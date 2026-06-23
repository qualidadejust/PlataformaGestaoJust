import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, PenLine, Award, Lock, CheckCircle2, Trash2, FolderUp, ShieldCheck, ClipboardCheck, AlertTriangle, Building2 } from "lucide-react";
import { api, core, cn, SETORES } from "../lib/cn";
import { gerarCertificadoPdf, type CertData } from "../lib/certificadoPdf";
import { AssinaturaModal } from "../components/AssinaturaModal";

interface Participacao {
  id: string;
  colaborador_id?: string | null;
  colaborador_nome: string;
  colaborador_cargo?: string | null;
  presente: boolean;
  assinatura_tipo?: string | null;
  bio_match?: boolean | null;
  certificado_em?: string | null;
  certificado_valido_ate?: string | null;
  ged_documento_id?: string | null;
}
interface Turma {
  id: string;
  treinamento_nome: string;
  treinamento_codigo?: string;
  setor: string;
  carga_horaria: number;
  data: string;
  instrutor?: string;
  local?: string;
  objetivo?: string | null;
  acao?: string | null;
  status: string;
  origem: string;
  entidade_externa?: string | null;
  eficacia_avaliar_em?: string | null;
  eficacia_em?: string | null;
  eficacia_proc_seguidos?: boolean | null;
  eficacia_houve_nc?: boolean | null;
  eficacia_eficaz?: boolean | null;
  eficacia_obs?: string | null;
  participacoes: Participacao[];
}
interface Colab { id: string; nome: string; matricula?: string; cargo?: { nome: string }; empresa?: { nome_fantasia?: string; razao_social?: string } }

export default function TurmaDetalheView({ turmaId, onBack, onCert }: { turmaId: string; onBack: () => void; onCert: (id: string) => void }) {
  const qc = useQueryClient();
  const turma = useQuery({ queryKey: ["turma", turmaId], queryFn: () => api<Turma>(`/turmas/${turmaId}`) });
  const colabs = useQuery({ queryKey: ["core-colaboradores"], queryFn: () => core<Colab[]>("/colaboradores") });
  const [addId, setAddId] = useState("");
  const [assinando, setAssinando] = useState<Participacao | null>(null);
  const [efic, setEfic] = useState<{ proc_seguidos: boolean; houve_nc: boolean; eficaz: boolean; obs: string }>({
    proc_seguidos: true,
    houve_nc: false,
    eficaz: true,
    obs: "",
  });

  const jaNaTurma = useMemo(() => new Set((turma.data?.participacoes ?? []).map((p) => p.colaborador_id)), [turma.data]);
  const disponiveis = (colabs.data ?? []).filter((c) => !jaNaTurma.has(c.id));

  const invalida = () => qc.invalidateQueries({ queryKey: ["turma", turmaId] });

  // Treinamento externo: confirma presença sem assinatura (tipo=declarado).
  const confirmarPresenca = useMutation({
    mutationFn: (id: string) =>
      api(`/participacoes/${id}/assinar`, { method: "POST", body: JSON.stringify({ assinatura_tipo: "declarado" }) }),
    onSuccess: invalida,
  });

  const adicionar = useMutation({
    mutationFn: () => {
      const c = colabs.data?.find((x) => x.id === addId);
      if (!c) throw new Error("selecione um colaborador");
      return api(`/turmas/${turmaId}/participantes`, {
        method: "POST",
        body: JSON.stringify({
          colaborador_id: c.id,
          colaborador_nome: c.nome,
          colaborador_matricula: c.matricula ?? null,
          colaborador_cargo: c.cargo?.nome ?? null,
          empresa_nome: c.empresa?.nome_fantasia ?? c.empresa?.razao_social ?? null,
        }),
      });
    },
    onSuccess: () => { setAddId(""); invalida(); },
  });

  const remover = useMutation({
    mutationFn: (id: string) => api(`/participacoes/${id}`, { method: "DELETE" }),
    onSuccess: invalida,
  });

  const emitir = useMutation({
    mutationFn: (p: Participacao) => api(`/participacoes/${p.id}/emitir`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: invalida,
  });

  // Arquiva o certificado na pasta do colaborador no GED (Core). Gera o PDF real do
  // certificado (mesmo layout da tela) e o sobe como documento (tipo certificado_treinamento,
  // setor da turma). Fecha o ciclo com o JustDocs.
  const arquivarGed = useMutation({
    mutationFn: async (p: Participacao) => {
      if (!p.colaborador_id) throw new Error("colaborador sem ID do Core");
      // garante a emissão (data + validade) antes de gerar o PDF
      await api(`/participacoes/${p.id}/emitir`, { method: "POST", body: JSON.stringify({}) });
      const cert = await api<CertData>(`/participacoes/${p.id}/certificado`);
      const blob = await gerarCertificadoPdf(cert);
      const nome = `certificado-${cert.turma.treinamento_codigo ?? "treinamento"}-${cert.participacao.colaborador_nome}.pdf`;
      const file = new File([blob], nome, { type: "application/pdf" });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("entidade_tipo", "colaborador");
      fd.append("entidade_id", p.colaborador_id);
      fd.append("entidade_label", p.colaborador_nome);
      fd.append("categoria", "certificado_treinamento");
      fd.append("tipo_codigo", "certificado_treinamento");
      fd.append("setor", cert.turma.setor);
      if (cert.participacao.certificado_valido_ate) fd.append("valido_ate", cert.participacao.certificado_valido_ate);
      fd.append("metadados", JSON.stringify({ treinamento: cert.turma.treinamento_nome, codigo: cert.turma.treinamento_codigo, carga_horaria: cert.turma.carga_horaria, data: cert.turma.data }));
      const doc = await core<{ id: string }>("/documentos", { method: "POST", body: fd });
      await api(`/participacoes/${p.id}/emitir`, { method: "POST", body: JSON.stringify({ ged_documento_id: doc.id }) });
      return doc;
    },
    onSuccess: invalida,
  });

  const concluir = useMutation({
    mutationFn: () => api(`/turmas/${turmaId}`, { method: "PUT", body: JSON.stringify({ status: "concluida" }) }),
    onSuccess: invalida,
  });

  const avaliarEficacia = useMutation({
    mutationFn: () => api(`/turmas/${turmaId}/eficacia`, { method: "POST", body: JSON.stringify(efic) }),
    onSuccess: invalida,
  });

  const t = turma.data;
  if (!t) return <p className="py-8 text-center text-sm text-slate-400">carregando…</p>;
  const assinados = t.participacoes.filter((p) => p.presente).length;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#0f2742]">
        <ArrowLeft className="size-4" /> voltar às turmas
      </button>

      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0f2742] dark:text-teal-300">
              {t.treinamento_codigo ? `${t.treinamento_codigo} · ` : ""}{t.treinamento_nome}
            </h2>
            <p className="text-sm text-slate-500">
              {SETORES[t.setor] ?? t.setor} · {t.carga_horaria}h · {t.data}
              {t.origem === "externa"
                ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Building2 className="size-3" /> Externo{t.entidade_externa ? `: ${t.entidade_externa}` : ""}</span>
                : <>{t.instrutor ? ` · instrutor: ${t.instrutor}` : ""}</>}
              {t.local ? ` · ${t.local}` : ""}
            </p>
            {(t.objetivo || t.acao) && (
              <p className="mt-1 text-xs text-slate-400">
                {t.objetivo ? `Objetivo: ${t.objetivo}` : ""}{t.objetivo && t.acao ? " · " : ""}{t.acao ? `Ação: ${t.acao}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{assinados}/{t.participacoes.length} assinaram</span>
            {t.status !== "concluida" && (
              <button onClick={() => concluir.mutate()} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                Concluir turma
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Adicionar participante */}
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          <UserPlus className="size-4" /> Adicionar participante (do Core)
        </h3>
        <div className="flex gap-2">
          <select
            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
          >
            <option value="">— selecione um colaborador —</option>
            {disponiveis.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}{c.cargo?.nome ? ` · ${c.cargo.nome}` : ""}</option>
            ))}
          </select>
          <button onClick={() => adicionar.mutate()} disabled={!addId || adicionar.isPending} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
            Adicionar
          </button>
        </div>
        {adicionar.isError && <p className="mt-2 text-xs text-red-600">{(adicionar.error as Error).message}</p>}
      </section>

      {/* Lista de participantes */}
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">Participantes</h3>
        <div className="space-y-2">
          {t.participacoes.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{p.colaborador_nome}</span>
                  {p.presente && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="size-3.5" /> {p.assinatura_tipo}
                      {p.bio_match && <ShieldCheck className="size-3.5" />}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {p.colaborador_cargo ?? "—"}
                  {p.certificado_em ? ` · certificado emitido` : ""}
                  {p.certificado_valido_ate ? ` (vence ${p.certificado_valido_ate})` : ""}
                  {p.ged_documento_id ? " · no GED ✓" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!p.presente ? (
                  t.origem === "externa" ? (
                    <button
                      onClick={() => confirmarPresenca.mutate(p.id)}
                      disabled={confirmarPresenca.isPending}
                      className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-3.5" /> Confirmar presença
                    </button>
                  ) : (
                    <button onClick={() => setAssinando(p)} className="flex items-center gap-1 rounded-lg bg-[#0f2742] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#173456]">
                      <PenLine className="size-3.5" /> Assinar
                    </button>
                  )
                ) : (
                  <>
                    {!p.certificado_em && (
                      <button onClick={() => emitir.mutate(p)} className="flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                        <Award className="size-3.5" /> Emitir certificado
                      </button>
                    )}
                    <button onClick={() => onCert(p.id)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700">
                      <Award className="size-3.5" /> Ver
                    </button>
                    {p.colaborador_id && !p.ged_documento_id && (
                      <button onClick={() => arquivarGed.mutate(p)} disabled={arquivarGed.isPending} className="flex items-center gap-1 rounded-lg border border-teal-300 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50">
                        <FolderUp className="size-3.5" /> Arquivar no GED
                      </button>
                    )}
                  </>
                )}
                {!p.presente && (
                  <button onClick={() => remover.mutate(p.id)} className="text-slate-300 hover:text-red-600">
                    <Trash2 className="size-4" />
                  </button>
                )}
                {p.presente && <Lock className="size-3.5 text-slate-300" />}
              </div>
            </div>
          ))}
          {t.participacoes.length === 0 && <p className="py-6 text-center text-xs text-slate-400">nenhum participante — adicione acima</p>}
        </div>
        {arquivarGed.isError && <p className="mt-2 text-xs text-red-600">{(arquivarGed.error as Error).message}</p>}
      </section>

      {/* Avaliação da eficácia (Formulário pg.2, após 30 dias) */}
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          <ClipboardCheck className="size-4" /> Avaliação da eficácia (após 30 dias)
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          Prevista para <strong>{t.eficacia_avaliar_em ?? "—"}</strong>.
        </p>
        {t.eficacia_em ? (
          <div className="space-y-1 text-sm">
            <div>Procedimentos seguidos: <strong>{t.eficacia_proc_seguidos ? "Sim" : "Não"}</strong></div>
            <div>Houve NC / retrabalho: <strong>{t.eficacia_houve_nc ? "Sim" : "Não"}</strong></div>
            <div className="flex items-center gap-2">
              Treinamento eficaz: <strong>{t.eficacia_eficaz ? "Sim" : "Não"}</strong>
              {!t.eficacia_eficaz && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="size-3.5" /> refazer / abrir análise de causa
                </span>
              )}
            </div>
            {t.eficacia_obs && <div className="text-xs text-slate-500">Obs.: {t.eficacia_obs}</div>}
            <div className="text-xs text-slate-400">avaliada em {t.eficacia_em.slice(0, 10)}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {([
              ["proc_seguidos", "Os procedimentos/processos foram seguidos pelos participantes?"],
              ["houve_nc", "Houve NC e/ou retrabalho relacionado ao tema após o treinamento?"],
              ["eficaz", "O treinamento foi eficaz?"],
            ] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{label}</span>
                <div className="flex shrink-0 gap-1">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => setEfic({ ...efic, [k]: v })}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium",
                        efic[k] === v ? "bg-[#0f2742] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800",
                      )}
                    >
                      {v ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="Observações"
              value={efic.obs}
              onChange={(e) => setEfic({ ...efic, obs: e.target.value })}
            />
            {!efic.eficaz && (
              <p className="text-xs text-amber-600">Se não eficaz, o treinamento deverá ser refeito; persistindo, abrir análise de causa.</p>
            )}
            <button
              onClick={() => avaliarEficacia.mutate()}
              disabled={avaliarEficacia.isPending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {avaliarEficacia.isPending ? "Salvando…" : "Registrar avaliação"}
            </button>
          </div>
        )}
      </section>

      {assinando && (
        <AssinaturaModal
          participante={assinando}
          onClose={() => setAssinando(null)}
          onDone={() => { setAssinando(null); invalida(); }}
        />
      )}
    </div>
  );
}

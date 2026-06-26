import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HardHat,
  ClipboardCheck,
  UserCheck,
  KeyRound,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Lock,
  FileText,
  Play,
  Plus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { api, ETAPA_LABEL, DISCIPLINAS, type Etapa, type NaoConformidade, type Construcao, type Unidade } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { FormularioView } from "./FormularioView.tsx";
import { TermoView } from "./TermoView.tsx";
import { RelatorioView } from "./RelatorioView.tsx";

const ICON: Record<Etapa["tipo"], LucideIcon> = {
  construcao: HardHat,
  inspecao_final: ClipboardCheck,
  vistoria_cliente: UserCheck,
  entrega_chaves: KeyRound,
};

const SIT_BADGE: Record<Etapa["situacao"], string> = {
  nao_iniciada: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  em_andamento: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  concluida: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  desconsiderada: "bg-slate-100 text-slate-400 line-through",
};
const SIT_LABEL: Record<Etapa["situacao"], string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  desconsiderada: "Desconsiderada",
};

type Modo = { tela: "pipeline" } | { tela: "checklist" } | { tela: "termo"; tipo: "vistoria_cliente" | "entrega_chaves" } | { tela: "relatorio" };

export function PipelineView({ unidade }: { unidade: Unidade }) {
  const qc = useQueryClient();
  const [modo, setModo] = useState<Modo>({ tela: "pipeline" });

  const etapasQ = useQuery({ queryKey: ["etapas", unidade.id], queryFn: () => api.get<Etapa[]>(`/api/unidades/${unidade.id}/etapas`) });
  const construcaoQ = useQuery({ queryKey: ["construcao", unidade.id], queryFn: () => api.get<Construcao>(`/api/unidades/${unidade.id}/construcao`) });
  const ncsQ = useQuery({ queryKey: ["ncs", unidade.id], queryFn: () => api.get<NaoConformidade[]>(`/api/ncs?unidade_id=${unidade.id}`) });

  const iniciar = useMutation({
    mutationFn: () => api.post<Etapa[]>(`/api/unidades/${unidade.id}/iniciar`, { unidade_label: unidade.identificador }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["etapas", unidade.id] }),
  });
  const atualizarEtapa = useMutation({
    mutationFn: (v: { id: string; situacao: Etapa["situacao"] }) =>
      api.put<Etapa>(`/api/etapas/${v.id}`, {
        situacao: v.situacao,
        ...(v.situacao === "concluida" ? { realizado_ate: new Date().toISOString().slice(0, 10) } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapas", unidade.id] });
      qc.invalidateQueries({ queryKey: ["construcao", unidade.id] });
    },
  });
  const reverificar = useMutation({
    mutationFn: (id: string) => api.post(`/api/ncs/${id}/reverificar`, { aprovada: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncs", unidade.id] }),
  });
  const invalidarNcs = () => { qc.invalidateQueries({ queryKey: ["ncs", unidade.id] }); qc.invalidateQueries({ queryKey: ["pendencias"] }); };
  const criarPendencia = useMutation({
    mutationFn: (v: { titulo: string; descricao?: string; severidade: string; categoria?: string }) =>
      api.post("/api/ncs", { ...v, unidade_id: unidade.id, unidade_label: unidade.identificador, origem: "construcao" }),
    onSuccess: () => { invalidarNcs(); setPendForm(false); setPend({ titulo: "", descricao: "", severidade: "media", categoria: "" }); },
  });
  const salvarTratativa = useMutation({
    mutationFn: (v: { id: string } & Partial<NaoConformidade>) => api.put(`/api/ncs/${v.id}`, v),
    onSuccess: () => { invalidarNcs(); setTratativaId(null); },
  });

  // pendência manual (Construção) + tratativa de NC crítica
  const [pendForm, setPendForm] = useState(false);
  const [pend, setPend] = useState({ titulo: "", descricao: "", severidade: "media", categoria: "" });
  const [tratativaId, setTratativaId] = useState<string | null>(null);
  const [trat, setTrat] = useState({ tipo: "", causa_raiz: "", acoes: "", prazo: "" });

  const etapas = etapasQ.data ?? [];
  const ncs = ncsQ.data ?? [];
  const ncsCriticasAbertas = ncs.filter((n) => n.severidade === "critica" && ["aberta", "em_correcao", "reverificar"].includes(n.status)).length;
  const etapaDe = (t: Etapa["tipo"]) => etapas.find((e) => e.tipo === t);
  const construcaoConcluida = etapaDe("construcao")?.situacao === "concluida";

  if (modo.tela === "checklist")
    return <FormularioView unidade={unidade} etapa={etapaDe("inspecao_final")} onVoltar={() => { setModo({ tela: "pipeline" }); qc.invalidateQueries({ queryKey: ["ncs", unidade.id] }); qc.invalidateQueries({ queryKey: ["etapas", unidade.id] }); }} />;
  if (modo.tela === "termo")
    return <TermoView unidade={unidade} tipo={modo.tipo} ncsRessalva={ncs.filter((n) => ["aberta", "em_correcao", "reverificar"].includes(n.status))} onVoltar={() => { setModo({ tela: "pipeline" }); qc.invalidateQueries({ queryKey: ["etapas", unidade.id] }); }} />;
  if (modo.tela === "relatorio") return <RelatorioView unidade={unidade} onVoltar={() => setModo({ tela: "pipeline" })} />;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-900 dark:text-slate-100">{unidade.identificador}</h1>
          <p className="text-sm text-slate-500">
            {unidade.obra?.nome ?? "—"}
            {unidade.cliente?.nome ? ` · Cliente: ${unidade.cliente.nome}` : " · sem comprador vinculado"}
          </p>
        </div>
        <button onClick={() => setModo({ tela: "relatorio" })} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
          <FileText className="size-4" /> Relatório
        </button>
      </header>

      {etapas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="mb-3 text-sm text-slate-500">Pipeline ainda não iniciado para esta unidade.</p>
          <button onClick={() => iniciar.mutate()} disabled={iniciar.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            <Play className="size-4" /> {iniciar.isPending ? "Iniciando…" : "Iniciar pipeline"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {etapas.map((e) => {
            const Icon = ICON[e.tipo];
            const bloqueada =
              (e.tipo === "inspecao_final" && !construcaoConcluida) ||
              (e.tipo === "entrega_chaves" && ncsCriticasAbertas > 0);
            return (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Icon className="size-5 text-brand-600 dark:text-brand-300" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-brand-900 dark:text-slate-100">{ETAPA_LABEL[e.tipo]}</h2>
                      <p className="text-xs text-slate-400">
                        {e.previsto_de || e.previsto_ate ? `Previsto: ${e.previsto_de ?? "—"} → ${e.previsto_ate ?? "—"}` : "Sem previsto"}
                        {e.realizado_ate ? ` · Realizado: ${e.realizado_ate}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", SIT_BADGE[e.situacao])}>{SIT_LABEL[e.situacao]}</span>
                </div>

                {/* Construção: pendências do Prevision + pendência manual */}
                {e.tipo === "construcao" && construcaoQ.data && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                    <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">
                      Cronograma (Prevision): {construcaoQ.data.total_tarefas} tarefa(s) · {construcaoQ.data.pendencias.length} pendente(s)
                    </p>
                    {construcaoQ.data.pendencias.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-500">
                        <Circle className="size-2.5 fill-amber-400 text-amber-400" /> {p.pacote} — {p.servico} {p.fim ? `(até ${p.fim})` : ""}
                      </div>
                    ))}
                    {construcaoQ.data.pendencias.length > 5 && <p className="mt-1 text-slate-400">+{construcaoQ.data.pendencias.length - 5} pendência(s)…</p>}

                    {/* Pendência manual (apontada em obra, fora do cronograma) */}
                    {!pendForm ? (
                      <button onClick={() => setPendForm(true)} className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                        <Plus className="size-3.5" /> Adicionar pendência
                      </button>
                    ) : (
                      <div className="mt-2 space-y-1.5 rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                        <input
                          autoFocus
                          placeholder="Título da pendência"
                          value={pend.titulo}
                          onChange={(ev) => setPend((p) => ({ ...p, titulo: ev.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                        <input
                          placeholder="Descrição (opcional)"
                          value={pend.descricao}
                          onChange={(ev) => setPend((p) => ({ ...p, descricao: ev.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <select value={pend.severidade} onChange={(ev) => setPend((p) => ({ ...p, severidade: ev.target.value }))} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                            <option value="critica">Crítica (bloqueia)</option>
                          </select>
                          <select value={pend.categoria} onChange={(ev) => setPend((p) => ({ ...p, categoria: ev.target.value }))} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                            <option value="">Disciplina…</option>
                            {DISCIPLINAS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            onClick={() => criarPendencia.mutate({ titulo: pend.titulo, descricao: pend.descricao || undefined, severidade: pend.severidade, categoria: pend.categoria || undefined })}
                            disabled={!pend.titulo || criarPendencia.isPending}
                            className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                          >
                            {criarPendencia.isPending ? "Salvando…" : "Salvar"}
                          </button>
                          <button onClick={() => setPendForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Ações por etapa */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {bloqueada && (
                    <span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-300">
                      <Lock className="size-3.5" />
                      {e.tipo === "inspecao_final" ? "Conclua a Construção antes" : `${ncsCriticasAbertas} NC crítica(s) em aberto`}
                    </span>
                  )}
                  {e.tipo === "inspecao_final" && !bloqueada && (
                    <button onClick={() => setModo({ tela: "checklist" })} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                      Aplicar checklist (FVC)
                    </button>
                  )}
                  {e.tipo === "vistoria_cliente" && (
                    <button onClick={() => setModo({ tela: "termo", tipo: "vistoria_cliente" })} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                      Gerar termo de vistoria
                    </button>
                  )}
                  {e.tipo === "entrega_chaves" && !bloqueada && (
                    <button onClick={() => setModo({ tela: "termo", tipo: "entrega_chaves" })} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                      Gerar termo de entrega
                    </button>
                  )}
                  {e.situacao !== "concluida" ? (
                    <button onClick={() => atualizarEtapa.mutate({ id: e.id, situacao: "concluida" })} className="flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="size-4" /> Concluir etapa
                    </button>
                  ) : (
                    <button onClick={() => atualizarEtapa.mutate({ id: e.id, situacao: "em_andamento" })} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:border-slate-700">
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Não-conformidades */}
      {ncs.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-900 dark:text-slate-100">
            <AlertTriangle className="size-4 text-amber-500" /> Não-conformidades ({ncs.length})
          </h3>
          <div className="space-y-1.5">
            {ncs.map((n) => (
              <div key={n.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium">{n.titulo}</span>
                    {n.descricao && <span className="ml-2 text-slate-400">{n.descricao}</span>}
                    {n.categoria && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">{n.categoria}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", n.severidade === "critica" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300")}>
                      {n.severidade}
                    </span>
                    <span className="text-[11px] text-slate-400">{n.status}</span>
                    {n.severidade === "critica" && (
                      <button
                        onClick={() => { setTratativaId(tratativaId === n.id ? null : n.id); setTrat({ tipo: n.tipo ?? "", causa_raiz: n.causa_raiz ?? "", acoes: n.acoes ?? "", prazo: n.prazo ?? "" }); }}
                        className="flex items-center gap-1 rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                      >
                        <Wrench className="size-3.5" /> Tratativa
                      </button>
                    )}
                    {["aberta", "em_correcao", "reverificar"].includes(n.status) && (
                      <button onClick={() => reverificar.mutate(n.id)} className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-700">
                        Marcar corrigida
                      </button>
                    )}
                  </div>
                </div>

                {tratativaId === n.id && (
                  <div className="mt-2 space-y-1.5 rounded-md border border-red-200 bg-red-50/50 p-2 dark:border-red-900 dark:bg-red-950/30">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Tratativa da NC (plano de qualidade)</p>
                    <div className="flex flex-wrap gap-1.5">
                      <input placeholder="Tipo (instalação, estrutura…)" value={trat.tipo} onChange={(ev) => setTrat((t) => ({ ...t, tipo: ev.target.value }))} className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" />
                      <input type="date" value={trat.prazo} onChange={(ev) => setTrat((t) => ({ ...t, prazo: ev.target.value }))} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" />
                    </div>
                    <textarea placeholder="Causa raiz" rows={2} value={trat.causa_raiz} onChange={(ev) => setTrat((t) => ({ ...t, causa_raiz: ev.target.value }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" />
                    <textarea placeholder="Ações / plano de correção" rows={2} value={trat.acoes} onChange={(ev) => setTrat((t) => ({ ...t, acoes: ev.target.value }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => salvarTratativa.mutate({ id: n.id, tipo: trat.tipo || null, causa_raiz: trat.causa_raiz || null, acoes: trat.acoes || null, prazo: trat.prazo || null, status: "em_correcao" })}
                        disabled={salvarTratativa.isPending}
                        className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {salvarTratativa.isPending ? "Salvando…" : "Salvar tratativa"}
                      </button>
                      <button onClick={() => setTratativaId(null)} className="text-xs text-slate-400 hover:text-slate-600">Fechar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

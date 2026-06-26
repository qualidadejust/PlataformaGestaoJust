import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Check, X, Download, Loader2, MessageCircle, ExternalLink, UserPlus } from "lucide-react";
import { api } from "../lib/api.ts";
import { abrirDoc } from "../api-base.ts";
import { cn } from "../lib/cn.ts";

// Fila de análise: documentos que chegaram pendentes de conferência (hoje, pelo WhatsApp via
// JustGate). O RH confere a classificação/campos detectados pela IA e aprova/rejeita — ou, no
// caso de ADMISSÃO (pessoa ainda não cadastrada), cria o colaborador pré-preenchido.
interface DadosExtraidos {
  cid?: string;
  dias_afastamento?: string;
  horas?: string;
  data_inicio?: string;
  data_realizacao?: string;
  vencimento?: string;
  instrutor?: string;
  carga_horaria?: string;
  nome_completo?: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  data_admissao?: string;
  cargo?: string;
  pis?: string;
}
interface Meta {
  origem?: string;
  destino?: string;
  telefone?: string;
  colaborador_nome?: string;
  enviado_por?: string;
  dados_extraidos?: DadosExtraidos;
}
interface Doc {
  id: string;
  entidade_id: string;
  nome_original: string;
  tipo_codigo: string | null;
  categoria: string;
  sensivel: boolean;
  valido_ate: string | null;
  origem: string | null;
  metadados: Meta | null;
  download_url: string;
  created_at: string;
}

const CAMPOS: { k: keyof DadosExtraidos; label: string }[] = [
  { k: "cid", label: "CID" },
  { k: "dias_afastamento", label: "Dias de afastamento" },
  { k: "horas", label: "Horas" },
  { k: "data_inicio", label: "Início" },
  { k: "data_realizacao", label: "Realização" },
  { k: "vencimento", label: "Vencimento" },
  { k: "instrutor", label: "Instrutor" },
  { k: "carga_horaria", label: "Carga horária" },
  { k: "cpf", label: "CPF" },
  { k: "cargo", label: "Cargo" },
  { k: "data_admissao", label: "Admissão" },
];

const DESTINO_LABEL: Record<string, string> = {
  atestados: "JustAtestados",
  treinamento: "JustTrain",
  novo_colaborador: "novo colaborador",
  ged: "GED",
};

// URL de outro app da plataforma (para a "ponte"). Vem de VITE_URL_* (render.yaml). Normaliza
// o host que o Render às vezes injeta só com o nome do serviço (sem .onrender.com).
const env = (import.meta as any).env ?? {};
function appUrl(name: string): string | null {
  let u = env[name];
  if (!u) return null;
  u = String(u).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!u.includes(".")) u = `${u}.onrender.com`;
  return `https://${u}`;
}
// Usa a var do render.yaml; com fallback fixo para não depender de sync de blueprint.
const ATESTADOS_URL = appUrl("VITE_URL_ATESTADOS") ?? "https://just-atestados-web.onrender.com";

export default function FilaView() {
  const qc = useQueryClient();
  const [admissao, setAdmissao] = useState<Doc | null>(null);
  const fila = useQuery({
    queryKey: ["fila-analise"],
    queryFn: () => api<Doc[]>("/documentos?analise=pendente"),
  });

  const analisar = async (id: string, acao: "aprovar" | "rejeitar") => {
    await api(`/documentos/${id}/analise`, { method: "POST", body: JSON.stringify({ acao }) });
    qc.invalidateQueries({ queryKey: ["fila-analise"] });
    qc.invalidateQueries({ queryKey: ["docs"] });
  };

  const docs = fila.data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          <Inbox className="size-4" /> Fila de análise
        </h2>
        <p className="text-xs text-slate-500">
          Documentos recebidos pelo WhatsApp (JustGate), classificados pela IA e aguardando conferência do RH.
          Confira os campos detectados e <strong>aprove/rejeite</strong> — ou, em admissões, <strong>crie o colaborador</strong>.
        </p>
      </section>

      {fila.isLoading && (
        <p className="flex items-center gap-2 px-1 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> carregando…
        </p>
      )}
      {!fila.isLoading && docs.length === 0 && (
        <p className="rounded-xl bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-sm dark:bg-slate-900">
          Nenhum documento aguardando análise.
        </p>
      )}

      {docs.map((d) => (
        <Card key={d.id} doc={d} onAnalisar={analisar} onCriarColaborador={() => setAdmissao(d)} />
      ))}

      {admissao && (
        <AdmissaoModal
          doc={admissao}
          onClose={() => setAdmissao(null)}
          onCriado={() => {
            setAdmissao(null);
            qc.invalidateQueries({ queryKey: ["fila-analise"] });
            qc.invalidateQueries({ queryKey: ["docs"] });
          }}
        />
      )}
    </div>
  );
}

function Card({
  doc,
  onAnalisar,
  onCriarColaborador,
}: {
  doc: Doc;
  onAnalisar: (id: string, a: "aprovar" | "rejeitar") => Promise<void>;
  onCriarColaborador: () => void;
}) {
  const meta = doc.metadados ?? {};
  const dados = meta.dados_extraidos ?? {};
  const destino = meta.destino ?? "ged";
  const ehAdmissao = destino === "novo_colaborador";
  const campos = useMemo(() => CAMPOS.filter((c) => (dados[c.k] ?? "").toString().trim()), [dados]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{doc.nome_original}</span>
        <div className="flex items-center gap-1.5">
          {doc.origem === "whatsapp" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <MessageCircle className="size-3" /> WhatsApp
            </span>
          )}
          {doc.sensivel && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              sensível
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            → {DESTINO_LABEL[destino] ?? destino}
          </span>
        </div>
      </div>

      <div className="grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
        {ehAdmissao ? (
          <>
            <Info label="Novo colaborador" valor={dados.nome_completo} />
            <Info label="Enviado por" valor={meta.enviado_por} />
          </>
        ) : (
          <>
            <Info label="Colaborador" valor={meta.colaborador_nome} />
            <Info label="Tipo" valor={doc.tipo_codigo ?? doc.categoria} />
          </>
        )}
        {doc.valido_ate && <Info label="Validade" valor={doc.valido_ate} />}
        {campos.map((c) => (
          <Info key={c.k} label={c.label} valor={dados[c.k]} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => abrirDoc(doc.download_url)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
        >
          <Download className="size-3.5" /> ver arquivo
        </button>
        <div className="flex items-center gap-2">
          {ehAdmissao ? (
            <button
              onClick={onCriarColaborador}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0f2742] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163554] dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <UserPlus className="size-3.5" /> Criar colaborador
            </button>
          ) : destino === "atestados" && ATESTADOS_URL ? (
            <a
              href={`${ATESTADOS_URL}/?ged=${doc.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0f2742] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163554] dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <ExternalLink className="size-3.5" /> Finalizar no JustAtestados
            </a>
          ) : (
            destino !== "ged" && (
              <span
                title="Ponte de finalização no app dono — em breve"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-400 dark:border-slate-700"
              >
                <ExternalLink className="size-3.5" /> Finalizar no {DESTINO_LABEL[destino]} (em breve)
              </span>
            )
          )}
          <button
            onClick={() => onAnalisar(doc.id, "rejeitar")}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
          >
            <X className="size-3.5" /> Rejeitar
          </button>
          {!ehAdmissao && (
            <button
              onClick={() => onAnalisar(doc.id, "aprovar")}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500"
            >
              <Check className="size-3.5" /> Aprovar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div className={cn("flex gap-1.5")}>
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium">{valor}</span>
    </div>
  );
}

const inp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

// Modal de criação do colaborador a partir da ficha de admissão. Pré-preenchido com o que a IA
// leu; o RH confere/corrige e salva. Cria o cadastro no Core e re-amarra os docs do lote.
function AdmissaoModal({ doc, onClose, onCriado }: { doc: Doc; onClose: () => void; onCriado: () => void }) {
  const d = doc.metadados?.dados_extraidos ?? {};
  const [form, setForm] = useState({
    nome: d.nome_completo ?? "",
    cpf: d.cpf ?? "",
    rg: d.rg ?? "",
    data_nascimento: d.data_nascimento ?? "",
    data_admissao: d.data_admissao ?? "",
    pis: d.pis ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await api("/gate/admissao/criar", {
        method: "POST",
        body: JSON.stringify({ lote: doc.entidade_id, colaborador: form }),
      });
      onCriado();
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          <UserPlus className="size-4" /> Criar colaborador (admissão)
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Campos lidos pela IA da ficha de admissão. Confira/corrija antes de salvar.
          {d.cargo && <> Cargo detectado: <strong>{d.cargo}</strong> — ajuste o cargo/empresa depois no Core.</>}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs text-slate-500">
            Nome completo
            <input className={cn(inp, !form.nome && "border-rose-400")} value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            CPF
            <input className={inp} value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            RG
            <input className={inp} value={form.rg} onChange={(e) => set("rg", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Nascimento
            <input type="date" className={inp} value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Admissão
            <input type="date" className={inp} value={form.data_admissao} onChange={(e) => set("data_admissao", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            PIS
            <input className={inp} value={form.pis} onChange={(e) => set("pis", e.target.value)} />
          </label>
        </div>
        {erro && <p className="mt-2 text-xs text-rose-600">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Criar e vincular documentos
          </button>
        </div>
      </div>
    </div>
  );
}

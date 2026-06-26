import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Check, X, Download, Loader2, MessageCircle, ExternalLink } from "lucide-react";
import { api } from "../lib/api.ts";
import { abrirDoc } from "../api-base.ts";
import { cn } from "../lib/cn.ts";

// Fila de análise: documentos que chegaram pendentes de conferência (hoje, pelo WhatsApp via
// JustGate). O RH confere a classificação/campos detectados pela IA e aprova ou rejeita.
interface DadosExtraidos {
  cid?: string;
  dias_afastamento?: string;
  horas?: string;
  data_inicio?: string;
  data_realizacao?: string;
  vencimento?: string;
  instrutor?: string;
  carga_horaria?: string;
}
interface Meta {
  origem?: string;
  destino?: string;
  telefone?: string;
  colaborador_nome?: string;
  dados_extraidos?: DadosExtraidos;
}
interface Doc {
  id: string;
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
];

const DESTINO_LABEL: Record<string, string> = {
  atestados: "JustAtestados",
  treinamento: "JustTrain",
  ged: "GED",
};

export default function FilaView() {
  const qc = useQueryClient();
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
          Confira os campos detectados e <strong>aprove</strong> ou <strong>rejeite</strong>.
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
        <Card key={d.id} doc={d} onAnalisar={analisar} />
      ))}
    </div>
  );
}

function Card({ doc, onAnalisar }: { doc: Doc; onAnalisar: (id: string, a: "aprovar" | "rejeitar") => Promise<void> }) {
  const meta = doc.metadados ?? {};
  const dados = meta.dados_extraidos ?? {};
  const destino = meta.destino ?? "ged";
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
        <Info label="Colaborador" valor={meta.colaborador_nome} />
        <Info label="Tipo" valor={doc.tipo_codigo ?? doc.categoria} />
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
          {destino !== "ged" && (
            <span
              title="Ponte de finalização no app dono — em breve (Fase 2)"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-400 dark:border-slate-700"
            >
              <ExternalLink className="size-3.5" /> Finalizar no {DESTINO_LABEL[destino]} (em breve)
            </span>
          )}
          <button
            onClick={() => onAnalisar(doc.id, "rejeitar")}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
          >
            <X className="size-3.5" /> Rejeitar
          </button>
          <button
            onClick={() => onAnalisar(doc.id, "aprovar")}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500"
          >
            <Check className="size-3.5" /> Aprovar
          </button>
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

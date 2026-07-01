import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Loader2, CheckCircle2, Clock, XCircle, Filter,
  ChevronDown, ChevronRight, User, Calendar, MessageSquare,
} from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import type { Obra, NaoConformidade } from "../lib/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SEV_COR: Record<string, string> = {
  baixa:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  media:   "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  alta:    "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  critica: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};
const SEV_LABEL: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };

const STATUS_COR: Record<string, string> = {
  aberta:        "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  em_acao:       "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  reverificacao: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  fechada:       "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};
const STATUS_LABEL: Record<string, string> = {
  aberta:        "Aberta",
  em_acao:       "Em ação",
  reverificacao: "Aguard. reverif.",
  fechada:       "Fechada",
};

function diasAte(iso: string | null): string {
  if (!iso) return "";
  const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (dias < 0) return `${Math.abs(dias)}d atrasado`;
  if (dias === 0) return "hoje";
  return `${dias}d restantes`;
}

// ---------------------------------------------------------------------------
// Cartão de NC
// ---------------------------------------------------------------------------
function NcCard({ nc, onUpdate }: { nc: NaoConformidade; onUpdate: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [causa, setCausa] = useState(nc.causa ?? "");
  const [acao, setAcao] = useState(nc.acao_corretiva ?? "");
  const [responsavel, setResponsavel] = useState(nc.responsavel_nome ?? "");
  const [prazo, setPrazo] = useState(nc.prazo ? nc.prazo.split("T")[0] : "");
  const [salvando, setSalvando] = useState(false);

  async function salvarAcao() {
    setSalvando(true);
    try {
      await api(`/nao-conformidades/${nc.id}/acao`, {
        method: "POST",
        body: JSON.stringify({ causa, acao_corretiva: acao, responsavel_nome: responsavel, prazo: prazo ? new Date(prazo).toISOString() : null }),
      });
      onUpdate();
    } finally {
      setSalvando(false);
    }
  }

  async function fechar() {
    setSalvando(true);
    try {
      await api(`/nao-conformidades/${nc.id}/fechar`, { method: "POST", body: JSON.stringify({}) });
      onUpdate();
    } finally {
      setSalvando(false);
    }
  }

  const vencida = nc.prazo && new Date(nc.prazo) < new Date() && nc.status !== "fechada";

  return (
    <div className={cn(
      "rounded-lg border bg-white dark:bg-slate-900",
      vencida ? "border-red-300 dark:border-red-800" : "border-slate-200 dark:border-slate-800",
    )}>
      {/* Cabeçalho do cartão */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        {aberto ? <ChevronDown className="mt-0.5 size-4 shrink-0 text-slate-400" /> : <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-400" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COR[nc.status] ?? STATUS_COR.aberta)}>
              {STATUS_LABEL[nc.status] ?? nc.status}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", SEV_COR[nc.severidade] ?? SEV_COR.media)}>
              {SEV_LABEL[nc.severidade] ?? nc.severidade}
            </span>
            {nc.prazo && (
              <span className={cn("flex items-center gap-1 text-xs", vencida ? "font-medium text-red-600 dark:text-red-400" : "text-slate-400")}>
                <Calendar className="size-3" />
                {diasAte(nc.prazo)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{nc.descricao}</p>
          <p className="mt-0.5 text-xs text-slate-400">Item: {nc.item_ref}</p>
        </div>
      </button>

      {/* Detalhes / tratativa */}
      {aberto && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {/* Causa raiz */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Causa raiz</label>
            <textarea
              value={causa}
              onChange={(e) => setCausa(e.target.value)}
              rows={2}
              placeholder="Descreva a causa raiz da não-conformidade…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Ação corretiva */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Ação corretiva</label>
            <textarea
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              rows={2}
              placeholder="Descreva a ação a ser tomada…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Responsável + prazo */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                <User className="mr-1 inline size-3" />Responsável
              </label>
              <input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do responsável"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                <Calendar className="mr-1 inline size-3" />Prazo
              </label>
              <input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-1">
            {nc.status !== "fechada" && (
              <>
                <button
                  onClick={salvarAcao}
                  disabled={salvando}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500"
                >
                  {salvando ? <Loader2 className="size-3 animate-spin" /> : <MessageSquare className="size-3" />}
                  Salvar tratativa
                </button>
                {nc.status === "em_acao" && (
                  <button
                    onClick={fechar}
                    disabled={salvando}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 dark:bg-green-500"
                  >
                    <CheckCircle2 className="size-3" />
                    Fechar NC
                  </button>
                )}
              </>
            )}
            {nc.status === "fechada" && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                NC fechada em {nc.fechada_em ? new Date(nc.fechada_em).toLocaleDateString("pt-BR") : "—"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View principal
// ---------------------------------------------------------------------------
export default function PendenciasView() {
  const qc = useQueryClient();
  const { data: obras } = useQuery<Obra[]>({ queryKey: ["obras"], queryFn: () => api("/obras") });
  const [obraId, setObraId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("aberta");
  const [filtroSev, setFiltroSev] = useState<string>("");

  // NCs filtradas por status e severidade via query params
  const { data: ncs = [], isLoading } = useQuery<NaoConformidade[]>({
    queryKey: ["nao-conformidades", obraId, filtroStatus, filtroSev],
    queryFn: () => {
      const params = new URLSearchParams();
      if (obraId) params.set("obra_id", obraId);
      if (filtroStatus) params.set("status", filtroStatus);
      if (filtroSev) params.set("severidade", filtroSev);
      return api(`/nao-conformidades?${params}`);
    },
    enabled: true,
    staleTime: 30_000,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["nao-conformidades"] });

  const atrasadas = ncs.filter((n) => n.prazo && new Date(n.prazo) < new Date() && n.status !== "fechada").length;
  const abertas   = ncs.filter((n) => n.status === "aberta").length;
  const emAcao    = ncs.filter((n) => n.status === "em_acao").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <AlertTriangle className="size-5 text-amber-500" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Pendências / NCs</h2>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra</label>
        <select
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Todas as obras</option>
          {obras?.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>

        <Filter className="size-4 text-slate-400" />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Todos os status</option>
          <option value="aberta">Abertas</option>
          <option value="em_acao">Em ação</option>
          <option value="reverificacao">Aguard. reverif.</option>
          <option value="fechada">Fechadas</option>
        </select>

        <select
          value={filtroSev}
          onChange={(e) => setFiltroSev(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Todas as severidades</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>
      </div>

      {/* Resumo */}
      {ncs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs dark:border-red-900 dark:bg-red-950">
            <XCircle className="size-4 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-700 dark:text-red-300">{abertas} abertas</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950">
            <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-700 dark:text-amber-300">{emAcao} em ação</span>
          </div>
          {atrasadas > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-400 bg-red-100 px-3 py-2 text-xs dark:border-red-700 dark:bg-red-950">
              <AlertTriangle className="size-4 text-red-700 dark:text-red-400" />
              <span className="font-medium text-red-700 dark:text-red-300">{atrasadas} atrasadas</span>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Carregando NCs…
        </div>
      )}

      {!isLoading && ncs.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-green-400" />
          <p className="text-sm text-slate-400">Nenhuma NC encontrada com os filtros atuais.</p>
        </div>
      )}

      <div className="space-y-2">
        {ncs.map((nc) => (
          <NcCard key={nc.id} nc={nc} onUpdate={invalidar} />
        ))}
      </div>
    </div>
  );
}

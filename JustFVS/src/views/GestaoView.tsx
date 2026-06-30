import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList, Loader2, CheckCircle2, XCircle, Clock, Lock,
  AlertTriangle, FileQuestion, ChevronDown, ChevronRight, BarChart3,
} from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import type { Obra, Tarefa, FormularioInstancia } from "../lib/types.ts";

// ---------------------------------------------------------------------------
// Status de qualidade de uma tarefa (calculado no front a partir dos dados)
// ---------------------------------------------------------------------------
type QualidadeStatus = "a_abrir" | "rascunho" | "conforme" | "pendencia_nc" | "bloqueada";

interface TarefaComStatus extends Tarefa {
  instancias: FormularioInstancia[];
  status_qualidade: QualidadeStatus;
}

function derivarStatus(
  tarefa: Tarefa,
  instancias: FormularioInstancia[],
  instanciasPorTarefa: Map<string, FormularioInstancia[]>,
): QualidadeStatus {
  if (instancias.length === 0) return "a_abrir";
  const concluidas = instancias.filter((i) => !!i.preenchido_em);
  if (concluidas.length === 0) return "rascunho";
  const comNc = concluidas.filter((i) => i.total_nc > 0);
  if (comNc.length > 0) return "pendencia_nc";
  return "conforme";
}

// ---------------------------------------------------------------------------
// Componentes de UI
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<QualidadeStatus, { label: string; cor: string; Icon: React.ComponentType<{ className?: string }> }> = {
  a_abrir:     { label: "A abrir",        cor: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",        Icon: FileQuestion  },
  rascunho:    { label: "Rascunho",       cor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",         Icon: Clock         },
  conforme:    { label: "Conforme",       cor: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",         Icon: CheckCircle2  },
  pendencia_nc:{ label: "NC pendente",    cor: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",                 Icon: XCircle       },
  bloqueada:   { label: "Bloqueada",      cor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",     Icon: Lock          },
};

function StatusBadge({ status }: { status: QualidadeStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  return (
    <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.cor)}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

function ContadorCard({ label, count, cor }: { label: string; count: number; cor: string }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-center", cor)}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="mt-0.5 text-xs">{label}</p>
    </div>
  );
}

function TarefaRow({ t, onAbrirFvs }: { t: TarefaComStatus; onAbrirFvs?: (t: TarefaComStatus) => void }) {
  const cfg = STATUS_CONFIG[t.status_qualidade];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
          {t.critico && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />}
          <span className="text-teal-700 dark:text-teal-400">{t.servico.sigla_prancha}</span>
          {t.job && <span className="text-xs text-slate-400">{t.job}</span>}
        </div>
        <div className="text-xs text-slate-400">
          {t.instancias.length > 0 && (
            <span>{t.instancias.length} FVS(s)</span>
          )}
        </div>
      </div>
      <StatusBadge status={t.status_qualidade} />
      {onAbrirFvs && t.status_qualidade !== "bloqueada" && t.status_qualidade !== "conforme" && (
        <button
          onClick={() => onAbrirFvs(t)}
          className="shrink-0 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          Abrir FVS
        </button>
      )}
      {t.status_qualidade === "bloqueada" && (
        <span title="Serviço bloqueado — FVS anterior não aprovada"><Lock className="size-4 shrink-0 text-purple-400" /></span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View principal
// ---------------------------------------------------------------------------
interface Props {
  onAbrirFvs: (tarefaId: string, tarefaLabel: string) => void;
}

type ZonaMap = Map<string, Map<string, TarefaComStatus[]>>;

function agrupar(tarefas: TarefaComStatus[]): ZonaMap {
  const m = new Map<string, Map<string, TarefaComStatus[]>>();
  for (const t of tarefas) {
    const zona = t.local.zona;
    const pav = t.local.pavimento;
    if (!m.has(zona)) m.set(zona, new Map());
    const pm = m.get(zona)!;
    if (!pm.has(pav)) pm.set(pav, []);
    pm.get(pav)!.push(t);
  }
  return m;
}

export default function GestaoView({ onAbrirFvs }: Props) {
  const { data: obras } = useQuery<Obra[]>({ queryKey: ["obras"], queryFn: () => api("/obras") });
  const [obraId, setObraId] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<QualidadeStatus | "">("");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const { data: tarefas, isLoading: loadingTarefas } = useQuery<Tarefa[]>({
    queryKey: ["tarefas", obraId],
    queryFn: () => api(`/tarefas?obra_id=${obraId}`),
    enabled: !!obraId,
    staleTime: 5 * 60 * 1000, // 5 min — árvore de serviços muda pouco
  });

  // Carrega todas as instâncias FVS da obra (uma query, não N)
  const { data: instancias, isLoading: loadingInst } = useQuery<FormularioInstancia[]>({
    queryKey: ["fvs-instancias-obra", obraId],
    queryFn: () => api(`/formularios/instancias?escopo=fvs&entidade_tipo=tarefa`),
    enabled: !!obraId,
    staleTime: 60 * 1000,
    select: (todas) => todas.filter((i) => i.entidade_label?.startsWith(`obra:${obraId}`)),
  });

  // Monta mapa tarefa_id → instâncias
  const instPorTarefa = useMemo<Map<string, FormularioInstancia[]>>(() => {
    const m = new Map<string, FormularioInstancia[]>();
    for (const i of instancias ?? []) {
      if (!i.entidade_id) continue;
      if (!m.has(i.entidade_id)) m.set(i.entidade_id, []);
      m.get(i.entidade_id)!.push(i);
    }
    return m;
  }, [instancias]);

  // Enriquece tarefas com status de qualidade
  const tarefasComStatus = useMemo<TarefaComStatus[]>(() => {
    if (!tarefas) return [];
    return tarefas.map((t) => {
      const inst = instPorTarefa.get(t.id) ?? [];
      return { ...t, instancias: inst, status_qualidade: derivarStatus(t, inst, instPorTarefa) };
    });
  }, [tarefas, instPorTarefa]);

  // Filtros
  const tarefasFiltradas = useMemo(() => {
    return tarefasComStatus.filter((t) => {
      if (filtroServico && t.servico.sigla_prancha !== filtroServico) return false;
      if (filtroStatus && t.status_qualidade !== filtroStatus) return false;
      return true;
    });
  }, [tarefasComStatus, filtroServico, filtroStatus]);

  // Contadores
  const contadores = useMemo(() => {
    const c: Record<QualidadeStatus, number> = { a_abrir: 0, rascunho: 0, conforme: 0, pendencia_nc: 0, bloqueada: 0 };
    for (const t of tarefasComStatus) c[t.status_qualidade]++;
    return c;
  }, [tarefasComStatus]);

  // Serviços únicos para filtro
  const servicos = useMemo(() => {
    const s = new Set<string>();
    for (const t of tarefasComStatus) s.add(t.servico.sigla_prancha);
    return [...s].sort();
  }, [tarefasComStatus]);

  const grupos = useMemo(() => agrupar(tarefasFiltradas), [tarefasFiltradas]);

  const toggle = (key: string) =>
    setAbertos((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const isLoading = loadingTarefas || loadingInst;

  return (
    <div className="space-y-5">
      {/* Seletor de obra */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra</label>
        <select
          value={obraId}
          onChange={(e) => { setObraId(e.target.value); setAbertos(new Set()); setFiltroServico(""); setFiltroStatus(""); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecione a obra…</option>
          {obras?.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>

      {!obraId && (
        <p className="text-sm text-slate-400">Selecione uma obra para ver a gestão de FVS.</p>
      )}

      {obraId && isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      )}

      {obraId && !isLoading && tarefasComStatus.length > 0 && (
        <>
          {/* Contadores */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <ContadorCard label="A abrir"     count={contadores.a_abrir}     cor="border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400" />
            <ContadorCard label="Rascunho"    count={contadores.rascunho}    cor="border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300" />
            <ContadorCard label="Conformes"   count={contadores.conforme}    cor="border-green-200 text-green-700 dark:border-green-900 dark:text-green-300" />
            <ContadorCard label="NC aberta"   count={contadores.pendencia_nc} cor="border-red-200 text-red-700 dark:border-red-900 dark:text-red-300" />
            <ContadorCard label="Bloqueadas"  count={contadores.bloqueada}   cor="border-purple-200 text-purple-700 dark:border-purple-900 dark:text-purple-300" />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <BarChart3 className="size-4 text-slate-400" />
            <select
              value={filtroServico}
              onChange={(e) => setFiltroServico(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todos os serviços</option>
              {servicos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as QualidadeStatus | "")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todos os status</option>
              {(Object.keys(STATUS_CONFIG) as QualidadeStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            {(filtroServico || filtroStatus) && (
              <button
                onClick={() => { setFiltroServico(""); setFiltroStatus(""); }}
                className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-200"
              >
                Limpar filtros
              </button>
            )}
            <span className="ml-auto text-xs text-slate-400">{tarefasFiltradas.length} tarefa(s)</span>
          </div>

          {/* Árvore Zona → Pavimento → Tarefa */}
          {[...grupos.entries()].map(([zona, pavMap]) => {
            const zonaKey = `z:${zona}`;
            const zonaAberta = abertos.has(zonaKey);
            const totalZona = [...pavMap.values()].reduce((s, t) => s + t.length, 0);
            return (
              <div key={zona} className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <button
                  onClick={() => toggle(zonaKey)}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/50"
                >
                  {zonaAberta ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
                  {zona}
                  <span className="ml-auto text-xs font-normal text-slate-400">{totalZona} tarefa{totalZona !== 1 ? "s" : ""}</span>
                </button>

                {zonaAberta && (
                  <div className="space-y-2 px-4 pb-4">
                    {[...pavMap.entries()].map(([pav, ts]) => {
                      const pavKey = `p:${zona}:${pav}`;
                      const pavAberto = abertos.has(pavKey);
                      const ncCount = ts.filter((t) => t.status_qualidade === "pendencia_nc").length;
                      const aAbrirCount = ts.filter((t) => t.status_qualidade === "a_abrir").length;
                      return (
                        <div key={pav}>
                          <button
                            onClick={() => toggle(pavKey)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            {pavAberto ? <ChevronDown className="size-3.5 text-slate-400" /> : <ChevronRight className="size-3.5 text-slate-400" />}
                            {pav}
                            <div className="ml-auto flex items-center gap-2">
                              {ncCount > 0 && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">{ncCount} NC</span>}
                              {aAbrirCount > 0 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">{aAbrirCount} pendente</span>}
                              <span className="text-xs font-normal text-slate-400">{ts.length}</span>
                            </div>
                          </button>
                          {pavAberto && (
                            <div className="mt-1 ml-4 space-y-1.5">
                              {ts.map((t) => (
                                <TarefaRow
                                  key={t.id}
                                  t={t}
                                  onAbrirFvs={(tc) => {
                                    const label = `${tc.servico.sigla_prancha}${tc.job ? " – " + tc.job : ""} · ${tc.local.zona} / ${tc.local.pavimento}`;
                                    onAbrirFvs(tc.id, label);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {tarefasFiltradas.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma tarefa encontrada com os filtros atuais.</p>
          )}
        </>
      )}

      {obraId && !isLoading && tarefasComStatus.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <ClipboardList className="mx-auto mb-2 size-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400">Nenhuma tarefa encontrada.</p>
          <p className="mt-1 text-xs text-slate-400">Importe o cronograma Prevision primeiro (Core → Integrações).</p>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, AlertTriangle, ClipboardPlus, Loader2, Lock } from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import type { Obra, Tarefa } from "../lib/types.ts";

interface Props {
  onNovaFvs: (tarefaId: string, tarefaLabel: string) => void;
}

function fmtData(raw: string | null) {
  if (!raw) return "—";
  const d = new Date(raw);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function BarraAvanco({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn("h-1.5 rounded-full", pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

type ZonaMap = Map<string, Map<string, Tarefa[]>>;

function agrupar(tarefas: Tarefa[]): ZonaMap {
  const m = new Map<string, Map<string, Tarefa[]>>();
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

function TarefaRow({ t, onNovaFvs, motivoBloqueio }: { t: Tarefa; onNovaFvs: Props["onNovaFvs"]; motivoBloqueio?: string }) {
  const label = `${t.servico.sigla_prancha}${t.job ? " – " + t.job : ""} · ${t.local.zona} / ${t.local.pavimento}`;
  const bloqueada = !!motivoBloqueio;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
          {t.critico && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />}
          <span className="truncate">
            <span className="text-teal-700 dark:text-teal-400">{t.servico.sigla_prancha}</span>
            {t.job && <span className="text-slate-500"> · {t.job}</span>}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400">
          <span>Baseline: {fmtData(t.baseline_inicio)} → {fmtData(t.baseline_fim)}</span>
          {t.real_inicio && <span>Real: {fmtData(t.real_inicio)} → {fmtData(t.real_fim)}</span>}
          {t.duracao && <span>{t.duracao}d</span>}
        </div>
      </div>
      <BarraAvanco pct={t.avanco_pct} />
      {bloqueada ? (
        <span
          title={motivoBloqueio}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:bg-purple-950/40 dark:text-purple-300"
        >
          <Lock className="size-3.5" />
          Bloqueada
        </span>
      ) : (
        <button
          onClick={() => onNovaFvs(t.id, label)}
          title="Nova FVS para esta tarefa"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          <ClipboardPlus className="size-3.5" />
          FVS
        </button>
      )}
    </div>
  );
}

export default function CronogramaView({ onNovaFvs }: Props) {
  const { data: obras } = useQuery<Obra[]>({ queryKey: ["obras"], queryFn: () => api("/obras") });
  const [obraId, setObraId] = useState<string>("");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const { data: tarefas, isLoading, error } = useQuery<Tarefa[]>({
    queryKey: ["tarefas", obraId],
    queryFn: () => api(`/tarefas?obra_id=${obraId}`),
    enabled: !!obraId,
  });

  // Gate em lote: tarefas bloqueadas por predecessora sem FVS aprovada (mesma fonte da Gestão).
  const { data: bloqueios } = useQuery<Record<string, string>>({
    queryKey: ["fvs-gate-lote", obraId],
    queryFn: () => api(`/formularios/gate/lote?obra_id=${obraId}`),
    enabled: !!obraId,
    staleTime: 60 * 1000,
  });

  const grupos: ZonaMap = useMemo(() => (tarefas ? agrupar(tarefas) : new Map()), [tarefas]);

  const toggle = (key: string) =>
    setAbertos((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra</label>
        <select
          value={obraId}
          onChange={(e) => { setObraId(e.target.value); setAbertos(new Set()); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecione a obra…</option>
          {obras?.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
        {tarefas && (
          <span className="text-xs text-slate-400">{tarefas.length} tarefa{tarefas.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {!obraId && (
        <p className="text-sm text-slate-400">Selecione uma obra para ver o cronograma.</p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Carregando tarefas…
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          Erro: {(error as Error).message}
        </p>
      )}

      {tarefas && tarefas.length === 0 && (
        <p className="text-sm text-slate-400">Nenhuma tarefa encontrada. Importe o CSV do Prevision primeiro.</p>
      )}

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
                {[...pavMap.entries()].map(([pav, tarefasLocal]) => {
                  const pavKey = `p:${zona}:${pav}`;
                  const pavAberto = abertos.has(pavKey);
                  return (
                    <div key={pav}>
                      <button
                        onClick={() => toggle(pavKey)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {pavAberto ? <ChevronDown className="size-3.5 text-slate-400" /> : <ChevronRight className="size-3.5 text-slate-400" />}
                        {pav}
                        <span className="ml-auto text-xs font-normal text-slate-400">{tarefasLocal.length}</span>
                      </button>
                      {pavAberto && (
                        <div className="mt-1 ml-4 space-y-1.5">
                          {tarefasLocal.map((t) => (
                            <TarefaRow key={t.id} t={t} onNovaFvs={onNovaFvs} motivoBloqueio={bloqueios?.[t.id]} />
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
    </div>
  );
}

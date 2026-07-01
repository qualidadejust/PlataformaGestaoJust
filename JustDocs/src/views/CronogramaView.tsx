import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

interface Obra { id: string; nome: string; }
interface Local { id: string; zona: string; pavimento: string; nome: string | null; }
interface Servico { id: string; sigla_prancha: string; nome: string; }
interface Tarefa {
  id: string;
  local: Local;
  servico: Servico;
  job: string | null;
  baseline_inicio: string | null;
  baseline_fim: string | null;
  duracao: number | null;
  critico: boolean;
  avanco_pct: number;
}

function fmtData(raw: string | null) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
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
      <span className="text-xs text-slate-400">{pct}%</span>
    </div>
  );
}

export default function CronogramaView() {
  const { data: obras } = useQuery<Obra[]>({ queryKey: ["obras"], queryFn: () => api("/obras") });
  const [obraId, setObraId] = useState("");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const { data: tarefas, isLoading, error } = useQuery<Tarefa[]>({
    queryKey: ["tarefas", obraId],
    queryFn: () => api(`/tarefas?obra_id=${obraId}`),
    enabled: !!obraId,
  });

  // Agrupa: zona → pavimento → tarefas
  const grupos = useMemo(() => {
    if (!tarefas) return new Map<string, Map<string, Tarefa[]>>();
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
  }, [tarefas]);

  const toggle = (key: string) =>
    setAbertos((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra</label>
        <select
          value={obraId}
          onChange={(e) => { setObraId(e.target.value); setAbertos(new Set()); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecione a obra…</option>
          {obras?.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        {tarefas && <span className="text-xs text-slate-400">{tarefas.length} tarefas · sincronizadas do Prevision</span>}
      </div>

      {!obraId && <p className="text-sm text-slate-400">Selecione uma obra para ver o cronograma do Prevision.</p>}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950">{(error as Error).message}</p>
      )}

      {tarefas?.length === 0 && (
        <p className="text-sm text-slate-400">Nenhuma tarefa. Importe o CSV do Prevision via JustFVS ou pela API do Core.</p>
      )}

      {[...grupos.entries()].map(([zona, pavMap]) => {
        const zonaKey = `z:${zona}`;
        const total = [...pavMap.values()].reduce((s, t) => s + t.length, 0);
        return (
          <div key={zona} className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <button
              onClick={() => toggle(zonaKey)}
              className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/50"
            >
              {abertos.has(zonaKey) ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
              {zona}
              <span className="ml-auto text-xs font-normal text-slate-400">{total} tarefas</span>
            </button>
            {abertos.has(zonaKey) && (
              <div className="space-y-2 px-4 pb-4">
                {[...pavMap.entries()].map(([pav, ts]) => {
                  const pk = `p:${zona}:${pav}`;
                  return (
                    <div key={pav}>
                      <button
                        onClick={() => toggle(pk)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {abertos.has(pk) ? <ChevronDown className="size-3.5 text-slate-400" /> : <ChevronRight className="size-3.5 text-slate-400" />}
                        {pav}
                        <span className="ml-auto text-xs font-normal text-slate-400">{ts.length}</span>
                      </button>
                      {abertos.has(pk) && (
                        <div className="mt-1 ml-4 space-y-1.5">
                          {ts.map((t) => (
                            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  {t.critico && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />}
                                  <span className="font-medium text-teal-700 dark:text-teal-400">{t.servico.sigla_prancha}</span>
                                  {t.job && <span className="text-slate-500">· {t.job}</span>}
                                </div>
                                <p className="text-xs text-slate-400">
                                  {fmtData(t.baseline_inicio)} → {fmtData(t.baseline_fim)}
                                  {t.duracao ? ` · ${t.duracao}d` : ""}
                                </p>
                              </div>
                              <BarraAvanco pct={t.avanco_pct} />
                            </div>
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

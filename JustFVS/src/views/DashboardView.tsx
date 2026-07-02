import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, CheckCircle2, ListChecks, XCircle, Lock, LayoutDashboard, ClipboardPlus,
} from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { STATUS, derivarStatus, type QualidadeStatus } from "../lib/qualidade.ts";
import type { Obra, Tarefa, FormularioInstancia, FormularioModelo, NaoConformidade } from "../lib/types.ts";

interface Props {
  onAbrirFvs: (tarefaId: string, tarefaLabel: string) => void;
}

export default function DashboardView({ onAbrirFvs }: Props) {
  const { data: obras } = useQuery<Obra[]>({ queryKey: ["obras"], queryFn: () => api("/obras") });
  const [obraId, setObraId] = useState("");

  const { data: tarefas, isLoading } = useQuery<Tarefa[]>({
    queryKey: ["tarefas", obraId],
    queryFn: () => api(`/tarefas?obra_id=${obraId}`),
    enabled: !!obraId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: instancias } = useQuery<FormularioInstancia[]>({
    queryKey: ["fvs-instancias-obra", obraId],
    queryFn: () => api(`/formularios/instancias?escopo=fvs&entidade_tipo=tarefa`),
    enabled: !!obraId,
    staleTime: 60 * 1000,
    select: (todas) => todas.filter((i) => i.entidade_label?.startsWith(`obra:${obraId}`)),
  });

  const { data: bloqueios } = useQuery<Record<string, string>>({
    queryKey: ["fvs-gate-lote", obraId],
    queryFn: () => api(`/formularios/gate/lote?obra_id=${obraId}`),
    enabled: !!obraId,
    staleTime: 60 * 1000,
  });

  const { data: ncs } = useQuery<NaoConformidade[]>({
    queryKey: ["fvs-ncs-obra", obraId],
    queryFn: () => api(`/nao-conformidades?obra_id=${obraId}`),
    enabled: !!obraId,
    staleTime: 60 * 1000,
  });

  const { data: modelos } = useQuery<FormularioModelo[]>({
    queryKey: ["fvs-modelos-publicados"],
    queryFn: () => api(`/formularios?escopo=fvs&publicado=true`),
    staleTime: 5 * 60 * 1000,
  });
  const siglasComModelo = useMemo(
    () => new Set((modelos ?? []).map((m) => m.servico_sigla).filter(Boolean) as string[]),
    [modelos],
  );

  const instPorTarefa = useMemo(() => {
    const m = new Map<string, FormularioInstancia[]>();
    for (const i of instancias ?? []) {
      if (!i.entidade_id) continue;
      if (!m.has(i.entidade_id)) m.set(i.entidade_id, []);
      m.get(i.entidade_id)!.push(i);
    }
    return m;
  }, [instancias]);

  const tarefasComStatus = useMemo(() => {
    return (tarefas ?? []).map((t) => {
      const inst = instPorTarefa.get(t.id) ?? [];
      const bloqueada = !!bloqueios?.[t.id];
      const temModelo = siglasComModelo.has(t.servico?.sigla_prancha ?? "");
      return { tarefa: t, status: derivarStatus(inst, bloqueada, temModelo) };
    });
  }, [tarefas, instPorTarefa, bloqueios, siglasComModelo]);

  const contagem = useMemo(() => {
    const c: Record<QualidadeStatus, number> = { a_abrir: 0, rascunho: 0, conforme: 0, pendencia_nc: 0, bloqueada: 0, sem_modelo: 0 };
    for (const t of tarefasComStatus) c[t.status]++;
    return c;
  }, [tarefasComStatus]);

  const total = tarefasComStatus.length;
  const comFvs = contagem.conforme + contagem.rascunho + contagem.pendencia_nc;
  const pctConformidade = comFvs ? Math.round((contagem.conforme / comFvs) * 100) : 0;
  const ncsAbertas = (ncs ?? []).filter((n) => n.status !== "fechada");

  // NC por serviço (via instancia → tarefa → sigla)
  const ncPorServico = useMemo(() => {
    const instToSigla = new Map<string, string>();
    for (const i of instancias ?? []) {
      if (!i.entidade_id) continue;
      const t = (tarefas ?? []).find((x) => x.id === i.entidade_id);
      if (t?.servico?.sigla_prancha) instToSigla.set(i.id, t.servico.sigla_prancha);
    }
    const cont = new Map<string, number>();
    for (const n of ncsAbertas) {
      const sigla = instToSigla.get(n.instancia_id);
      if (!sigla) continue;
      cont.set(sigla, (cont.get(sigla) ?? 0) + 1);
    }
    return [...cont.entries()].map(([sigla, qtd]) => ({ sigla, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 6);
  }, [instancias, tarefas, ncsAbertas]);

  // Prontos para inspeção (a_abrir e não bloqueada)
  const prontos = tarefasComStatus.filter((t) => t.status === "a_abrir").slice(0, 8);

  const donut = useMemo(() => {
    const ordem: QualidadeStatus[] = ["conforme", "pendencia_nc", "rascunho", "a_abrir", "bloqueada", "sem_modelo"];
    return ordem.map((s) => ({ status: s, valor: contagem[s] })).filter((d) => d.valor > 0);
  }, [contagem]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra</label>
        <select
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecione a obra…</option>
          {obras?.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>

      {!obraId && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <LayoutDashboard className="mx-auto mb-2 size-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400">Selecione uma obra para ver os indicadores de qualidade.</p>
        </div>
      )}

      {obraId && isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Carregando indicadores…
        </div>
      )}

      {obraId && !isLoading && total > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard title="Conformidade 1ª verif." valor={`${pctConformidade}%`} Icon={CheckCircle2} cor="text-teal-500" fundo="bg-teal-50 dark:bg-teal-950/40" />
            <KpiCard title="Aguardando inspeção" valor={contagem.a_abrir} Icon={ListChecks} cor="text-amber-500" fundo="bg-amber-50 dark:bg-amber-950/40" />
            <KpiCard title="NCs abertas" valor={ncsAbertas.length} Icon={XCircle} cor="text-red-500" fundo="bg-red-50 dark:bg-red-950/40" />
            <KpiCard title="Serviços bloqueados" valor={contagem.bloqueada} Icon={Lock} cor="text-purple-500" fundo="bg-purple-50 dark:bg-purple-950/40" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Donut de status */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status das inspeções (FVS)</h3>
              <div className="flex items-center gap-6">
                <Donut dados={donut} total={total} />
                <div className="space-y-1.5">
                  {donut.map((d) => (
                    <div key={d.status} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="inline-block size-3 rounded-full" style={{ backgroundColor: STATUS[d.status].hex }} />
                      {STATUS[d.status].label}
                      <span className="font-semibold">{d.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* NC por serviço */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">NCs abertas por serviço</h3>
              {ncPorServico.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Nenhuma NC aberta. 🎉</p>
              ) : (
                <div className="space-y-2">
                  {ncPorServico.map((n) => {
                    const max = ncPorServico[0].qtd;
                    return (
                      <div key={n.sigla} className="flex items-center gap-3 text-xs">
                        <span className="w-16 shrink-0 truncate font-medium text-teal-700 dark:text-teal-400">{n.sigla}</span>
                        <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                          <div className="h-4 rounded bg-red-400" style={{ width: `${(n.qtd / max) * 100}%` }} />
                        </div>
                        <span className="w-6 shrink-0 text-right font-semibold text-slate-600 dark:text-slate-300">{n.qtd}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Prontos para inspeção */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Prontos para inspeção (aguardando FVS)</h3>
            {prontos.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nenhum serviço aguardando inspeção.</p>
            ) : (
              <div className="space-y-2">
                {prontos.map(({ tarefa: t }) => {
                  const label = `${t.servico.sigla_prancha}${t.job ? " – " + t.job : ""} · ${t.local.zona} / ${t.local.pavimento}`;
                  return (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/20">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          <span className="text-teal-700 dark:text-teal-400">{t.servico.sigla_prancha}</span>
                          {t.job && <span className="text-slate-500"> · {t.job}</span>}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">{t.local.zona} • {t.local.pavimento}</p>
                      </div>
                      <button
                        onClick={() => onAbrirFvs(t.id, label)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                      >
                        <ClipboardPlus className="size-3.5" /> Abrir FVS
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {obraId && !isLoading && total === 0 && (
        <p className="text-sm text-slate-400">Nenhuma tarefa encontrada para esta obra. Importe o cronograma Prevision primeiro.</p>
      )}
    </div>
  );
}

function KpiCard({ title, valor, Icon, cor, fundo }: { title: string; valor: string | number; Icon: React.ComponentType<{ className?: string }>; cor: string; fundo: string }) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{valor}</p>
      </div>
      <div className={cn("rounded-lg p-2", fundo)}>
        <Icon className={cn("size-5", cor)} />
      </div>
    </div>
  );
}

// Donut em SVG puro (sem dependência) — segmentos proporcionais.
function Donut({ dados, total }: { dados: { status: QualidadeStatus; valor: number }[]; total: number }) {
  const raio = 42;
  const circ = 2 * Math.PI * raio;
  let offset = 0;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0 -rotate-90">
      <circle cx="60" cy="60" r={raio} fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-100 dark:text-slate-800" />
      {dados.map((d) => {
        const frac = d.valor / total;
        const dash = frac * circ;
        const seg = (
          <circle
            key={d.status}
            cx="60" cy="60" r={raio}
            fill="none"
            stroke={STATUS[d.status].hex}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return seg;
      })}
    </svg>
  );
}

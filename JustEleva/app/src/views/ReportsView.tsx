import { useState } from "react";
import { TrendingUp, CheckCircle2, ClipboardList, Building2 } from "lucide-react";
import { useEvaluations } from "../hooks/useEvaluations";
import { usePdiPlans } from "../hooks/usePdi";
import { useCycles } from "../hooks/useCycles";
import { useObras } from "../hooks/useObras";

export function ReportsView() {
  const { data: cycles = [] } = useCycles();
  const { data: obras = [] } = useObras();
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedObraId, setSelectedObraId] = useState('');

  const activeCycle = cycles.find(c => c.status === 'active') ?? cycles[0];
  const cycleId = selectedCycleId || activeCycle?.id || '';

  const { data: allEvaluations = [], isLoading: loadingEvals } = useEvaluations(
    cycleId ? { cycle_id: cycleId } : undefined
  );
  // KPIs e "por colaborador" respeitam o filtro de obra; o painel "por obra" usa o ciclo inteiro
  const evaluations = selectedObraId ? allEvaluations.filter(e => e.obra_id === selectedObraId) : allEvaluations;

  const { data: allPdiPlans = [] } = usePdiPlans();
  const pdiPlans = cycleId ? allPdiPlans.filter(p => p.cycle_id === cycleId) : allPdiPlans;

  const completed = evaluations.filter(e => ['submitted', 'completed'].includes(e.status));
  const conclusionRate = evaluations.length > 0 ? Math.round((completed.length / evaluations.length) * 100) : 0;

  // Agregado por obra (ciclo inteiro): progresso e nota média
  type ObraStat = { nome: string; total: number; completed: number; scoreSum: number; scoreN: number };
  const byObra: Record<string, ObraStat> = {};
  allEvaluations.forEach(ev => {
    if (!ev.obra_id) return;
    const key = ev.obra_id;
    if (!byObra[key]) byObra[key] = { nome: ev.obra_nome ?? 'Obra', total: 0, completed: 0, scoreSum: 0, scoreN: 0 };
    byObra[key].total++;
    if (['submitted', 'completed'].includes(ev.status)) byObra[key].completed++;
    if (ev.avg_score != null) { byObra[key].scoreSum += ev.avg_score; byObra[key].scoreN++; }
  });
  const obraData = Object.values(byObra).sort((a, b) => b.total - a.total);

  const allActions = pdiPlans.flatMap(p => p.actions);
  const actionsDone = allActions.filter(a => a.status === 'completed').length;
  const actionsProgress = allActions.filter(a => a.status === 'in_progress').length;
  const actionsPending = allActions.filter(a => a.status === 'pending').length;
  const totalActions = allActions.length;
  const pdiRate = totalActions > 0 ? Math.round((actionsDone / totalActions) * 100) : 0;

  type EmpData = { name: string; role: string; completed: number; total: number };
  const byEmployee: Record<string, EmpData> = {};
  evaluations.forEach(ev => {
    if (!byEmployee[ev.employee_id]) {
      byEmployee[ev.employee_id] = { name: ev.employee_name, role: ev.employee_role, completed: 0, total: 0 };
    }
    byEmployee[ev.employee_id].total++;
    if (['submitted', 'completed'].includes(ev.status)) byEmployee[ev.employee_id].completed++;
  });
  const employeeData = Object.values(byEmployee).sort((a, b) => b.total - a.total);

  const doneArc = totalActions > 0 ? (actionsDone / totalActions) * 100 : 0;
  const progressArc = totalActions > 0 ? (actionsProgress / totalActions) * 100 : 0;

  const selectedCycleName = cycles.find(c => c.id === cycleId)?.name ?? '';

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Relatórios e Indicadores</h1>
          <p className="text-sm text-slate-500 mt-1">Visão analítica dos resultados do ciclo de avaliação.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedObraId}
            onChange={e => setSelectedObraId(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm cursor-pointer"
          >
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <select
            value={cycleId}
            onChange={e => setSelectedCycleId(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm cursor-pointer"
          >
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Avaliações no Ciclo</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{evaluations.length}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{completed.length} concluídas · {evaluations.length - completed.length} pendentes</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Taxa de Conclusão</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{conclusionRate}%</h3>
            <p className="text-xs text-slate-400 mt-0.5">{completed.length} de {evaluations.length} avaliações</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ações PDI Concluídas</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{pdiRate}%</h3>
            <p className="text-xs text-slate-400 mt-0.5">{actionsDone} de {totalActions} ações</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-700" /> Desempenho por Obra
        </h2>
        <p className="text-sm text-slate-400 mb-6">{selectedCycleName} · progresso e nota média por obra</p>
        {obraData.length === 0 ? (
          <div className="py-10 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">Nenhuma avaliação vinculada a obra neste ciclo.</p>
            <p className="text-xs text-slate-400 mt-1">Gere as avaliações pela matriz em Gestão de Ciclos.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {obraData.map(o => {
              const pct = o.total > 0 ? Math.round((o.completed / o.total) * 100) : 0;
              const media = o.scoreN > 0 ? (o.scoreSum / o.scoreN) : null;
              return (
                <div key={o.nome} className="group">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-slate-700">{o.nome}</span>
                    <div className="flex items-center gap-3">
                      {media != null && (
                        <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                          média {media.toFixed(1)}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-500">{o.completed}/{o.total} ({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Avaliações por Colaborador</h2>
          <p className="text-sm text-slate-400 mb-8">{selectedCycleName}</p>

          {loadingEvals ? (
            <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
          ) : employeeData.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">Nenhuma avaliação neste ciclo.</p>
              <p className="text-xs text-slate-400 mt-1">Crie avaliações em Avaliações para ver os dados aqui.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {employeeData.map(emp => (
                <div key={emp.name} className="group">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div>
                      <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{emp.name}</span>
                      <span className="text-slate-400 ml-2 text-xs">{emp.role}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{emp.completed}/{emp.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: emp.total > 0 ? `${(emp.completed / emp.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Distribuição de Ações PDI</h2>
            <p className="text-sm text-slate-400">Todos os ciclos · {totalActions} ações cadastradas</p>
          </div>

          <div className="flex-1 flex items-center justify-center py-4">
            {totalActions === 0 ? (
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">Nenhuma ação de PDI cadastrada.</p>
              </div>
            ) : (
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#f1f5f9" strokeWidth="4"
                  />
                  {doneArc > 0 && (
                    <path
                      strokeDasharray={`${doneArc} ${100 - doneArc}`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#10b981" strokeWidth="4"
                    />
                  )}
                  {progressArc > 0 && (
                    <path
                      strokeDasharray={`${progressArc} ${100 - progressArc}`}
                      strokeDashoffset={`-${doneArc}`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#325286" strokeWidth="4"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-900">{pdiRate}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Concluído</span>
                </div>
              </div>
            )}
          </div>

          {totalActions > 0 && (
            <div className="flex flex-col gap-2 mt-4 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                  <span className="text-slate-600 font-medium">Concluído</span>
                </div>
                <span className="font-bold text-slate-700">{actionsDone} <span className="font-normal text-slate-400">({Math.round(doneArc)}%)</span></span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-brand-500 ring-2 ring-brand-100" />
                  <span className="text-slate-600 font-medium">Em Andamento</span>
                </div>
                <span className="font-bold text-slate-700">{actionsProgress} <span className="font-normal text-slate-400">({Math.round(progressArc)}%)</span></span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-300 ring-2 ring-slate-100" />
                  <span className="text-slate-600 font-medium">Planejado</span>
                </div>
                <span className="font-bold text-slate-700">{actionsPending} <span className="font-normal text-slate-400">({totalActions > 0 ? Math.round((actionsPending / totalActions) * 100) : 0}%)</span></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

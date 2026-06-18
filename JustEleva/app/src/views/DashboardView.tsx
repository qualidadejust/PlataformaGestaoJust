import { useState } from "react";
import { Users, CheckCircle2, Clock, AlertCircle, ArrowRight, TrendingUp, MessageSquare, Target, Award, Filter } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import type { EvaluationItem } from "../types";
import { useEmployees } from "../hooks/useEmployees";
import { useEvaluations } from "../hooks/useEvaluations";
import { useFeedbacks } from "../hooks/useFeedback";
import { usePdiPlans } from "../hooks/usePdi";
import { useCycles } from "../hooks/useCycles";
import { cn } from "../lib/utils";

export function DashboardView({ onNavigate }: { onNavigate: (view: string, id?: string) => void }) {
  const [metricFilter, setMetricFilter] = useState<'departamento' | 'individual' | 'lideranca'>('departamento');

  const { data: employees = [] } = useEmployees();
  const { data: feedbacks = [] } = useFeedbacks();
  const { data: pdiPlans = [] } = usePdiPlans();
  const { data: cycles = [] } = useCycles();

  const activeCycle = cycles.find(c => c.status === 'active');

  const { data: evaluations = [] } = useEvaluations(
    activeCycle ? { cycle_id: activeCycle.id } : undefined
  );

  const totalEvals = evaluations.length;
  const completedEvals = evaluations.filter(e => e.status === 'submitted').length;
  const draftEvals = evaluations.filter(e => e.status === 'draft').length;
  const pendingCount = evaluations.filter(e => e.status === 'pending').length;
  const completedPct = totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0;
  const openPdiActions = pdiPlans.flatMap(p => p.actions).filter(a => a.status !== 'completed').length;

  const submittedWithScore = evaluations.filter(e => e.status === 'submitted' && e.avg_score != null);
  const avgScore = submittedWithScore.length > 0
    ? Math.round(submittedWithScore.reduce((sum, e) => sum + (e.avg_score ?? 0), 0) / submittedWithScore.length * 10) / 10
    : null;

  const pendingEvals: EvaluationItem[] = evaluations.filter(e => e.status === 'pending').map(e => ({
    id: e.id,
    employeeId: e.employee_id,
    employeeName: e.employee_name,
    employeeRole: e.employee_role,
    status: e.status as any,
    dueDate: e.due_date ?? '-',
  }));

  const inProgressEvals: EvaluationItem[] = evaluations.filter(e => e.status === 'draft').map(e => ({
    id: e.id,
    employeeId: e.employee_id,
    employeeName: e.employee_name,
    employeeRole: e.employee_role,
    status: e.status as any,
    dueDate: e.due_date ?? '-',
  }));

  // Termômetro departamental calculado dos PDIs reais
  const deptMap: Record<string, { total: number; completed: number }> = {};
  pdiPlans.forEach(p => {
    const dept = (p as any).employee_department ?? p.employee_role ?? 'Outros';
    if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0 };
    p.actions.forEach(a => {
      deptMap[dept].total++;
      if (a.status === 'completed') deptMap[dept].completed++;
    });
  });
  const heatMapData = Object.entries(deptMap).slice(0, 5).map(([dept, v]) => ({
    dept,
    sentiment: 0,
    pdiComplete: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
  }));
  const hasHeatMap = heatMapData.length > 0;

  // Tendência: últimos 6 meses de avaliações submetidas (placeholder — precisa de endpoint agregado)
  const trendData: { month: string; performance: number; potential: number }[] = [];

  const getHeatmapColor = (value: number) => {
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 60) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Visão Geral</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Bem-vindo(a) ao ciclo de avaliação {activeCycle?.name ?? 'ciclo de avaliação'}.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <button 
            onClick={() => setMetricFilter('departamento')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", metricFilter === 'departamento' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700")}
          >
            Departamento
          </button>
          <button 
            onClick={() => setMetricFilter('individual')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", metricFilter === 'individual' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700")}
          >
            Contribuidor Individual
          </button>
          <button 
            onClick={() => setMetricFilter('lideranca')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", metricFilter === 'lideranca' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700")}
          >
            Liderança
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition-colors"
          onClick={() => onNavigate('team')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 line-clamp-1">Minha Equipe</p>
              <h3 className="text-2xl font-bold text-slate-900">{employees.length}</h3>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center cursor-pointer hover:border-emerald-300 transition-colors"
          onClick={() => onNavigate('evaluations')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1 w-full">
              <p className="text-sm font-medium text-slate-500 line-clamp-1">Concluídas</p>
              <div className="flex items-end justify-between gap-2 mt-1">
                 <h3 className="text-2xl font-bold text-slate-900 leading-none">{completedEvals} <span className="text-sm font-normal text-slate-400">/ {totalEvals}</span></h3>
                 <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{completedPct}%</span>
              </div>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completedPct}%` }}></div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
          onClick={() => onNavigate('evaluations')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 line-clamp-1">Em Rascunho</p>
              <h3 className="text-2xl font-bold text-slate-900">{draftEvals}</h3>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-300 transition-colors"
          onClick={() => onNavigate('evaluations')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 line-clamp-1">Pendentes</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* New Line of KPIs */}
        <div
          className="bg-brand-900 border border-brand-900 p-6 rounded-2xl shadow-sm cursor-pointer hover:bg-brand-800 transition-colors"
          onClick={() => onNavigate('calibration')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-200 line-clamp-1">Score Médio</p>
              <h3 className="text-2xl font-bold text-white">
                {avgScore !== null ? avgScore.toFixed(1) : '—'}
              </h3>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition-colors"
          onClick={() => onNavigate('calibration')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 line-clamp-1">Altos Talentos</p>
              <div className="flex items-end justify-between gap-4 mt-1">
                 <h3 className="text-2xl font-bold text-slate-900 leading-none">—</h3>
                 <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded leading-tight text-center">Pós<br/>Calibração</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition-colors" onClick={() => onNavigate('feedback')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
               <p className="text-sm font-medium text-slate-500 line-clamp-1">Feedbacks 5Cs</p>
               <h3 className="text-2xl font-bold text-slate-900">{feedbacks.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-300 transition-colors" onClick={() => onNavigate('pdi')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
               <p className="text-sm font-medium text-slate-500 line-clamp-1">Ações PDI Abertas</p>
               <h3 className="text-2xl font-bold text-slate-900">{openPdiActions}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts & Heatmap Area */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-700" />
            Tendência de Desempenho (6 meses)
          </h2>
          <div className="flex-1 min-h-[250px]">
            {trendData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <TrendingUp className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Disponível após calibração de avaliações</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 10]} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                    labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Line type="monotone" name="Desempenho" dataKey="performance" stroke="#0e2148" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Potencial" dataKey="potential" stroke="#6388bb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-700" />
            Termômetro Departamental
          </h2>
          
          <div className="grid grid-cols-3 gap-4 mb-4 px-2 border-b border-slate-100 pb-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Sentimento de Equipe</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Conclusão de PDI</div>
          </div>
          
          <div className="flex-1 flex flex-col justify-between gap-3">
            {!hasHeatMap ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-8">
                <Target className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Disponível após criação de PDIs</p>
              </div>
            ) : heatMapData.map(item => (
              <div key={item.dept} className="grid grid-cols-3 items-center gap-4 px-2 hover:bg-slate-50 py-1.5 rounded-lg transition-colors">
                <span className="text-sm font-semibold text-slate-700 truncate">{item.dept}</span>
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="w-12 h-6 rounded-md bg-slate-200"></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-500 drop-shadow-md">—</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className={cn("w-12 h-6 rounded-md", getHeatmapColor(item.pdiComplete))}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 drop-shadow-md">
                      {item.pdiComplete}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-medium text-slate-600">Saudável (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <span className="text-xs font-medium text-slate-600">Atenção (60-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-xs font-medium text-slate-600">Crítico (&lt;60%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Avaliações Pendentes */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Requerem Atenção</h2>
            {activeCycle?.end_date && (
              <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
                Prazo: {new Date(activeCycle.end_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <div className="p-0 flex-1">
            <ul className="divide-y divide-slate-100">
              {pendingEvals.map(ev => (
                 <li key={ev.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                       {ev.employeeName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                     </div>
                     <div>
                       <p className="text-sm font-medium text-slate-900">{ev.employeeName}</p>
                       <p className="text-xs text-slate-500">{ev.employeeRole}</p>
                     </div>
                   </div>
                   <button 
                    onClick={() => onNavigate('evaluation_form', ev.id)}
                    className="flex items-center gap-2 text-sm font-medium text-white bg-brand-900 hover:bg-brand-800 px-4 py-2 rounded-lg transition-colors">
                     Avaliar <ArrowRight className="w-4 h-4" />
                   </button>
                 </li>
              ))}
              {inProgressEvals.map(ev => (
                 <li key={ev.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                       {ev.employeeName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         <p className="text-sm font-medium text-slate-900">{ev.employeeName}</p>
                         <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Rascunho</span>
                       </div>
                       <p className="text-xs text-slate-500">{ev.employeeRole}</p>
                     </div>
                   </div>
                   <button 
                    onClick={() => onNavigate('evaluation_form', ev.id)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors">
                     Continuar <ArrowRight className="w-4 h-4" />
                   </button>
                 </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Info Card Cultura Just */}
        <div className="bg-brand-900 border border-brand-800 rounded-2xl shadow-sm p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-400/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-semibold mb-4">Cultura de Feedback Contínuo</h2>
            <p className="text-brand-200 text-sm leading-relaxed mb-6">
              Lembre-se: O objetivo do ciclo de avaliação é o desenvolvimento do colaborador. Avalie com base em fatos e dados, não apenas em impressões recentes.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-brand-200">
                <CheckCircle2 className="w-5 h-5 text-brand-300 shrink-0" />
                <span>Seja objetivo e claro em seus comentários.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-brand-200">
                <CheckCircle2 className="w-5 h-5 text-brand-300 shrink-0" />
                <span>Utilize a opção "NS" apenas para colaboradores com menos de 6 meses na posição.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-brand-200">
                <CheckCircle2 className="w-5 h-5 text-brand-300 shrink-0" />
                <span>Prepare-se para a reunião de Devolutiva de forma construtiva.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

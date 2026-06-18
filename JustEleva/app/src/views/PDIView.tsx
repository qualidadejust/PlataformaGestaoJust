import { useState } from "react";
import { Target, Plus, Calendar, ChevronRight, LayoutGrid, List, ArrowRight, ArrowLeft, X, AlertTriangle } from "lucide-react";
import { usePdiPlans, useUpdatePdiAction, useCreatePdiPlan } from "../hooks/usePdi";
import type { PdiPlan, PdiAction } from "../hooks/usePdi";
import { useEmployees } from "../hooks/useEmployees";
import { useCycles } from "../hooks/useCycles";
import { cn } from "../lib/utils";

function NovoPdiModal({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const { data: employees = [] } = useEmployees();
  const { data: cycles = [] } = useCycles();
  const create = useCreatePdiPlan();
  const [form, setForm] = useState({ employee_id: '', cycle_id: '' });
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.cycle_id) {
      setError('Colaborador e ciclo são obrigatórios.');
      return;
    }
    try {
      const result = await create.mutateAsync({ employee_id: form.employee_id, cycle_id: form.cycle_id });
      if (onCreated) onCreated(result.id);
      else onClose();
    } catch {
      setError('Erro ao criar PDI. Tente novamente.');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Novo PDI</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Colaborador *</label>
            <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Selecione...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ciclo *</label>
            <select value={form.cycle_id} onChange={e => set('cycle_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Selecione...</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {create.isPending ? 'Criando...' : 'Criar e Abrir PDI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmtDeadline(d: string) {
  if (!d) return '—';
  if (d.includes('/')) return d;
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

const STATUS_DOT: Record<string, string> = { pending: 'bg-slate-300', in_progress: 'bg-brand-500', completed: 'bg-emerald-500' };

function parseDeadline(d: string): Date | null {
  if (!d) return null;
  if (d.includes('/')) { const [dd, mm, yy] = d.split('/'); const dt = new Date(`${yy}-${mm}-${dd}T23:59:59`); return isNaN(dt.getTime()) ? null : dt; }
  const dt = new Date(d + 'T23:59:59'); return isNaN(dt.getTime()) ? null : dt;
}
function isOverdue(a: PdiAction): boolean {
  if (a.status === 'completed') return false;
  const dt = parseDeadline(a.deadline);
  return !!dt && dt.getTime() < Date.now();
}

export function PDIView({ onNavigate }: { onNavigate?: (view: string, id?: string) => void }) {
  const [activeView, setActiveView] = useState<'list' | 'board'>('list');
  const [showModal, setShowModal] = useState(false);

  const { data: pdis = [], isLoading } = usePdiPlans();
  const updateAction = useUpdatePdiAction();

  // Compute all actions for Kanban
  type BoardAction = PdiAction & { pdiId: string; pdiPlan: PdiPlan; employeeName: string };
  const allActions: BoardAction[] = pdis.flatMap(pdi =>
    pdi.actions.map(a => ({ ...a, pdiId: pdi.id, pdiPlan: pdi, employeeName: pdi.employee_name }))
  );

  const columns = [
    { id: 'pending', title: 'Planejado' },
    { id: 'in_progress', title: 'Em Andamento' },
    { id: 'completed', title: 'Concluído' }
  ] as const;

  const moveAction = (actionId: string, plan: PdiPlan, newStatus: PdiAction['status']) => {
    const action = plan.actions.find(a => a.id === actionId);
    if (!action) return;
    updateAction.mutate({ planId: plan.id, actionId, ...action, status: newStatus });
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {showModal && <NovoPdiModal onClose={() => setShowModal(false)} onCreated={(id) => { setShowModal(false); onNavigate && onNavigate('pdi_detail', id); }} />}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Plano de Desenvolvimento</h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe e defina ações de desenvolvimento (PDI) para a sua equipe.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo PDI
        </button>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveView('list')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", activeView === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900 focus:outline-none")}
        >
          <List className="w-4 h-4" /> Visão por Colaborador
        </button>
        <button
          onClick={() => setActiveView('board')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", activeView === 'board' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900 focus:outline-none")}
        >
          <LayoutGrid className="w-4 h-4" /> Board (Kanban)
        </button>
      </div>

      {activeView === 'list' && (
        pdis.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <Target className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">Nenhum PDI cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Novo PDI" para começar.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pdis.map(pdi => {
            const total = pdi.actions.length;
            const done = pdi.actions.filter(a => a.status === 'completed').length;
            const doing = pdi.actions.filter(a => a.status === 'in_progress').length;
            const planned = pdi.actions.filter(a => a.status === 'pending').length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const overdue = pdi.actions.filter(isOverdue).length;
            const visible = pdi.actions.slice(0, 3);
            const rest = total - visible.length;

            return (
              <div key={pdi.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                {/* Header compacto */}
                <div className="p-4 flex items-center gap-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm border border-brand-200 shrink-0">
                    {pdi.employee_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{pdi.employee_name}</h3>
                    <p className="text-xs text-slate-500 truncate">{pdi.employee_role} · {pdi.cycle_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-slate-800 leading-none">{progress}%</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{done}/{total}</div>
                  </div>
                </div>

                {/* Progresso + resumo de status */}
                <div className="px-4 pt-3">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[11px] font-medium text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" />{planned}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500" />{doing}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{done}</span>
                    {overdue > 0 && <span className="ml-auto text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{overdue} atrasada(s)</span>}
                  </div>
                </div>

                {/* Ações em linha única */}
                <div className="p-4 flex-1 flex flex-col gap-0.5">
                  {total === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Nenhuma ação planejada ainda.</p>
                  ) : visible.map(action => (
                    <div key={action.id} className="flex items-center gap-2 py-1">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[action.status])} />
                      <span className="text-sm text-slate-700 truncate flex-1">{action.title}</span>
                      <span className={cn("text-[11px] shrink-0", isOverdue(action) ? "text-red-600 font-semibold" : "text-slate-400")}>{fmtDeadline(action.deadline)}</span>
                    </div>
                  ))}
                  {rest > 0 && <p className="text-[11px] font-medium text-slate-400 pl-4 pt-1">+{rest} ação(ões)</p>}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/60 mt-auto">
                  <button
                    onClick={() => onNavigate && onNavigate('pdi_detail', pdi.id)}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1.5 w-full transition-colors">
                    Ver detalhes <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        )
      )}

      {activeView === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(col => {
            const colActions = allActions.filter(a => a.status === col.id);
            return (
              <div key={col.id} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold text-slate-700 tracking-tight">{col.title}</h3>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{colActions.length}</span>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  {colActions.map(action => (
                    <div key={action.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider truncate max-w-[150px]">
                          {action.employeeName}
                        </span>
                        {/* Quick Action Movers */}
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {col.id !== 'pending' && (
                              <button 
                                onClick={() => moveAction(action.id, action.pdiPlan, col.id === 'completed' ? 'in_progress' : 'pending')}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                                title="Mover para esquerda"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.id !== 'completed' && (
                               <button 
                               onClick={() => moveAction(action.id, action.pdiPlan, col.id === 'pending' ? 'in_progress' : 'completed')}
                               className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                               title="Mover para direita"
                             >
                               <ArrowRight className="w-3.5 h-3.5" />
                             </button>
                            )}
                         </div>
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900 mb-1">{action.title}</h4>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mt-3">
                        <Calendar className="w-3.5 h-3.5" /> Prazo: <span className="text-slate-600">{fmtDeadline(action.deadline)}</span>
                      </div>
                    </div>
                  ))}
                  
                  {colActions.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-slate-400">Nenhuma ação</p>
                      <p className="text-xs text-slate-400 mt-1">Solte itens aqui</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}

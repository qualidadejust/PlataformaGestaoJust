import { useState } from "react";
import { Search, ClipboardList, Clock, CheckCircle2, ChevronRight, Plus, X } from "lucide-react";
import { useEvaluations, useCreateEvaluation } from "../hooks/useEvaluations";
import { useEmployees } from "../hooks/useEmployees";
import { useCycles } from "../hooks/useCycles";

const EVAL_TYPES = [
  { value: 'Avaliação pelo Gestor', label: 'Avaliação pelo Gestor' },
  { value: 'Autoavaliação', label: 'Autoavaliação' },
  { value: 'Consenso', label: 'Consenso' },
  { value: 'Feedback', label: 'Feedback 360°' },
];

function NovaAvaliacaoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { data: employees = [] } = useEmployees();
  const { data: cycles = [] } = useCycles();
  const create = useCreateEvaluation();

  const [form, setForm] = useState({
    employee_id: '',
    evaluator_id: '',
    cycle_id: '',
    type: 'Avaliação pelo Gestor',
    due_date: '',
  });
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const managers = employees.filter(e => e.is_manager);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id) { setError('Selecione o colaborador a ser avaliado.'); return; }
    if (!form.type) { setError('Selecione o tipo de avaliação.'); return; }
    try {
      const result = await create.mutateAsync({
        employee_id: form.employee_id,
        type: form.type,
        evaluator_id: form.evaluator_id || undefined,
        cycle_id: form.cycle_id || undefined,
        due_date: form.due_date || undefined,
      });
      onCreated(result.id);
    } catch {
      setError('Erro ao criar avaliação. Tente novamente.');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nova Avaliação</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Colaborador avaliado *</label>
            <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Selecione...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de avaliação *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              {EVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Avaliador (opcional)</label>
            <select value={form.evaluator_id} onChange={e => set('evaluator_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Nenhum</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ciclo (opcional)</label>
            <select value={form.cycle_id} onChange={e => set('cycle_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Nenhum</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Prazo</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {create.isPending ? 'Criando...' : 'Criar e Abrir Formulário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EvaluationsListView({ onNavigate }: { onNavigate: (view: string, id?: string) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: evaluations = [], isLoading } = useEvaluations(statusFilter ? { status: statusFilter } : undefined);

  const filtered = evaluations.filter(ev =>
    !search ||
    ev.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    ev.employee_role?.toLowerCase().includes(search.toLowerCase()) ||
    ev.type?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"><Clock className="w-3.5 h-3.5" /> Pendente</span>;
      case 'draft': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold"><Clock className="w-3.5 h-3.5" /> Rascunho</span>;
      case 'submitted':
      case 'completed': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Concluída</span>;
      case 'feedback_pending': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold"><ClipboardList className="w-3.5 h-3.5" /> Aguardando Feedback</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {showModal && (
        <NovaAvaliacaoModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => { setShowModal(false); onNavigate('evaluation_form', id); }}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Avaliações</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie e acompanhe as avaliações de desempenho da sua equipe.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova Avaliação
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por colaborador, cargo ou tipo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="draft">Rascunho</option>
            <option value="submitted">Concluída</option>
            <option value="feedback_pending">Aguardando Feedback</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma avaliação encontrada.</p>
            <p className="text-sm mt-1">Clique em "Nova Avaliação" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Ciclo</th>
                  <th className="px-6 py-4">Prazo</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onNavigate('evaluation_form', ev.id)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm">
                          {ev.employee_name?.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '??'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{ev.employee_name}</p>
                          <p className="text-xs text-slate-500">{ev.employee_role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{ev.type ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{ev.cycle_name ?? ev.cycle_id ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {ev.due_date ? new Date(ev.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ev.status)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Search, UserPlus, Building2, Calendar, ChevronRight, X } from "lucide-react";
import { useEmployees, useCreateEmployee } from '../hooks/useEmployees';

function NovoColaboradorModal({ onClose }: { onClose: () => void }) {
  const create = useCreateEmployee();
  const [form, setForm] = useState({
    name: '', role: '', department: '', email: '', phone: '',
    admission_date: '', is_manager: false,
  });
  const [error, setError] = useState('');

  const set = (field: string, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim() || !form.department.trim()) {
      setError('Nome, cargo e departamento são obrigatórios.');
      return;
    }
    try {
      await create.mutateAsync({ ...form, is_manager: form.is_manager ? 1 : 0 } as any);
      onClose();
    } catch {
      setError('Erro ao criar colaborador. Tente novamente.');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Novo Colaborador</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome completo *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: João Silva" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cargo *</label>
              <input value={form.role} onChange={e => set('role', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Engenheiro Civil" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Departamento *</label>
              <input value={form.department} onChange={e => set('department', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Engenharia" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="joao@just.com.br" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="(11) 9xxxx-xxxx" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data de admissão</label>
              <input type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <input type="checkbox" id="is_manager" checked={form.is_manager} onChange={e => set('is_manager', e.target.checked)} className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500" />
              <label htmlFor="is_manager" className="text-sm font-medium text-slate-700 cursor-pointer">É gestor/liderança</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {create.isPending ? 'Salvando...' : 'Criar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeamView({ onNavigate }: { onNavigate?: (view: string, id?: string) => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: team = [], isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const departments = [...new Set(team.map(m => m.department))].sort();
  const filtered = team.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || m.department === roleFilter;
    return matchSearch && matchRole;
  });

  const formatDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {showModal && <NovoColaboradorModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Minha Equipe</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os colaboradores sob sua responsabilidade.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Todos os departamentos</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="font-medium">Nenhum colaborador encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Cargo / Área</th>
                  <th className="px-6 py-4">Obra</th>
                  <th className="px-6 py-4">Admissão</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => onNavigate && onNavigate('employee_profile', member.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-medium text-sm border border-brand-200 group-hover:bg-brand-800 group-hover:text-white transition-colors">
                          {member.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700 transition-colors">{member.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold tracking-wide">ATIVO</span>
                            {member.is_manager ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold">GESTOR</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-slate-700">{member.role}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{member.department}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> {member.cost_center ?? '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(member.admission_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
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

import { useEffect, useState } from "react";
import { Search, Building2, Calendar, ChevronRight, Database } from "lucide-react";
import { useEmployees } from '../hooks/useEmployees';

// Aviso: o cadastro de colaboradores é feito no JustCore (fonte única).
function AvisoCore() {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
      <Database className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <span>
        Colaboradores são cadastrados no <strong>JustCore</strong> (porta 4101). Esta tela é somente
        leitura — reflete os dados sincronizados.
      </span>
    </div>
  );
}

export function TeamView({ onNavigate }: { onNavigate?: (view: string, id?: string) => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: team = [], isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const departments = [...new Set(team.map(m => m.department))].sort();
  const filtered = team.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || m.department === roleFilter;
    return matchSearch && matchRole;
  });

  const formatDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Minha Equipe</h1>
        <p className="text-sm text-slate-500 mt-1">Colaboradores sob sua responsabilidade (somente leitura).</p>
      </div>

      <div className="mb-6"><AvisoCore /></div>

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

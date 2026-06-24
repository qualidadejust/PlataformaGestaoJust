import { LayoutDashboard, FilePlus, ListTodo, Users, Settings, LogOut, Database, Inbox } from 'lucide-react';
import { cn } from '../utils';
import { ViewState, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { JustLogo } from './JustLogo';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  isOpen?: boolean;       // drawer aberto (mobile)
  onClose?: () => void;   // fecha o drawer (mobile)
}

// Cada item declara quais perfis podem vê-lo. Apontador só lança documentos.
const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard, roles: ['rh'] },
  { id: 'new_entry', label: 'Novo Lançamento', icon: FilePlus, roles: ['rh', 'apontador'] },
  { id: 'meus_envios', label: 'Meus Envios', icon: Inbox, roles: ['rh', 'apontador'] },
  { id: 'queue', label: 'Fila de Análise', icon: ListTodo, roles: ['rh'] },
  { id: 'registry', label: 'Consulta Geral', icon: Database, roles: ['rh'] },
  { id: 'history', label: 'Histórico Colaborador', icon: Users, roles: ['rh'] },
  { id: 'admin', label: 'Administração', icon: Settings, roles: ['rh'] },
] as const;

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

export function Sidebar({ currentView, onNavigate, onLogout, isOpen = false, onClose }: SidebarProps) {
  const { user } = useAuth();
  const role: Role = user?.role ?? 'apontador';
  const menuItems = ALL_MENU_ITEMS.filter((item) => (item.roles as readonly Role[]).includes(role));

  // Navega e, no mobile, fecha o drawer.
  const handleNavigate = (view: ViewState) => {
    onNavigate(view);
    onClose?.();
  };

  return (
    <div
      className={cn(
        // Mobile: drawer off-canvas fixo. Desktop (lg+): coluna fixa no fluxo.
        "fixed lg:sticky inset-y-0 left-0 top-0 z-40 flex flex-col w-64 h-screen bg-navy-900 text-navy-200 border-r border-navy-800 transform transition-transform duration-200 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="px-6 py-6 flex flex-col items-start gap-1.5 border-b border-navy-800">
        <JustLogo variant="white" heightPx={26} />
        <span className="text-[11px] font-semibold tracking-[0.22em] text-petroleum-400 uppercase">
          Atestados
        </span>
      </div>

      <div className="px-4 pt-5 pb-2 text-xs font-semibold text-navy-400 uppercase tracking-wider">
        Menu Principal
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id as ViewState)}
            className={cn(
              "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
              currentView === item.id
                ? "bg-navy-800 text-white"
                : "text-navy-200 hover:bg-navy-800 hover:text-white"
            )}
          >
            <item.icon className={cn("mr-3 h-5 w-5", currentView === item.id ? "text-petroleum-400" : "text-navy-400")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-navy-800">
        <div className="flex items-center px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-white mr-3">
            {user ? initials(user.nome) : '--'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.nome ?? 'Usuário'}</p>
            <p className="text-xs text-navy-400 truncate">{user?.cargo ?? (role === 'rh' ? 'RH' : 'Apontador')}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-4 w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-navy-300 hover:text-white hover:bg-navy-800 rounded-md transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}

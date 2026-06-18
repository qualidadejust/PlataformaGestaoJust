import { LayoutDashboard, Users, ClipboardList, Target, BarChart3, Settings, LogOut, CalendarDays, SlidersHorizontal, MessageSquare, Smile, CalendarClock, Building2, TrendingUp, Gauge } from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'central', label: 'Central RH', icon: CalendarClock },
    { id: 'team', label: 'Minha Equipe', icon: Users },
    { id: 'obras', label: 'Obras', icon: Building2 },
    { id: 'evaluations', label: 'Avaliações', icon: ClipboardList },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'calibration', label: 'Calibração', icon: SlidersHorizontal },
    { id: 'movimentacao', label: 'Movimentação', icon: TrendingUp },
    { id: 'pdi', label: 'PDI', icon: Target },
    { id: 'indicadores', label: 'Indicadores', icon: Gauge },
    { id: 'survey', label: 'Pesquisa de Clima', icon: Smile },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'cycles', label: 'Gestão de Ciclos', icon: CalendarDays },
  ];

  return (
    <aside className="w-64 bg-brand-900 text-brand-100 flex flex-col h-screen overflow-y-auto border-r border-brand-800">
      <div className="px-6 py-4 border-b border-white/5">
        <span className="text-xl font-bold tracking-tight text-white leading-none">Just<span className="text-brand-300 font-semibold">Eleva</span></span>
      </div>

      <div className="px-4 py-3">
        <p className="px-3 text-[11px] font-semibold text-brand-300/70 uppercase tracking-[0.14em] mb-2">Menu Principal</p>
        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'evaluations' && currentView === 'evaluation_form') || (item.id === 'survey' && currentView === 'survey_respond');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  isActive
                    ? "bg-white/10 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:bg-white"
                    : "text-brand-200/80 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-white/5">
        <div className="space-y-0.5">
          <button
            onClick={() => onNavigate('settings')}
            aria-current={currentView === 'settings' ? 'page' : undefined}
            className={cn(
               "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
               currentView === 'settings'
                 ? "bg-white/10 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:bg-white"
                 : "text-brand-200/80 hover:bg-white/5 hover:text-white"
             )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            Configurações
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium text-brand-200/80 hover:bg-white/5 hover:text-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            <LogOut className="w-5 h-5 shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

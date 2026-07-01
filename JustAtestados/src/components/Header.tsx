import { Search, Bell, Moon, Sun, Menu } from 'lucide-react';
import { ViewState } from '../types';
import { useEffect, useRef, useState } from 'react';
import { dataService } from '../services';
import { JustLogo } from './JustLogo';

interface HeaderProps {
  currentView: ViewState;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  onNavigate?: (view: ViewState) => void;
  onSearch?: (term: string) => void;       // busca global → Consulta Geral
  onToggleSidebar?: () => void;            // abre/fecha o drawer mobile
}

const viewTitles: Record<ViewState, string> = {
  login: '',
  dashboard: 'Dashboard Executivo',
  new_entry: 'Novo Lançamento',
  meus_envios: 'Meus Envios',
  queue: 'Fila de Análise RH',
  history: 'Histórico por Colaborador',
  admin: 'Configurações e Administração',
  registry: 'Consulta Geral',
};

export function Header({ currentView, isDarkMode, toggleDarkMode, onNavigate, onSearch, onToggleSidebar }: HeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [pendentes, setPendentes] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Atualiza a contagem de pendentes ao trocar de tela (reflete novos envios/aprovações).
  useEffect(() => {
    let cancelled = false;
    dataService.getResumoFila()
      .then((r) => { if (!cancelled) setPendentes(r.pendentes); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentView]);

  const submitSearch = () => {
    const term = query.trim();
    if (term) onSearch?.(term);
  };

  return (
    <header className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20 shrink-0">
      {/* Logo JUST centralizado (padrão dos apps da empresa) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <JustLogo variant="navy" heightPx={34} className="dark:hidden" />
        <JustLogo variant="white" heightPx={34} className="hidden dark:inline-flex" />
      </div>

      <div className="flex items-center min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden mr-3 p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          title="Menu"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight truncate">
            {viewTitles[currentView]}
          </h1>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:flex items-center space-x-2">
            <span>Início</span>
            <span>/</span>
            <span className="text-petroleum-600 font-medium">{viewTitles[currentView]}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-6">
        <div className="relative group hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
            placeholder="Buscar por colaborador, matrícula..."
            className="pl-9 pr-14 py-2 w-56 lg:w-72 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-md text-sm focus:bg-white dark:focus:bg-slate-900 focus:border-petroleum-500 dark:focus:border-petroleum-400 focus:ring-1 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 transition-colors text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="hidden group-hover:inline-flex md:inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
        <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-3 sm:pl-6">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Alternar tema"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              {pendentes > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>
            {bellOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notificações</p>
                  </div>
                  <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {pendentes > 0 ? (
                      <>
                        <span className="font-semibold text-slate-900 dark:text-slate-50">{pendentes}</span>{' '}
                        documento(s) pendente(s) de análise.
                      </>
                    ) : (
                      'Sem novas notificações.'
                    )}
                  </div>
                  {pendentes > 0 && onNavigate && (
                    <button
                      onClick={() => { setBellOpen(false); onNavigate('queue'); }}
                      className="w-full px-4 py-2.5 text-sm font-medium text-petroleum-600 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800 text-left"
                    >
                      Ver fila de análise →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

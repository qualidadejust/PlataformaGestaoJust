import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { NewEntry } from './views/NewEntry';
import { MeusEnvios } from './views/MeusEnvios';
import { HrQueue } from './views/HrQueue';
import { History } from './views/History';
import { Admin } from './views/Admin';
import { Registry } from './views/Registry';
import { useAuth } from './context/AuthContext';
import { ViewState, Role, DocumentoView } from './types';

// Telas liberadas por perfil. Apontador lança e acompanha seus envios;
// RH tem acesso a todas as telas.
const VIEWS_BY_ROLE: Record<Role, ViewState[]> = {
  apontador: ['new_entry', 'meus_envios'],
  rh: ['dashboard', 'new_entry', 'meus_envios', 'queue', 'registry', 'history', 'admin'],
};

const HOME_BY_ROLE: Record<Role, ViewState> = {
  apontador: 'new_entry',
  rh: 'dashboard',
};

export default function App() {
  const { user, logout, initializing } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);   // drawer mobile
  const [registrySearch, setRegistrySearch] = useState(''); // termo vindo da busca do Header
  const [editDoc, setEditDoc] = useState<DocumentoView | null>(null); // doc em reenvio

  useEffect(() => {
    // Tema padrão = claro. Só fica escuro se o usuário escolheu explicitamente.
    const isDark = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Enquanto a sessão persistida é verificada, evita piscar a tela de login.
  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-petroleum-500 border-t-transparent animate-spin" />
        <p className="text-sm">Verificando sessão…</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const allowed = VIEWS_BY_ROLE[user.role];
  // Garante que a tela ativa é sempre permitida ao perfil atual.
  const activeView = allowed.includes(currentView) ? currentView : HOME_BY_ROLE[user.role];

  const navigate = (view: ViewState) => {
    setEditDoc(null); // sair de um reenvio em andamento ao navegar pelo menu
    if (allowed.includes(view)) setCurrentView(view);
  };

  // Apontador clica "Corrigir e reenviar" → abre o formulário em modo edição.
  const handleReenviar = (doc: DocumentoView) => {
    setEditDoc(doc);
    setCurrentView('new_entry');
  };

  // Após reenviar, volta para "Meus Envios".
  const handleResubmitDone = () => {
    setEditDoc(null);
    setCurrentView('meus_envios');
  };

  // Busca global do Header → leva o termo para a Consulta Geral.
  const handleSearch = (term: string) => {
    setRegistrySearch(term);
    navigate('registry');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'new_entry': return <NewEntry editDoc={editDoc} onResubmitDone={handleResubmitDone} />;
      case 'meus_envios': return <MeusEnvios onReenviar={handleReenviar} />;
      case 'queue': return <HrQueue />;
      case 'history': return <History />;
      case 'admin': return <Admin />;
      case 'registry': return <Registry initialBusca={registrySearch} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-800 dark:text-slate-50 overflow-hidden font-sans">
      {/* Overlay do drawer no mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        currentView={activeView}
        onNavigate={navigate}
        onLogout={logout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          currentView={activeView}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          onNavigate={navigate}
          onSearch={handleSearch}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto w-full border-t border-slate-200 dark:border-slate-700/50">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

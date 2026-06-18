import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { EvaluationFormView } from './views/EvaluationFormView';
import { TeamView } from './views/TeamView';
import { EvaluationsListView } from './views/EvaluationsListView';
import { PDIView } from './views/PDIView';
import { ReportsView } from './views/ReportsView';
import { CycleManagementView } from './views/CycleManagementView';
import { PDIDetailView } from './views/PDIDetailView';
import { EmployeeProfileView } from './views/EmployeeProfileView';
import { CalibrationView } from './views/CalibrationView';
import { FeedbackView } from './views/FeedbackView';
import { SettingsView } from './views/SettingsView';
import { SurveyView } from './views/SurveyView';
import { SurveyResponseView } from './views/SurveyResponseView';
import { CentralView } from './views/CentralView';
import { ObrasView } from './views/ObrasView';
import { MovimentacaoView } from './views/MovimentacaoView';
import { IndicadoresView } from './views/IndicadoresView';
import { EvaluatorPortal } from './views/EvaluatorPortal';
import { useEmployees } from './hooks/useEmployees';

export default function App() {
  // Link mágico do avaliador: /avaliar/<token> abre o portal mobile sem o shell (sem login)
  const portalMatch = window.location.pathname.match(/^\/avaliar\/(.+)$/);
  if (portalMatch) return <EvaluatorPortal token={decodeURIComponent(portalMatch[1])} />;

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedEvalId, setSelectedEvalId] = useState<string | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
  const [selectedPdiId, setSelectedPdiId] = useState<string | undefined>();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('mgr1');

  const { data: employees = [] } = useEmployees();
  const currentUser = employees.find(e => e.id === currentUserId) ?? employees[0];

  const handleNavigate = (view: string, id?: string) => {
    setCurrentView(view);
    if (view === 'employee_profile') setSelectedEmployeeId(id);
    else if (view === 'pdi_detail') setSelectedPdiId(id);
    else if (view === 'survey_respond') setSelectedCampaignId(id);
    else if (id) setSelectedEvalId(id);
    setIsSidebarOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'central':
        return <CentralView onNavigate={handleNavigate} />;
      case 'team':
        return <TeamView onNavigate={handleNavigate} />;
      case 'obras':
        return <ObrasView />;
      case 'movimentacao':
        return <MovimentacaoView />;
      case 'indicadores':
        return <IndicadoresView />;
      case 'employee_profile':
        return <EmployeeProfileView employeeId={selectedEmployeeId} onBack={() => handleNavigate('team')} onNavigatePdi={(pdiId) => handleNavigate('pdi_detail', pdiId)} onNavigate={handleNavigate} />;
      case 'evaluations':
        return <EvaluationsListView onNavigate={handleNavigate} />;
      case 'evaluation_form':
        return <EvaluationFormView evalId={selectedEvalId} onBack={() => handleNavigate('evaluations')} onNavigate={handleNavigate} />;
      case 'feedback':
        return <FeedbackView onNavigate={handleNavigate} currentUserId={currentUser?.id} />;
      case 'pdi':
        return <PDIView onNavigate={handleNavigate} />;
      case 'pdi_detail':
        return <PDIDetailView pdiId={selectedPdiId} onBack={() => handleNavigate('pdi')} />;
      case 'calibration':
        return <CalibrationView onNavigate={handleNavigate} />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      case 'survey':
        return <SurveyView onNavigate={handleNavigate} />;
      case 'survey_respond':
        return <SurveyResponseView campaignId={selectedCampaignId} onBack={() => handleNavigate('survey')} />;
      case 'cycles':
        return <CycleManagementView onNavigate={handleNavigate} />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Página em Construção</h2>
            <p className="text-sm">Esta funcionalidade será implementada em futuras versões do protótipo base.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 flex-shrink-0 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      </div>
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          currentUser={currentUser}
          employees={employees}
          onUserChange={setCurrentUserId}
        />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

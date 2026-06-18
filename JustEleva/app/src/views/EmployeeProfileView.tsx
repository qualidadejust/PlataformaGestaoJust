import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Phone, Calendar, TrendingUp, Target, Award, Clock, Sparkles, MessageSquare, Loader2, X, Plus } from "lucide-react";
import { useEmployee, useEmployeePerformance } from '../hooks/useEmployees';
import { useEvaluations } from '../hooks/useEvaluations';
import { useFeedbacks } from '../hooks/useFeedback';
import { usePdiPlans } from '../hooks/usePdi';

const NINE_BOX_CELLS = [
  [
    { label: 'Enigma', text: 'Enigma', colors: 'bg-emerald-100/50 text-emerald-800', activeColors: 'bg-emerald-100 border-[3px] border-emerald-500 ring-4 ring-emerald-500/20 shadow-md text-emerald-900' },
    { label: 'Alto Crescimento', text: 'Alto Crescimento', colors: 'bg-emerald-200/50 text-emerald-800', activeColors: 'bg-emerald-200 border-[3px] border-emerald-500 ring-4 ring-emerald-500/20 shadow-md text-emerald-900' },
    { label: 'Talento Topo', text: 'Alto Desempenho\nAlto Potencial', colors: 'bg-emerald-300/50 text-emerald-900', activeColors: 'bg-emerald-300 border-[3px] border-emerald-500 ring-4 ring-emerald-500/20 shadow-md text-emerald-900' },
  ],
  [
    { label: 'Profissional Estabilizado', text: 'Apto Profissional', colors: 'bg-brand-100/50 text-brand-800', activeColors: 'bg-brand-100 border-[3px] border-brand-500 ring-4 ring-brand-500/20 shadow-md text-brand-900' },
    { label: 'Profissional Chave', text: 'Profissional Chave', colors: 'bg-brand-200/50 text-brand-800', activeColors: 'bg-brand-200 border-[3px] border-brand-500 ring-4 ring-brand-500/20 shadow-md text-brand-900' },
    { label: 'Forte Desempenho', text: 'Forte Desempenho', colors: 'bg-emerald-200/50 text-emerald-800', activeColors: 'bg-emerald-200 border-[3px] border-emerald-500 ring-4 ring-emerald-500/20 shadow-md text-emerald-900' },
  ],
  [
    { label: 'Atenção Necessária', text: 'Risco', colors: 'bg-red-100/50 text-red-800', activeColors: 'bg-red-100 border-[3px] border-red-500 ring-4 ring-red-500/20 shadow-md text-red-900' },
    { label: 'Em Desenvolvimento', text: 'Questionável', colors: 'bg-amber-100/50 text-amber-800', activeColors: 'bg-amber-100 border-[3px] border-amber-500 ring-4 ring-amber-500/20 shadow-md text-amber-900' },
    { label: 'Desempenho Sólido', text: 'Desempenho Sólido', colors: 'bg-brand-100/50 text-brand-800', activeColors: 'bg-brand-100 border-[3px] border-brand-500 ring-4 ring-brand-500/20 shadow-md text-brand-900' },
  ],
];

const NINE_BOX_DESCRIPTIONS: Record<string, string> = {
  'Talento Topo': 'Pronto para novos desafios e alta retenção. Foco em planejamento de sucessão e liderança estratégica.',
  'Alto Crescimento': 'Grande potencial e desempenho crescente. Candidato natural a posições estratégicas.',
  'Enigma': 'Alto potencial ainda não confirmado por desempenho. Requer acompanhamento e desafios adequados.',
  'Forte Desempenho': 'Desempenho acima da média com potencial moderado. Manter desafiado e reconhecido.',
  'Profissional Chave': 'Profissional sólido e confiável. Ampliar responsabilidades gradualmente.',
  'Profissional Estabilizado': 'Profissional estável na função. Avaliar motivação e plano de carreira.',
  'Desempenho Sólido': 'Bom desempenho na função atual. Crescimento vertical pode ser limitado.',
  'Em Desenvolvimento': 'Baixo desempenho com potencial limitado. Avaliar fit com a função.',
  'Atenção Necessária': 'Situação crítica. Requer Plano de Melhoria de Desempenho urgente.',
};

function getNineBoxPosition(score: number | null, potential: number | null): { row: number; col: number } | null {
  if (score === null || potential === null) return null;
  // Eixo desempenho em escala 1-5 (tercis): baixo < 2.33, médio 2.33–3.66, alto >= 3.67
  const col = score < 2.33 ? 0 : score < 3.67 ? 1 : 2;
  const row = potential < 1.5 ? 2 : potential < 2.5 ? 1 : 0;
  return { row, col };
}

export function EmployeeProfileView({
  employeeId,
  onBack,
  onNavigatePdi,
  onNavigate,
}: {
  employeeId?: string;
  onBack: () => void;
  onNavigatePdi?: (pdiId: string) => void;
  onNavigate?: (view: string, id?: string) => void;
}) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const { data: employee, isLoading } = useEmployee(employeeId);
  const { data: evaluations = [] } = useEvaluations({ employee_id: employeeId });
  const { data: feedbacksReceived = [] } = useFeedbacks({ to_employee_id: employeeId });
  const { data: pdiPlans = [] } = usePdiPlans({ employee_id: employeeId });
  const { data: perfHistory = [] } = useEmployeePerformance(employeeId);

  const lastEval = evaluations.filter(e => e.type === 'Avaliação pelo Gestor' && e.status === 'submitted').at(-1);
  const historyScores = perfHistory.map(item => ({ cycle: item.cycle_name, score: item.avg_score ?? 0 }));
  const lastScore = historyScores.length ? historyScores[historyScores.length - 1].score : null;

  const evolutionPct = historyScores.length >= 2
    ? Math.round(((historyScores[historyScores.length - 1].score - historyScores[0].score) / (historyScores[0].score || 1)) * 100)
    : null;

  const lastPerf = perfHistory.length ? perfHistory[perfHistory.length - 1] : null;
  const nineBoxPos = getNineBoxPosition(lastPerf?.avg_score ?? null, lastPerf?.avg_potential ?? null);
  const nineBoxCell = nineBoxPos ? NINE_BOX_CELLS[nineBoxPos.row][nineBoxPos.col] : null;

  const generateAiAnalysis = () => {
    setShowAiAnalysis(true);
    setIsGeneratingAi(true);
    setTimeout(() => {
      const strengths = lastEval?.strengths
        ? lastEval.strengths.split(/\n|;/).map(s => s.trim()).filter(Boolean)
        : ['Nenhum ponto forte registrado. Complete uma avaliação para visualizar.'];
      const developmentAreas = lastEval?.opportunities
        ? lastEval.opportunities.split(/\n|;/).map(s => s.trim()).filter(Boolean)
        : ['Nenhuma oportunidade registrada. Complete uma avaliação para visualizar.'];
      const suggestedActions = pdiPlans[0]?.actions?.slice(0, 2).map(a => a.title) ?? [
        'Criar um PDI com ações concretas de desenvolvimento para o próximo ciclo.',
      ];
      setAiAnalysisResult({ strengths, developmentAreas, suggestedActions });
      setIsGeneratingAi(false);
    }, 1500);
  };

  if (isLoading || !employee) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  type TimelineEvent = { id: string; date: string; sortDate: number; type: string; title: string; desc: string; icon: typeof Clock };
  const timeline: TimelineEvent[] = [
    ...feedbacksReceived.map(f => ({
      id: `feedback-${f.id}`,
      date: new Date(f.created_at).toLocaleDateString('pt-BR'),
      sortDate: new Date(f.created_at).getTime(),
      type: 'feedback',
      title: 'Feedback Recebido',
      desc: `De ${f.from_name}: ${f.content}`,
      icon: MessageSquare,
    })),
    ...evaluations.filter(e => e.status === 'submitted').map(e => ({
      id: `evaluation-${e.id}`,
      date: e.submitted_at ? new Date(e.submitted_at).toLocaleDateString('pt-BR') : '',
      sortDate: e.submitted_at ? new Date(e.submitted_at).getTime() : 0,
      type: 'evaluation',
      title: `Avaliação Concluída: ${e.type}`,
      desc: e.evaluator_name ? `Realizada por ${e.evaluator_name}.` : 'Avaliação registrada.',
      icon: TrendingUp,
    })),
    ...pdiPlans.map(p => ({
      id: `pdi-${p.id}`,
      date: '',
      sortDate: 0,
      type: 'pdi',
      title: `PDI: ${p.cycle_name}`,
      desc: `${p.actions.length} ação(ões) de desenvolvimento.`,
      icon: Target,
    })),
  ].sort((a, b) => b.sortDate - a.sortDate).slice(0, 7);

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 relative">
      {showAiAnalysis && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 relative">
              <button
                onClick={() => setShowAiAnalysis(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-400/30">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Análise do Perfil</h3>
                  <p className="text-sm text-brand-300">Sintetizando histórico de desempenho...</p>
                </div>
              </div>
              {isGeneratingAi ? (
                <div className="py-12 flex flex-col items-center justify-center text-center relative z-10">
                  <Loader2 className="w-10 h-10 text-brand-400 animate-spin mb-4" />
                  <p className="text-brand-200 font-medium animate-pulse">Relacionando resultados de desempenho, metas alcançadas e notas de PDI...</p>
                </div>
              ) : aiAnalysisResult && (
                <div className="space-y-6 relative z-10">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">Pontos Fortes Identificados</h4>
                    <ul className="space-y-2">
                      {aiAnalysisResult.strengths.map((str: string, idx: number) => (
                        <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-emerald-400 mt-0.5">•</span> {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">Oportunidades de Desenvolvimento</h4>
                    <ul className="space-y-2 mb-4">
                      {aiAnalysisResult.developmentAreas.map((area: string, idx: number) => (
                        <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5">•</span> {area}
                        </li>
                      ))}
                    </ul>
                    <div className="relative pt-4 border-t border-white/10">
                      <p className="text-xs font-bold text-brand-300 uppercase tracking-wider mb-2">Ações Recomendadas para o PDI</p>
                      <ul className="space-y-2">
                        {aiAnalysisResult.suggestedActions.map((act: string, idx: number) => (
                          <li key={idx} className="text-xs text-brand-200 flex items-start gap-2 bg-brand-500/10 p-2 rounded border border-brand-500/20">
                            <Plus className="w-3 h-3 mt-0.5 shrink-0" /> {act}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => {
                        setShowAiAnalysis(false);
                        if (pdiPlans[0]) onNavigatePdi?.(pdiPlans[0].id);
                        else onNavigate?.('pdi');
                      }}
                      className="px-5 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    >
                      Ir para Plano de Desenvolvimento
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Equipe
      </button>

      {/* Header Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="h-32 bg-slate-900 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row justify-between mb-6 gap-6">
            <div className="flex items-start gap-6">
              <div className="-mt-14 w-24 h-24 rounded-full bg-white p-1.5 shadow-md shrink-0 relative z-10">
                <div className="w-full h-full rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-3xl font-bold">
                  {employee?.name ? employee.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : '??'}
                </div>
              </div>
              <div className="pt-2">
                <h1 className="text-2xl font-bold text-slate-900">{employee.name}</h1>
                <p className="text-slate-500 font-medium">{employee.role} • {employee.department}{employee.cost_center ? ` • ${employee.cost_center}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider border border-emerald-200 shadow-sm">
                Colaborador Ativo
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                <Mail className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">E-mail Corporativo</p>
                <p className="text-sm font-medium text-slate-700">{employee?.email ?? 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                <Phone className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Telefone Contato</p>
                <p className="text-sm font-medium text-slate-700">{employee?.phone ?? 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Data de Admissão</p>
                <p className="text-sm font-medium text-slate-700">{employee?.admission_date ? new Date(employee.admission_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: Charts & KPIs */}
        <div className="lg:col-span-2 space-y-8">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-600" /> Evolução de Desempenho
              </h2>
            </div>
            <div className="flex items-end gap-4 h-48 mb-6 pt-4 border-b border-slate-100 relative">
              {historyScores.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  Nenhuma avaliação concluída ainda.
                </div>
              ) : historyScores.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full max-w-[48px] bg-brand-100 rounded-t-lg relative flex flex-col justify-end transition-all group-hover:bg-brand-200" style={{ height: `${(item.score / 5) * 100}%` }}>
                    <div className="bg-brand-500 w-full rounded-t-lg transition-all duration-1000" style={{ height: '100%' }}></div>
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-700 bg-white px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-slate-200">
                      {item.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center h-8 leading-tight">{item.cycle}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <p className="text-3xl font-extrabold text-slate-900">{lastScore !== null ? lastScore.toFixed(1) : '—'}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Última Avaliação</p>
              </div>
              <div className={`p-4 rounded-xl border text-center ${evolutionPct === null ? 'bg-slate-50 border-slate-100' : evolutionPct >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <p className={`text-3xl font-extrabold ${evolutionPct === null ? 'text-slate-400' : evolutionPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {evolutionPct === null ? '—' : `${evolutionPct >= 0 ? '+' : ''}${evolutionPct}%`}
                </p>
                <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${evolutionPct === null ? 'text-slate-400' : evolutionPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {evolutionPct === null ? 'Sem histórico' : 'Evolução no período'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Matriz Desempenho x Potencial (Nine Box)
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-2/3 aspect-square md:aspect-auto md:h-64 grid grid-cols-3 grid-rows-3 gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-xl relative">
                {NINE_BOX_CELLS.map((row, rowIdx) =>
                  row.map((cell, colIdx) => {
                    const isActive = nineBoxPos?.row === rowIdx && nineBoxPos?.col === colIdx;
                    return (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className={`rounded-lg flex items-center justify-center p-2 text-center text-[10px] font-semibold transition-all ${isActive ? cell.activeColors + ' relative overflow-hidden' : cell.colors}`}
                      >
                        <span className="relative z-10 leading-tight">
                          {cell.text.split('\n').map((line, i) => (
                            <span key={i}>{line}{i < cell.text.split('\n').length - 1 && <br />}</span>
                          ))}
                        </span>
                        {isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="w-full md:w-1/3 flex flex-col justify-center text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Posição Atual</p>
                {nineBoxCell ? (
                  <>
                    <p className="text-xl font-extrabold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-100 inline-block mb-3">
                      {nineBoxCell.label}
                    </p>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed relative before:absolute before:-left-3 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-emerald-400 before:rounded-full ml-3">
                      {NINE_BOX_DESCRIPTIONS[nineBoxCell.label]}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-400 bg-slate-50 py-2 px-3 rounded-lg border border-slate-100">
                    {lastScore === null
                      ? 'Sem avaliação concluída'
                      : 'Potencial não registrado no Eixo 2'}
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Timeline & Actions */}
        <div className="space-y-8">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4 border border-brand-100 relative z-10">
              <Sparkles className="w-6 h-6 text-brand-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2 relative z-10">Análise Inteligente de Perfil</h3>
            <p className="text-sm text-slate-500 mb-6 relative z-10">Sintetize o histórico de avaliações, feedbacks e PDI para identificar o próximo passo ideal de desenvolvimento.</p>
            <button
              onClick={generateAiAnalysis}
              className="w-full py-2.5 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm relative z-10 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Gerar Análise com IA
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4 border border-brand-100">
              <Target className="w-6 h-6 text-brand-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Plano de Desenvolvimento</h3>
            <p className="text-sm text-slate-500 mb-6">Acompanhe as ações de desenvolvimento ativas para este colaborador.</p>
            <button
              onClick={() => {
                if (pdiPlans[0]) onNavigatePdi?.(pdiPlans[0].id);
                else onNavigate?.('pdi');
              }}
              className="w-full py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {pdiPlans[0] ? 'Ver PDI Atual' : 'Criar PDI'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Histórico de Desempenho e Feedbacks
            </h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum evento registrado ainda.</p>
            ) : (
              <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100">
                {timeline.map(event => {
                  const Icon = event.icon || Clock;
                  return (
                    <div key={event.id} className="relative flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-white border-[3px] border-brand-100 flex items-center justify-center shrink-0 z-10 mt-0.5">
                        <Icon className="w-3 h-3 text-brand-600" />
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 w-full group hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all text-left">
                        <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1">{event.date}</p>
                        <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{event.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

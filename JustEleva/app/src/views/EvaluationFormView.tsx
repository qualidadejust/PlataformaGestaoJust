import { useState, useEffect } from "react";
import { ArrowLeft, Save, Send, AlertCircle, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { useEvaluation, useSaveScores } from "../hooks/useEvaluations";
import { usePdiPlans } from "../hooks/usePdi";
import { cn } from "../lib/utils";

export function EvaluationFormView({ evalId, onBack, onNavigate }: { evalId?: string; onBack: () => void; onNavigate?: (view: string, id?: string) => void }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: evaluation } = useEvaluation(evalId);
  const { mutateAsync: saveScores, isPending: isSaving } = useSaveScores();
  const { data: pdiPlans = [] } = usePdiPlans(evaluation?.employee_id ? { employee_id: evaluation.employee_id } : undefined);

  const [scores, setScores] = useState<Record<string, string>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [strengths, setStrengths] = useState('');
  const [opportunities, setOpportunities] = useState('');
  const [feedbackDate, setFeedbackDate] = useState('');
  const [reflectionStrengths, setReflectionStrengths] = useState('');
  const [reflectionDifficulties, setReflectionDifficulties] = useState('');
  const [reflectionCompetencies, setReflectionCompetencies] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (evaluation?.scores) {
      const loadedScores: Record<string, string> = {};
      const loadedJust: Record<string, string> = {};
      for (const s of evaluation.scores) {
        loadedScores[s.question_id] = s.score ?? '';
        if (s.justification) loadedJust[s.question_id] = s.justification;
      }
      setScores(loadedScores);
      setJustifications(loadedJust);
    }
    if (evaluation?.strengths) setStrengths(evaluation.strengths);
    if (evaluation?.opportunities) setOpportunities(evaluation.opportunities);
    if (evaluation?.feedback_date) setFeedbackDate(evaluation.feedback_date);
    if (evaluation?.reflection_strengths) setReflectionStrengths(evaluation.reflection_strengths);
    if (evaluation?.reflection_difficulties) setReflectionDifficulties(evaluation.reflection_difficulties);
    if (evaluation?.reflection_competencies) setReflectionCompetencies(evaluation.reflection_competencies);
  }, [evaluation?.id]);

  const handleScoreChange = (questionId: string, value: string) => {
    setScores(prev => ({ ...prev, [questionId]: value }));
  };

  const handleJustificationChange = (questionId: string, value: string) => {
    setJustifications(prev => ({ ...prev, [questionId]: value }));
  };

  const getScoreDescription = (s: string) => {
    switch (s) {
      case 'NS': return "Não sei avaliar (< 6 meses / não observado)";
      case '1': return "Muito abaixo do esperado";
      case '2': return "Abaixo do esperado";
      case '3': return "Atende ao esperado";
      case '4': return "Acima do esperado";
      case '5': return "Referência (excede o esperado)";
      default: return "";
    }
  };

  const isManager = ((evaluation as { is_manager?: number } | undefined)?.is_manager ?? 0) === 1;
  const isMov = evaluation?.type === 'movimentacao';
  const isAutoavaliacao = evaluation?.type === 'Autoavaliação';
  const isGestor = evaluation?.type === 'Avaliação pelo Gestor';
  const template = evaluation?.template ?? null;
  const applicableBlocks = (template?.blocks ?? []).filter(b => !b.manager_only || isManager);

  const employeeName = evaluation?.employee_name ?? 'Carregando...';
  const initials = (evaluation?.employee_name ?? '').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    draft: 'Rascunho',
    submitted: 'Concluída',
    completed: 'Concluída',
    feedback_pending: 'Aguardando Feedback',
  };
  const statusColors: Record<string, string> = {
    pending: 'text-slate-500',
    draft: 'text-amber-600',
    submitted: 'text-emerald-600',
    completed: 'text-emerald-600',
    feedback_pending: 'text-brand-600',
  };
  const currentStatus = evaluation?.status ?? '';
  const statusText = statusLabel[currentStatus] ?? currentStatus;

  async function handleSave(status: string) {
    await saveScores({
      id: evalId!,
      scores,
      justifications,
      status,
      strengths,
      opportunities,
      feedback_date: feedbackDate || undefined,
      reflection_strengths: reflectionStrengths || undefined,
      reflection_difficulties: reflectionDifficulties || undefined,
      reflection_competencies: reflectionCompetencies || undefined,
    });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 relative">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold border border-brand-200 shadow-sm">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{employeeName}</h1>
            <p className="text-sm font-medium text-slate-500">{evaluation?.employee_role ?? ''}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1.5 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider border border-brand-200 shadow-sm">
            {evaluation?.type ?? 'Carregando...'}
          </span>
          {evaluation?.cycle_name && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {evaluation.cycle_name}
            </span>
          )}
          {evaluation?.evaluator_name && (
            <span className="text-xs font-medium text-slate-400">
              Avaliador: {evaluation.evaluator_name}
            </span>
          )}
          {currentStatus && (
            <span className={`text-xs font-bold ${statusColors[currentStatus] ?? 'text-slate-400'}`}>
              {statusText}
            </span>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm relative overflow-hidden">
        <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5 relative z-10" />
        <div className="text-sm text-brand-900 relative z-10">
          <p className="font-bold mb-2">{template?.name ?? 'Modelo de Avaliação'}</p>
          {isMov ? (
            <ul className="list-disc pl-4 space-y-1 text-brand-800">
              <li>Avalie a <strong>prontidão</strong> do colaborador para o cargo pretendido, com base no que você <strong>observou trabalhando com ele(a)</strong>.</li>
              <li>Responda a escala de <strong>1 a 5</strong> e, ao final, sua <strong>recomendação</strong> com uma justificativa objetiva.</li>
              <li>Utilize <strong>N/S</strong> quando o item não se aplica ou você não teve como observar.</li>
            </ul>
          ) : (
            <ul className="list-disc pl-4 space-y-1 text-brand-800">
              <li>Avalie cada competência na escala <strong>1 a 5</strong> considerando o comportamento observado no período.</li>
              <li>Toda resposta deve ser acompanhada de uma <strong>justificativa em texto</strong> — evidências, exemplos e contexto.</li>
              <li>Utilize <strong>N/S</strong> apenas se o colaborador possui menos de 6 meses na função ou se não houve chance de observar.</li>
            </ul>
          )}
        </div>
      </div>

      {/* Escala de referência */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-bold text-slate-900">Escala de Referência (1 a 5)</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="text-lg font-black text-red-600 mb-1">1</div>
              <h4 className="text-xs font-bold text-red-900 mb-2 uppercase tracking-wide">Muito abaixo</h4>
              <p className="text-[11px] text-red-800 leading-relaxed font-medium">Raramente atende ao esperado. Necessita de acompanhamento constante.</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="text-lg font-black text-amber-600 mb-1">2</div>
              <h4 className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">Abaixo</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">Atende parcialmente. O desempenho oscila e requer orientação frequente.</p>
            </div>
            <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
              <div className="text-lg font-black text-brand-600 mb-1">3</div>
              <h4 className="text-xs font-bold text-brand-900 mb-2 uppercase tracking-wide">Atende</h4>
              <p className="text-[11px] text-brand-800 leading-relaxed font-medium">Atende ao esperado de forma consistente. Atua com autonomia nas rotinas.</p>
            </div>
            <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
              <div className="text-lg font-black text-brand-600 mb-1">4</div>
              <h4 className="text-xs font-bold text-brand-900 mb-2 uppercase tracking-wide">Acima</h4>
              <p className="text-[11px] text-brand-800 leading-relaxed font-medium">Supera o esperado com frequência. Ocasionalmente serve como referência.</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-lg font-black text-emerald-600 mb-1">5</div>
              <h4 className="text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wide">Referência</h4>
              <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">Excede o esperado. É referência, inova e eleva o padrão da equipe.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Competências */}
      <div className="space-y-10">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mb-6 border-b border-slate-200 pb-4">
          {isMov ? 'Avaliação de Prontidão' : 'Desempenho por Competências'}
        </h2>

        {applicableBlocks.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3 text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Nenhum bloco de competência configurado</strong>
              Defina as perguntas deste modelo em Configurações → Modelos de Avaliação.
            </div>
          </div>
        )}

        {applicableBlocks.map((block) => (
          <div key={block.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{block.title}</h3>
            </div>
            <div className="p-6 space-y-10">
              {block.questions.map((question) => {
                const currentScore = scores[question.id] ?? '';

                return (
                  <div key={question.id} className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">{question.text}</p>

                    {question.answer_type === 'text' ? (
                      <textarea
                        value={currentScore}
                        onChange={e => handleScoreChange(question.id, e.target.value)}
                        className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                        placeholder="Resposta aberta..."
                      />
                    ) : question.answer_type === 'yesno' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {[{ v: 'sim', l: 'Sim' }, { v: 'nao', l: 'Não' }, { v: 'NS', l: 'N/S' }].map(opt => (
                          <button
                            key={opt.v}
                            onClick={() => handleScoreChange(question.id, opt.v)}
                            className={cn(
                              "px-5 py-2 rounded-lg flex items-center justify-center text-sm font-bold transition-all border",
                              currentScore === opt.v
                                ? opt.v === 'NS' ? "bg-slate-700 text-white border-slate-700 shadow-md"
                                  : opt.v === 'sim' ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                                  : "bg-red-500 text-white border-red-500 shadow-md"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300 hover:bg-brand-50"
                            )}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['1', '2', '3', '4', '5', 'NS'].map((option) => (
                            <button
                              key={option}
                              onClick={() => handleScoreChange(question.id, option)}
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all border",
                                currentScore === option
                                  ? option === 'NS'
                                    ? "bg-slate-700 text-white border-slate-700 shadow-md transform scale-105"
                                    : "bg-brand-900 text-white border-brand-900 shadow-md transform scale-105"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300 hover:bg-brand-50"
                              )}
                              title={getScoreDescription(option)}
                            >
                              {option}
                            </button>
                          ))}
                          <div className="ml-4 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-500 min-w-[180px] text-center shrink-0">
                            {currentScore ? getScoreDescription(currentScore) : "-"}
                          </div>
                        </div>
                        <textarea
                          value={justifications[question.id] ?? ''}
                          onChange={e => handleJustificationChange(question.id, e.target.value)}
                          rows={2}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none placeholder:text-slate-400"
                          placeholder="Justificativa obrigatória — descreva evidências ou exemplos que embasam esta nota..."
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Reflexões do colaborador — apenas Autoavaliação */}
        {isAutoavaliacao && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Reflexões do colaborador</h3>
            </div>
            <div className="p-6 space-y-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Quais são meus principais pontos fortes no trabalho? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reflectionStrengths}
                  onChange={e => setReflectionStrengths(e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                  placeholder="Insira sua resposta..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Houve alguma situação em que senti dificuldade ou não obtive o resultado esperado? O que poderia ter sido diferente? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reflectionDifficulties}
                  onChange={e => setReflectionDifficulties(e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                  placeholder="Insira sua resposta..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Quais competências técnicas ou comportamentais desejo desenvolver nos próximos meses? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reflectionCompetencies}
                  onChange={e => setReflectionCompetencies(e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                  placeholder="Insira sua resposta..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Feedback Estruturado — apenas Avaliação pelo Gestor */}
        {isGestor && !isMov && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Feedback Estruturado (Preparo para PDI)</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Data Prevista da Reunião de Consenso</label>
                <input
                  type="date"
                  value={feedbackDate}
                  onChange={e => setFeedbackDate(e.target.value)}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-700"
                />
                <p className="text-xs text-slate-400 mt-1">Agende a data para a reunião de consenso com o colaborador.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Principais Forças / Destaques do Período</label>
                <textarea
                  value={strengths}
                  onChange={e => setStrengths(e.target.value)}
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                  placeholder="Liste 2 a 3 pontos fortes evidenciados durante o ciclo..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Principais Oportunidades de Desenvolvimento / Lacunas</label>
                <textarea
                  value={opportunities}
                  onChange={e => setOpportunities(e.target.value)}
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                  placeholder="Liste 2 a 3 pontos que precisam de aprimoramento e guiarão o PDI..."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 ml-4">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          {isSaving ? 'Salvando...' : 'Salve o rascunho ou envie para concluir a avaliação'}
        </div>
        <div className="flex items-center gap-3 pr-4">
          <button
            disabled={!evalId || isSaving}
            onClick={async () => {
              await handleSave('draft');
              setToast('Rascunho salvo');
              setTimeout(() => setToast(null), 2500);
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> Salvar Rascunho
          </button>
          <button
            disabled={!evalId || isSaving}
            onClick={async () => {
              await handleSave('submitted');
              setToast('Avaliação enviada e registrada ✓');
              setTimeout(() => {
                setToast(null);
                if (onNavigate) {
                  const plan = pdiPlans.find(p => p.cycle_id === evaluation?.cycle_id);
                  if (plan) onNavigate('pdi_detail', plan.id);
                  else onNavigate('evaluations');
                }
              }, 1200);
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white bg-brand-900 hover:bg-brand-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> Enviar e Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

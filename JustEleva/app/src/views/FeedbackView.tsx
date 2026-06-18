import { useState, useEffect } from "react";
import { MessageSquare, Plus, X, Send, Target, AlertTriangle, ChevronRight, Filter } from "lucide-react";
import { useEmployees } from "../hooks/useEmployees";
import { useFeedbacks, useCreateFeedback } from "../hooks/useFeedback";
import { usePdiPlans, useAddPdiAction } from "../hooks/usePdi";
import { cn } from "../lib/utils";

const NEGATIVE_WORDS = ['sempre', 'nunca', 'péssimo', 'ruim', 'incompetente', 'burro', 'estúpido', 'pior', 'nada', 'ninguém'];

function NovoFeedbackModal({
  currentUserId,
  onClose,
}: {
  currentUserId?: string;
  onClose: () => void;
}) {
  const { data: employees = [] } = useEmployees();
  const createFeedback = useCreateFeedback();
  const addPdiAction = useAddPdiAction();

  const [toEmployeeId, setToEmployeeId] = useState('');
  const [feedbackType, setFeedbackType] = useState<'positive' | 'improvement'>('improvement');
  const [contexto, setContexto] = useState('');
  const [comportamento, setComportamento] = useState('');
  const [consequencia, setConsequencia] = useState('');
  const [construcao, setConstrucao] = useState('');
  const [continuidade, setContinuidade] = useState('');
  const [sentimentWarning, setSentimentWarning] = useState<string | null>(null);

  const [createPdiAction, setCreatePdiAction] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [pdiTitle, setPdiTitle] = useState('');
  const [pdiDeadline, setPdiDeadline] = useState('');
  const [error, setError] = useState('');

  const { data: pdiPlans = [] } = usePdiPlans(toEmployeeId ? { employee_id: toEmployeeId } : undefined);

  useEffect(() => {
    const check = setTimeout(() => {
      const text = `${comportamento} ${consequencia}`.toLowerCase();
      const found = NEGATIVE_WORDS.filter(w => text.includes(w));
      setSentimentWarning(found.length > 0
        ? `As palavras "${found.join(', ')}" podem soar generalistas. Prefira descrever fatos específicos.`
        : null);
    }, 800);
    return () => clearTimeout(check);
  }, [comportamento, consequencia]);

  useEffect(() => {
    if (createPdiAction && construcao && !pdiTitle) {
      setPdiTitle(construcao.slice(0, 80));
    }
  }, [createPdiAction, construcao]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!toEmployeeId) { setError('Selecione o colaborador.'); return; }
    const content = [contexto, comportamento, consequencia, construcao, continuidade].filter(Boolean).join('\n\n');
    if (!content.trim()) { setError('Preencha ao menos um campo do feedback.'); return; }
    if (createPdiAction && !selectedPlanId) { setError('Selecione o PDI do colaborador.'); return; }
    if (createPdiAction && !pdiTitle.trim()) { setError('Informe o título da ação de PDI.'); return; }
    if (createPdiAction && !pdiDeadline) { setError('Informe o prazo da ação de PDI.'); return; }

    try {
      await createFeedback.mutateAsync({
        from_employee_id: currentUserId ?? '',
        to_employee_id: toEmployeeId,
        content,
        type: feedbackType,
      });

      if (createPdiAction && selectedPlanId) {
        await addPdiAction.mutateAsync({
          planId: selectedPlanId,
          title: pdiTitle,
          description: `Originado de feedback 5Cs.\n\nContexto: ${contexto}\n\nConstrução esperada: ${construcao}`.trim(),
          status: 'pending',
          deadline: pdiDeadline,
        });
      }

      onClose();
    } catch {
      setError('Erro ao registrar. Tente novamente.');
    }
  }

  const isPending = createFeedback.isPending || addPdiAction.isPending;

  const fields = [
    {
      key: 'contexto',
      label: '1. Contexto',
      sub: 'Onde e quando a situação aconteceu? Seja específico e factual.',
      val: contexto,
      set: setContexto,
      ph: 'Ex: Na reunião de alinhamento do projeto X, realizada na última terça-feira...',
    },
    {
      key: 'comportamento',
      label: '2. Comportamento',
      sub: 'O que você observou? Descreva ações e palavras — sem julgamentos de personalidade.',
      val: comportamento,
      set: setComportamento,
      ph: 'Ex: Você interrompeu o cliente três vezes enquanto ele tentava explicar...',
    },
    {
      key: 'consequencia',
      label: '3. Consequência',
      sub: 'Qual foi o impacto desse comportamento no projeto, cliente ou equipe?',
      val: consequencia,
      set: setConsequencia,
      ph: 'Ex: Isso gerou tensão e prolongou a reunião em 30 minutos...',
    },
    {
      key: 'construcao',
      label: feedbackType === 'improvement' ? '4. Construção / Mudança' : '4. Celebração',
      sub: feedbackType === 'improvement'
        ? 'Quais são as expectativas para o futuro? O que precisa ser feito diferente?'
        : 'Como potencializar esse comportamento e inspirar a equipe?',
      val: construcao,
      set: setConstrucao,
      ph: 'Ex: Nas próximas reuniões, anote suas dúvidas e faça no momento reservado para perguntas...',
    },
    {
      key: 'continuidade',
      label: '5. Continuidade',
      sub: 'Como e quando faremos o acompanhamento deste ponto?',
      val: continuidade,
      set: setContinuidade,
      ph: 'Ex: Revisaremos esse ponto na nossa 1:1 mensal e no PDI...',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600" />
            Registrar Feedback 5Cs
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
          )}

          {sentimentWarning && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl flex gap-2 text-sm animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              {sentimentWarning}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Para *</label>
              <select
                value={toEmployeeId}
                onChange={e => setToEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">Selecione...</option>
                {employees.filter(e => e.id !== currentUserId).map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo</label>
              <div className="flex bg-slate-100 p-1 rounded-lg" style={{ height: 38 }}>
                <button
                  type="button"
                  onClick={() => setFeedbackType('improvement')}
                  className={cn("flex-1 text-xs font-bold rounded-md transition-all",
                    feedbackType === 'improvement' ? "bg-white text-brand-700 shadow-sm" : "text-slate-500")}
                >
                  Construtivo
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('positive')}
                  className={cn("flex-1 text-xs font-bold rounded-md transition-all",
                    feedbackType === 'positive' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500")}
                >
                  Positivo
                </button>
              </div>
            </div>
          </div>

          {fields.map(({ key, label, sub, val, set, ph }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-700 mb-0.5">{label}</label>
              <p className="text-[11px] text-slate-400 mb-1">{sub}</p>
              <textarea
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={ph}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none min-h-[72px]"
              />
            </div>
          ))}

          {/* PDI action toggle */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setCreatePdiAction(v => !v)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors",
                createPdiAction
                  ? "bg-brand-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              )}
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" /> Desdobrar em Ação de PDI
              </span>
              <span className={cn("text-xs font-medium", createPdiAction ? "text-brand-200" : "text-slate-400")}>
                {createPdiAction ? 'Ativado' : 'Opcional'}
              </span>
            </button>

            {createPdiAction && (
              <div className="p-4 space-y-3 bg-brand-50/40 border-t border-brand-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PDI do colaborador *</label>
                  {toEmployeeId === '' ? (
                    <p className="text-xs text-slate-400 italic">Selecione o colaborador primeiro.</p>
                  ) : pdiPlans.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nenhum PDI encontrado para este colaborador. Crie um em Plano de Desenvolvimento.
                    </p>
                  ) : (
                    <select
                      value={selectedPlanId}
                      onChange={e => setSelectedPlanId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
                    >
                      <option value="">Selecione o PDI...</option>
                      {pdiPlans.map(p => (
                        <option key={p.id} value={p.id}>{p.cycle_name} — {p.employee_name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Título da ação *</label>
                  <input
                    type="text"
                    value={pdiTitle}
                    onChange={e => setPdiTitle(e.target.value)}
                    placeholder="Ex: Praticar escuta ativa em reuniões com clientes"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prazo *</label>
                  <input
                    type="date"
                    value={pdiDeadline}
                    onChange={e => setPdiDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isPending ? 'Registrando...' : 'Registrar Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FeedbackView({
  onNavigate,
  currentUserId,
}: {
  onNavigate?: (view: string, id?: string) => void;
  currentUserId?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');

  const { data: employees = [] } = useEmployees();
  const { data: feedbacks = [], isLoading } = useFeedbacks(
    filterEmployee ? { to_employee_id: filterEmployee } : undefined
  );

  const typeLabel = (t: string) =>
    t === 'positive' ? 'Positivo' : t === 'recognition' ? 'Reconhecimento' : 'Construtivo';
  const typeColor = (t: string) =>
    t === 'positive' || t === 'recognition'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-brand-50 text-brand-700 border-brand-200';

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {showModal && (
        <NovoFeedbackModal
          currentUserId={currentUserId}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Feedback Contínuo</h1>
          <p className="text-sm text-slate-500 mt-1">Registros de feedback 5Cs da equipe.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Registrar Feedback
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Todos os colaboradores</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 font-medium ml-auto">
            {feedbacks.length} registro(s)
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Carregando...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum feedback registrado.</p>
            <p className="text-sm mt-1">Clique em "Registrar Feedback" para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feedbacks.map(entry => (
              <div
                key={entry.id}
                className="p-5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 cursor-default"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm shrink-0">
                    {(entry.to_name ?? '').split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{entry.to_name}</span>
                      <span className="text-xs text-slate-400">←</span>
                      <span className="text-xs text-slate-500">{entry.from_name}</span>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border", typeColor(entry.type))}>
                        {typeLabel(entry.type)}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{entry.content}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

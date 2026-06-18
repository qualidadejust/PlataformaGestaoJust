import { useState, useEffect } from "react";
import { ArrowLeft, Filter, Search, SlidersHorizontal, AlertCircle, Save, CheckCircle2, MessageSquare, X, AlertTriangle, MessageCircle, Target } from "lucide-react";
import { cn } from "../lib/utils";
import { useEvaluations, type Evaluation } from "../hooks/useEvaluations";
import { useCycles } from "../hooks/useCycles";
import { useCalibrations, useSaveCalibrations } from "../hooks/useCalibrations";
import { useFeedbacks } from "../hooks/useFeedback";
import { usePdiPlans } from "../hooks/usePdi";

type EmployeeGroup = {
  employee_id: string;
  employee_name: string;
  employee_role: string;
  evaluations: Evaluation[];
};

type CalibEntry = { score: string; potential: string; justification: string };

function JustificativaModal({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Justificativa de Calibração</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Descreva o motivo do ajuste de nota (evidências, comparação entre gestor e autoavaliação, contexto do período)..."
            className="w-full h-36 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button onClick={() => { onSave(text); onClose(); }} className="flex-1 py-2 bg-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PdiModal({
  groups,
  cycleId,
  pdiPlans,
  onNavigate,
  onClose,
}: {
  groups: EmployeeGroup[];
  cycleId: string;
  pdiPlans: { employee_id: string; cycle_id: string; id: string }[];
  onNavigate?: (view: string, id?: string) => void;
  onClose: () => void;
}) {
  const withoutPdi = groups.filter(g => !pdiPlans.some(p => p.employee_id === g.employee_id && p.cycle_id === cycleId));
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Calibração Finalizada
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          {withoutPdi.length > 0 ? (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Os colaboradores abaixo ainda <strong>não têm PDI</strong> para este ciclo. Deseja criar agora?
              </p>
              <ul className="space-y-2 mb-6">
                {withoutPdi.map(g => (
                  <li key={g.employee_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                      {g.employee_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{g.employee_name}</p>
                      <p className="text-xs text-slate-500">{g.employee_role}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Agora não
                </button>
                <button
                  onClick={() => { onClose(); onNavigate && onNavigate('pdi'); }}
                  className="flex-1 py-2.5 bg-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800 flex items-center justify-center gap-2"
                >
                  <Target className="w-4 h-4" /> Ir para PDI
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-6">
                Todos os colaboradores calibrados já têm PDI neste ciclo.
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Fechar
                </button>
                <button
                  onClick={() => { onClose(); onNavigate && onNavigate('pdi'); }}
                  className="flex-1 py-2.5 bg-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800 flex items-center justify-center gap-2"
                >
                  <Target className="w-4 h-4" /> Ver PDIs
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  draft: 'Rascunho',
  submitted: 'Submetida',
  completed: 'Concluída',
  feedback_pending: 'Ag. Feedback',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  submitted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  feedback_pending: 'bg-brand-50 text-brand-700 border border-brand-200',
};

const SCORE_CATEGORY = (s: string | number) => {
  const n = typeof s === 'number' ? s : parseFloat(String(s));
  if (isNaN(n)) return null;
  if (n >= 4.5) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (n >= 3.5) return { label: 'Bom', color: 'bg-brand-100 text-brand-800 border-brand-200' };
  if (n >= 2.5) return { label: 'Regular', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  return { label: 'Insatisfatório', color: 'bg-red-100 text-red-800 border-red-200' };
};

const POTENTIAL_OPTIONS = [
  { value: '', label: 'Selecionar' },
  { value: '1', label: '1 — Consolida (foco na função atual)' },
  { value: '2', label: '2 — Desenvolve (desafios maiores em 1–2 anos)' },
  { value: '3', label: '3 — Acelera (candidato a sucessão)' },
];

export function CalibrationView({ onNavigate }: { onNavigate?: (view: string, id?: string) => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: cycles = [] } = useCycles();
  const activeCycle = cycles.find(c => c.status === 'active');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [search, setSearch] = useState('');
  const [justModal, setJustModal] = useState<string | null>(null);
  const [finalizError, setFinalizError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showPdiModal, setShowPdiModal] = useState(false);

  useEffect(() => {
    if (activeCycle && !selectedCycleId) setSelectedCycleId(activeCycle.id);
  }, [activeCycle]);

  const { data: evaluations = [], isLoading } = useEvaluations(
    selectedCycleId ? { cycle_id: selectedCycleId } : undefined
  );
  const { data: savedCalibrations = [] } = useCalibrations(selectedCycleId || undefined);
  const { data: allFeedbacks = [] } = useFeedbacks();
  const { data: allPdiPlans = [] } = usePdiPlans();
  const saveCalibrations = useSaveCalibrations();

  const [calibrations, setCalibrations] = useState<Record<string, CalibEntry>>({});

  // Feedback count per employee
  const feedbackCount: Record<string, number> = {};
  allFeedbacks.forEach(f => {
    feedbackCount[f.to_employee_id] = (feedbackCount[f.to_employee_id] ?? 0) + 1;
  });

  useEffect(() => {
    if (savedCalibrations.length > 0) {
      const initial: Record<string, CalibEntry> = {};
      savedCalibrations.forEach(c => {
        initial[c.employee_id] = {
          score: c.score != null ? String(c.score) : '',
          potential: c.potential ?? '',
          justification: c.justification ?? '',
        };
      });
      setCalibrations(initial);
    }
  }, [savedCalibrations]);

  const setCalib = (empId: string, field: keyof CalibEntry, value: string) => {
    setIsSaved(false);
    setCalibrations(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
  };

  const groups: EmployeeGroup[] = evaluations.reduce<EmployeeGroup[]>((acc, ev) => {
    const existing = acc.find(g => g.employee_id === ev.employee_id);
    if (existing) {
      existing.evaluations.push(ev);
    } else {
      acc.push({
        employee_id: ev.employee_id,
        employee_name: ev.employee_name,
        employee_role: ev.employee_role,
        evaluations: [ev],
      });
      if (!calibrations[ev.employee_id]) {
        setCalibrations(prev => ({
          ...prev,
          [ev.employee_id]: { score: '', potential: '', justification: '' },
        }));
      }
    }
    return acc;
  }, []);

  const filtered = groups.filter(g =>
    !search ||
    g.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    g.employee_role.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  function buildEntries() {
    return Object.entries(calibrations).map(([employee_id, c]) => ({
      employee_id,
      score: c.score ? parseFloat(c.score) : null,
      potential: c.potential || null,
      justification: c.justification || null,
    }));
  }

  async function handleSave() {
    if (!selectedCycleId) return;
    await saveCalibrations.mutateAsync({ cycleId: selectedCycleId, entries: buildEntries(), status: 'draft' });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }

  async function handleFinalize() {
    setFinalizError('');
    const missing = groups.filter(g => {
      const c = calibrations[g.employee_id];
      if (!c?.score) return false;
      return parseFloat(c.score) >= 4.5 && !c.justification?.trim();
    });
    if (missing.length > 0) {
      setFinalizError(`Notas "Excelente" (≥ 4,5) exigem justificativa: ${missing.map(g => g.employee_name).join(', ')}.`);
      return;
    }
    if (!selectedCycleId) return;
    await saveCalibrations.mutateAsync({ cycleId: selectedCycleId, entries: buildEntries(), status: 'finalized' });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    setShowPdiModal(true);
  }

  const justifyingGroup = justModal ? filtered.find(g => g.employee_id === justModal) : null;

  function getGroupScores(group: EmployeeGroup) {
    const selfEval = group.evaluations.find(ev =>
      ev.type?.toLowerCase().includes('auto') || !ev.evaluator_id
    );
    const managerEval = group.evaluations.find(ev =>
      ev.type?.toLowerCase().includes('gestor') || (ev.evaluator_id && ev.evaluator_id !== ev.employee_id)
    );
    const selfScore = selfEval?.avg_score ?? null;
    const managerScore = managerEval?.avg_score ?? null;
    const delta = selfScore != null && managerScore != null ? selfScore - managerScore : null;
    const hasDiscrepancy = delta != null && Math.abs(delta) > 1;
    // avg_potential from manager eval (evaluator's assessment of employee potential)
    const avgPotential = managerEval?.avg_potential ?? selfEval?.avg_potential ?? null;
    return { selfScore, managerScore, delta, hasDiscrepancy, avgPotential };
  }

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      {justModal && justifyingGroup && (
        <JustificativaModal
          value={calibrations[justModal]?.justification ?? ''}
          onSave={v => setCalib(justModal, 'justification', v)}
          onClose={() => setJustModal(null)}
        />
      )}
      {showPdiModal && (
        <PdiModal
          groups={groups}
          cycleId={selectedCycleId}
          pdiPlans={allPdiPlans}
          onNavigate={onNavigate}
          onClose={() => setShowPdiModal(false)}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <SlidersHorizontal className="w-8 h-8 text-brand-600" />
            Comitê de Calibração
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Consolide as notas de desempenho e potencial por colaborador. Selecione o ciclo e ajuste as notas calibradas pelo comitê.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Salvo
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saveCalibrations.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> Salvar Rascunho
            </button>
            <button
              onClick={handleFinalize}
              disabled={saveCalibrations.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 border border-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800 transition-colors shadow-sm disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalizar Calibração
            </button>
          </div>
          {finalizError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 max-w-sm text-right">{finalizError}</p>
          )}
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-8 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-brand-900 mb-1">
            Diretrizes da Calibração {selectedCycle ? `— ${selectedCycle.name}` : ''}
          </h3>
          <ul className="text-sm text-brand-800 space-y-1 list-disc pl-4">
            <li>Discrepâncias <strong>&gt; 1 ponto</strong> entre autoavaliação e gestor são destacadas automaticamente em laranja.</li>
            <li>Nota calibrada <strong>"Excelente" (≥ 4,5)</strong> exige justificativa preenchida para finalizar.</li>
            <li>Potencial considera o horizonte de sucessão: <strong>Consolida</strong> (estabiliza), <strong>Desenvolve</strong> (1–2 anos), <strong>Acelera</strong> (sucessão imediata).</li>
            <li>A coluna <strong>"Potencial Avaliador"</strong> mostra a média do Eixo 2 preenchido na avaliação (escala 1–3).</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-56"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCycleId}
                onChange={e => { setSelectedCycleId(e.target.value); setCalibrations({}); }}
                className="py-2 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Selecione um ciclo</option>
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {isLoading ? 'Carregando...' : `${filtered.length} colaborador(es) no ciclo`}
          </div>
        </div>

        {!selectedCycleId ? (
          <div className="p-12 text-center text-slate-400">
            <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Selecione um ciclo para iniciar a calibração.</p>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando avaliações...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhuma avaliação encontrada neste ciclo.</p>
            <p className="text-sm mt-1">Crie avaliações em "Avaliações" e preencha-as para calibrar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-6 py-4 font-bold">Colaborador</th>
                  <th className="px-6 py-4 font-bold">Notas do Ciclo</th>
                  <th className="px-6 py-4 font-bold text-center">Feedbacks</th>
                  <th className="px-6 py-4 font-bold bg-brand-50/50 text-brand-800 border-x border-brand-100/50">Nota Calibrada</th>
                  <th className="px-6 py-4 font-bold bg-brand-50/50 text-brand-800">Pot. Avaliador</th>
                  <th className="px-6 py-4 font-bold bg-brand-50/50 text-brand-800 border-r border-brand-100/50">Potencial Comitê</th>
                  <th className="px-6 py-4 font-bold text-center">Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((group) => {
                  const calib = calibrations[group.employee_id] ?? { score: '', potential: '', justification: '' };
                  const cat = SCORE_CATEGORY(calib.score);
                  const initials = group.employee_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  const { delta, hasDiscrepancy, avgPotential } = getGroupScores(group);
                  const fbCount = feedbackCount[group.employee_id] ?? 0;

                  return (
                    <tr key={group.employee_id} className={cn("hover:bg-slate-50 transition-colors group", hasDiscrepancy && "bg-amber-50/30")}>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{group.employee_name}</p>
                            <p className="text-xs text-slate-500">{group.employee_role}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          {group.evaluations.map(ev => (
                            <div key={ev.id} className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-600 font-medium w-28 shrink-0">{ev.type}</span>
                              {ev.avg_score != null ? (
                                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                  {ev.avg_score.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">sem nota</span>
                              )}
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", STATUS_COLOR[ev.status] ?? 'bg-slate-100 text-slate-600')}>
                                {STATUS_LABEL[ev.status] ?? ev.status}
                              </span>
                            </div>
                          ))}
                          {hasDiscrepancy && delta != null && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-[11px] font-bold text-amber-700">
                                Δ {delta > 0 ? '+' : ''}{delta.toFixed(1)} — discrepância &gt; 1 pt
                              </span>
                            </div>
                          )}
                          {!hasDiscrepancy && delta != null && Math.abs(delta) > 0 && (
                            <div className="text-[11px] text-slate-400">
                              Δ {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Feedbacks */}
                      <td className="px-6 py-5 text-center">
                        {fbCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-full">
                            <MessageCircle className="w-3.5 h-3.5" /> {fbCount}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">—</span>
                        )}
                      </td>

                      {/* Nota Calibrada */}
                      <td className="px-6 py-5 whitespace-nowrap bg-brand-50/30 border-x border-brand-50/50">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="5"
                            placeholder="—"
                            value={calib.score}
                            onChange={e => setCalib(group.employee_id, 'score', e.target.value)}
                            className="w-20 px-3 py-1.5 bg-white border border-brand-200 rounded-lg text-sm font-bold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-center"
                          />
                          {cat && (
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", cat.color)}>
                              {cat.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Potencial Avaliador (read-only, from evaluation Eixo 2) */}
                      <td className="px-6 py-5 whitespace-nowrap bg-brand-50/30 text-center">
                        {avgPotential != null ? (
                          <span className="text-xs font-bold text-brand-700 bg-brand-100 border border-brand-200 px-2 py-1 rounded-lg">
                            {avgPotential.toFixed(1)}/3
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Potencial Comitê */}
                      <td className="px-6 py-5 whitespace-nowrap bg-brand-50/30 border-r border-brand-50/50">
                        <select
                          value={calib.potential}
                          onChange={e => setCalib(group.employee_id, 'potential', e.target.value)}
                          className="w-52 px-3 py-1.5 bg-white border border-brand-200 rounded-lg text-sm font-medium text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        >
                          {POTENTIAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <button
                          onClick={() => setJustModal(group.employee_id)}
                          title={calib.justification || 'Adicionar justificativa'}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            calib.justification
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <MessageSquare className={cn("w-4 h-4", calib.justification && "fill-emerald-100")} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

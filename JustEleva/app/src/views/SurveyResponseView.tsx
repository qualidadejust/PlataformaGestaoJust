import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ShieldCheck, Send, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useSurveyCampaigns, useSurveyForm, useSubmitResponse } from "../hooks/useSurveys";
import { useEmployees } from "../hooks/useEmployees";

const SCALE = [
  { v: 1, label: 'Muito insatisfeito', color: 'bg-red-500 border-red-500' },
  { v: 2, label: 'Insatisfeito', color: 'bg-orange-400 border-orange-400' },
  { v: 3, label: 'Neutro', color: 'bg-amber-400 border-amber-400' },
  { v: 4, label: 'Satisfeito', color: 'bg-emerald-400 border-emerald-400' },
  { v: 5, label: 'Muito satisfeito', color: 'bg-emerald-600 border-emerald-600' },
];

export function SurveyResponseView({ campaignId, onBack }: { campaignId?: string; onBack: () => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { data: campaigns = [] } = useSurveyCampaigns();
  const campaign = campaigns.find(c => c.id === campaignId);
  const { data: form } = useSurveyForm(campaign?.form_id);
  const { data: employees = [] } = useEmployees();
  const submit = useSubmitResponse(campaignId || '');

  const [costCenter, setCostCenter] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const obras = useMemo(() => [...new Set(employees.map(e => e.cost_center).filter(Boolean) as string[])].sort(), [employees]);

  if (done) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-24 animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4"><CheckCircle2 className="w-9 h-9 text-emerald-600" /></div>
        <h1 className="text-2xl font-bold text-slate-900">Resposta enviada!</h1>
        <p className="text-slate-500 mt-2 max-w-md">Obrigado por participar. Sua resposta é <strong>anônima</strong> e ajuda a melhorar o ambiente de trabalho.</p>
        <div className="flex gap-3 mt-8">
          <button onClick={() => { setAnswers({}); setComment(''); setCostCenter(''); setDone(false); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold">Responder outra (próximo)</button>
          <button onClick={onBack} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Voltar</button>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    setError('');
    if (!costCenter) { setError('Selecione sua obra/área.'); return; }
    try {
      await submit.mutateAsync({ cost_center: costCenter, answers, comment: comment.trim() || undefined });
      setDone(true);
      window.scrollTo(0, 0);
    } catch { setError('Erro ao enviar. Tente novamente.'); }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6"><ArrowLeft className="w-4 h-4" /> Voltar</button>

      <div className="bg-brand-900 text-white rounded-2xl p-6 mb-8 shadow-sm">
        <h1 className="text-xl font-bold">{campaign?.name ?? 'Pesquisa de Satisfação'}</h1>
        <p className="text-brand-100 text-sm mt-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Pesquisa <strong>anônima</strong> — não pedimos seu nome. Responda com sinceridade.</p>
      </div>

      {/* Obra/área */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <label className="block text-sm font-bold text-slate-800 mb-2">Em qual obra / área você trabalha? *</label>
        <select value={costCenter} onChange={e => setCostCenter(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
          <option value="">Selecione...</option>
          {obras.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {form?.dimensions.map(dim => (
        <div key={dim.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200"><h3 className="font-bold text-slate-900">{dim.title}</h3></div>
          <div className="p-6 space-y-7">
            {dim.questions.map(q => (
              <div key={q.id}>
                <p className="text-sm font-semibold text-slate-800 mb-3">{q.text}</p>
                {q.kind === 'enps' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 11 }, (_, i) => i).map(n => (
                      <button key={n} onClick={() => setAnswers(a => ({ ...a, [q.id]: n }))}
                        className={cn("w-9 h-9 rounded-lg text-sm font-bold border transition-all",
                          answers[q.id] === n ? "bg-brand-900 text-white border-brand-900 scale-105" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300")}>{n}</button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {SCALE.map(s => (
                      <button key={s.v} onClick={() => setAnswers(a => ({ ...a, [q.id]: s.v }))}
                        className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold transition-all min-w-[88px]",
                          answers[q.id] === s.v ? `${s.color} text-white shadow-md scale-105` : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300")}>
                        <span className="text-base">{s.v}</span>{s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <label className="block text-sm font-bold text-slate-800 mb-2">Sugestões, comentários e observações</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Opcional — fique à vontade, é anônimo." />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">{error}</p>}

      <button onClick={handleSubmit} disabled={submit.isPending} className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm disabled:opacity-60">
        <Send className="w-5 h-5" /> {submit.isPending ? 'Enviando...' : 'Enviar Resposta'}
      </button>
    </div>
  );
}

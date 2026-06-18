import { useState, useEffect } from "react";
import { Plus, X, Smile, Megaphone, AlertTriangle, Trash2, MessageSquare, TrendingUp, ClipboardCheck } from "lucide-react";
import { cn } from "../lib/utils";
import {
  useSurveyCampaigns, useSurveyResults, useSurveyForms, useCreateCampaign,
  useSurveyActions, useCreateSurveyAction, useUpdateSurveyAction, useDeleteSurveyAction,
  type SurveyResults, type SurveyCampaign,
} from "../hooks/useSurveys";

function mediaColor(m: number) {
  if (m >= 4.5) return "bg-emerald-500 text-white";
  if (m >= 4.0) return "bg-emerald-300 text-emerald-900";
  if (m >= 3.5) return "bg-amber-300 text-amber-900";
  if (m >= 3.0) return "bg-orange-300 text-orange-900";
  return "bg-red-400 text-white";
}

const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', open: 'Aberta', closed: 'Encerrada' };

function NovaCampanhaModal({ onClose }: { onClose: () => void }) {
  const { data: forms = [] } = useSurveyForms();
  const create = useCreateCampaign();
  const [form, setForm] = useState({ name: '', revision: '', form_id: '', start_date: '', end_date: '', status: 'open', min_n: 5 });
  const [error, setError] = useState('');
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { if (forms[0] && !form.form_id) set('form_id', forms[0].id); }, [forms]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.form_id) { setError('Nome e formulário são obrigatórios.'); return; }
    try { await create.mutateAsync({ ...form, min_n: Number(form.min_n), status: form.status as SurveyCampaign['status'] }); onClose(); }
    catch { setError('Erro ao criar campanha.'); }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nova Campanha de Clima</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Pesquisa de Clima 2026.1" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Revisão</label>
              <input value={form.revision} onChange={e => set('revision', e.target.value)} placeholder="07" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">N mínimo</label>
              <input type="number" min={1} value={form.min_n} onChange={e => set('min_n', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
          </div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Formulário *</label>
            <select value={form.form_id} onChange={e => set('form_id', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Início</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Fim</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
          </div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <option value="open">Aberta (coletando)</option><option value="draft">Rascunho</option><option value="closed">Encerrada</option>
            </select></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold disabled:opacity-60">{create.isPending ? 'Criando...' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NovaAcaoModal({ campaignId, results, onClose }: { campaignId: string; results?: SurveyResults; onClose: () => void }) {
  const create = useCreateSurveyAction(campaignId);
  const [form, setForm] = useState({ dimension_title: '', cost_center: '', title: '', description: '', owner: '', deadline: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { if (results?.byDimension[0] && !form.dimension_title) set('dimension_title', results.byDimension[0].title); }, [results]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.dimension_title) { setError('Dimensão e título são obrigatórios.'); return; }
    try { await create.mutateAsync({ ...form, cost_center: form.cost_center || undefined }); onClose(); }
    catch { setError('Erro ao criar ação.'); }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nova Ação (Plano)</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Dimensão *</label>
              <select value={form.dimension_title} onChange={e => set('dimension_title', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                {results?.byDimension.map(d => <option key={d.id} value={d.title}>{d.title}</option>)}
              </select></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Obra (opcional)</label>
              <select value={form.cost_center} onChange={e => set('cost_center', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <option value="">Todas</option>
                {results?.costCenters.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Ação *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Revisar comunicação dos líderes com a equipe" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} className="w-full h-20 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Responsável</label>
              <input value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Nome" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Prazo</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold disabled:opacity-60">{create.isPending ? 'Salvando...' : 'Criar Ação'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SurveyView({ onNavigate }: { onNavigate?: (view: string, id?: string) => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { data: campaigns = [], isLoading } = useSurveyCampaigns();
  const [selectedId, setSelectedId] = useState('');
  const [campaignModal, setCampaignModal] = useState(false);
  const [actionModal, setActionModal] = useState(false);

  const campaignId = selectedId || campaigns[0]?.id || '';
  const campaign = campaigns.find(c => c.id === campaignId);
  const { data: results } = useSurveyResults(campaignId);
  const { data: actions = [] } = useSurveyActions(campaignId);
  const updateAction = useUpdateSurveyAction(campaignId);
  const delAction = useDeleteSurveyAction(campaignId);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  // dimensão mais crítica (menor geral) para destaque
  const critical = results?.byDimension.filter(d => d.geral != null).sort((a, b) => (a.geral! - b.geral!))[0];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {campaignModal && <NovaCampanhaModal onClose={() => setCampaignModal(false)} />}
      {actionModal && <NovaAcaoModal campaignId={campaignId} results={results} onClose={() => setActionModal(false)} />}

      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2"><Smile className="w-6 h-6 text-brand-600" /> Pesquisa de Clima</h1>
          <p className="text-sm text-slate-500 mt-1">Satisfação interna anônima, por dimensão e obra. Resultados só com grupo ≥ {campaign?.min_n ?? 5}.</p>
        </div>
        <div className="flex items-center gap-3">
          {campaigns.length > 0 && (
            <select value={campaignId} onChange={e => setSelectedId(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}{c.revision ? ` (Rev ${c.revision})` : ''}</option>)}
            </select>
          )}
          {campaign?.status === 'open' && (
            <button onClick={() => onNavigate && onNavigate('survey_respond', campaignId)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm">
              <Megaphone className="w-4 h-4" /> Responder (Quiosque)
            </button>
          )}
          <button onClick={() => setCampaignModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold shadow-sm">
            <Plus className="w-4 h-4" /> Nova Campanha
          </button>
        </div>
      </div>

      {!campaign ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Smile className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">Nenhuma campanha de clima ainda.</p>
          <p className="text-xs text-slate-400 mt-1">Clique em "Nova Campanha" para começar.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Média Global" value={results?.overallMedia != null ? results.overallMedia.toFixed(1) : '—'} hint="escala 1–5" />
            <KpiCard label="eNPS" value={results?.enps != null ? String(results.enps) : '—'} hint="−100 a +100" />
            <KpiCard label="Respostas" value={String(campaign.response_count ?? 0)} hint={STATUS_LABEL[campaign.status]} />
            <KpiCard label="Ações do Plano" value={String(actions.length)} hint={`${actions.filter(a => a.status === 'completed').length} concluída(s)`} />
          </div>

          {critical && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-8 text-sm text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span><strong>Dimensão a priorizar:</strong> {critical.title} (média {critical.geral?.toFixed(1)}). Crie uma ação para fechar o ciclo.</span>
            </div>
          )}

          {/* Heatmap dimensão × obra */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 overflow-x-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-600" /> Médias por Dimensão e Obra</h2>
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400">
                  <th className="text-left font-semibold py-2 pr-4">Dimensão</th>
                  {results?.costCenters.map(cc => <th key={cc} className="px-2 py-2 font-semibold text-center">{cc}</th>)}
                  <th className="px-2 py-2 font-semibold text-center text-slate-700">Geral</th>
                </tr>
              </thead>
              <tbody>
                {results?.byDimension.map(d => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-700">{d.title}</td>
                    {results.costCenters.map(cc => {
                      const cell = d.cells[cc];
                      return (
                        <td key={cc} className="px-2 py-1.5 text-center">
                          {!cell ? <span className="text-slate-300">—</span>
                            : 'suppressed' in cell ? <span className="text-[10px] text-slate-400 italic" title="Grupo abaixo do N mínimo (anonimato)">N&lt;{campaign.min_n}</span>
                              : <span className={cn("inline-block w-11 py-1 rounded-md font-bold text-xs", mediaColor(cell.media))}>{cell.media.toFixed(1)}</span>}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center">
                      {d.geral != null ? <span className={cn("inline-block w-11 py-1 rounded-md font-bold text-xs ring-2 ring-slate-200", mediaColor(d.geral))}>{d.geral.toFixed(1)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-400 mt-3">Cores: vermelho &lt;3 · laranja 3–3,5 · amarelo 3,5–4 · verde-claro 4–4,5 · verde ≥4,5.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plano de Ação */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-brand-600" /> Plano de Ação</h2>
                <button onClick={() => setActionModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"><Plus className="w-3.5 h-3.5" /> Nova Ação</button>
              </div>
              {actions.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhuma ação ainda. Transforme os pontos críticos em ações com responsável e prazo.</p>
              ) : (
                <div className="space-y-2">
                  {actions.map(a => (
                    <div key={a.id} className="border border-slate-100 rounded-xl p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{a.dimension_title}{a.cost_center ? ` · ${a.cost_center}` : ''}{a.owner ? ` · ${a.owner}` : ''}{a.deadline ? ` · ${new Date(a.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}</p>
                      </div>
                      <select value={a.status} onChange={e => updateAction.mutate({ id: a.id, status: e.target.value as any })} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1 focus:outline-none shrink-0">
                        <option value="pending">Planejado</option><option value="in_progress">Andamento</option><option value="completed">Concluído</option>
                      </select>
                      <button onClick={() => { if (confirm('Excluir esta ação?')) delAction.mutate(a.id); }} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comentários */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-brand-600" /> Comentários ({results?.comments.length ?? 0})</h2>
              {(results?.comments.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Sem comentários nesta rodada.</p>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {results?.comments.map(c => (
                    <div key={c.id} className="border border-slate-100 rounded-xl p-3">
                      <p className="text-sm text-slate-700 leading-relaxed">"{c.text}"</p>
                      {c.cost_center && <p className="text-[11px] text-slate-400 mt-1">{c.cost_center}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 mt-1">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

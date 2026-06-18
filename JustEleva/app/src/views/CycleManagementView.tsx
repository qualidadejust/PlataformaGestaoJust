import { useState } from "react";
import { Calendar, Clock, Building, Plus, AlertTriangle, BarChartHorizontal, X, CheckCircle2, Sparkles, Send, Copy, Check, RefreshCw } from "lucide-react";
import { useCycles, useCreateCycle, useUpdateCycle, useGenerateCycle, useCycleAccessTokens } from "../hooks/useCycles";
import type { Cycle, GenerateResult, AccessLink } from "../hooks/useCycles";
import { useEvaluations } from "../hooks/useEvaluations";
import { cn } from "../lib/utils";

function NovoCicloModal({ onClose }: { onClose: () => void }) {
  const create = useCreateCycle();
  const [form, setForm] = useState<Omit<Cycle, 'id'>>({ name: '', start_date: '', end_date: '', status: 'draft' });
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      setError('Nome, data de início e data de fim são obrigatórios.');
      return;
    }
    try {
      await create.mutateAsync(form);
      onClose();
    } catch {
      setError('Erro ao criar ciclo. Tente novamente.');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Novo Ciclo de Avaliação</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome do ciclo *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Avaliação Semestral 2027.1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Início *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fim *</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status inicial</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {create.isPending ? 'Criando...' : 'Criar Ciclo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; dot: string; border: string; bg: string; barColor: string }> = {
  active:    { label: 'Ativo',     dot: 'bg-brand-500',    border: 'border-brand-200',   bg: 'bg-brand-50',    barColor: 'bg-brand-500' },
  completed: { label: 'Encerrado', dot: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50', barColor: 'bg-emerald-500' },
  closed:    { label: 'Encerrado', dot: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50', barColor: 'bg-emerald-500' },
  draft:     { label: 'Rascunho',  dot: 'bg-slate-400',   border: 'border-slate-200',  bg: 'bg-slate-100',  barColor: 'bg-slate-300' },
};

export function CycleManagementView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('overview');
  const [showModal, setShowModal] = useState(false);

  const { data: cycles = [], isLoading } = useCycles();
  const updateCycle = useUpdateCycle();
  const generate = useGenerateCycle();
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const dispatch = useCycleAccessTokens();
  const [links, setLinks] = useState<AccessLink[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const activeCycle = cycles.find(c => c.status === 'active');
  const nonActiveCycles = cycles.filter(c => c.status !== 'active');

  const { data: activeEvals = [] } = useEvaluations(activeCycle ? { cycle_id: activeCycle.id } : undefined);

  const fmtDate = (d?: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

  // % of cycle elapsed based on today's date
  const cycleProgress = (() => {
    if (!activeCycle) return 0;
    const start = new Date(activeCycle.start_date + 'T00:00:00').getTime();
    const end = new Date(activeCycle.end_date + 'T00:00:00').getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  })();

  const completedEvals = activeEvals.filter(e => ['submitted', 'completed'].includes(e.status));
  const pendingEvals = activeEvals.filter(e => e.status === 'pending');
  const draftEvals = activeEvals.filter(e => e.status === 'draft');
  const engagementRate = activeEvals.length > 0 ? Math.round((completedEvals.length / activeEvals.length) * 100) : 0;

  // Group by department/role for area progress
  type AreaStat = { completed: number; total: number };
  const byArea: Record<string, AreaStat> = {};
  activeEvals.forEach(ev => {
    const area = (ev as any).employee_department ?? ev.employee_role ?? 'Outros';
    if (!byArea[area]) byArea[area] = { completed: 0, total: 0 };
    byArea[area].total++;
    if (['submitted', 'completed'].includes(ev.status)) byArea[area].completed++;
  });
  const areaData = Object.entries(byArea)
    .map(([name, v]) => ({ name, ...v, pct: Math.round((v.completed / v.total) * 100) }))
    .sort((a, b) => b.total - a.total);
  const bottlenecks = areaData.filter(a => a.pct < 50);

  // Gantt: compute date range across all cycles
  const today = new Date();
  const allDates = cycles.flatMap(c => [
    new Date(c.start_date + 'T00:00:00'),
    new Date(c.end_date + 'T00:00:00'),
  ]);
  const minMs = allDates.length > 0 ? Math.min(...allDates.map(d => d.getTime())) : today.getTime();
  const maxMs = allDates.length > 0 ? Math.max(...allDates.map(d => d.getTime())) : today.getTime();
  const totalMs = maxMs - minMs || 1;

  const getCycleBar = (c: Cycle) => {
    const start = new Date(c.start_date + 'T00:00:00').getTime();
    const end = new Date(c.end_date + 'T00:00:00').getTime();
    return {
      left: ((start - minMs) / totalMs) * 100,
      width: Math.max(((end - start) / totalMs) * 100, 1),
    };
  };

  const todayPct = Math.min(100, Math.max(0, ((today.getTime() - minMs) / totalMs) * 100));

  if (isLoading) return <div className="p-8 text-center text-slate-400">Carregando...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {showModal && <NovoCicloModal onClose={() => setShowModal(false)} />}

      {links && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLinks(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-brand-700" /> Disparo &amp; Acompanhamento
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => { const r = await dispatch.mutateAsync(activeCycle!.id); setLinks(r); }}
                  disabled={dispatch.isPending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", dispatch.isPending && "animate-spin")} /> Atualizar
                </button>
                <button onClick={() => setLinks(null)} aria-label="Fechar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {links.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Nenhum avaliador com avaliações neste ciclo. Gere as avaliações primeiro.</p>
              ) : (() => {
                const totalAval = links.length;
                const concluidosAval = links.filter(l => l.pendentes === 0).length;
                const totalEvals = links.reduce((s, l) => s + l.total, 0);
                const concluidasEvals = links.reduce((s, l) => s + (l.total - l.pendentes), 0);
                const pctGeral = totalEvals > 0 ? Math.round((concluidasEvals / totalEvals) * 100) : 0;
                return (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-slate-800">{concluidosAval}<span className="text-base font-normal text-slate-400">/{totalAval}</span></p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">avaliadores concluíram</p>
                    </div>
                    <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-brand-800">{pctGeral}%</p>
                      <p className="text-xs font-medium text-brand-700/70 mt-0.5">{concluidasEvals}/{totalEvals} avaliações</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">Cada avaliador acessa <strong>sua fila</strong> pelo link pessoal — sem senha. Acompanhe e cobre pelo WhatsApp:</p>
                  <ul className="space-y-3">
                    {links.map(l => {
                      const url = `${window.location.origin}/avaliar/${l.token}`;
                      const feitas = l.total - l.pendentes;
                      const pct = l.total > 0 ? Math.round((feitas / l.total) * 100) : 0;
                      const done = l.pendentes === 0;
                      const naoIniciou = feitas === 0;
                      const msg = `Olá, ${l.evaluator_name.split(' ')[0]}! Suas avaliações do ciclo ${activeCycle?.name ?? ''} já estão disponíveis (${l.pendentes} pendente${l.pendentes === 1 ? '' : 's'}). Acesse pelo link: ${url}`;
                      const digits = (l.phone ?? '').replace(/\D/g, '');
                      const wa = digits ? `https://wa.me/${digits.length <= 11 ? '55' + digits : digits}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      return (
                        <li key={l.token} className="border border-slate-200 rounded-xl p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{l.evaluator_name}</p>
                              <p className="text-xs text-slate-500 truncate">{l.evaluator_role}</p>
                            </div>
                            <span className={cn("shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              done ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : naoIniciou ? "text-slate-500 bg-slate-100 border-slate-200"
                              : "text-amber-700 bg-amber-50 border-amber-200")}>
                              {done ? "Concluído" : naoIniciou ? "Não iniciou" : "Em andamento"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", done ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 shrink-0">{feitas}/{l.total}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { navigator.clipboard?.writeText(url); setCopied(l.token); setTimeout(() => setCopied(c => c === l.token ? null : c), 1500); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              {copied === l.token ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar link</>}
                            </button>
                            <a
                              href={wa} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" /> {done ? "Reenviar" : "Cobrar"}
                            </a>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-slate-400 mt-4">Sem custo: abre o WhatsApp com a mensagem pronta. Clique <strong>Atualizar</strong> para ver o progresso mais recente. Automação em massa (API oficial) pode ser ligada depois.</p>
                </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {genResult && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setGenResult(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Avaliações geradas
              </h2>
              <button onClick={() => setGenResult(null)} aria-label="Fechar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{genResult.criadas}</p>
                  <p className="text-xs font-medium text-emerald-600 mt-1">Criadas agora</p>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-700">{genResult.ja_existiam}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Já existiam</p>
                </div>
              </div>
              {genResult.avisos.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Pendências de configuração
                  </p>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc pl-4">
                    {genResult.avisos.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                  <p className="text-xs text-amber-700/80 mt-3">Defina o avaliador responsável na tela <span className="font-semibold">Obras</span> e gere novamente — não duplica o que já foi criado.</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                {onNavigate && (
                  <button onClick={() => { setGenResult(null); onNavigate('evaluations'); }} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors">
                    Ver avaliações
                  </button>
                )}
                <button onClick={() => setGenResult(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Gestão de Ciclos</h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhamento e planejamento dos ciclos de avaliação da empresa.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Novo Ciclo
        </button>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'overview' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900 focus:outline-none")}
        >
          <BarChartHorizontal className="w-4 h-4" /> Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'calendar' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900 focus:outline-none")}
        >
          <Calendar className="w-4 h-4" /> Linha do Tempo
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {activeCycle ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold uppercase tracking-wider border border-brand-200">
                        Ciclo Ativo
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{activeCycle.name}</h2>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {fmtDate(activeCycle.start_date)} a {fmtDate(activeCycle.end_date)}
                    </p>
                    <div className="mt-4 max-w-md">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>{fmtDate(activeCycle.start_date)}</span>
                        <span className="font-semibold text-slate-600">{cycleProgress}% do período decorrido</span>
                        <span>{fmtDate(activeCycle.end_date)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-brand-500 h-2 rounded-full transition-all duration-700" style={{ width: `${cycleProgress}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-slate-500 mb-1">Engajamento</p>
                    <div className="text-3xl font-extrabold text-brand-600">{engagementRate}%</div>
                    <p className="text-xs text-slate-400 mt-0.5">{completedEvals.length}/{activeEvals.length} concluídas</p>
                    <div className="mt-3 flex flex-col items-end gap-2">
                      <button
                        onClick={async () => {
                          const r = await generate.mutateAsync(activeCycle.id);
                          setGenResult(r);
                        }}
                        disabled={generate.isPending}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-brand-900 rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {generate.isPending ? 'Gerando…' : 'Gerar avaliações'}
                      </button>
                      <button
                        onClick={async () => { const r = await dispatch.mutateAsync(activeCycle.id); setLinks(r); }}
                        disabled={dispatch.isPending}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {dispatch.isPending ? 'Gerando links…' : 'Disparar (WhatsApp)'}
                      </button>
                      <button
                        onClick={() => updateCycle.mutate({ ...activeCycle, status: 'closed' as any })}
                        disabled={updateCycle.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Encerrar Ciclo
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left: eval summary + calibration */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" /> Avaliações do Ciclo
                  </h3>

                  {activeEvals.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">
                      Nenhuma avaliação criada neste ciclo. Crie em <span className="font-medium text-slate-600">Avaliações</span>.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                        <p className="text-2xl font-bold text-slate-700">{activeEvals.length}</p>
                        <p className="text-xs font-medium text-slate-400 mt-1">Total</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                        <p className="text-2xl font-bold text-emerald-700">{completedEvals.length}</p>
                        <p className="text-xs font-medium text-emerald-600 mt-1">Concluídas</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                        <p className="text-2xl font-bold text-amber-700">{pendingEvals.length + draftEvals.length}</p>
                        <p className="text-xs font-medium text-amber-600 mt-1">Pendentes</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 mb-1">Comitê de Calibração</h4>
                    <p className="text-xs text-slate-500 mb-4">Ajuste e consolide as notas de desempenho e potencial.</p>
                    <button
                      onClick={() => onNavigate && onNavigate('calibration')}
                      className="w-full py-2 bg-brand-900 text-white text-sm font-bold rounded-lg hover:bg-brand-800 transition-colors shadow-sm"
                    >
                      Acessar Painel de Calibração
                    </button>
                  </div>
                </div>

                {/* Right: area progress */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
                    <Building className="w-5 h-5 text-slate-400" /> Progresso por Área
                  </h3>

                  {bottlenecks.length > 0 && (
                    <div className="mb-5 bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-900">Alerta de Gargalos</p>
                          <p className="text-xs text-amber-800 mt-0.5 mb-2">Áreas com menos de 50% de conclusão:</p>
                          <div className="flex flex-wrap gap-2">
                            {bottlenecks.map(b => (
                              <span key={b.name} className="text-xs bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-medium">
                                {b.name} — {b.pct}%
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {areaData.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">Crie avaliações no ciclo ativo para ver o progresso por área.</p>
                  ) : (
                    <div className="space-y-5">
                      {areaData.map(area => (
                        <div key={area.name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-sm text-slate-700">{area.name}</span>
                            <span className={cn(
                              "text-xs font-semibold px-2.5 py-1 rounded-lg border",
                              area.pct < 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                              {area.completed}/{area.total} ({area.pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all duration-700",
                                area.pct >= 90 ? "bg-emerald-500" : area.pct >= 50 ? "bg-brand-500" : "bg-amber-500"
                              )}
                              style={{ width: `${area.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center mb-8">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">Nenhum ciclo ativo no momento.</p>
              <p className="text-sm text-slate-400 mt-1">Crie um novo ciclo ou ative um existente para acompanhar avaliações.</p>
            </div>
          )}

          {/* Historical cycles */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-semibold text-slate-800">Histórico de Ciclos</h3>
            </div>
            {nonActiveCycles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Nenhum ciclo anterior.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white">
                    <th className="px-6 py-4">Nome do Ciclo</th>
                    <th className="px-6 py-4">Período</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nonActiveCycles.map(c => {
                    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.draft;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 text-sm">{c.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{fmtDate(c.start_date)} a {fmtDate(c.end_date)}</td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.bg, cfg.border)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {c.status === 'draft' && (
                              <button
                                onClick={() => updateCycle.mutate({ ...c, status: 'active' })}
                                disabled={updateCycle.isPending}
                                className="text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-50"
                              >
                                Ativar
                              </button>
                            )}
                            <button
                              onClick={() => onNavigate && onNavigate('reports')}
                              className="text-brand-600 text-sm font-medium hover:text-brand-800 transition-colors"
                            >
                              Ver Relatório
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Linha do Tempo dos Ciclos</h2>
            <p className="text-sm text-slate-500">Visualização cronológica de todos os ciclos de avaliação.</p>
          </div>

          {cycles.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Nenhum ciclo cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="flex items-center gap-6 text-xs font-medium text-slate-500 mb-6">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand-500" /> Ativo</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Encerrado</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300" /> Rascunho</div>
                  <div className="flex items-center gap-1.5"><span className="w-px h-4 bg-rose-400" /> Hoje</div>
                </div>

                <div className="space-y-5">
                  {cycles.map(c => {
                    const { left, width } = getCycleBar(c);
                    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.draft;
                    return (
                      <div key={c.id} className="flex items-center gap-4">
                        <div className="w-44 shrink-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                          <p className="text-xs text-slate-400">{fmtDate(c.start_date)} – {fmtDate(c.end_date)}</p>
                        </div>
                        <div className="flex-1 relative h-8 bg-slate-50 rounded-full border border-slate-100">
                          <div
                            className="absolute top-0 bottom-0 w-px bg-rose-400 z-10"
                            style={{ left: `${todayPct}%` }}
                          />
                          <div
                            className={cn("absolute h-full rounded-full flex items-center justify-center overflow-hidden", cfg.barColor)}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            {width > 12 && (
                              <span className="text-[10px] font-bold text-white px-2 truncate">{c.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Today label row */}
                  <div className="flex items-center gap-4">
                    <div className="w-44 shrink-0" />
                    <div className="flex-1 relative h-4">
                      <span
                        className="absolute text-xs font-medium text-rose-500"
                        style={{ left: `${todayPct}%`, transform: 'translateX(-50%)' }}
                      >
                        ▲ Hoje
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

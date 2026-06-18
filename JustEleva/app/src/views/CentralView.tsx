import { useState, useEffect, useMemo } from "react";
import { CalendarClock, ClipboardList, Target, Smile, AlertTriangle, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "../lib/utils";
import { useEvaluations } from "../hooks/useEvaluations";
import { usePdiPlans } from "../hooks/usePdi";
import { useSurveyCampaigns } from "../hooks/useSurveys";
import { useEmployees } from "../hooks/useEmployees";

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  if (d.includes('/')) { const [dd, mm, yy] = d.split('/'); const dt = new Date(`${yy}-${mm}-${dd}T23:59:59`); return isNaN(dt.getTime()) ? null : dt; }
  const dt = new Date(d + 'T23:59:59'); return isNaN(dt.getTime()) ? null : dt;
}
const fmt = (d?: string | null) => { const dt = parseDate(d); return dt ? dt.toLocaleDateString('pt-BR') : '—'; };
const isPast = (d?: string | null) => { const dt = parseDate(d); return !!dt && dt.getTime() < Date.now(); };

const PENDING_EVAL = new Set(['pending', 'draft', 'feedback_pending']);

export function CentralView({ onNavigate }: { onNavigate?: (view: string, id?: string) => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { data: evaluations = [] } = useEvaluations();
  const { data: pdis = [] } = usePdiPlans();
  const { data: campaigns = [] } = useSurveyCampaigns();
  const { data: employees = [] } = useEmployees();

  const [area, setArea] = useState('');

  const deptOf = useMemo(() => { const m = new Map(employees.map(e => [e.name, e.department])); return (name?: string) => (name ? m.get(name) : undefined); }, [employees]);
  const departments = useMemo(() => [...new Set(employees.map(e => e.department))].sort(), [employees]);
  const inArea = (name?: string) => !area || deptOf(name) === area;

  // --- Avaliações pendentes ---
  const pendingEvals = evaluations.filter(e => PENDING_EVAL.has(e.status) && inArea(e.employee_name));
  const overdueEvals = pendingEvals.filter(e => isPast(e.due_date));
  const owersMap = new Map<string, number>();
  for (const e of pendingEvals) { const who = e.evaluator_name || '— (sem avaliador)'; owersMap.set(who, (owersMap.get(who) || 0) + 1); }
  const owers = [...owersMap.entries()].sort((a, b) => b[1] - a[1]);

  // --- PDI: ações atrasadas / pendentes ---
  type PdiRow = { id: string; pdiId: string; title: string; who: string; deadline?: string; overdue: boolean };
  const pdiRows: PdiRow[] = [];
  for (const p of pdis) {
    if (!inArea(p.employee_name)) continue;
    for (const a of p.actions) {
      if (a.status === 'completed') continue;
      pdiRows.push({ id: a.id, pdiId: p.id, title: a.title, who: p.employee_name, deadline: a.deadline, overdue: isPast(a.deadline) });
    }
  }
  const pdiOverdue = pdiRows.filter(r => r.overdue);

  // --- Clima ---
  const openCampaigns = campaigns.filter(c => c.status === 'open');
  const surveyOpenActions = campaigns.reduce((s, c) => s + (c.action_count || 0), 0);

  // --- Cronograma (próximos prazos unificados) ---
  type TLItem = { kind: 'Avaliação' | 'PDI' | 'Clima'; label: string; sub: string; date: Date | null; overdue: boolean; go: () => void };
  const timeline: TLItem[] = [];
  for (const e of pendingEvals) timeline.push({ kind: 'Avaliação', label: `${e.type} — ${e.employee_name}`, sub: `Avaliador: ${e.evaluator_name || '—'}`, date: parseDate(e.due_date), overdue: isPast(e.due_date), go: () => onNavigate?.('evaluation_form', e.id) });
  for (const r of pdiRows) timeline.push({ kind: 'PDI', label: r.title, sub: r.who, date: parseDate(r.deadline), overdue: r.overdue, go: () => onNavigate?.('pdi_detail', r.pdiId) });
  for (const c of openCampaigns) timeline.push({ kind: 'Clima', label: c.name, sub: `${c.response_count ?? 0} respostas`, date: parseDate(c.end_date), overdue: isPast(c.end_date), go: () => onNavigate?.('survey') });
  timeline.sort((a, b) => { if (!a.date) return 1; if (!b.date) return -1; return a.date.getTime() - b.date.getTime(); });

  const totalPend = pendingEvals.length + pdiRows.length + openCampaigns.length;
  const totalOver = overdueEvals.length + pdiOverdue.length;

  const KIND_COLOR: Record<string, string> = { 'Avaliação': 'bg-brand-50 text-brand-700 border-brand-100', 'PDI': 'bg-brand-50 text-brand-700 border-brand-100', 'Clima': 'bg-emerald-50 text-emerald-700 border-emerald-100' };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2"><CalendarClock className="w-6 h-6 text-brand-600" /> Central RH</h1>
          <p className="text-sm text-slate-500 mt-1">Tudo que precisa de ação, por área — quem está devendo e o que está atrasado.</p>
        </div>
        <select value={area} onChange={e => setArea(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
          <option value="">Todas as áreas</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi label="Pendências totais" value={totalPend} tone="slate" />
        <Kpi label="Atrasadas" value={totalOver} tone={totalOver > 0 ? 'red' : 'emerald'} />
        <Kpi label="Avaliadores devendo" value={owers.length} tone="indigo" />
        <Kpi label="Campanhas abertas" value={openCampaigns.length} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Avaliações */}
        <ModuleCard icon={ClipboardList} title="Avaliações" color="indigo" pend={pendingEvals.length} over={overdueEvals.length} onGo={() => onNavigate?.('evaluations')}>
          {owers.length === 0 ? <Empty text="Nenhuma avaliação pendente." />
            : <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Quem está devendo</p>
                {owers.slice(0, 5).map(([who, n]) => (
                  <div key={who} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" />{who}</span>
                    <span className="font-bold text-slate-500 shrink-0">{n}</span>
                  </div>
                ))}
                {owers.length > 5 && <p className="text-[11px] text-slate-400 pt-1">+{owers.length - 5} avaliadores</p>}
              </div>}
        </ModuleCard>

        {/* PDI */}
        <ModuleCard icon={Target} title="PDI" color="blue" pend={pdiRows.length} over={pdiOverdue.length} onGo={() => onNavigate?.('pdi')}>
          {pdiRows.length === 0 ? <Empty text="Nenhuma ação de PDI em aberto." />
            : <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ações em aberto</p>
                {pdiRows.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-slate-700 truncate">{r.who} · {r.title}</span>
                    <span className={cn("text-[11px] shrink-0", r.overdue ? "text-red-600 font-bold" : "text-slate-400")}>{fmt(r.deadline)}</span>
                  </div>
                ))}
                {pdiRows.length > 5 && <p className="text-[11px] text-slate-400 pt-1">+{pdiRows.length - 5} ações</p>}
              </div>}
        </ModuleCard>

        {/* Clima */}
        <ModuleCard icon={Smile} title="Pesquisa de Clima" color="emerald" pend={openCampaigns.length} over={0} onGo={() => onNavigate?.('survey')}>
          {openCampaigns.length === 0 && surveyOpenActions === 0 ? <Empty text="Nenhuma campanha aberta." />
            : <div className="space-y-1.5 text-sm">
                {openCampaigns.map(c => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-slate-700 truncate">{c.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{c.response_count ?? 0} resp.</span>
                  </div>
                ))}
                <p className="text-[11px] text-slate-400 pt-1">{surveyOpenActions} ação(ões) no plano</p>
              </div>}
        </ModuleCard>
      </div>

      {/* Cronograma */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-brand-600" /> Cronograma — próximos prazos</h2>
        {timeline.length === 0 ? <Empty text="Nada pendente no momento. 🎉" />
          : <div className="divide-y divide-slate-100">
              {timeline.slice(0, 14).map((t, i) => (
                <button key={i} onClick={t.go} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors group">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 w-20 text-center", KIND_COLOR[t.kind])}>{t.kind}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.label}</p>
                    <p className="text-xs text-slate-400 truncate">{t.sub}</p>
                  </div>
                  <span className={cn("text-xs shrink-0 flex items-center gap-1", t.overdue ? "text-red-600 font-bold" : "text-slate-500")}>
                    {t.overdue && <AlertTriangle className="w-3.5 h-3.5" />}{t.date ? fmt(t.date.toISOString().slice(0, 10)) : 'sem prazo'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 shrink-0" />
                </button>
              ))}
            </div>}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'red' | 'emerald' | 'indigo' }) {
  const tones: Record<string, string> = { slate: 'text-slate-900', red: 'text-red-600', emerald: 'text-emerald-600', indigo: 'text-brand-600' };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("text-3xl font-extrabold mt-1", tones[tone])}>{value}</p>
    </div>
  );
}

const ICON_CLASS: Record<string, string> = {
  indigo: 'bg-brand-50 text-brand-600',
  blue: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

function ModuleCard({ icon: Icon, title, color, pend, over, onGo, children }: { icon: any; title: string; color: string; pend: number; over: number; onGo: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", ICON_CLASS[color])}><Icon className="w-5 h-5" /></div>
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <div className="text-right">
          <span className="text-xl font-extrabold text-slate-800">{pend}</span>
          {over > 0 && <span className="block text-[11px] font-bold text-red-600">{over} atrasada(s)</span>}
        </div>
      </div>
      <div className="flex-1">{children}</div>
      <button onClick={onGo} className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1.5 w-full pt-3 border-t border-slate-100">Abrir <ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400 py-4 text-center">{text}</p>;
}

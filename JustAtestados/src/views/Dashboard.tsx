import { useState, useEffect, useMemo } from 'react';
import {
  Building,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  Activity,
  Filter,
  Download,
  FileText,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, Legend,
} from 'recharts';
import { cn } from '../utils';
import { ExportModal } from '../components/ExportModal';
import { dataService } from '../services';
import type { DocumentoView, KPI, Obra, ViewState } from '../types';

// ─── Filter state types ────────────────────────────────────────────────────

type PeriodoFiltro = 'todos' | '30d' | 'mes' | 'trimestre' | 'ano';

interface FilterState {
  periodo: PeriodoFiltro;
  obraId: string;
  tipo: '' | 'atestado' | 'declaracao';
  setor: string;
  cargo: string;
}

// ─── Date helpers for period filter ───────────────────────────────────────

function periodoStartDate(periodo: PeriodoFiltro): Date | null {
  const now = new Date();
  if (periodo === 'todos') return null;
  if (periodo === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (periodo === 'mes') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (periodo === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3, 1);
  }
  // ano
  return new Date(now.getFullYear(), 0, 1);
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// ─── tipos internos dos datasets computados ────────────────────────────────

interface ObraRow { obra: string; dias: number; horas: number; custo: number; atestados: number }
interface CustoObraBar { name: string; custo: number }
interface TipoDocPie { name: string; value: number; color: string }
interface CidRow { cid: string; casos: number; dias: number; custo: number }
interface ColabRow { nome: string; cargo: string; custo: number; dias: number }
interface MensalBar { name: string; custo: number; dias: number }

// ─── helpers de agregação ──────────────────────────────────────────────────

/** Custo estimado: R$ 250 por dia de atestado + R$ 100 por hora de declaração. */
function estimaCusto(dias: number, horas: number): number {
  return dias * 250 + horas * 100;
}

function computeObraRows(docs: DocumentoView[]): ObraRow[] {
  const map = new Map<string, ObraRow>();
  for (const d of docs) {
    const key = d.obraNome || 'Sem obra';
    if (!map.has(key)) map.set(key, { obra: key, dias: 0, horas: 0, custo: 0, atestados: 0 });
    const row = map.get(key)!;
    const dias = d.dias ?? 0;
    const horas = d.horas ?? 0;
    row.dias += dias;
    row.horas += horas;
    row.custo += estimaCusto(dias, horas);
    if (d.tipo === 'atestado') row.atestados += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.custo - a.custo);
}

function computeCustoObraBar(rows: ObraRow[]): CustoObraBar[] {
  return rows.slice(0, 8).map((r) => ({ name: r.obra, custo: r.custo }));
}

function computeTipoDoc(docs: DocumentoView[]): TipoDocPie[] {
  const atestados = docs.filter((d) => d.tipo === 'atestado').length;
  const declaracoes = docs.filter((d) => d.tipo === 'declaracao').length;
  const total = atestados + declaracoes;
  if (total === 0) return [];
  return [
    { name: 'Atestados Médicos', value: Math.round((atestados / total) * 100), color: '#0d9488' },
    { name: 'Declarações', value: Math.round((declaracoes / total) * 100), color: '#f59e0b' },
  ];
}

function computeCidRows(docs: DocumentoView[]): CidRow[] {
  const map = new Map<string, CidRow>();
  for (const d of docs) {
    if (!d.cid) continue;
    const key = `${d.cid.codigo} – ${d.cid.descricao}`;
    if (!map.has(key)) map.set(key, { cid: key, casos: 0, dias: 0, custo: 0 });
    const row = map.get(key)!;
    row.casos += 1;
    const dias = d.dias ?? 0;
    row.dias += dias;
    row.custo += estimaCusto(dias, 0);
  }
  return Array.from(map.values()).sort((a, b) => b.custo - a.custo).slice(0, 10);
}

function computeTopColabs(docs: DocumentoView[]): ColabRow[] {
  const map = new Map<string, ColabRow>();
  for (const d of docs) {
    const key = d.colaboradorId;
    if (!map.has(key)) map.set(key, { nome: d.colaboradorNome, cargo: d.cargo, custo: 0, dias: 0 });
    const row = map.get(key)!;
    const dias = d.dias ?? 0;
    const horas = d.horas ?? 0;
    row.dias += dias;
    row.custo += estimaCusto(dias, horas);
  }
  return Array.from(map.values()).sort((a, b) => b.custo - a.custo).slice(0, 5);
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function computeMensal(docs: DocumentoView[]): MensalBar[] {
  const map = new Map<string, MensalBar>();
  for (const d of docs) {
    const date = new Date(d.dataLancamento);
    if (isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, { name: MONTHS_PT[date.getMonth()], custo: 0, dias: 0 });
    const row = map.get(key)!;
    const dias = d.dias ?? 0;
    const horas = d.horas ?? 0;
    row.dias += dias;
    row.custo += estimaCusto(dias, horas);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, v]) => v);
}

// ─── KPI helpers ──────────────────────────────────────────────────────────

function kpiValue(kpis: KPI[], titleSubstr: string): string {
  const found = kpis.find((k) => k.title.toLowerCase().includes(titleSubstr.toLowerCase()));
  if (!found) return '—';
  return found.suffix ? `${found.value}${found.suffix}` : String(found.value);
}

// ─── KPICard ──────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isCritical?: boolean;
  featured?: boolean;   // card de destaque navy (identidade JUST)
}

function KPICard({ title, value, subtext, icon: Icon, trend, trendValue, isCritical = false, featured = false }: KPICardProps) {
  return (
    <div className={cn(
      'p-5 rounded-xl border flex flex-col justify-between',
      featured
        ? 'bg-navy-900 border-navy-800 text-white shadow-sm'
        : isCritical
          ? 'bg-white dark:bg-slate-900 border-rose-200 shadow-rose-100/50 shadow-sm dark:shadow-none'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none',
    )}>
      <div className="flex justify-between items-start">
        <div>
          <p className={cn('text-sm font-medium', featured ? 'text-navy-200' : 'text-slate-500 dark:text-slate-400')}>{title}</p>
          <h3 className={cn('text-2xl font-bold mt-1', featured ? 'text-white' : isCritical ? 'text-rose-700' : 'text-slate-900 dark:text-slate-50')}>{value}</h3>
          <p className={cn('text-xs mt-2 flex items-center', featured ? 'text-navy-300' : 'text-slate-500 dark:text-slate-400')}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3 text-rose-500 mr-1" /> : trend === 'down' ? <TrendingDown className="w-3 h-3 text-emerald-500 mr-1" /> : null}
            {trendValue && <span className={cn('font-medium mr-1', trend === 'up' ? 'text-rose-600' : trend === 'down' ? 'text-emerald-600' : '')}>{trendValue}</span>}
            {subtext}
          </p>
        </div>
        <div className={cn('p-2 rounded-lg', featured ? 'bg-white/10' : isCritical ? 'bg-rose-50' : 'bg-slate-50 dark:bg-slate-800')}>
          <Icon className={cn('w-5 h-5', featured ? 'text-petroleum-400' : isCritical ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400')} />
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────

function EmptyState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 gap-2 py-8">
      <FileText className="w-8 h-8 opacity-40" />
      <span className="text-sm">{label ?? 'Nenhum dado disponível'}</span>
    </div>
  );
}

function afastamento(d: DocumentoView): string {
  if (d.tipo === 'atestado') return d.dias != null ? `${d.dias} dia(s)` : 'atestado';
  return d.horas != null ? `${d.horas}h` : 'declaração';
}

// ─── Dashboard ────────────────────────────────────────────────────────────

interface DashboardProps {
  onNavigate?: (view: ViewState) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [showExport, setShowExport] = useState(false);
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentoView[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);

  const [filters, setFilters] = useState<FilterState>({ periodo: 'todos', obraId: '', tipo: '', setor: '', cargo: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [docs, rawKpis, rawObras] = await Promise.all([
          dataService.listDocumentos(),
          dataService.getKpis(),
          dataService.listObras(),
        ]);
        if (cancelled) return;
        setAllDocs(docs);
        setKpis(rawKpis);
        setObras(rawObras);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const setores = useMemo(() => [...new Set(allDocs.map((d) => d.setor).filter(Boolean))].sort(), [allDocs]);
  const cargos = useMemo(() => [...new Set(allDocs.map((d) => d.cargo).filter(Boolean))].sort(), [allDocs]);

  const filteredDocs = useMemo(() => {
    const startDate = periodoStartDate(filters.periodo);
    const obraFiltro = filters.obraId ? (obras.find((o) => o.id === filters.obraId)?.nome ?? null) : null;
    return allDocs.filter((d) => {
      if (filters.tipo && d.tipo !== filters.tipo) return false;
      if (obraFiltro !== null && d.obraNome !== obraFiltro) return false;
      if (filters.setor && d.setor !== filters.setor) return false;
      if (filters.cargo && d.cargo !== filters.cargo) return false;
      if (startDate) {
        const docDate = new Date(d.dataLancamento);
        if (isNaN(docDate.getTime()) || docDate < startDate) return false;
      }
      return true;
    });
  }, [allDocs, filters, obras]);

  const obraRows = useMemo(() => computeObraRows(filteredDocs), [filteredDocs]);
  const custoObraBar = useMemo(() => computeCustoObraBar(obraRows), [obraRows]);
  const tipoDocData = useMemo(() => computeTipoDoc(filteredDocs), [filteredDocs]);
  const cidRows = useMemo(() => computeCidRows(filteredDocs), [filteredDocs]);
  const topColabs = useMemo(() => computeTopColabs(filteredDocs), [filteredDocs]);
  const mensalData = useMemo(() => computeMensal(filteredDocs), [filteredDocs]);
  const pendentes = useMemo(() => filteredDocs.filter((d) => d.status === 'pendente'), [filteredDocs]);

  const custoTotal = kpiValue(kpis, 'custo');
  const diasPerdidos = kpiValue(kpis, 'dias');
  const horasPerdidas = kpiValue(kpis, 'horas');
  const txAbsenteismo = kpiValue(kpis, 'absenteísmo');

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header + filtros */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Dashboard Executivo</h2>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
          <div className="flex items-center space-x-2 mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4" />
            <span>Filtros Globais</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <select value={filters.periodo} onChange={(e) => setFilter('periodo', e.target.value as PeriodoFiltro)}
              className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:shadow-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="todos">Todos os períodos</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="mes">Mês Atual</option>
              <option value="trimestre">Trimestre Atual</option>
              <option value="ano">Ano Atual</option>
            </select>
            <select value={filters.obraId} onChange={(e) => setFilter('obraId', e.target.value)}
              className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:shadow-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="">Todas as Obras</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome} ({o.uf})</option>)}
            </select>
            <select value={filters.setor} onChange={(e) => setFilter('setor', e.target.value)}
              className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:shadow-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="">Todos os Setores</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.cargo} onChange={(e) => setFilter('cargo', e.target.value)}
              className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:shadow-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="">Todos os Cargos</option>
              {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.tipo} onChange={(e) => setFilter('tipo', e.target.value as FilterState['tipo'])}
              className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:shadow-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="">Ambos (Atest. / Decl.)</option>
              <option value="atestado">Atestado Médico</option>
              <option value="declaracao">Declaração de Comparecimento</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Custo Estimado (Afastamentos)" value={loading ? '…' : custoTotal} subtext="acumulado" icon={DollarSign} featured />
        <KPICard title="Dias Perdidos" value={loading ? '…' : diasPerdidos} subtext="acumulado" icon={Activity} />
        <KPICard title="Horas Perdidas" value={loading ? '…' : horasPerdidas} subtext="acumulado" icon={Building} />
        <KPICard title="Taxa de Absenteísmo" value={loading ? '…' : txAbsenteismo} subtext="calculado" icon={Users} isCritical />
      </div>

      {/* Fila pendente (operacional) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            Fila Pendente {pendentes.length > 0 && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">{pendentes.length}</span>}
          </h3>
          {onNavigate && (
            <button onClick={() => onNavigate('queue')} className="text-sm font-medium text-petroleum-600 hover:text-petroleum-700 flex items-center">
              Ir para a fila <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
        {pendentes.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Nenhum documento pendente.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendentes.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{d.colaboradorNome}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{d.tipo === 'atestado' ? 'Atestado' : 'Declaração'} · {afastamento(d)}</p>
                </div>
                <span className="text-xs font-mono text-slate-400 shrink-0 ml-3">{d.ticket}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custo por Obra + tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Custo por Obra (R$)</h3>
          <div className="h-64">
            {custoObraBar.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={custoObraBar} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} width={90} />
                  <RechartsTooltip cursor={{ fill: 'var(--chart-tooltip-border)' }} formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--chart-text)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="custo" name="Custo" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none lg:col-span-2 overflow-auto">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Detalhamento por Obra</h3>
          {obraRows.length === 0 ? <EmptyState label="Nenhuma obra com dados no período" /> : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-4 py-3">Obra</th>
                  <th className="px-4 py-3 text-right">Dias Perd.</th>
                  <th className="px-4 py-3 text-right">Hrs Perd.</th>
                  <th className="px-4 py-3 text-right">Atestados</th>
                  <th className="px-4 py-3 text-right">Custo Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {obraRows.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{item.obra}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.dias}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.horas.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.atestados}</td>
                    <td className="px-4 py-3 text-right text-petroleum-700 font-semibold">{formatCurrency(item.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tipos e CID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Composição por Tipo de Documento</h3>
          <div className="h-64">
            {tipoDocData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tipoDocData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {tipoDocData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => `${val}% do total`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--chart-text)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none lg:col-span-2 overflow-auto">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Top Capítulos CID (Impacto)</h3>
          {cidRows.length === 0 ? <EmptyState label="Nenhum documento com CID informado" /> : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-4 py-3">Código / Descrição CID-10</th>
                  <th className="px-4 py-3 text-right">Casos</th>
                  <th className="px-4 py-3 text-right">Dias Perdidos</th>
                  <th className="px-4 py-3 text-right">Custo Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {cidRows.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{item.cid}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.casos}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.dias}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-semibold">{formatCurrency(item.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Evolução + Top Colaboradores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Evolução de Custo vs Dias Perdidos</h3>
          <div className="h-64">
            {mensalData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mensalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} dy={10} />
                  <YAxis yAxisId="left" tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                  <RechartsTooltip formatter={(val: any, name: any) => name === 'Custo (R$)' ? formatCurrency(Number(val)) : val}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--chart-text)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar yAxisId="left" dataKey="custo" name="Custo (R$)" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line yAxisId="right" type="monotone" dataKey="dias" name="Dias Perdidos" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" />
            Top Colaboradores (Custo)
          </h3>
          {topColabs.length === 0 ? <EmptyState label="Nenhum dado disponível" /> : (
            <div className="space-y-4">
              {topColabs.map((collab, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{collab.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{collab.cargo} • {collab.dias} dias perd.</p>
                  </div>
                  <div className="text-right font-medium text-sm text-petroleum-700">{formatCurrency(collab.custo)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}

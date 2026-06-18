import { useState } from "react";
import { Gauge, Plus, X, Pencil, Trash2, ArrowUp, ArrowDown, Library, UserCog, Info, BarChart3, Target, ClipboardList, Check, Minus, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie,
} from "recharts";
import { cn } from "../lib/utils";
import { useEmployees } from "../hooks/useEmployees";
import {
  useIndicadores, useCreateIndicador, useUpdateIndicador, useDeleteIndicador,
  useAtribuicoes, useCreateAtribuicao, useDeleteAtribuicao,
  useRealizacoes, useUpsertRealizacao,
  type Indicador, type Realizacao,
} from "../hooks/useIndicadores";

// Extrai o primeiro número de um texto livre ('≥ 95%' → 95; '≤ 2,5 dias' → 2.5). null se não houver.
function parseNum(s?: string | null): number | null {
  if (!s) return null;
  const m = String(s).replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// Compara realizado x meta respeitando a direção. null se faltar dado numérico.
function atendeMeta(valorNum: number | null, meta?: string | null, direcao?: "maior" | "menor"): boolean | null {
  const metaNum = parseNum(meta);
  if (valorNum == null || metaNum == null) return null;
  return direcao === "menor" ? valorNum <= metaNum : valorNum >= metaNum;
}

// Rótulo do período corrente no formato 'YYYY-MM' (mês atual)
function periodoAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Rótulo curto de período para eixo do gráfico ('2026-05' → '05/26'; 'YYYY-Tn' → 'Tn')
function fmtPeriodo(p: string): string {
  const mm = p.match(/^(\d{4})-(\d{2})$/);
  if (mm) return `${mm[2]}/${mm[1].slice(2)}`;
  const t = p.match(/^(\d{4})-(T\d)$/);
  if (t) return `${t[2]}/${t[1].slice(2)}`;
  return p;
}

// Constrói a série temporal de um indicador (valor do setor, com número), já acumulando no ano se for o caso
function buildSerie(indicador: Indicador, realizacoes: Realizacao[]): { periodo: string; valor: number }[] {
  const pontos = realizacoes
    .filter(r => r.indicador_id === indicador.id && !r.employee_id)
    .map(r => ({ periodo: r.periodo, valor: r.valor_num ?? parseNum(r.valor) }))
    .filter((p): p is { periodo: string; valor: number } => p.valor != null)
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  if (!indicador.acumula) return pontos;
  let acc = 0;
  return pontos.map(p => ({ periodo: p.periodo, valor: (acc += p.valor) }));
}

function DirBadge({ direcao }: { direcao: "maior" | "menor" }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border",
      direcao === "maior" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
      {direcao === "maior" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {direcao === "maior" ? "maior melhor" : "menor melhor"}
    </span>
  );
}

function IndicadorModal({ initial, onClose }: { initial?: Indicador; onClose: () => void }) {
  const create = useCreateIndicador();
  const update = useUpdateIndicador();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [setor, setSetor] = useState(initial?.setor ?? "");
  const [responsavel, setResponsavel] = useState(initial?.responsavel ?? "");
  const [unidade, setUnidade] = useState(initial?.unidade ?? "");
  const [cargo, setCargo] = useState(initial?.cargo_alvo ?? "");
  const [meta, setMeta] = useState(initial?.meta ?? "");
  const [periodicidade, setPeriodicidade] = useState(initial?.periodicidade ?? "");
  const [direcao, setDirecao] = useState<"maior" | "menor">(initial?.direcao ?? "maior");
  const [acumula, setAcumula] = useState(initial?.acumula ?? false);
  const [formula, setFormula] = useState(initial?.formula ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Informe o nome do indicador."); return; }
    const data = {
      nome: nome.trim(), setor: setor.trim() || undefined, responsavel: responsavel.trim() || undefined,
      unidade: unidade.trim() || undefined, cargo_alvo: cargo.trim() || undefined,
      meta: meta.trim() || undefined, periodicidade: periodicidade.trim() || undefined,
      direcao, acumula, formula: formula.trim() || undefined, descricao: descricao.trim() || undefined,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, ...data });
      else await create.mutateAsync(data);
      onClose();
    } catch { setError("Erro ao salvar. Tente novamente."); }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{initial ? "Editar indicador" : "Novo indicador"}</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Índice de retrabalho" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Setor</label>
              <input value={setor} onChange={e => setSetor(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Qualidade, RH, Obra" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Responsável</label>
              <input value={responsavel} onChange={e => setResponsavel(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Samuel Beienke" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fórmula / como medir</label>
            <input value={formula} onChange={e => setFormula(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Nº NC ÷ total de itens × 100" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meta</label>
              <input value={meta} onChange={e => setMeta(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="≥ 95%" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unidade</label>
              <input value={unidade} onChange={e => setUnidade(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="%, dias" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Periodicidade</label>
              <input value={periodicidade} onChange={e => setPeriodicidade(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="mensal" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cargo alvo (opcional)</label>
            <input value={cargo} onChange={e => setCargo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Mestre de Obra" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Direção</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirecao("maior")} className={cn("px-3 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-1.5", direcao === "maior" ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}><ArrowUp className="w-4 h-4" /> Maior melhor</button>
              <button type="button" onClick={() => setDirecao("menor")} className={cn("px-3 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-1.5", direcao === "menor" ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}><ArrowDown className="w-4 h-4" /> Menor melhor</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de meta</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAcumula(false)} className={cn("px-3 py-2 rounded-lg text-xs font-bold border transition-colors text-left", !acumula ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>
                Taxa / % por período
                <span className={cn("block text-[10px] font-normal mt-0.5", !acumula ? "text-brand-200" : "text-slate-400")}>compara o valor de cada mês com a meta</span>
              </button>
              <button type="button" onClick={() => setAcumula(true)} className={cn("px-3 py-2 rounded-lg text-xs font-bold border transition-colors text-left", acumula ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>
                Contagem (teto anual)
                <span className={cn("block text-[10px] font-normal mt-0.5", acumula ? "text-brand-200" : "text-slate-400")}>acumula no ano; meta é o limite (ex.: máx 1/unid)</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição (como apurar)</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full h-20 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" placeholder="Como o valor é medido e de onde vem o dado." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AtribuirModal({ employeeId, jaAtribuidos, onClose }: { employeeId: string; jaAtribuidos: Set<string>; onClose: () => void }) {
  const { data: indicadores = [] } = useIndicadores();
  const create = useCreateAtribuicao(employeeId);
  const [indicadorId, setIndicadorId] = useState("");
  const [meta, setMeta] = useState("");
  const [peso, setPeso] = useState(1);
  const [fonte, setFonte] = useState<"avaliador" | "rh">("avaliador");

  const disponiveis = indicadores.filter(i => i.ativo && !jaAtribuidos.has(i.id));

  async function add() {
    if (!indicadorId) return;
    await create.mutateAsync({ indicador_id: indicadorId, employee_id: employeeId, meta: meta.trim() || undefined, peso, fonte });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Atribuir indicador</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Indicador</label>
            <select value={indicadorId} onChange={e => setIndicadorId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <option value="">Selecione…</option>
              {disponiveis.map(i => <option key={i.id} value={i.id}>{i.nome}{i.unidade ? ` (${i.unidade})` : ""}</option>)}
            </select>
            {disponiveis.length === 0 && <p className="text-xs text-slate-400 mt-1">Nenhum indicador disponível — cadastre no Catálogo.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meta</label>
              <input value={meta} onChange={e => setMeta(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="95%, ≤ 2%, 30 dias" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Peso</label>
              <input type="number" min={1} max={10} value={peso} onChange={e => setPeso(Number(e.target.value) || 1)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fonte do dado</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFonte("avaliador")} className={cn("px-3 py-2 rounded-lg text-sm font-bold border transition-colors", fonte === "avaliador" ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>Avaliador</button>
              <button type="button" onClick={() => setFonte("rh")} className={cn("px-3 py-2 rounded-lg text-sm font-bold border transition-colors", fonte === "rh" ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>RH</button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={add} disabled={!indicadorId || create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">Atribuir</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PorPessoa() {
  const { data: employees = [] } = useEmployees();
  const [empId, setEmpId] = useState("");
  const { data: atribuicoes = [], isLoading } = useAtribuicoes(empId || undefined);
  const del = useDeleteAtribuicao(empId || undefined);
  const [showAdd, setShowAdd] = useState(false);

  const jaAtribuidos = new Set(atribuicoes.map(a => a.indicador_id));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Colaborador</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full sm:max-w-sm px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
          </select>
        </div>
        {empId && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Atribuir indicador
          </button>
        )}
      </div>

      {!empId ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center text-slate-400 text-sm">Selecione um colaborador para ver e atribuir indicadores.</div>
      ) : isLoading ? (
        <div className="p-12 text-center text-slate-400">Carregando…</div>
      ) : atribuicoes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center text-slate-400 text-sm">Nenhum indicador atribuído a esta pessoa ainda.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {atribuicoes.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{a.indicador?.nome}{a.indicador?.unidade ? <span className="text-slate-400 font-normal"> ({a.indicador.unidade})</span> : null}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {a.indicador && <DirBadge direcao={a.indicador.direcao} />}
                    {a.meta && <span className="text-xs text-slate-500">meta <span className="font-semibold text-slate-700">{a.meta}</span></span>}
                    <span className="text-xs text-slate-500">peso <span className="font-semibold text-slate-700">{a.peso}</span></span>
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", a.fonte === "rh" ? "bg-brand-50 text-brand-700 border-brand-200" : "bg-slate-100 text-slate-600 border-slate-200")}>{a.fonte === "rh" ? "fonte: RH" : "fonte: avaliador"}</span>
                  </div>
                </div>
                <button onClick={() => { if (confirm("Remover este indicador da pessoa?")) del.mutate(a.id); }} aria-label="Remover" className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAdd && empId && <AtribuirModal employeeId={empId} jaAtribuidos={jaAtribuidos} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function Catalogo() {
  const { data: indicadores = [], isLoading } = useIndicadores();
  const del = useDeleteIndicador();
  const [modal, setModal] = useState<{ open: boolean; edit?: Indicador }>({ open: false });

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo indicador
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Carregando…</div>
      ) : indicadores.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
          <Gauge className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">Nenhum indicador no catálogo.</p>
          <p className="text-xs text-slate-400 mt-1">Comece enxuto: 2 a 4 por cargo, fáceis de apurar.</p>
        </div>
      ) : (
        (() => {
          const grupos = new Map<string, typeof indicadores>();
          indicadores.forEach(i => {
            const k = i.setor || "Sem setor";
            if (!grupos.has(k)) grupos.set(k, []);
            grupos.get(k)!.push(i);
          });
          return (
            <div className="space-y-7">
              {[...grupos.entries()].map(([setor, itens]) => (
                <div key={setor}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{setor}</h3>
                    <span className="text-xs text-slate-400">· {itens.length}</span>
                    {itens[0]?.responsavel && <span className="text-xs text-slate-400">· {itens[0].responsavel}</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {itens.map(i => (
                      <div key={i.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900">{i.nome}{i.unidade ? <span className="text-slate-400 font-normal"> ({i.unidade})</span> : null}</h4>
                            {i.formula && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{i.formula}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setModal({ open: true, edit: i })} aria-label="Editar" className="p-1.5 text-slate-400 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => { if (confirm(`Excluir o indicador "${i.nome}"? Remove também as atribuições.`)) del.mutate(i.id); }} aria-label="Excluir" className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <DirBadge direcao={i.direcao} />
                          {i.meta && <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">meta {i.meta}</span>}
                          {i.periodicidade && <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{i.periodicidade}</span>}
                          {i.cargo_alvo && <span className="text-[11px] text-slate-500">{i.cargo_alvo}</span>}
                          <span className="text-xs text-slate-400 ml-auto">{i.atribuicoes_count ?? 0} {i.atribuicoes_count === 1 ? "pessoa" : "pessoas"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}

      {modal.open && <IndicadorModal initial={modal.edit} onClose={() => setModal({ open: false })} />}
    </div>
  );
}

function StatusPill({ valorNum, meta, direcao }: { valorNum: number | null; meta?: string | null; direcao: "maior" | "menor" }) {
  const ok = atendeMeta(valorNum, meta, direcao);
  if (ok === null) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border",
      ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
      {ok ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {ok ? "atende" : "abaixo"}
    </span>
  );
}

// Uma linha de lançamento (valor realizado + observação) para um indicador no período selecionado
function LinhaLancamento({ indicador, periodo, atual }: { indicador: Indicador; periodo: string; atual?: Realizacao }) {
  const upsert = useUpsertRealizacao();
  const [valor, setValor] = useState(atual?.valor ?? "");
  const [obs, setObs] = useState(atual?.observacao ?? "");
  const [salvo, setSalvo] = useState(false);
  const dirty = valor !== (atual?.valor ?? "") || obs !== (atual?.observacao ?? "");
  const valorNum = parseNum(valor);

  async function salvar() {
    await upsert.mutateAsync({
      indicador_id: indicador.id, periodo,
      valor: valor.trim() || undefined,
      valor_num: parseNum(valor),
      observacao: obs.trim() || undefined,
      lancado_por: indicador.responsavel || undefined,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 1500);
  }

  return (
    <li className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{indicador.nome}{indicador.unidade ? <span className="text-slate-400 font-normal"> ({indicador.unidade})</span> : null}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {indicador.meta && <span className="text-[11px] text-slate-500">meta <span className="font-semibold text-slate-700">{indicador.meta}</span></span>}
          <StatusPill valorNum={valorNum} meta={indicador.meta} direcao={indicador.direcao} />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input value={valor} onChange={e => { setValor(e.target.value); setSalvo(false); }} placeholder="realizado"
          className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        <input value={obs} onChange={e => { setObs(e.target.value); setSalvo(false); }} placeholder="observação"
          className="w-32 sm:w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        <button onClick={salvar} disabled={!dirty || upsert.isPending} aria-label="Salvar realizado"
          className={cn("px-3 py-2 rounded-lg text-sm font-bold transition-colors shrink-0",
            salvo ? "bg-emerald-600 text-white" : dirty ? "bg-brand-900 hover:bg-brand-800 text-white" : "bg-slate-100 text-slate-400 cursor-default")}>
          {salvo ? <Check className="w-4 h-4" /> : "Salvar"}
        </button>
      </div>
    </li>
  );
}

function Lancar() {
  const { data: indicadores = [], isLoading } = useIndicadores();
  const [periodo, setPeriodo] = useState(periodoAtual());
  const { data: realizacoes = [] } = useRealizacoes(periodo);

  // mapeia o valor do setor (employee_id null) por indicador no período
  const porIndicador = new Map<string, Realizacao>();
  realizacoes.filter(r => !r.employee_id).forEach(r => porIndicador.set(r.indicador_id, r));

  const ativos = indicadores.filter(i => i.ativo);
  const grupos = new Map<string, Indicador[]>();
  ativos.forEach(i => {
    const k = i.setor || "Sem setor";
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(i);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Período</label>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
        <p className="text-xs text-slate-400 sm:pb-2">Lance o valor realizado de cada indicador no período. Quem lança é o responsável do setor; o valor é só registro (não entra na nota).</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Carregando…</div>
      ) : ativos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center text-slate-400 text-sm">Cadastre indicadores no Catálogo para lançar valores.</div>
      ) : (
        <div className="space-y-7">
          {[...grupos.entries()].map(([setor, itens]) => (
            <div key={setor}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{setor}</h3>
                <span className="text-xs text-slate-400">· {itens.length}</span>
                {itens[0]?.responsavel && <span className="text-xs text-slate-400">· lança: {itens[0].responsavel}</span>}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {itens.map(i => (
                    <LinhaLancamento key={`${i.id}-${periodo}`} indicador={i} periodo={periodo} atual={porIndicador.get(i.id)} />
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Card de KPI com gráfico de barras (valor por período) + linha da meta
function KpiCard({ indicador, realizacoes }: { indicador: Indicador; realizacoes: Realizacao[] }) {
  const serie = buildSerie(indicador, realizacoes);
  const metaNum = parseNum(indicador.meta);
  const atende = indicador.direcao === "menor"
    ? (v: number) => metaNum == null ? null : v <= metaNum
    : (v: number) => metaNum == null ? null : v >= metaNum;
  const headline = serie.length ? serie[serie.length - 1].valor : null;
  const headStatus = headline == null ? null : atende(headline);
  const maxVal = Math.max(...serie.map(p => p.valor), metaNum ?? 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 leading-snug">{indicador.nome}</h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", indicador.acumula ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-sky-50 text-sky-700 border-sky-200")}>
              {indicador.acumula ? "acumula no ano" : "por período"}
            </span>
            {indicador.meta && <span className="text-[11px] text-slate-500">meta <span className="font-semibold text-slate-700">{indicador.meta}</span></span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn("text-2xl font-bold leading-none", headStatus === null ? "text-slate-700" : headStatus ? "text-emerald-600" : "text-rose-600")}>
            {headline != null ? (Number.isInteger(headline) ? headline : headline.toFixed(1)) : "—"}{indicador.unidade && headline != null ? <span className="text-xs font-medium text-slate-400"> {indicador.unidade}</span> : null}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{indicador.acumula ? "acumulado no ano" : "último período"}</p>
        </div>
      </div>

      {serie.length === 0 ? (
        <div className="h-36 flex flex-col items-center justify-center text-slate-300 gap-1 mt-2">
          <BarChart3 className="w-7 h-7" />
          <p className="text-xs">sem lançamento ainda</p>
        </div>
      ) : (
        <div className="h-36 mt-3 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="periodo" tickFormatter={fmtPeriodo} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, Math.ceil(maxVal * 1.15) || 1]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
              <RTooltip
                formatter={(v: number) => [`${Number.isInteger(v) ? v : v.toFixed(1)}${indicador.unidade ? " " + indicador.unidade : ""}`, indicador.acumula ? "Acumulado" : "Realizado"]}
                labelFormatter={(l: string) => fmtPeriodo(l)}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              {metaNum != null && (
                <ReferenceLine y={metaNum} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={2}
                  label={{ value: `meta ${indicador.meta}`, position: "insideTopRight", fontSize: 10, fill: "#b45309" }} />
              )}
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={42}>
                {serie.map((p, idx) => {
                  const ok = atende(p.valor);
                  return <Cell key={idx} fill={ok === null ? "#0e2148" : ok ? "#10b981" : "#f43f5e"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Painel() {
  const { data: indicadores = [], isLoading } = useIndicadores();
  const { data: realizacoes = [] } = useRealizacoes();
  if (isLoading) return <div className="p-12 text-center text-slate-400">Carregando…</div>;
  if (indicadores.length === 0) return <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center text-slate-400 text-sm">Cadastre indicadores no Catálogo para montar o painel.</div>;

  const ativos = indicadores.filter(i => i.ativo);

  // status de cada indicador pelo headline (último valor / acumulado)
  let atende = 0, abaixo = 0, semDado = 0;
  ativos.forEach(i => {
    const serie = buildSerie(i, realizacoes);
    if (!serie.length) { semDado++; return; }
    const v = serie[serie.length - 1].valor;
    const ok = atendeMeta(v, i.meta, i.direcao);
    if (ok === null) { semDado++; } else if (ok) { atende++; } else { abaixo++; }
  });
  const comDado = atende + abaixo;
  const pizza = [
    { nome: "Atende", valor: atende, cor: "#10b981" },
    { nome: "Abaixo", valor: abaixo, cor: "#f43f5e" },
  ].filter(s => s.valor > 0);

  const grupos = new Map<string, Indicador[]>();
  ativos.forEach(i => {
    const k = i.setor || "Sem setor";
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(i);
  });

  return (
    <div className="space-y-7">
      {/* Resumo geral */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-28 h-28 shrink-0 relative">
          {comDado > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pizza} dataKey="valor" innerRadius={36} outerRadius={52} paddingAngle={2} stroke="none">
                    {pizza.map((s, i) => <Cell key={i} fill={s.cor} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900">{Math.round((atende / comDado) * 100)}%</span>
                <span className="text-[10px] text-slate-400">atende</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300 text-center px-2">sem dados ainda</div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 flex-1 w-full">
          <div className="text-center sm:text-left"><p className="text-2xl font-bold text-emerald-600">{atende}</p><p className="text-xs text-slate-500">atendem a meta</p></div>
          <div className="text-center sm:text-left"><p className="text-2xl font-bold text-rose-600">{abaixo}</p><p className="text-xs text-slate-500">abaixo da meta</p></div>
          <div className="text-center sm:text-left"><p className="text-2xl font-bold text-slate-400">{semDado}</p><p className="text-xs text-slate-500">sem lançamento</p></div>
        </div>
      </div>

      {/* KPIs por setor */}
      {[...grupos.entries()].map(([setor, itens]) => (
        <div key={setor}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-brand-700" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{setor}</h3>
            {itens[0]?.responsavel && <span className="text-xs text-slate-400">· {itens[0].responsavel}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itens.map(i => <KpiCard key={i.id} indicador={i} realizacoes={realizacoes} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function IndicadoresView() {
  const [tab, setTab] = useState<"catalogo" | "pessoa" | "lancar" | "painel">("catalogo");

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Indicadores</h1>
        <p className="text-sm text-slate-500 mt-1">Defina os indicadores por cargo e atribua a cada pessoa (meta, peso e fonte do dado).</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Piloto.</strong> Os indicadores <strong>ainda não entram na nota</strong> da avaliação — esta etapa serve para estruturar o que medir e descobrir quem consegue alimentar cada dado. Quando estiver maduro, ligamos a composição na nota.
        </p>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        <button onClick={() => setTab("catalogo")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", tab === "catalogo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          <Library className="w-4 h-4" /> Catálogo
        </button>
        <button onClick={() => setTab("pessoa")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", tab === "pessoa" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          <UserCog className="w-4 h-4" /> Por pessoa
        </button>
        <button onClick={() => setTab("lancar")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", tab === "lancar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          <ClipboardList className="w-4 h-4" /> Lançar realizado
        </button>
        <button onClick={() => setTab("painel")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", tab === "painel" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          <BarChart3 className="w-4 h-4" /> Painel de Desempenho
        </button>
      </div>

      {tab === "catalogo" ? <Catalogo /> : tab === "pessoa" ? <PorPessoa /> : tab === "lancar" ? <Lancar /> : <Painel />}
    </div>
  );
}

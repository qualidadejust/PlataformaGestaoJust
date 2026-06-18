import { useState } from "react";
import { TrendingUp, Plus, X, ChevronLeft, ArrowRight, UserPlus, Trash2, Send, Copy, Check, RefreshCw, CheckCircle2, XCircle, Users } from "lucide-react";
import { cn } from "../lib/utils";
import { useEmployees } from "../hooks/useEmployees";
import {
  useMovimentacoes, useMovimentacao, useCreateMovimentacao, useUpdateMovimentacao,
  useAddBanca, useRemoveBanca, useMovimentacaoTokens,
  type Movimentacao,
} from "../hooks/useMovimentacoes";
import type { AccessLink } from "../hooks/useCycles";

const STATUS: Record<string, { label: string; cls: string }> = {
  solicitada: { label: "Solicitada", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  em_coleta: { label: "Em coleta", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  concluida: { label: "Concluída", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  arquivada: { label: "Arquivada", cls: "bg-slate-100 text-slate-400 border-slate-200" },
};

const DONE = new Set(["submitted", "completed"]);

function NovaModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data: employees = [] } = useEmployees();
  const create = useCreateMovimentacao();
  const [empId, setEmpId] = useState("");
  const [tipo, setTipo] = useState<"aumento" | "promocao">("promocao");
  const [cargo, setCargo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const cargoAtual = employees.find(e => e.id === empId)?.role ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!empId) { setError("Selecione o colaborador."); return; }
    if (tipo === "promocao" && !cargo.trim()) { setError("Informe o cargo pretendido (ou troque para aumento salarial)."); return; }
    try {
      const m = await create.mutateAsync({
        employee_id: empId,
        tipo,
        cargo_pretendido: tipo === "promocao" ? cargo.trim() : undefined,
        motivo: motivo.trim() || undefined,
      });
      onCreated(m.id);
    } catch { setError("Erro ao criar. Tente novamente."); }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nova movimentação</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Colaborador *</label>
            <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Selecione…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTipo("aumento")} className={cn("px-3 py-2 rounded-lg text-sm font-bold border transition-colors", tipo === "aumento" ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>Aumento salarial</button>
              <button type="button" onClick={() => setTipo("promocao")} className={cn("px-3 py-2 rounded-lg text-sm font-bold border transition-colors", tipo === "promocao" ? "bg-brand-900 text-white border-brand-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>Promoção / cargo</button>
            </div>
          </div>
          {tipo === "promocao" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cargo pretendido *</label>
              <input value={cargo} onChange={e => setCargo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Pedreiro Sênior" />
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Mantém o cargo atual{cargoAtual ? <>: <span className="font-semibold text-slate-700">{cargoAtual}</span></> : null}. A banca avalia a entrega para justificar o aumento.
            </p>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Motivo (opcional)</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} className="w-full h-20 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" placeholder="Pedido de aumento / promoção…" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">{create.isPending ? "Criando…" : "Criar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DispatchModal({ links, cargo, onClose, onRefresh, refreshing }: { links: AccessLink[]; cargo: string; onClose: () => void; onRefresh: () => void; refreshing: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Send className="w-5 h-5 text-brand-700" /> Disparo à banca</h2>
          <div className="flex items-center gap-1">
            <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} /> Atualizar</button>
            <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto">
          {links.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Adicione avaliadores à banca primeiro.</p>
          ) : (
            <ul className="space-y-3">
              {links.map(l => {
                const url = `${window.location.origin}/avaliar/${l.token}`;
                const feitas = l.total - l.pendentes;
                const pct = l.total > 0 ? Math.round((feitas / l.total) * 100) : 0;
                const done = l.pendentes === 0;
                const msg = `Olá, ${l.evaluator_name.split(" ")[0]}! Preciso da sua avaliação para a movimentação (${cargo}). Acesse pelo link: ${url}`;
                const digits = (l.phone ?? "").replace(/\D/g, "");
                const wa = digits ? `https://wa.me/${digits.length <= 11 ? "55" + digits : digits}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                return (
                  <li key={l.token} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{l.evaluator_name}</p>
                        <p className="text-xs text-slate-500 truncate">{l.evaluator_role}</p>
                      </div>
                      <span className={cn("shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", done ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200")}>{done ? "Respondeu" : "Pendente"}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className={cn("h-full rounded-full", done ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs font-bold text-slate-500 shrink-0">{feitas}/{l.total}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { navigator.clipboard?.writeText(url); setCopied(l.token); setTimeout(() => setCopied(c => c === l.token ? null : c), 1500); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                        {copied === l.token ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar link</>}
                      </button>
                      <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"><Send className="w-3.5 h-3.5" /> WhatsApp</a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-slate-400 mt-4">A banca acessa sem senha pelo link pessoal. Sem custo (mensagem pronta no WhatsApp).</p>
        </div>
      </div>
    </div>
  );
}

function Detalhe({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: mov, isLoading } = useMovimentacao(id);
  const { data: employees = [] } = useEmployees();
  const addBanca = useAddBanca(id);
  const removeBanca = useRemoveBanca(id);
  const update = useUpdateMovimentacao();
  const tokens = useMovimentacaoTokens();
  const [addId, setAddId] = useState("");
  const [links, setLinks] = useState<AccessLink[] | null>(null);
  const [decisao, setDecisao] = useState<"aprovada" | "reprovada" | "">("");
  const [justificativa, setJustificativa] = useState("");

  if (isLoading || !mov) return <div className="p-12 text-center text-slate-400">Carregando…</div>;

  const naBanca = new Set(mov.banca.map(b => b.evaluator_id));
  const disponiveis = employees.filter(e => e.id !== mov.employee_id && !naBanca.has(e.id));
  const concluidas = mov.banca.filter(b => DONE.has(b.status)).length;

  async function dispatch() {
    const r = await tokens.mutateAsync(id);
    setLinks(r);
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Todas as movimentações
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{mov.employee.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1.5">
              {mov.tipo === "aumento" ? (
                <span className="inline-flex items-center gap-1.5"><span className="font-bold text-brand-800">Aumento salarial</span><span className="text-slate-400">·</span><span className="text-slate-500">{mov.cargo_atual}</span></span>
              ) : (
                <><span className="text-slate-500">{mov.cargo_atual}</span><ArrowRight className="w-4 h-4 text-brand-600" /><span className="font-bold text-brand-800">{mov.cargo_pretendido}</span></>
              )}
            </div>
            {mov.motivo && <p className="text-sm text-slate-500 mt-2 max-w-prose">{mov.motivo}</p>}
          </div>
          <span className={cn("text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border", STATUS[mov.status]?.cls)}>{STATUS[mov.status]?.label}</span>
        </div>

        {mov.status === "concluida" && mov.decisao && (
          <div className={cn("mt-4 rounded-xl border p-3 flex items-start gap-2", mov.decisao === "aprovada" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
            {mov.decisao === "aprovada" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
            <div>
              <p className={cn("text-sm font-bold", mov.decisao === "aprovada" ? "text-emerald-800" : "text-red-800")}>{mov.decisao === "aprovada" ? "Aprovada" : "Reprovada"}</p>
              {mov.justificativa && <p className="text-sm text-slate-600 mt-0.5">{mov.justificativa}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Banca */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Users className="w-4 h-4" /> Banca avaliadora</h2>
          <span className="text-xs font-medium text-slate-400">{concluidas}/{mov.banca.length} responderam</span>
        </div>

        {mov.status !== "concluida" && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end bg-slate-50 border-b border-slate-100 p-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adicionar avaliador (quem trabalhou junto)</label>
              <select value={addId} onChange={e => setAddId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <option value="">Selecione…</option>
                {disponiveis.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
              </select>
            </div>
            <button onClick={async () => { if (addId) { await addBanca.mutateAsync(addId); setAddId(""); } }} disabled={!addId || addBanca.isPending} className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
              <UserPlus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        )}

        {mov.banca.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">Nenhum avaliador na banca ainda. O RH define quem avalia.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mov.banca.map(b => (
              <li key={b.evaluation_id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                  {(b.evaluator_name ?? "?").split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{b.evaluator_name}</p>
                  <p className="text-xs text-slate-500 truncate">{b.evaluator_role}</p>
                </div>
                {DONE.has(b.status)
                  ? <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Respondeu</span>
                  : <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pendente</span>}
                {mov.status !== "concluida" && (
                  <button onClick={() => { if (confirm(`Remover ${b.evaluator_name} da banca?`)) removeBanca.mutate(b.evaluation_id); }} aria-label="Remover" className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ações */}
      {mov.status !== "concluida" && (
        <div className="flex flex-wrap gap-3">
          <button onClick={dispatch} disabled={mov.banca.length === 0 || tokens.isPending} className="flex items-center gap-2 px-4 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
            <Send className="w-4 h-4" /> {tokens.isPending ? "Gerando links…" : "Disparar à banca (WhatsApp)"}
          </button>
        </div>
      )}

      {/* Decisão */}
      {mov.status !== "concluida" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Registrar decisão</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setDecisao("aprovada")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors", decisao === "aprovada" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>
              <CheckCircle2 className="w-4 h-4" /> Aprovar
            </button>
            <button onClick={() => setDecisao("reprovada")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors", decisao === "reprovada" ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>
              <XCircle className="w-4 h-4" /> Reprovar
            </button>
          </div>
          <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} className="w-full h-20 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none mb-3" placeholder="Justificativa da decisão (com base nas avaliações da banca)…" />
          <button onClick={() => decisao && update.mutate({ id, decisao, justificativa: justificativa.trim() || undefined })} disabled={!decisao || update.isPending} className="px-5 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
            {update.isPending ? "Salvando…" : "Concluir movimentação"}
          </button>
        </div>
      )}

      {links && <DispatchModal links={links} cargo={mov.cargo_pretendido} onClose={() => setLinks(null)} onRefresh={dispatch} refreshing={tokens.isPending} />}
    </div>
  );
}

export function MovimentacaoView() {
  const { data: movs = [], isLoading } = useMovimentacoes();
  const [selected, setSelected] = useState<string | undefined>();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      {selected ? (
        <Detalhe id={selected} onBack={() => setSelected(undefined)} />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Movimentações</h1>
              <p className="text-sm text-slate-500 mt-1">Aumentos e promoções avaliados por uma banca de quem trabalhou com o colaborador.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Nova movimentação
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Carregando…</div>
          ) : movs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">Nenhuma movimentação registrada.</p>
              <p className="text-xs text-slate-400 mt-1">Crie uma quando um colaborador pedir aumento ou troca de cargo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movs.map((m: Movimentacao) => {
                const pct = m.banca_total > 0 ? Math.round((m.banca_concluidas / m.banca_total) * 100) : 0;
                return (
                  <button key={m.id} onClick={() => setSelected(m.id)} className="w-full text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {m.employee_name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{m.employee_name}</p>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                        {m.tipo === "aumento" ? (
                          <><span className="font-medium text-brand-700">Aumento salarial</span> <span className="text-slate-300">·</span> {m.cargo_atual}</>
                        ) : (
                          <>{m.cargo_atual} <ArrowRight className="w-3 h-3 text-brand-500" /> <span className="font-medium text-brand-700">{m.cargo_pretendido}</span></>
                        )}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 w-40">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs font-bold text-slate-500 shrink-0">{m.banca_concluidas}/{m.banca_total}</span>
                    </div>
                    <span className={cn("text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0", STATUS[m.status]?.cls)}>{STATUS[m.status]?.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {showModal && <NovaModal onClose={() => setShowModal(false)} onCreated={(newId) => { setShowModal(false); setSelected(newId); }} />}
    </div>
  );
}

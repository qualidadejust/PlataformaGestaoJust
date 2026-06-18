import { useState } from "react";
import { Building2, HardHat, Plus, X, Star, Trash2, ChevronLeft, Users, Briefcase, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";
import { useEmployees } from "../hooks/useEmployees";
import {
  useObras, useObra, useCreateObra,
  useCreateAlocacao, useUpdateAlocacao, useDeleteAlocacao,
  type PapelObra,
} from "../hooks/useObras";

const PAPEL_LABEL: Record<string, string> = {
  residente: "Engenheiro Residente",
  mestre: "Mestre / Contramestre",
  mao_de_obra: "Mão de obra",
  administrativo: "Administrativo",
};

const PAPEL_BADGE: Record<string, string> = {
  residente: "bg-brand-100 text-brand-800 border-brand-200",
  mestre: "bg-amber-50 text-amber-700 border-amber-200",
  mao_de_obra: "bg-slate-100 text-slate-600 border-slate-200",
  administrativo: "bg-slate-100 text-slate-500 border-slate-200",
};

const PAPEL_ORDER: PapelObra[] = ["residente", "mestre", "mao_de_obra", "administrativo"];

function NovaObraModal({ onClose }: { onClose: () => void }) {
  const create = useCreateObra();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"obra" | "sede">("obra");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Informe o nome da obra."); return; }
    try {
      await create.mutateAsync({ nome: nome.trim(), tipo, status: "ativa" });
      onClose();
    } catch {
      setError("Erro ao criar. Tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nova Obra</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Blank Residence" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as "obra" | "sede")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="obra">Obra (canteiro)</option>
              <option value="sede">Sede / Administrativo</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {create.isPending ? "Criando..." : "Criar Obra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddAlocacaoForm({ obraId, alocados }: { obraId: string; alocados: Set<string> }) {
  const { data: employees = [] } = useEmployees();
  const create = useCreateAlocacao(obraId);
  const [empId, setEmpId] = useState("");
  const [papel, setPapel] = useState<PapelObra>("mao_de_obra");
  const [principal, setPrincipal] = useState(false);

  const disponiveis = employees.filter(e => !alocados.has(e.id));

  async function add() {
    if (!empId) return;
    await create.mutateAsync({ employee_id: empId, papel_na_obra: papel, principal });
    setEmpId(""); setPrincipal(false);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="flex-1 min-w-0">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Colaborador</label>
        <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
          <option value="">Selecione…</option>
          {disponiveis.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
        </select>
      </div>
      <div className="sm:w-52">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Papel na obra</label>
        <select value={papel} onChange={e => setPapel(e.target.value as PapelObra)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
          {PAPEL_ORDER.map(p => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 sm:pb-2 whitespace-nowrap">
        <input type="checkbox" checked={principal} onChange={e => setPrincipal(e.target.checked)} className="rounded border-slate-300 text-brand-900 focus:ring-brand-500/30" />
        Principal
      </label>
      <button onClick={add} disabled={!empId || create.isPending} className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        <Plus className="w-4 h-4" /> Alocar
      </button>
    </div>
  );
}

function ObraDetalhe({ obraId, onBack }: { obraId: string; onBack: () => void }) {
  const { data: obra, isLoading } = useObra(obraId);
  const updateAloc = useUpdateAlocacao(obraId);
  const deleteAloc = useDeleteAlocacao(obraId);

  if (isLoading || !obra) {
    return <div className="p-12 text-center text-slate-400">Carregando obra…</div>;
  }

  const alocados = new Set(obra.alocacoes.map(a => a.employee_id));
  const grupos = PAPEL_ORDER
    .map(p => ({ papel: p, itens: obra.alocacoes.filter(a => a.papel_na_obra === p) }))
    .filter(g => g.itens.length > 0);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Todas as obras
      </button>

      <div className="flex items-center gap-4">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", obra.tipo === "sede" ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700")}>
          {obra.tipo === "sede" ? <Briefcase className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{obra.nome}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {obra.alocacoes.length} alocados · {obra.tipo === "sede" ? "Sede / Administrativo" : "Canteiro de obra"}
            {obra.cost_center ? ` · ${obra.cost_center}` : ""}
          </p>
        </div>
      </div>

      <AddAlocacaoForm obraId={obraId} alocados={alocados} />

      {grupos.map(g => (
        <div key={g.papel} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">{PAPEL_LABEL[g.papel]}</h2>
            <span className="text-xs font-medium text-slate-400">{g.itens.length}</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {g.itens.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                  {a.employee?.name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{a.employee?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{a.employee?.role}</p>
                </div>
                {(a.papel_na_obra === "mestre" || a.papel_na_obra === "residente") && (
                  <button
                    onClick={() => updateAloc.mutate({ id: a.id, responsavel: !a.responsavel })}
                    aria-label={a.responsavel ? "Remover responsável pela avaliação" : "Marcar como responsável pela avaliação"}
                    title={a.responsavel ? "Responsável por avaliar o nível abaixo nesta obra" : "Marcar como responsável pela avaliação"}
                    className={cn("flex items-center gap-1 px-1.5 py-1 rounded-lg text-[11px] font-bold transition-colors", a.responsavel ? "text-brand-700 bg-brand-50" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500")}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">{a.responsavel ? "Avaliador" : "Definir"}</span>
                  </button>
                )}
                <button
                  onClick={() => updateAloc.mutate({ id: a.id, principal: !a.principal })}
                  aria-label={a.principal ? "Remover marcação de principal" : "Marcar como obra principal"}
                  title={a.principal ? "Obra principal deste colaborador" : "Marcar como obra principal"}
                  className={cn("p-1.5 rounded-lg transition-colors", a.principal ? "text-amber-500 hover:bg-amber-50" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500")}
                >
                  <Star className={cn("w-4 h-4", a.principal && "fill-amber-400")} />
                </button>
                <select
                  value={a.papel_na_obra}
                  onChange={e => updateAloc.mutate({ id: a.id, papel_na_obra: e.target.value as PapelObra })}
                  className="text-xs py-1.5 pl-2 pr-6 bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {PAPEL_ORDER.map(p => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
                </select>
                <button
                  onClick={() => { if (confirm(`Remover ${a.employee?.name} desta obra?`)) deleteAloc.mutate(a.id); }}
                  aria-label="Remover alocação"
                  className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ObrasView() {
  const { data: obras = [], isLoading } = useObras();
  const [selected, setSelected] = useState<string | undefined>();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      {selected ? (
        <ObraDetalhe obraId={selected} onBack={() => setSelected(undefined)} />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Obras &amp; Alocação</h1>
              <p className="text-sm text-slate-500 mt-1">Quem trabalha em cada obra e em que papel — base da matriz de avaliação.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Nova Obra
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Carregando obras…</div>
          ) : obras.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Nenhuma obra cadastrada ainda.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {obras.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className="text-left bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", o.tipo === "sede" ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700")}>
                      {o.tipo === "sede" ? <Briefcase className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{o.nome}</h3>
                      <p className="text-xs text-slate-400">{o.tipo === "sede" ? "Sede / Administrativo" : "Canteiro de obra"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{o.total_alocados ?? 0}</span> alocados
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PAPEL_ORDER.filter(p => o.by_papel?.[p]).map(p => (
                      <span key={p} className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border", PAPEL_BADGE[p])}>
                        {p === "mestre" && <HardHat className="w-3 h-3" />}
                        {o.by_papel?.[p]} {PAPEL_LABEL[p]}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && <NovaObraModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

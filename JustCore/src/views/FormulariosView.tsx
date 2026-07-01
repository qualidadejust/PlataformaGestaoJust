// Builder do MOTOR DE FORMULÁRIOS (Core). Espelha o fluxo do Mobuss:
//   Lista de formulários → Cadastro (tipo/grupo/avaliados/comportamento) →
//   Itens (seções) → Manutenção do item (tipo de resposta, instruções, gera-NC).
// O `schema` (estrutura JSON) é o contrato — formulário novo é DADO, não tela em código.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList, Plus, Pencil, ListTree, Copy, GitBranch, Trash2, Check, X,
  ChevronUp, ChevronDown, ArrowLeft, Send, Save, AlertTriangle,
} from "lucide-react";
import { api } from "../lib/utils";
import { cn } from "../lib/utils";

// ---- Tipos de resposta suportados (portáveis no JSON) ----
const RESPOSTA_TIPOS: { value: string; label: string; temOpcoes?: boolean }[] = [
  { value: "sim_nao_na", label: "Conforme / Não conforme / NA" },
  { value: "booleano", label: "Booleano (Sim/Não)" },
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Numérico" },
  { value: "nota", label: "Qualificador numérico (nota)" },
  { value: "data", label: "Data" },
  { value: "selecao_simples", label: "Lista de seleção simples", temOpcoes: true },
  { value: "selecao_multipla", label: "Lista de múltipla seleção", temOpcoes: true },
  { value: "foto", label: "Foto / Anexo" },
  { value: "assinatura", label: "Assinatura" },
];
const ESCOPOS = ["geral", "vistoria", "fvs", "epi", "clima", "fornecedor", "assistencia"];
const ENTIDADES = ["unidade", "obra", "colaborador", "fornecedor", "entrega_epi", "veiculo"];
const AVALIADOS = ["local", "servico", "colaborador", "equipamento", "insumo"] as const;

interface Item {
  ordem: number;
  descricao: string;
  instrucoes?: string;
  peso?: number;
  resposta: { tipo: string; rotulo?: string; opcoes?: string[]; permite_na?: boolean; exige_justificativa_na?: boolean };
  foto?: { permite: boolean; obrigatoria_se_nc?: boolean };
  gera_nc?: { ativo: boolean; quando?: string; severidade_padrao?: string; descricao?: string; tipo?: string; dias_resolucao?: number };
}
interface Secao { secao: string; ordem: number; itens: Item[] }
interface Modelo {
  id?: string; codigo: string; nome: string; descricao?: string; cabecalho?: string;
  tipo_id?: string | null; grupo_id?: string | null; escopo: string; entidade_alvo?: string | null;
  revisao?: string | null; versao?: number; ativo?: boolean; publicado?: boolean; dias_validade?: number | null;
  config?: any; estrutura?: any; tipo?: any; grupo?: any; _count?: { instancias: number };
}

function parseJson<T>(v: any, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v !== "string") return v as T;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

const CONFIG_PADRAO = {
  avaliados: { local: { informar: true, obrigar: false } },
  comportamento: { assina_responsavel: true, assina_avaliado: false, exibe_nota: false, calculo_nota: "sem_nota" },
};

export function FormulariosView() {
  const qc = useQueryClient();
  const [tela, setTela] = useState<{ modo: "lista" } | { modo: "cadastro"; modelo: Modelo } | { modo: "itens"; modelo: Modelo }>({ modo: "lista" });

  const modelosQ = useQuery({ queryKey: ["formularios"], queryFn: () => api.get<Modelo[]>("/api/formularios") });
  const tiposQ = useQuery({ queryKey: ["formulario-tipos"], queryFn: () => api.get<any[]>("/api/formulario-tipos") });
  const gruposQ = useQuery({ queryKey: ["formulario-grupos"], queryFn: () => api.get<any[]>("/api/formulario-grupos") });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["formularios"] });
  const acao = useMutation({
    mutationFn: ({ id, op }: { id: string; op: string }) => api.post(`/api/formularios/${id}/${op}`, {}),
    onSuccess: invalidar,
  });
  const excluir = useMutation({ mutationFn: (id: string) => api.del(`/api/formularios/${id}`), onSuccess: invalidar });

  if (tela.modo === "cadastro")
    return <Cadastro modelo={tela.modelo} tipos={tiposQ.data ?? []} grupos={gruposQ.data ?? []} onVoltar={() => { invalidar(); setTela({ modo: "lista" }); }} onItens={(m) => setTela({ modo: "itens", modelo: m })} />;
  if (tela.modo === "itens")
    return <ItensEditor modelo={tela.modelo} onVoltar={() => { invalidar(); setTela({ modo: "lista" }); }} />;

  const modelos = modelosQ.data ?? [];
  const novo: Modelo = { codigo: "", nome: "", escopo: "geral", config: CONFIG_PADRAO, estrutura: [] };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-brand-900">
            <ClipboardList className="size-6 text-brand-600" /> Formulários (motor)
          </h1>
          <p className="text-sm text-slate-500">Modelos versionados consumidos por todos os apps. Tipos e grupos ficam em Cadastros.</p>
        </div>
        <button onClick={() => setTela({ modo: "cadastro", modelo: novo })} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="size-4" /> Novo formulário
        </button>
      </header>

      {modelosQ.isLoading && <p className="text-sm text-slate-400">Carregando…</p>}
      {!modelosQ.isLoading && modelos.length === 0 && <p className="text-sm text-slate-400">Nenhum formulário. Crie o primeiro.</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Código</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Escopo</th><th className="px-3 py-2">Versão</th><th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {modelos.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/60">
                <td className="px-3 py-2 font-medium">{m.codigo}</td>
                <td className="px-3 py-2">{m.nome}</td>
                <td className="px-3 py-2 text-slate-500">{m.tipo?.nome ?? "—"}</td>
                <td className="px-3 py-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{m.escopo}</span></td>
                <td className="px-3 py-2">v{m.versao}</td>
                <td className="px-3 py-2">
                  {m.publicado
                    ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Publicado</span>
                    : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Rascunho</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Itens" onClick={() => setTela({ modo: "itens", modelo: m })}><ListTree className="size-4" /></IconBtn>
                    <IconBtn title="Editar" onClick={() => setTela({ modo: "cadastro", modelo: m })}><Pencil className="size-4" /></IconBtn>
                    {!m.publicado && <IconBtn title="Publicar" onClick={() => acao.mutate({ id: m.id!, op: "publicar" })}><Send className="size-4 text-emerald-600" /></IconBtn>}
                    <IconBtn title="Nova versão" onClick={() => acao.mutate({ id: m.id!, op: "nova-versao" })}><GitBranch className="size-4" /></IconBtn>
                    <IconBtn title="Duplicar" onClick={() => acao.mutate({ id: m.id!, op: "duplicar" })}><Copy className="size-4" /></IconBtn>
                    <IconBtn title="Excluir" onClick={() => { if (confirm(`Excluir ${m.codigo}?`)) excluir.mutate(m.id!); }}><Trash2 className="size-4 text-red-500" /></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(acao.isError || excluir.isError) && <p className="mt-3 text-sm text-red-600">{((acao.error || excluir.error) as Error)?.message}</p>}
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return <button title={title} onClick={onClick} className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-brand-700">{children}</button>;
}

// ---------------------------------------------------------------------------
// Cadastro do formulário (dados + avaliados + comportamento)
// ---------------------------------------------------------------------------
function Cadastro({ modelo, tipos, grupos, onVoltar, onItens }: { modelo: Modelo; tipos: any[]; grupos: any[]; onVoltar: () => void; onItens: (m: Modelo) => void }) {
  const [m, setM] = useState<Modelo>(() => ({ ...modelo, config: parseJson(modelo.config, CONFIG_PADRAO) }));
  const set = (patch: Partial<Modelo>) => setM((x) => ({ ...x, ...patch }));
  const cfg = m.config ?? CONFIG_PADRAO;
  const setCfg = (patch: any) => set({ config: { ...cfg, ...patch } });
  const setComp = (patch: any) => setCfg({ comportamento: { ...cfg.comportamento, ...patch } });
  const setAval = (k: string, patch: any) => setCfg({ avaliados: { ...cfg.avaliados, [k]: { ...(cfg.avaliados?.[k] ?? {}), ...patch } } });

  const salvar = useMutation({
    mutationFn: () => {
      const payload = { ...m, config: m.config, estrutura: parseJson(m.estrutura, []) };
      return m.id ? api.put<Modelo>(`/api/formularios/${m.id}`, payload) : api.post<Modelo>("/api/formularios", payload);
    },
    onSuccess: (saved) => { setM((x) => ({ ...x, id: (saved as Modelo).id, versao: (saved as Modelo).versao })); },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onVoltar} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700"><ArrowLeft className="size-4" /> Voltar à lista</button>
      <h1 className="mb-4 text-xl font-bold text-brand-900">{m.id ? `Editar ${m.codigo}` : "Novo formulário"} {m.id && <span className="text-sm font-normal text-slate-400">v{m.versao} · {m.publicado ? "publicado" : "rascunho"}</span>}</h1>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Código *"><input value={m.codigo} onChange={(e) => set({ codigo: e.target.value })} className={inp} /></Campo>
          <Campo label="Nome *"><input value={m.nome} onChange={(e) => set({ nome: e.target.value })} className={inp} /></Campo>
          <Campo label="Descrição"><input value={m.descricao ?? ""} onChange={(e) => set({ descricao: e.target.value })} className={inp} /></Campo>
          <Campo label="Cabeçalho (relatório)"><input value={m.cabecalho ?? ""} onChange={(e) => set({ cabecalho: e.target.value })} className={inp} /></Campo>
          <Campo label="Tipo de formulário">
            <select value={m.tipo_id ?? ""} onChange={(e) => set({ tipo_id: e.target.value || null })} className={inp}>
              <option value="">—</option>{tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Grupo de inspeção">
            <select value={m.grupo_id ?? ""} onChange={(e) => set({ grupo_id: e.target.value || null })} className={inp}>
              <option value="">—</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Escopo (app/módulo)">
            <select value={m.escopo} onChange={(e) => set({ escopo: e.target.value })} className={inp}>{ESCOPOS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </Campo>
          <Campo label="Entidade alvo">
            <select value={m.entidade_alvo ?? ""} onChange={(e) => set({ entidade_alvo: e.target.value || null })} className={inp}>
              <option value="">—</option>{ENTIDADES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo label="Revisão (SGQ)"><input value={m.revisao ?? ""} onChange={(e) => set({ revisao: e.target.value })} className={inp} /></Campo>
          <Campo label="Dias de validade"><input type="number" value={m.dias_validade ?? ""} onChange={(e) => set({ dias_validade: e.target.value ? Number(e.target.value) : null })} className={inp} /></Campo>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Avaliados (o que o preenchimento informa)</p>
            <div className="space-y-1.5">
              {AVALIADOS.map((a) => (
                <div key={a} className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 text-sm">
                  <span className="capitalize">{a}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!cfg.avaliados?.[a]?.informar} onChange={(e) => setAval(a, { informar: e.target.checked })} /> Informar</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!cfg.avaliados?.[a]?.obrigar} onChange={(e) => setAval(a, { obrigar: e.target.checked })} /> Obrigar</label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Comportamento</p>
            <div className="space-y-1.5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!cfg.comportamento?.assina_responsavel} onChange={(e) => setComp({ assina_responsavel: e.target.checked })} /> Exige assinatura do responsável</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!cfg.comportamento?.assina_avaliado} onChange={(e) => setComp({ assina_avaliado: e.target.checked })} /> Exige assinatura do avaliado</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!cfg.comportamento?.exibe_nota} onChange={(e) => setComp({ exibe_nota: e.target.checked })} /> Exibe nota</label>
              <Campo label="Cálculo da nota">
                <select value={cfg.comportamento?.calculo_nota ?? "sem_nota"} onChange={(e) => setComp({ calculo_nota: e.target.value })} className={inp}>
                  <option value="sem_nota">Sem nota</option>
                  <option value="ponderacao_pesos">Ponderação por pesos</option>
                  <option value="percentual_conformidade">% de conformidade</option>
                </select>
              </Campo>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => salvar.mutate()} disabled={!m.codigo || !m.nome || salvar.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          <Save className="size-4" /> {salvar.isPending ? "Salvando…" : "Salvar"}
        </button>
        {m.id && <button onClick={() => onItens(m)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"><ListTree className="size-4" /> Itens do formulário</button>}
        {salvar.isError && <span className="text-sm text-red-600">{(salvar.error as Error).message}</span>}
        {salvar.isSuccess && <span className="text-sm text-emerald-600">Salvo.</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Itens do formulário (seções → itens) + manutenção do item
// ---------------------------------------------------------------------------
function ItensEditor({ modelo, onVoltar }: { modelo: Modelo; onVoltar: () => void }) {
  const [secoes, setSecoes] = useState<Secao[]>(() => normalizaSecoes(parseJson<any[]>(modelo.estrutura, [])));
  const [editando, setEditando] = useState<{ si: number; ii: number } | null>(null);
  const aplicado = (modelo._count?.instancias ?? 0) > 0;

  const salvar = useMutation({
    mutationFn: () => api.put(`/api/formularios/${modelo.id}`, { estrutura: secoes }),
  });

  const addSecao = () => setSecoes((s) => [...s, { secao: "NOVA SEÇÃO", ordem: s.length + 1, itens: [] }]);
  const delSecao = (si: number) => setSecoes((s) => s.filter((_, i) => i !== si));
  const moveSecao = (si: number, dir: -1 | 1) => setSecoes((s) => { const a = [...s]; const j = si + dir; if (j < 0 || j >= a.length) return s; [a[si], a[j]] = [a[j], a[si]]; return a; });
  const setSecaoNome = (si: number, nome: string) => setSecoes((s) => s.map((x, i) => (i === si ? { ...x, secao: nome } : x)));
  const addItem = (si: number) => setSecoes((s) => s.map((x, i) => (i === si ? { ...x, itens: [...x.itens, novoItem(x.itens.length + 1)] } : x)));
  const delItem = (si: number, ii: number) => setSecoes((s) => s.map((x, i) => (i === si ? { ...x, itens: x.itens.filter((_, j) => j !== ii) } : x)));
  const setItem = (si: number, ii: number, it: Item) => setSecoes((s) => s.map((x, i) => (i === si ? { ...x, itens: x.itens.map((y, j) => (j === ii ? it : y)) } : x)));

  const totalItens = secoes.reduce((n, s) => n + s.itens.length, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={onVoltar} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700"><ArrowLeft className="size-4" /> Voltar à lista</button>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">{modelo.codigo} — itens</h1>
          <p className="text-sm text-slate-500">{secoes.length} seção(ões) · {totalItens} item(ns)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addSecao} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"><Plus className="size-4" /> Seção</button>
          <button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"><Save className="size-4" /> {salvar.isPending ? "Salvando…" : "Salvar itens"}</button>
        </div>
      </div>

      {aplicado && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="size-4" /> Modelo já aplicado ({modelo._count?.instancias} instância(s)). Alterar a estrutura será bloqueado — use “Nova versão”.
        </div>
      )}
      {salvar.isError && <p className="mb-3 text-sm text-red-600">{(salvar.error as Error).message}</p>}
      {salvar.isSuccess && <p className="mb-3 text-sm text-emerald-600">Itens salvos.</p>}

      <div className="space-y-4">
        {secoes.map((s, si) => (
          <div key={si} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <input value={s.secao} onChange={(e) => setSecaoNome(si, e.target.value)} className="flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-brand-800 hover:border-slate-200 focus:border-brand-300 focus:outline-none" />
              <IconBtn title="Subir" onClick={() => moveSecao(si, -1)}><ChevronUp className="size-4" /></IconBtn>
              <IconBtn title="Descer" onClick={() => moveSecao(si, 1)}><ChevronDown className="size-4" /></IconBtn>
              <IconBtn title="Adicionar item" onClick={() => addItem(si)}><Plus className="size-4 text-brand-600" /></IconBtn>
              <IconBtn title="Excluir seção" onClick={() => delSecao(si)}><Trash2 className="size-4 text-red-500" /></IconBtn>
            </div>
            <div className="divide-y divide-slate-100">
              {s.itens.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Sem itens. Use + para adicionar.</p>}
              {s.itens.map((it, ii) => (
                <div key={ii} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span>{it.descricao || <em className="text-slate-400">sem descrição</em>}</span>
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{RESPOSTA_TIPOS.find((r) => r.value === it.resposta.tipo)?.label ?? it.resposta.tipo}</span>
                    {it.gera_nc?.ativo && <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">gera NC</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconBtn title="Editar item" onClick={() => setEditando({ si, ii })}><Pencil className="size-4" /></IconBtn>
                    <IconBtn title="Excluir item" onClick={() => delItem(si, ii)}><Trash2 className="size-4 text-red-500" /></IconBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <ItemModal
          item={secoes[editando.si].itens[editando.ii]}
          onClose={() => setEditando(null)}
          onSave={(it) => { setItem(editando.si, editando.ii, it); setEditando(null); }}
        />
      )}
    </div>
  );
}

function ItemModal({ item, onClose, onSave }: { item: Item; onClose: () => void; onSave: (it: Item) => void }) {
  const [it, setIt] = useState<Item>(() => JSON.parse(JSON.stringify(item)));
  const set = (patch: Partial<Item>) => setIt((x) => ({ ...x, ...patch }));
  const setResp = (patch: any) => setIt((x) => ({ ...x, resposta: { ...x.resposta, ...patch } }));
  const setNc = (patch: any) => setIt((x) => ({ ...x, gera_nc: { ...(x.gera_nc ?? { ativo: false }), ...patch } }));
  const tipoSel = RESPOSTA_TIPOS.find((r) => r.value === it.resposta.tipo);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-900">Manutenção do item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="size-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Descrição *" full><textarea rows={2} value={it.descricao} onChange={(e) => set({ descricao: e.target.value })} className={inp} /></Campo>
          <Campo label="Instruções" full><textarea rows={2} value={it.instrucoes ?? ""} onChange={(e) => set({ instrucoes: e.target.value })} className={inp} /></Campo>
          <Campo label="Peso do item"><input type="number" step="0.1" value={it.peso ?? 1} onChange={(e) => set({ peso: Number(e.target.value) })} className={inp} /></Campo>
          <Campo label="Tipo da resposta *">
            <select value={it.resposta.tipo} onChange={(e) => setResp({ tipo: e.target.value })} className={inp}>{RESPOSTA_TIPOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
          </Campo>
          <Campo label="Rótulo da resposta"><input value={it.resposta.rotulo ?? ""} onChange={(e) => setResp({ rotulo: e.target.value })} className={inp} /></Campo>
          {tipoSel?.temOpcoes && (
            <Campo label="Opções (uma por linha)" full>
              <textarea rows={3} value={(it.resposta.opcoes ?? []).join("\n")} onChange={(e) => setResp({ opcoes: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} className={inp} />
            </Campo>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!it.resposta.permite_na} onChange={(e) => setResp({ permite_na: e.target.checked })} /> Permite N/A</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!it.resposta.exige_justificativa_na} onChange={(e) => setResp({ exige_justificativa_na: e.target.checked })} /> Exige justificativa N/A</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!it.foto?.permite} onChange={(e) => set({ foto: { permite: e.target.checked, obrigatoria_se_nc: it.foto?.obrigatoria_se_nc } })} /> Permite foto</label>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!it.gera_nc?.ativo} onChange={(e) => setNc({ ativo: e.target.checked })} /> Gera não-conformidade</label>
          {it.gera_nc?.ativo && (
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo label="Quando">
                <select value={it.gera_nc.quando ?? "nao_conforme"} onChange={(e) => setNc({ quando: e.target.value })} className={inp}>
                  <option value="nao_conforme">Resposta não conforme</option>
                  <option value="reprovado">Resposta reprovada</option>
                </select>
              </Campo>
              <Campo label="Severidade padrão">
                <select value={it.gera_nc.severidade_padrao ?? "media"} onChange={(e) => setNc({ severidade_padrao: e.target.value })} className={inp}>
                  <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica (bloqueia)</option>
                </select>
              </Campo>
              <Campo label="Dias para resolução"><input type="number" value={it.gera_nc.dias_resolucao ?? ""} onChange={(e) => setNc({ dias_resolucao: e.target.value ? Number(e.target.value) : undefined })} className={inp} /></Campo>
              <Campo label="Descrição padrão da NC" full><input value={it.gera_nc.descricao ?? ""} onChange={(e) => setNc({ descricao: e.target.value })} className={inp} /></Campo>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">Cancelar</button>
          <button onClick={() => onSave(it)} disabled={!it.descricao} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"><Check className="size-4" /> Aplicar</button>
        </div>
      </div>
    </div>
  );
}

// ---- helpers ----
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400";
function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={cn("block", full && "sm:col-span-2")}><span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>{children}</label>;
}
function novoItem(ordem: number): Item {
  return { ordem, descricao: "", peso: 1, resposta: { tipo: "sim_nao_na", permite_na: true }, foto: { permite: true, obrigatoria_se_nc: true }, gera_nc: { ativo: true, quando: "nao_conforme", severidade_padrao: "media" } };
}
/** aceita estrutura rica (secao/itens-objeto) ou simples (grupo/itens-string) e normaliza. */
function normalizaSecoes(raw: any[]): Secao[] {
  return (raw ?? []).map((s, si) => ({
    secao: s.secao ?? s.grupo ?? `SEÇÃO ${si + 1}`,
    ordem: s.ordem ?? si + 1,
    itens: (s.itens ?? []).map((it: any, ii: number) =>
      typeof it === "string"
        ? novoItemDesc(it, ii + 1)
        : { ordem: it.ordem ?? ii + 1, descricao: it.descricao ?? "", instrucoes: it.instrucoes, peso: it.peso ?? 1, resposta: it.resposta ?? { tipo: "sim_nao_na", permite_na: true }, foto: it.foto, gera_nc: it.gera_nc },
    ),
  }));
}
function novoItemDesc(descricao: string, ordem: number): Item {
  return { ...novoItem(ordem), descricao };
}

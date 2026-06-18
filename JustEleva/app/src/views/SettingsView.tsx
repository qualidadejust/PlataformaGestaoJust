import { useState, useEffect } from "react";
import { Settings, CalendarDays, Shield, Save, CheckCircle2, Plus, Edit2, AlertCircle, X, ListChecks, Trash2, Users, Layers, Crown, Smile } from "lucide-react";
import { cn } from "../lib/utils";
import { useCycles, useCreateCycle, useUpdateCycle } from "../hooks/useCycles";
import type { Cycle } from "../hooks/useCycles";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useAssignTemplate } from "../hooks/useTemplates";
import type { TemplateInput } from "../hooks/useTemplates";
import { useEmployees } from "../hooks/useEmployees";
import type { EvaluationTemplate } from "../types";
import { useSurveyForms, useCreateSurveyForm, useUpdateSurveyForm, useDeleteSurveyForm } from "../hooks/useSurveys";
import type { SurveyForm, SurveyFormInput } from "../hooks/useSurveys";

function CicloModal({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial?: Cycle;
}) {
  const create = useCreateCycle();
  const update = useUpdateCycle();
  const [form, setForm] = useState<Omit<Cycle, 'id'>>({
    name: initial?.name ?? '',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    status: initial?.status ?? 'draft',
  });
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      setError('Nome, data de início e data de fim são obrigatórios.');
      return;
    }
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...form });
      } else {
        await create.mutateAsync(form);
      }
      onClose();
    } catch {
      setError('Erro ao salvar ciclo. Tente novamente.');
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{initial ? 'Editar Ciclo' : 'Novo Ciclo'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome do ciclo *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Avaliação Semestral 2026.2" />
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="closed">Encerrado</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
              {isPending ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Ciclo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type EditQuestion = { text: string; answer_type: 'scale' | 'yesno' | 'text' };
type EditBlock = { title: string; manager_only: boolean; questions: EditQuestion[] };
type EditForm = { name: string; description: string; applies_to: 'default' | 'managers'; blocks: EditBlock[] };

function toEditForm(tpl?: EvaluationTemplate): EditForm {
  if (!tpl) return { name: '', description: '', applies_to: 'default', blocks: [] };
  return {
    name: tpl.name,
    description: tpl.description ?? '',
    applies_to: tpl.applies_to,
    blocks: tpl.blocks.map(b => ({
      title: b.title,
      manager_only: b.manager_only,
      questions: b.questions.map(q => ({ text: q.text, answer_type: q.answer_type })),
    })),
  };
}

function TemplateEditorModal({ onClose, initial }: { onClose: () => void; initial?: EvaluationTemplate }) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const [form, setForm] = useState<EditForm>(() => toEditForm(initial));
  const [error, setError] = useState('');

  const isPending = create.isPending || update.isPending;

  const setBlock = (bi: number, patch: Partial<EditBlock>) =>
    setForm(f => ({ ...f, blocks: f.blocks.map((b, i) => i === bi ? { ...b, ...patch } : b) }));
  const addBlock = () =>
    setForm(f => ({ ...f, blocks: [...f.blocks, { title: '', manager_only: false, questions: [{ text: '', answer_type: 'scale' }] }] }));
  const removeBlock = (bi: number) =>
    setForm(f => ({ ...f, blocks: f.blocks.filter((_, i) => i !== bi) }));
  const setQuestion = (bi: number, qi: number, patch: Partial<EditQuestion>) =>
    setBlock(bi, { questions: form.blocks[bi].questions.map((q, i) => i === qi ? { ...q, ...patch } : q) });
  const addQuestion = (bi: number) =>
    setBlock(bi, { questions: [...form.blocks[bi].questions, { text: '', answer_type: 'scale' }] });
  const removeQuestion = (bi: number, qi: number) =>
    setBlock(bi, { questions: form.blocks[bi].questions.filter((_, i) => i !== qi) });

  async function handleSave() {
    setError('');
    if (!form.name.trim()) { setError('Informe o nome do modelo.'); return; }
    const blocks = form.blocks
      .map(b => ({ title: b.title.trim(), manager_only: b.manager_only, questions: b.questions.filter(q => q.text.trim()).map(q => ({ text: q.text.trim(), answer_type: q.answer_type })) }))
      .filter(b => b.title && b.questions.length > 0);
    if (blocks.length === 0) { setError('Adicione ao menos um bloco com uma pergunta.'); return; }
    const payload: TemplateInput = { name: form.name.trim(), description: form.description.trim() || null, applies_to: form.applies_to, blocks };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, ...payload });
      else await create.mutateAsync(payload);
      onClose();
    } catch {
      setError('Erro ao salvar o modelo. Tente novamente.');
    }
  }

  const totalQuestions = form.blocks.reduce((s, b) => s + b.questions.length, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{initial ? 'Editar Modelo de Avaliação' : 'Novo Modelo de Avaliação'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome do modelo *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Ex: Avaliação — Liderança" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Aplica-se a (perfil)</label>
              <select value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as 'default' | 'managers' }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                <option value="default">Padrão (todos os colaboradores)</option>
                <option value="managers">Lideranças (gestores)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Opcional" />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900">Blocos e Perguntas <span className="text-slate-400 font-medium">({form.blocks.length} blocos · {totalQuestions} perguntas)</span></h3>
            <button onClick={addBlock} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"><Plus className="w-3.5 h-3.5" /> Bloco</button>
          </div>

          <div className="space-y-5">
            {form.blocks.map((block, bi) => (
              <div key={bi} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <input value={block.title} onChange={e => setBlock(bi, { title: e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white" placeholder="Título do bloco (ex: Competências Técnicas)" />
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={block.manager_only} onChange={e => setBlock(bi, { manager_only: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                    Só lideranças
                  </label>
                  <button onClick={() => removeBlock(bi)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 pl-1">
                  {block.questions.map((q, qi) => (
                    <div key={qi} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">{qi + 1}.</span>
                      <input value={q.text} onChange={e => setQuestion(bi, qi, { text: e.target.value })} className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white" placeholder="Texto da pergunta..." />
                      <select value={q.answer_type} onChange={e => setQuestion(bi, qi, { answer_type: e.target.value as EditQuestion['answer_type'] })} title="Tipo de resposta" className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shrink-0 cursor-pointer">
                        <option value="scale">Escala 1–5</option>
                        <option value="yesno">Sim / Não</option>
                        <option value="text">Texto livre</option>
                      </select>
                      <button onClick={() => removeQuestion(bi, qi)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => addQuestion(bi)} className="text-xs font-bold text-brand-600 hover:text-brand-800 ml-7">+ Pergunta</button>
                </div>
              </div>
            ))}
            {form.blocks.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
                Nenhum bloco ainda. Clique em <strong>+ Bloco</strong> para começar.
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-60">
            {isPending ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Modelo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelosAvaliacaoTab() {
  const { data: templates = [], isLoading } = useTemplates();
  const { data: employees = [] } = useEmployees();
  const del = useDeleteTemplate();
  const assign = useAssignTemplate();
  const [editor, setEditor] = useState<{ open: boolean; editing?: EvaluationTemplate }>({ open: false });

  const appliesBadge = (a: string) => a === 'managers'
    ? <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-bold"><Crown className="w-3 h-3" /> Lideranças</span>
    : <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs font-bold"><Users className="w-3 h-3" /> Todos</span>;

  return (
    <div className="space-y-6">
      {editor.open && <TemplateEditorModal onClose={() => setEditor({ open: false })} initial={editor.editing} />}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Modelos de Avaliação</h2>
            <p className="text-sm text-slate-500 mt-1">Defina os blocos e perguntas usados no formulário. Escala fixa de 1 a 5 + N/S.</p>
          </div>
          <button onClick={() => setEditor({ open: true })} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Novo Modelo
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 py-8">Carregando modelos...</div>
        ) : templates.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">Nenhum modelo cadastrado.</div>
        ) : (
          <div className="space-y-3">
            {templates.map(tpl => {
              const totalQ = tpl.blocks.reduce((s, b) => s + b.questions.length, 0);
              return (
                <div key={tpl.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Layers className="w-5 h-5" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900">{tpl.name}</h3>
                        {appliesBadge(tpl.applies_to)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{tpl.blocks.length} blocos · {totalQ} perguntas{tpl.description ? ` · ${tpl.description}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setEditor({ open: true, editing: tpl })} className="p-2 text-slate-400 hover:text-brand-600 bg-white rounded-lg border border-slate-200 transition-colors shadow-sm"><Edit2 className="w-4 h-4" /></button>
                    <button
                      onClick={() => { if (confirm(`Excluir o modelo "${tpl.name}"? Colaboradores atribuídos voltarão ao padrão.`)) del.mutate(tpl.id); }}
                      className="p-2 text-slate-400 hover:text-red-600 bg-white rounded-lg border border-slate-200 transition-colors shadow-sm"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in">
        <div className="mb-4 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">Atribuição Individual</h2>
          <p className="text-sm text-slate-500 mt-1">Defina um modelo específico por colaborador. Sem atribuição, vale o modelo do perfil (lideranças / padrão).</p>
        </div>
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.id} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-800">{emp.name}</span>
                <span className="text-xs text-slate-400 ml-2">{emp.role}{emp.is_manager ? ' · Liderança' : ''}</span>
              </div>
              <select
                value={emp.template_id ?? ''}
                onChange={e => assign.mutate({ employee_id: emp.id, template_id: e.target.value || null })}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm cursor-pointer shrink-0 max-w-[260px]"
              >
                <option value="">Padrão do perfil</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Modelos de Pesquisa (Clima) ----------------------- */

type SQ = { text: string; kind: 'scale' | 'enps' };
type SDim = { title: string; questions: SQ[] };
type SForm = { name: string; dimensions: SDim[] };

function toSurveyForm(f?: SurveyForm): SForm {
  if (!f) return { name: '', dimensions: [] };
  return { name: f.name, dimensions: f.dimensions.map(d => ({ title: d.title, questions: d.questions.map(q => ({ text: q.text, kind: q.kind })) })) };
}

function SurveyFormEditorModal({ onClose, initial }: { onClose: () => void; initial?: SurveyForm }) {
  const create = useCreateSurveyForm();
  const update = useUpdateSurveyForm();
  const [form, setForm] = useState<SForm>(() => toSurveyForm(initial));
  const [error, setError] = useState('');
  const isPending = create.isPending || update.isPending;

  const setDim = (di: number, patch: Partial<SDim>) => setForm(f => ({ ...f, dimensions: f.dimensions.map((d, i) => i === di ? { ...d, ...patch } : d) }));
  const addDim = () => setForm(f => ({ ...f, dimensions: [...f.dimensions, { title: '', questions: [{ text: '', kind: 'scale' }] }] }));
  const removeDim = (di: number) => setForm(f => ({ ...f, dimensions: f.dimensions.filter((_, i) => i !== di) }));
  const setQ = (di: number, qi: number, patch: Partial<SQ>) => setDim(di, { questions: form.dimensions[di].questions.map((q, i) => i === qi ? { ...q, ...patch } : q) });
  const addQ = (di: number) => setDim(di, { questions: [...form.dimensions[di].questions, { text: '', kind: 'scale' }] });
  const removeQ = (di: number, qi: number) => setDim(di, { questions: form.dimensions[di].questions.filter((_, i) => i !== qi) });

  async function handleSave() {
    setError('');
    if (!form.name.trim()) { setError('Informe o nome do formulário.'); return; }
    const dimensions = form.dimensions
      .map(d => ({ title: d.title.trim(), questions: d.questions.filter(q => q.text.trim()).map(q => ({ text: q.text.trim(), kind: q.kind })) }))
      .filter(d => d.title && d.questions.length > 0);
    if (dimensions.length === 0) { setError('Adicione ao menos uma dimensão com uma pergunta.'); return; }
    const payload: SurveyFormInput = { name: form.name.trim(), dimensions };
    try { if (initial) await update.mutateAsync({ id: initial.id, ...payload }); else await create.mutateAsync(payload); onClose(); }
    catch { setError('Erro ao salvar o formulário.'); }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{initial ? 'Editar Formulário de Pesquisa' : 'Novo Formulário de Pesquisa'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome do formulário *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Ex: Pesquisa de Satisfação — Obras" />
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900">Dimensões e Perguntas <span className="text-slate-400 font-medium">({form.dimensions.length} dimensões)</span></h3>
            <button onClick={addDim} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"><Plus className="w-3.5 h-3.5" /> Dimensão</button>
          </div>
          <div className="space-y-5">
            {form.dimensions.map((dim, di) => (
              <div key={di} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <input value={dim.title} onChange={e => setDim(di, { title: e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Título da dimensão (ex: Condições de Trabalho)" />
                  <button onClick={() => removeDim(di)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 pl-1">
                  {dim.questions.map((q, qi) => (
                    <div key={qi} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">{qi + 1}.</span>
                      <input value={q.text} onChange={e => setQ(di, qi, { text: e.target.value })} className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Texto da pergunta..." />
                      <select value={q.kind} onChange={e => setQ(di, qi, { kind: e.target.value as 'scale' | 'enps' })} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 bg-white shrink-0">
                        <option value="scale">Escala 1–5</option>
                        <option value="enps">eNPS 0–10</option>
                      </select>
                      <button onClick={() => removeQ(di, qi)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => addQ(di)} className="text-xs font-bold text-brand-600 hover:text-brand-800 ml-7">+ Pergunta</button>
                </div>
              </div>
            ))}
            {form.dimensions.length === 0 && <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">Nenhuma dimensão. Clique em <strong>+ Dimensão</strong>.</div>}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={isPending} className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-sm font-bold disabled:opacity-60">{isPending ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Formulário'}</button>
        </div>
      </div>
    </div>
  );
}

function ModelosPesquisaTab() {
  const { data: forms = [], isLoading } = useSurveyForms();
  const del = useDeleteSurveyForm();
  const [editor, setEditor] = useState<{ open: boolean; editing?: SurveyForm }>({ open: false });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in">
      {editor.open && <SurveyFormEditorModal onClose={() => setEditor({ open: false })} initial={editor.editing} />}
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Modelos de Pesquisa de Clima</h2>
          <p className="text-sm text-slate-500 mt-1">Dimensões e perguntas usadas nas campanhas. Escala 1–5 + eNPS.</p>
        </div>
        <button onClick={() => setEditor({ open: true })} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /> Novo Formulário</button>
      </div>
      {isLoading ? <div className="text-center text-slate-400 py-8">Carregando...</div>
        : forms.length === 0 ? <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">Nenhum formulário cadastrado.</div>
          : (
            <div className="space-y-3">
              {forms.map(f => {
                const totalQ = f.dimensions.reduce((s, d) => s + d.questions.length, 0);
                return (
                  <div key={f.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-4 hover:bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Smile className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-slate-900">{f.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{f.dimensions.length} dimensões · {totalQ} perguntas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEditor({ open: true, editing: f })} className="p-2 text-slate-400 hover:text-brand-600 bg-white rounded-lg border border-slate-200 shadow-sm"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm(`Excluir o formulário "${f.name}"?`)) del.mutate(f.id); }} className="p-2 text-slate-400 hover:text-red-600 bg-white rounded-lg border border-slate-200 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}

export function SettingsView() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [activeTab, setActiveTab] = useState<'hierarchy' | 'cycles' | 'permissions' | 'templates' | 'survey_forms'>('cycles');
  const [cicloModal, setCicloModal] = useState<{ open: boolean; editing?: Cycle }>({ open: false });

  const { data: cycles = [], isLoading: loadingCycles } = useCycles();
  const activeCycle = cycles.find(c => c.status === 'active');
  const historicalCycles = cycles.filter(c => c.status !== 'active');

  const formatDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

  const tabs = [
    { id: 'cycles', label: 'Ciclos de Avaliação', icon: CalendarDays },
    { id: 'templates', label: 'Modelos de Avaliação', icon: ListChecks },
    { id: 'survey_forms', label: 'Modelos de Pesquisa', icon: Smile },
    { id: 'hierarchy', label: 'Hierarquia e Fluxos', icon: Settings },
    { id: 'permissions', label: 'Perfis e Permissões', icon: Shield },
  ];

  const statusBadge = (status: string) => {
    if (status === 'active') return <span className="text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded text-xs font-bold">Em Andamento</span>;
    if (status === 'closed') return <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-xs font-bold">Concluído</span>;
    return <span className="text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded text-xs font-bold">Rascunho</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      {cicloModal.open && (
        <CicloModal
          onClose={() => setCicloModal({ open: false })}
          initial={cicloModal.editing}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-brand-600" />
            Configurações do Sistema
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl font-medium">
            Gerencie ciclos de avaliação, defina as regras de hierarquia e configure os acessos por perfil de usuário.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col gap-1 sticky top-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors w-full text-left",
                  activeTab === tab.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-brand-600" : "text-slate-400")} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === 'cycles' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Configuração de Ciclos (Rodadas)</h2>
                  <p className="text-sm text-slate-500 mt-1">Defina a periodicidade e os parâmetros das avaliações.</p>
                </div>
                <button
                  onClick={() => setCicloModal({ open: true })}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Novo Ciclo
                </button>
              </div>

              {loadingCycles ? (
                <div className="text-center text-slate-400 py-8">Carregando ciclos...</div>
              ) : (
                <div className="space-y-6">
                  {activeCycle ? (
                    <div className="border border-brand-200 bg-brand-50/50 rounded-xl p-5 relative">
                      <div className="absolute top-5 right-5 flex gap-2">
                        <button
                          onClick={() => setCicloModal({ open: true, editing: activeCycle })}
                          className="p-2 text-slate-400 hover:text-brand-600 bg-white rounded-lg border border-slate-200 transition-colors shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-brand-100 text-brand-700 text-xs font-black uppercase tracking-wider rounded-md border border-brand-200">Em Andamento</span>
                        <h3 className="text-lg font-bold text-slate-900">{activeCycle.name}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início</label>
                          <span className="text-sm font-medium text-slate-900">{formatDate(activeCycle.start_date)}</span>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fim</label>
                          <span className="text-sm font-medium text-slate-900">{formatDate(activeCycle.end_date)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                      <p className="text-slate-500 font-medium mb-3">Nenhum ciclo ativo no momento.</p>
                      <button
                        onClick={() => setCicloModal({ open: true })}
                        className="text-brand-600 text-sm font-bold hover:underline"
                      >
                        Criar o primeiro ciclo
                      </button>
                    </div>
                  )}

                  {historicalCycles.length > 0 && (
                    <>
                      <h3 className="text-sm font-bold text-slate-900 mt-8 mb-4">Histórico de Ciclos</h3>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-bold">
                            <tr>
                              <th className="px-4 py-3">Nome do Ciclo</th>
                              <th className="px-4 py-3">Período</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {historicalCycles.map(c => (
                              <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-900">{c.name}</td>
                                <td className="px-4 py-3 text-slate-600">{formatDate(c.start_date)} — {formatDate(c.end_date)}</td>
                                <td className="px-4 py-3">{statusBadge(c.status)}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => setCicloModal({ open: true, editing: c })}
                                    className="text-brand-600 hover:text-brand-800 text-xs font-bold"
                                  >
                                    Editar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && <ModelosAvaliacaoTab />}

          {activeTab === 'survey_forms' && <ModelosPesquisaTab />}

          {activeTab === 'hierarchy' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900">Estrutura de Avaliação</h2>
                <p className="text-sm text-slate-500 mt-1">Defina de quem parte a avaliação e como o fluxo acontece.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong className="font-bold block mb-0.5">Configurações em desenvolvimento</strong>
                  As opções abaixo ainda não são salvas. Serão ativadas em uma próxima versão do sistema.
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { title: 'Autoavaliação (First-step)', desc: 'O colaborador avalia a si mesmo antes da nota do gestor direto. Cria a base para o contraste na calibração.', checked: true, disabled: false },
                  { title: 'Avaliação do Gestor Direto (Top-Down)', desc: 'Obrigatório. O líder imediato avalia sua equipe reportada.', checked: true, disabled: true },
                  { title: 'Avaliação Matricial / Projetos', desc: 'Permite que gerentes de projeto avaliem o desempenho funcional do colaborador alocado em suas obras.', checked: true, disabled: false },
                  { title: 'Avaliação 360° (Pares e Subordinados)', desc: 'Liberar escolhas de parceiros para feedback anônimo multidirecional.', checked: false, disabled: false },
                ].map(item => (
                  <div key={item.title} className="flex items-start justify-between border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                    <label className={cn("relative inline-flex items-center cursor-pointer shrink-0 mt-1", item.disabled && "opacity-50 cursor-not-allowed")}>
                      <input type="checkbox" defaultChecked={item.checked} disabled={item.disabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-900"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900">Perfis de Acesso (Restrições)</h2>
                <p className="text-sm text-slate-500 mt-1">Configure o que cada perfil pode visualizar e editar no sistema.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong className="font-bold block mb-0.5">Configurações em desenvolvimento</strong>
                  As permissões abaixo ainda não são salvas. O controle de acesso por perfil será ativado junto com o módulo de autenticação.
                </div>
              </div>
              <div className="space-y-6">
                {[
                  {
                    label: 'Administrador / DHO (RH)', color: 'indigo',
                    perms: [
                      { label: 'Gerenciar todos os ciclos', locked: true, checked: true },
                      { label: 'Acesso amplo a Calibrações', locked: true, checked: true },
                      { label: 'Pode sobrescrever notas de gestores', locked: false, checked: true },
                      { label: 'Visualizar dashboard consolidado (Nine-box global)', locked: false, checked: true },
                    ]
                  },
                  {
                    label: 'Líder / Gestor Direto', color: 'blue',
                    perms: [
                      { label: 'Avaliar equipe direta', locked: true, checked: true },
                      { label: 'Visualizar histórico PDI da sua equipe', locked: false, checked: true },
                      { label: 'Acesso aos resultados de calibração restrita', locked: false, checked: true },
                      { label: 'Convidar avaliadores externos/pares', locked: false, checked: false },
                    ]
                  },
                  {
                    label: 'Colaborador (Usuário Padrão)', color: 'slate',
                    perms: [
                      { label: 'Responder Autoavaliação', locked: true, checked: true },
                      { label: 'Acesso ao próprio PDI', locked: true, checked: true },
                      { label: 'Visualizar competências e rubricas do cargo', locked: false, checked: true },
                      { label: 'Visualizar nota formatada após calibração (Nine-Box)', locked: false, checked: false },
                    ]
                  },
                ].map(group => (
                  <div key={group.label} className={`border border-${group.color}-200 rounded-xl overflow-hidden shadow-sm`}>
                    <div className={`bg-${group.color}-50 px-5 py-4 border-b border-${group.color}-100 flex items-center gap-3`}>
                      <Shield className={`w-5 h-5 text-${group.color}-600`} />
                      <h3 className={`font-black text-${group.color}-900 text-lg`}>{group.label}</h3>
                    </div>
                    <div className="px-5 py-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                      {group.perms.map(perm => (
                        <label key={perm.label} className={cn("flex items-center gap-2", perm.locked ? "cursor-not-allowed" : "cursor-pointer group")}>
                          <input type="checkbox" defaultChecked={perm.checked} disabled={perm.locked} className={`w-4 h-4 text-${group.color}-600 border-slate-300 rounded focus:ring-${group.color}-500 ${perm.locked ? 'opacity-60' : ''}`} />
                          <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 text-sm text-orange-800">
                  <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <strong className="font-bold block mb-1">Atenção com permissões sensíveis</strong>
                    Módulo de calibração e edição de notas consolidadas devem geralmente ficar restritos ao DHO e Diretoria para garantir integridade do processo de Meritocracia.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

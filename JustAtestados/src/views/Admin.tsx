import { useState, useEffect, useCallback } from 'react';
import {
  Users, Building, Briefcase, FileType, Database, Sliders,
  Plus, Edit2, Download, Search, CheckCircle2, XCircle, AlertCircle,
  FileText, Clock, Trash2, Loader2, UserPlus, Wallet,
} from 'lucide-react';
import { cn } from '../utils';
import { dataService } from '../services';
import { useAuth } from '../context/AuthContext';
import { searchCidCatalogo, listCidsCatalogo, getCidCount } from '../services/cidCatalog';
import type { Obra, Colaborador, CentroCusto, Cargo, AuditEvento, Cid, User } from '../types';

/** Registra um evento de auditoria sem quebrar a ação caso falhe. */
async function logAudit(usuario: string, acao: string, modulo: string, detalhe: string): Promise<void> {
  try {
    await dataService.logEvento({ usuario, acao, modulo, detalhe });
  } catch { /* auditoria não deve interromper o fluxo */ }
}

type AdminSection = 'usuarios' | 'obras' | 'colaboradores' | 'parametros' | 'audit' | 'tipos' | 'cargos';

// ── helpers ────────────────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm ' +
  'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 ' +
  'focus:outline-none focus:ring-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 ' +
  'focus:border-petroleum-500 dark:focus:border-petroleum-400';

const LABEL_CLS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

const UF_LIST = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

// ── sub-components ─────────────────────────────────────────────────────────────

interface ToastState { message: string; type: 'success' | 'error' }

// ─── Obras Section ─────────────────────────────────────────────────────────────

interface ObraFormData { codigo: string; nome: string; uf: string }
const OBRA_EMPTY: ObraFormData = { codigo: '', nome: '', uf: 'SP' };

interface ObrasSectionProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  actor?: string;   // nome do usuário logado, para auditoria
}

function ObrasSection({ showToast }: ObrasSectionProps) {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Obra | null>(null);
  const [form, setForm] = useState<ObraFormData>(OBRA_EMPTY);
  const [errors, setErrors] = useState<Partial<ObraFormData>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataService.listObras();
      setObras(data);
    } catch {
      showToast('Erro ao carregar obras.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(OBRA_EMPTY);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (o: Obra) => {
    setEditTarget(o);
    setForm({ codigo: o.codigo, nome: o.nome, uf: o.uf });
    setErrors({});
    setShowModal(true);
  };

  const validate = (): boolean => {
    const e: Partial<ObraFormData> = {};
    if (!form.codigo.trim()) e.codigo = 'Obrigatório';
    if (!form.nome.trim()) e.nome = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await dataService.updateObra(editTarget.id, {
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          uf: form.uf,
        });
        showToast('Obra atualizada com sucesso!');
      } else {
        await dataService.createObra({
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          uf: form.uf,
        });
        showToast('Obra cadastrada com sucesso!');
      }
      setShowModal(false);
      await load();
    } catch {
      showToast('Erro ao salvar obra.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await dataService.deleteObra(id);
      showToast('Obra removida com sucesso!');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Erro ao remover obra.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = obras.filter(o =>
    !search ||
    o.nome.toLowerCase().includes(search.toLowerCase()) ||
    o.codigo.toLowerCase().includes(search.toLowerCase()) ||
    o.uf.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Obras / Unidades</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => showToast('Em breve')}
            className="flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar
          </button>
          <button
            onClick={openAdd}
            className="flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700 shadow-sm dark:shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Obra
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 sm:text-sm"
            placeholder="Buscar por código, nome ou UF..."
          />
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
            <Building className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhuma obra cadastrada</p>
            <button onClick={openAdd} className="mt-4 flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700">
              <Plus className="w-4 h-4 mr-2" /> Cadastrar primeira obra
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-4 py-3">Cód. Obra</th>
                <th className="px-4 py-3">Nome da Obra / Unidade</th>
                <th className="px-4 py-3">UF</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">{o.codigo}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-50">{o.nome}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      {o.uf}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => openEdit(o)}
                      className="text-petroleum-600 hover:text-petroleum-800 p-1 rounded hover:bg-petroleum-50 dark:hover:bg-slate-800"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(o.id)}
                      className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-slate-800"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} obra{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}.
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {editTarget ? 'Editar Obra' : 'Nova Obra'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Cód. Obra <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                    className={cn(INPUT_CLS, errors.codigo && 'border-rose-400 dark:border-rose-500')}
                    placeholder="Ex: 003"
                  />
                  {errors.codigo && <p className="text-xs text-rose-500 mt-1">{errors.codigo}</p>}
                </div>
                <div>
                  <label className={LABEL_CLS}>UF</label>
                  <select
                    value={form.uf}
                    onChange={e => setForm(f => ({ ...f, uf: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Nome da Obra / Unidade <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className={cn(INPUT_CLS, errors.nome && 'border-rose-400 dark:border-rose-500')}
                  placeholder="Ex: Obra Delta - MG"
                />
                {errors.nome && <p className="text-xs text-rose-500 mt-1">{errors.nome}</p>}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="py-2 px-4 bg-petroleum-600 text-white rounded-md font-medium text-sm hover:bg-petroleum-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-60 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editTarget ? 'Atualizar Obra' : 'Salvar Obra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-1">Confirmar exclusão</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Esta ação é permanente. Colaboradores vinculados a esta obra podem ficar inconsistentes.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={saving}
                className="py-2 px-4 bg-rose-600 text-white rounded-md font-medium text-sm hover:bg-rose-700 disabled:opacity-60 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Centros de Custo Section ──────────────────────────────────────────────────

interface CCFormData { codigo: string; nome: string }
const CC_EMPTY: CCFormData = { codigo: '', nome: '' };

function CentroCustoSection({ showToast }: ObrasSectionProps) {
  const [ccs, setCcs] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CentroCusto | null>(null);
  const [form, setForm] = useState<CCFormData>(CC_EMPTY);
  const [errors, setErrors] = useState<Partial<CCFormData>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataService.listCentrosCusto();
      setCcs(data);
    } catch {
      showToast('Erro ao carregar centros de custo.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(CC_EMPTY);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (c: CentroCusto) => {
    setEditTarget(c);
    setForm({ codigo: c.codigo, nome: c.nome });
    setErrors({});
    setShowModal(true);
  };

  const validate = (): boolean => {
    const e: Partial<CCFormData> = {};
    if (!form.codigo.trim()) e.codigo = 'Obrigatório';
    if (!form.nome.trim()) e.nome = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await dataService.updateCentroCusto(editTarget.id, {
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
        });
        showToast('Centro de custo atualizado com sucesso!');
      } else {
        await dataService.createCentroCusto({
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
        });
        showToast('Centro de custo cadastrado com sucesso!');
      }
      setShowModal(false);
      await load();
    } catch {
      showToast('Erro ao salvar centro de custo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await dataService.deleteCentroCusto(id);
      showToast('Centro de custo removido com sucesso!');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Erro ao remover centro de custo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = ccs.filter(c =>
    !search ||
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 pt-2 flex flex-col animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Centros de Custo</h2>
        <button
          onClick={openAdd}
          className="flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700 shadow-sm dark:shadow-none"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo C.C.
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 sm:text-sm"
            placeholder="Buscar por código ou nome..."
          />
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-10 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 py-12">
            <Wallet className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhum centro de custo cadastrado</p>
            <button onClick={openAdd} className="mt-4 flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700">
              <Plus className="w-4 h-4 mr-2" /> Cadastrar primeiro C.C.
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{c.codigo}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-50">{c.nome}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-petroleum-600 hover:text-petroleum-800 p-1 rounded hover:bg-petroleum-50 dark:hover:bg-slate-800"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c.id)}
                      className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-slate-800"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} centro{filtered.length !== 1 ? 's' : ''} de custo encontrado{filtered.length !== 1 ? 's' : ''}.
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {editTarget ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL_CLS}>Código <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  className={cn(INPUT_CLS, errors.codigo && 'border-rose-400 dark:border-rose-500')}
                  placeholder="Ex: CC-045-SP"
                />
                {errors.codigo && <p className="text-xs text-rose-500 mt-1">{errors.codigo}</p>}
              </div>
              <div>
                <label className={LABEL_CLS}>Nome <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className={cn(INPUT_CLS, errors.nome && 'border-rose-400 dark:border-rose-500')}
                  placeholder="Ex: Operacional - Obra Alfa"
                />
                {errors.nome && <p className="text-xs text-rose-500 mt-1">{errors.nome}</p>}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="py-2 px-4 bg-petroleum-600 text-white rounded-md font-medium text-sm hover:bg-petroleum-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-60 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editTarget ? 'Atualizar C.C.' : 'Salvar C.C.'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-1">Confirmar exclusão</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Colaboradores que usam este centro de custo manterão o código já gravado.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={saving}
                className="py-2 px-4 bg-rose-600 text-white rounded-md font-medium text-sm hover:bg-rose-700 disabled:opacity-60 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Colaboradores Section ─────────────────────────────────────────────────────

interface ColabFormData {
  matricula: string;
  nome: string;
  cargo: string;
  setor: string;
  obraId: string;
  gestor: string;
  centroCusto: string;
  cpf: string;
  sexo: '' | 'M' | 'F';
  dataAdmissao: string;
  dataNascimento: string;
  endereco: string;
  numero: string;
  cep: string;
}
const COLAB_EMPTY: ColabFormData = {
  matricula: '', nome: '', cargo: '', setor: '', obraId: '', gestor: '', centroCusto: '',
  cpf: '', sexo: '', dataAdmissao: '', dataNascimento: '', endereco: '', numero: '', cep: '',
};

interface ColaboradoresSectionProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  actor?: string;
}

function ColaboradoresSection({ showToast, actor }: ColaboradoresSectionProps) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Colaborador | null>(null);
  const [form, setForm] = useState<ColabFormData>(COLAB_EMPTY);
  const [errors, setErrors] = useState<Partial<ColabFormData>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const obrasMap = new Map(obras.map(o => [o.id, o]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, os, ccs, cgs] = await Promise.all([
        dataService.listColaboradores(),
        dataService.listObras(),
        dataService.listCentrosCusto(),
        dataService.listCargos(),
      ]);
      setColaboradores(cs);
      setObras(os);
      setCentrosCusto(ccs);
      setCargos(cgs);
    } catch {
      showToast('Erro ao carregar colaboradores.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...COLAB_EMPTY, obraId: obras[0]?.id ?? '' });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (c: Colaborador) => {
    setEditTarget(c);
    setForm({
      matricula: c.matricula,
      nome: c.nome,
      cargo: c.cargo,
      setor: c.setor,
      obraId: c.obraId,
      gestor: c.gestor,
      centroCusto: c.centroCusto,
      cpf: c.cpf ?? '',
      sexo: c.sexo ?? '',
      dataAdmissao: c.dataAdmissao ?? '',
      dataNascimento: c.dataNascimento ?? '',
      endereco: c.endereco ?? '',
      numero: c.numero ?? '',
      cep: c.cep ?? '',
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = (): boolean => {
    const e: Partial<ColabFormData> = {};
    if (!form.matricula.trim()) e.matricula = 'Obrigatório';
    if (!form.nome.trim()) e.nome = 'Obrigatório';
    if (!form.obraId) e.obraId = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        matricula: form.matricula.trim(),
        nome: form.nome.trim(),
        cargo: form.cargo.trim(),
        setor: form.setor.trim(),
        obraId: form.obraId,
        gestor: form.gestor.trim(),
        centroCusto: form.centroCusto.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        sexo: form.sexo || undefined,
        dataAdmissao: form.dataAdmissao || undefined,
        dataNascimento: form.dataNascimento || undefined,
        endereco: form.endereco.trim(),
        numero: form.numero.trim(),
        cep: form.cep.trim(),
      };
      if (editTarget) {
        await dataService.updateColaborador(editTarget.id, payload);
        showToast('Colaborador atualizado com sucesso!');
        void logAudit(actor ?? 'RH', 'Alteração de colaborador', 'Administração', `Colaborador "${payload.nome}" (${payload.matricula}) atualizado`);
      } else {
        await dataService.createColaborador(payload);
        showToast('Colaborador cadastrado com sucesso!');
        void logAudit(actor ?? 'RH', 'Cadastro de colaborador', 'Administração', `Colaborador "${payload.nome}" (${payload.matricula}) criado`);
      }
      setShowModal(false);
      await load();
    } catch {
      showToast('Erro ao salvar colaborador.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await dataService.deleteColaborador(id);
      showToast('Colaborador removido com sucesso!');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Erro ao remover colaborador.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = colaboradores.filter(c =>
    !search ||
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.matricula.toLowerCase().includes(search.toLowerCase()) ||
    c.cargo.toLowerCase().includes(search.toLowerCase()),
  );

  const noObras = obras.length === 0;

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Colaboradores</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => showToast('Em breve')}
            className="flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm dark:shadow-none"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar
          </button>
          <button
            onClick={openAdd}
            disabled={noObras}
            title={noObras ? 'Cadastre uma obra primeiro' : undefined}
            className="flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700 shadow-sm dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Novo Colaborador
          </button>
        </div>
      </div>

      {noObras && !loading && (
        <div className="mb-4 flex items-start space-x-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Nenhuma obra cadastrada. Acesse a aba <strong>Obras / C.C.</strong> e cadastre ao menos uma obra antes de adicionar colaboradores.
          </p>
        </div>
      )}

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 sm:text-sm"
            placeholder="Buscar por nome, matrícula ou cargo..."
          />
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhum colaborador cadastrado.</p>
            <p className="text-sm mt-1">Cadastre uma obra primeiro se necessário.</p>
            {!noObras && (
              <button onClick={openAdd} className="mt-4 flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700">
                <UserPlus className="w-4 h-4 mr-2" /> Cadastrar colaborador
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Matrícula</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Obra</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filtered.map(c => {
                  const obra = obrasMap.get(c.obraId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50 whitespace-nowrap">{c.matricula}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-50">{c.nome}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.cargo || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {obra ? (
                          <span className="inline-flex items-center">
                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1.5">{obra.uf}</span>
                            {obra.nome}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Obra não encontrada</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-petroleum-600 hover:text-petroleum-800 p-1 rounded hover:bg-petroleum-50 dark:hover:bg-slate-800"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-slate-800"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} colaborador{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}.
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {editTarget ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Matrícula <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={form.matricula}
                    onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))}
                    className={cn(INPUT_CLS, errors.matricula && 'border-rose-400 dark:border-rose-500')}
                    placeholder="Ex: 10452"
                  />
                  {errors.matricula && <p className="text-xs text-rose-500 mt-1">{errors.matricula}</p>}
                </div>
                <div>
                  <label className={LABEL_CLS}>Cargo</label>
                  <input
                    type="text"
                    list="cargos-list"
                    value={form.cargo}
                    onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Selecione ou digite..."
                  />
                  <datalist id="cargos-list">
                    {cargos.map(c => <option key={c.id} value={c.nome} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Nome Completo <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className={cn(INPUT_CLS, errors.nome && 'border-rose-400 dark:border-rose-500')}
                  placeholder="Nome do colaborador"
                />
                {errors.nome && <p className="text-xs text-rose-500 mt-1">{errors.nome}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Setor</label>
                  <input
                    type="text"
                    value={form.setor}
                    onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Ex: Operacional"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Centro de Custo</label>
                  <select
                    value={form.centroCusto}
                    onChange={e => setForm(f => ({ ...f, centroCusto: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    <option value="">
                      {centrosCusto.length === 0 ? 'Nenhum C.C. cadastrado' : 'Selecione um C.C...'}
                    </option>
                    {centrosCusto.map(cc => (
                      <option key={cc.id} value={cc.codigo}>{cc.codigo} — {cc.nome}</option>
                    ))}
                  </select>
                  {centrosCusto.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">Cadastre na aba Obras / C.C.</p>
                  )}
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Obra / Unidade <span className="text-rose-500">*</span></label>
                <select
                  value={form.obraId}
                  onChange={e => setForm(f => ({ ...f, obraId: e.target.value }))}
                  disabled={noObras}
                  className={cn(INPUT_CLS, errors.obraId && 'border-rose-400 dark:border-rose-500', noObras && 'opacity-50 cursor-not-allowed')}
                >
                  <option value="">Selecione uma obra...</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.codigo} — {o.nome} ({o.uf})</option>
                  ))}
                </select>
                {errors.obraId && <p className="text-xs text-rose-500 mt-1">{errors.obraId}</p>}
              </div>

              <div>
                <label className={LABEL_CLS}>Gestor</label>
                <input
                  type="text"
                  value={form.gestor}
                  onChange={e => setForm(f => ({ ...f, gestor: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Nome do gestor responsável"
                />
              </div>

              {/* Dados pessoais */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Dados pessoais</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>CPF</label>
                    <input
                      type="text"
                      value={form.cpf}
                      onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                      className={INPUT_CLS}
                      placeholder="Só números"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Sexo</label>
                    <select
                      value={form.sexo}
                      onChange={e => setForm(f => ({ ...f, sexo: e.target.value as ColabFormData['sexo'] }))}
                      className={INPUT_CLS}
                    >
                      <option value="">—</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Data de Admissão</label>
                    <input
                      type="date"
                      value={form.dataAdmissao}
                      onChange={e => setForm(f => ({ ...f, dataAdmissao: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Data de Nascimento</label>
                    <input
                      type="date"
                      value={form.dataNascimento}
                      onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-4 mt-4">
                  <div className="col-span-4">
                    <label className={LABEL_CLS}>Endereço</label>
                    <input
                      type="text"
                      value={form.endereco}
                      onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                      className={INPUT_CLS}
                      placeholder="Logradouro"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Nº</label>
                    <input
                      type="text"
                      value={form.numero}
                      onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>CEP</label>
                    <input
                      type="text"
                      value={form.cep}
                      onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowModal(false)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="py-2 px-4 bg-petroleum-600 text-white rounded-md font-medium text-sm hover:bg-petroleum-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-60 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editTarget ? 'Atualizar Colaborador' : 'Salvar Colaborador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-1">Confirmar exclusão</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Documentos deste colaborador ficarão sem referência de cadastro.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={saving}
                className="py-2 px-4 bg-rose-600 text-white rounded-md font-medium text-sm hover:bg-rose-700 disabled:opacity-60 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Usuários e Perfis Section ─────────────────────────────────────────────────

const ROLE_LABEL: Record<User['role'], string> = {
  rh: 'RH (acesso total)',
  apontador: 'Apontador (lançamento)',
};

interface UsuarioFormData { nome: string; email: string; senha: string; role: User['role'] }
const USUARIO_EMPTY: UsuarioFormData = { nome: '', email: '', senha: '', role: 'apontador' };

function UsuariosSection({ showToast, actor }: ObrasSectionProps) {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<UsuarioFormData>(USUARIO_EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof UsuarioFormData, string>>>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsuarios(await dataService.listUsuarios());
    } catch {
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setForm(USUARIO_EMPTY);
    setErrors({});
    setShowModal(true);
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof UsuarioFormData, string>> = {};
    if (!form.nome.trim()) e.nome = 'Obrigatório';
    if (!form.email.trim()) e.email = 'Obrigatório';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = 'E-mail inválido';
    if (!form.senha) e.senha = 'Obrigatório';
    else if (form.senha.length < 6) e.senha = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await dataService.createUsuario({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        role: form.role,
      });
      showToast('Usuário criado com sucesso!');
      void logAudit(actor ?? 'RH', 'Novo usuário', 'Administração', `Usuário "${form.nome.trim()}" (${form.email.trim()}) criado como ${form.role}`);
      setShowModal(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar usuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = usuarios.filter(u =>
    !search ||
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Usuários e Perfis de Acesso</h2>
        <button
          onClick={openAdd}
          className="flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700 shadow-sm dark:shadow-none"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 sm:text-sm"
            placeholder="Buscar por nome ou e-mail..."
          />
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 py-16">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhum usuário encontrado</p>
            <button onClick={openAdd} className="mt-4 flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700">
              <Plus className="w-4 h-4 mr-2" /> Criar usuário
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-4 py-3">Nome do Usuário</th>
                <th className="px-4 py-3">E-mail Corporativo</th>
                <th className="px-4 py-3">Perfil de Acesso</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">{u.nome}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      u.role === 'rh'
                        ? 'bg-petroleum-100 text-petroleum-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                    )}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Ativo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}.
          </div>
        )}
      </div>

      {/* Novo usuário modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Novo Usuário</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL_CLS}>Nome Completo <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className={cn(INPUT_CLS, errors.nome && 'border-rose-400 dark:border-rose-500')}
                  placeholder="Nome do usuário"
                />
                {errors.nome && <p className="text-xs text-rose-500 mt-1">{errors.nome}</p>}
              </div>
              <div>
                <label className={LABEL_CLS}>E-mail Corporativo <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={cn(INPUT_CLS, errors.email && 'border-rose-400 dark:border-rose-500')}
                  placeholder="email@construtora.com.br"
                />
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                <p className="text-xs text-slate-400 mt-1">Usado para login e para redefinir a senha depois.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Senha <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={form.senha}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    className={cn(INPUT_CLS, errors.senha && 'border-rose-400 dark:border-rose-500')}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {errors.senha && <p className="text-xs text-rose-500 mt-1">{errors.senha}</p>}
                </div>
                <div>
                  <label className={LABEL_CLS}>Perfil de Acesso <span className="text-rose-500">*</span></label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as User['role'] }))}
                    className={INPUT_CLS}
                  >
                    <option value="apontador">Apontador (só lançamento)</option>
                    <option value="rh">RH (acesso total)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="py-2 px-4 bg-petroleum-600 text-white rounded-md font-medium text-sm hover:bg-petroleum-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-60 flex items-center"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cargos e Setores Section ──────────────────────────────────────────────────

interface CargoFormData { nome: string; setor: string }
const CARGO_EMPTY: CargoFormData = { nome: '', setor: '' };

function CargosSection({ showToast }: ObrasSectionProps) {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Cargo | null>(null);
  const [form, setForm] = useState<CargoFormData>(CARGO_EMPTY);
  const [errors, setErrors] = useState<Partial<CargoFormData>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cgs, cs] = await Promise.all([dataService.listCargos(), dataService.listColaboradores()]);
      setCargos(cgs);
      setColaboradores(cs);
    } catch {
      showToast('Erro ao carregar cargos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  // Contagem de colaboradores por nome de cargo (relação cargo ↔ colaborador).
  const countByCargo = new Map<string, number>();
  for (const c of colaboradores) {
    const k = (c.cargo || '').toLowerCase();
    countByCargo.set(k, (countByCargo.get(k) ?? 0) + 1);
  }

  const openAdd = () => { setEditTarget(null); setForm(CARGO_EMPTY); setErrors({}); setShowModal(true); };
  const openEdit = (c: Cargo) => { setEditTarget(c); setForm({ nome: c.nome, setor: c.setor ?? '' }); setErrors({}); setShowModal(true); };

  const validate = (): boolean => {
    const e: Partial<CargoFormData> = {};
    if (!form.nome.trim()) e.nome = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { nome: form.nome.trim(), setor: form.setor.trim() || undefined };
      if (editTarget) {
        await dataService.updateCargo(editTarget.id, payload);
        showToast('Cargo atualizado com sucesso!');
      } else {
        await dataService.createCargo(payload);
        showToast('Cargo cadastrado com sucesso!');
      }
      setShowModal(false);
      await load();
    } catch {
      showToast('Erro ao salvar cargo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await dataService.deleteCargo(id);
      showToast('Cargo removido com sucesso!');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Erro ao remover cargo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = cargos.filter(c =>
    !search ||
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.setor ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Cargos e Setores</h2>
        <button onClick={openAdd} className="flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700 shadow-sm dark:shadow-none">
          <Plus className="w-4 h-4 mr-2" /> Novo Cargo
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 sm:text-sm"
            placeholder="Buscar por cargo ou setor..." />
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 py-16"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
            <Briefcase className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhum cargo cadastrado</p>
            <button onClick={openAdd} className="mt-4 flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700"><Plus className="w-4 h-4 mr-2" /> Cadastrar cargo</button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-4 py-3">Nome do Cargo</th>
                <th className="px-4 py-3">Setor</th>
                <th className="px-4 py-3 text-center">Colaboradores</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">{c.nome}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.setor || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {countByCargo.get(c.nome.toLowerCase()) ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(c)} className="text-petroleum-600 hover:text-petroleum-800 p-1 rounded hover:bg-petroleum-50 dark:hover:bg-slate-800" title="Editar"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDelete(c.id)} className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-slate-800" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} cargo{filtered.length !== 1 ? 's' : ''}.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{editTarget ? 'Editar Cargo' : 'Novo Cargo'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL_CLS}>Nome do Cargo <span className="text-rose-500">*</span></label>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className={cn(INPUT_CLS, errors.nome && 'border-rose-400 dark:border-rose-500')} placeholder="Ex: Pedreiro" />
                {errors.nome && <p className="text-xs text-rose-500 mt-1">{errors.nome}</p>}
              </div>
              <div>
                <label className={LABEL_CLS}>Setor</label>
                <input type="text" value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}
                  className={INPUT_CLS} placeholder="Ex: Obra, Administrativo" />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="py-2 px-4 bg-petroleum-600 text-white rounded-md font-medium text-sm hover:bg-petroleum-700 disabled:opacity-60 flex items-center">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editTarget ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-1">Confirmar exclusão</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Os colaboradores que usam este cargo mantêm o nome já gravado.</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button onClick={() => setConfirmDelete(null)} className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={saving} className="py-2 px-4 bg-rose-600 text-white rounded-md font-medium text-sm hover:bg-rose-700 disabled:opacity-60 flex items-center">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Logs e Auditoria Section ──────────────────────────────────────────────────

function AuditSection({ showToast }: ObrasSectionProps) {
  const [eventos, setEventos] = useState<AuditEvento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const es = await dataService.listEventos(200);
        if (alive) setEventos(es);
      } catch {
        if (alive) showToast('Erro ao carregar os logs.', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [showToast]);

  const fmtTs = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Logs de Auditoria do Sistema</h2>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none overflow-hidden flex-1">
        <div className="overflow-x-auto h-full">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...</div>
          ) : eventos.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400"><FileText className="w-10 h-10 mb-3 opacity-40" /><p className="font-medium">Nenhum evento registrado ainda</p></div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="px-6 py-3 whitespace-nowrap">Usuário</th>
                  <th className="px-6 py-3 whitespace-nowrap">Ação</th>
                  <th className="px-6 py-3 whitespace-nowrap">Módulo</th>
                  <th className="px-6 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {eventos.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 flex items-center"><Clock className="w-4 h-4 mr-2" /> {fmtTs(log.ts)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-50">{log.usuario}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        log.acao.includes('Aprov') ? 'bg-emerald-100 text-emerald-800' :
                        log.acao.includes('Recus') ? 'bg-rose-100 text-rose-800' :
                        log.acao.includes('usuário') || log.acao.includes('Usuário') ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800 border border-amber-200',
                      )}>{log.acao}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">{log.modulo}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{log.detalhe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin component ──────────────────────────────────────────────────────

export function Admin() {
  const { user } = useAuth();
  const actor = user?.nome ?? 'RH';
  const [activeTab, setActiveTab] = useState<AdminSection>('parametros');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const menuItems: { id: AdminSection; label: string; icon: React.ElementType }[] = [
    { id: 'usuarios', label: 'Usuários e Perfis', icon: Users },
    { id: 'obras', label: 'Obras / C.C.', icon: Building },
    { id: 'colaboradores', label: 'Colaboradores', icon: UserPlus },
    { id: 'cargos', label: 'Cargos e Setores', icon: Briefcase },
    { id: 'tipos', label: 'Tipos de Documento', icon: FileType },
    { id: 'parametros', label: 'Parâmetros de Custo', icon: Sliders },
    { id: 'audit', label: 'Logs e Auditoria', icon: FileText },
  ];

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)]">

      {/* Sidebar Administrativa — empilha no mobile (barra horizontal), coluna no desktop */}
      <div className="w-full lg:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto shadow-sm dark:shadow-none">
        <div className="hidden lg:block p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center">
            Configurações
          </h3>
        </div>
        <nav className="p-2 flex gap-1 overflow-x-auto lg:flex-col lg:gap-0 lg:space-y-1 lg:overflow-visible">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'shrink-0 lg:w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-left whitespace-nowrap',
                activeTab === item.id
                  ? 'bg-petroleum-50 text-petroleum-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <item.icon className={cn('mr-3 h-4 w-4', activeTab === item.id ? 'text-petroleum-600' : 'text-slate-400')} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Área Principal */}
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-t-0 lg:border-t lg:border-l-0 border-slate-200 dark:border-slate-700 rounded-b-xl lg:rounded-r-xl lg:rounded-bl-none shadow-sm dark:shadow-none overflow-y-auto flex flex-col">

        {activeTab === 'parametros' && (
          <div className="p-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Parâmetros de Custo e Metas</h2>
              <button
                onClick={() => showToast('Parâmetros salvos com sucesso!')}
                className="flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700 shadow-sm dark:shadow-none"
              >
                Salvar Alterações
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 border-b pb-2">Cálculo de Absenteísmo</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carga Horária Mensal Padrão (Horas)</label>
                      <input type="number" defaultValue="220" className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Meta Máxima de Absenteísmo (%)</label>
                      <input type="number" step="0.1" defaultValue="4.0" className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 border-b pb-2">Valoração</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custo Médio da Hora (R$)</label>
                      <input type="number" defaultValue="15.50" className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50" />
                    </div>
                    <div className="flex items-start">
                      <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-petroleum-600 focus:ring-petroleum-500 dark:focus:ring-petroleum-400" />
                      <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                        Utilizar custo específico por cargo (sobrepõe o custo médio global)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="flex items-center text-sm font-bold text-amber-800 mb-2">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Fator de Impacto Operacional
                    </h4>
                    <p className="text-xs text-amber-700 mb-3">O multiplicador de impacto aplica um acréscimo no custo das horas perdidas para cobrir despesas indiretas e substituição de turnos.</p>
                    <label className="block text-sm font-medium text-amber-900 mb-1">Multiplicador Atual</label>
                    <div className="flex items-center space-x-2">
                      <select defaultValue="Médio (1.5x - C/ Encargos)" className="border border-amber-300 bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500 text-slate-700 dark:text-slate-300">
                        <option>Nenhum (1.0x)</option>
                        <option>Baixo (1.2x)</option>
                        <option>Médio (1.5x - C/ Encargos)</option>
                        <option>Alto (2.0x)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'usuarios' && <UsuariosSection showToast={showToast} actor={actor} />}

        {activeTab === 'obras' && (
          <>
            <ObrasSection showToast={showToast} />
            <CentroCustoSection showToast={showToast} />
          </>
        )}

        {activeTab === 'colaboradores' && <ColaboradoresSection showToast={showToast} actor={actor} />}

        {activeTab === 'cargos' && <CargosSection showToast={showToast} actor={actor} />}

        {activeTab === 'tipos' && (
          <div className="p-6 flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Tipos de Documento</h2>
              <button onClick={() => setShowModal('tipo')} className="flex items-center px-3 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700 shadow-sm dark:shadow-none">
                <Plus className="w-4 h-4 mr-2" /> Novo Tipo
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm dark:shadow-none">
                <div className="flex justify-between items-start">
                  <div className="flex items-center mb-2">
                    <span className="w-8 h-8 rounded-full bg-petroleum-100 flex items-center justify-center mr-3">
                      <FileType className="w-4 h-4 text-petroleum-600" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50">Atestado Médico</h3>
                  </div>
                  <button onClick={() => showToast('Em breve')} className="text-petroleum-600 hover:text-petroleum-800 p-1"><Edit2 className="w-4 h-4" /></button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 mt-2">Documento oficial de afastamento por motivo de saúde justificado por médico/dentista.</p>
                <div className="flex items-center space-x-2 text-xs font-medium">
                  <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded border border-rose-100">Gera Absenteísmo</span>
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">Exige CID</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm dark:shadow-none">
                <div className="flex justify-between items-start">
                  <div className="flex items-center mb-2">
                    <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                      <FileType className="w-4 h-4 text-amber-600" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50">Declaração de Comparecimento</h3>
                  </div>
                  <button onClick={() => showToast('Em breve')} className="text-petroleum-600 hover:text-petroleum-800 p-1"><Edit2 className="w-4 h-4" /></button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 mt-2">Comprovante de presença em consulta não gerando dia completo de atestado (cobrança por horas).</p>
                <div className="flex items-center space-x-2 text-xs font-medium">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">Não gera Absenteísmo</span>
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">Cálculo em Horas</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && <AuditSection showToast={showToast} />}

        {/* Fallback for any unhandled tabs */}
        {activeTab !== 'parametros' && activeTab !== 'usuarios' &&
         activeTab !== 'obras' && activeTab !== 'colaboradores' && activeTab !== 'cargos' &&
         activeTab !== 'tipos' && activeTab !== 'audit' && (
          <div className="p-8 flex items-center justify-center h-full text-slate-500 dark:text-slate-400 font-medium">
            Módulo {menuItems.find(m => m.id === activeTab)?.label} (Em desenvolvimento)
          </div>
        )}
      </div>

      {/* ── Modals for legacy / non-functional sections ─────────────────── */}

      {showModal === 'tipo' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Novo Tipo de Documento</h3>
              <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL_CLS}>Nome do Tipo <span className="text-rose-500">*</span></label>
                <input type="text" className={INPUT_CLS} placeholder="Ex: Atestado de Luto" />
              </div>
              <div>
                <label className={LABEL_CLS}>Descrição</label>
                <input type="text" className={INPUT_CLS} placeholder="Instrução para uso..." />
              </div>
              <div className="space-y-2 mt-4">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-petroleum-600 shadow-sm dark:shadow-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 h-4 w-4" />
                  <span className="ml-2 text-sm text-slate-700 dark:text-slate-300 font-medium">Gera Absenteísmo (Desconta horas originais)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-petroleum-600 shadow-sm dark:shadow-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 h-4 w-4" />
                  <span className="ml-2 text-sm text-slate-700 dark:text-slate-300 font-medium">Exige CID para envio</span>
                </label>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button onClick={() => setShowModal(null)} className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={() => { setShowModal(null); showToast('Tipo de documento salvo com sucesso!'); }} className="py-2 px-4 bg-petroleum-600 text-white rounded-md font-medium text-sm hover:bg-petroleum-700 shadow-sm dark:shadow-none">Salvar Tipo</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={cn(
            'flex items-center px-4 py-3 rounded-lg shadow-lg dark:shadow-none border',
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800',
          )}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
            <span className="font-medium text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 text-slate-400 hover:text-slate-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

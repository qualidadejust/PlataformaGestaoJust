import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Filter, Download, MoreHorizontal, Calendar,
  Database, ChevronLeft, ChevronRight, XCircle, Loader2,
  Paperclip, Eye, Trash2,
} from 'lucide-react';
import { cn, openAnexo } from '../utils';
import { ExportModal } from '../components/ExportModal';
import { dataService } from '../services';
import type { DocumentoView, Obra, DocumentoFiltros, DocumentType, Status } from '../types';

// ── Anexo / detail modal ───────────────────────────────────────────
interface AnexoModalProps {
  doc: DocumentoView;
  onClose: () => void;
}

function AnexoModal({ doc, onClose }: AnexoModalProps) {
  const anexo = doc.anexo;

  const isImage = anexo && anexo.tipo.startsWith('image/');
  const isPdf   = anexo && anexo.tipo === 'application/pdf';

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-petroleum-600" />
              {anexo ? anexo.nome : 'Sem Anexo'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {doc.ticket} — {doc.colaboradorNome}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        <div className="p-6">
          {!anexo ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Este documento não possui anexo.
            </p>
          ) : isImage ? (
            <img
              src={anexo.dataUrl}
              alt={anexo.nome}
              className="max-h-[60vh] mx-auto rounded-lg object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={anexo.dataUrl}
              title={anexo.nome}
              className="w-full h-[60vh] rounded-lg border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-4">
                Arquivo: <span className="font-medium">{anexo.nome}</span> ({(anexo.tamanho / 1024).toFixed(1)} KB)
              </p>
              <button
                onClick={() => openAnexo(anexo)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700"
              >
                <Eye className="w-4 h-4" /> Abrir arquivo
              </button>
            </div>
          )}
        </div>

        {/* footer */}
        {anexo && (isImage || isPdf) && (
          <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
              onClick={() => window.open(anexo.dataUrl, '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-petroleum-600 text-white rounded-md text-sm font-medium hover:bg-petroleum-700"
            >
              <Eye className="w-4 h-4" /> Abrir em nova aba
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Row actions menu ────────────────────────────────────────────────
interface ActionMenuProps {
  doc: DocumentoView;
  onViewAnexo: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ActionMenu({ doc, onViewAnexo, onDelete, onClose }: ActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden"
    >
      <button
        onClick={() => { onViewAnexo(); onClose(); }}
        disabled={!doc.anexo}
        className={cn(
          'flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors',
          doc.anexo
            ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            : 'text-slate-400 dark:text-slate-600 cursor-not-allowed',
        )}
      >
        <Paperclip className="w-4 h-4 shrink-0" />
        Ver anexo
      </button>
      <hr className="border-slate-100 dark:border-slate-700" />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
      >
        <Trash2 className="w-4 h-4 shrink-0" />
        Excluir
      </button>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────
function formatDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function motivo(doc: DocumentoView) {
  if (doc.tipo === 'atestado') {
    if (doc.cid) return `${doc.cid.codigo} - ${doc.cid.descricao}`;
    return 'Sem CID Informado';
  }
  return doc.local ?? '—';
}

function afastamento(doc: DocumentoView) {
  if (doc.tipo === 'atestado') {
    return doc.dias != null ? `${doc.dias} dia${doc.dias !== 1 ? 's' : ''}` : '—';
  }
  if (doc.horas != null) return `${doc.horas}h`;
  if (doc.periodo) {
    const map: Record<string, string> = { manha: 'Turno M', tarde: 'Turno T', integral: 'Integral' };
    return map[doc.periodo] ?? doc.periodo;
  }
  return '—';
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Em Análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  inconsistente: 'Inconsistente',
};

const STATUS_CLASSES: Record<string, string> = {
  pendente:      'bg-amber-100 text-amber-800 border-amber-200',
  aprovado:      'bg-emerald-100 text-emerald-800 border-emerald-200',
  reprovado:     'bg-rose-100 text-rose-800 border-rose-200',
  inconsistente: 'bg-purple-100 text-purple-800 border-purple-200',
};

// ── Main component ───────────────────────────────────────────────────
interface RegistryProps {
  initialBusca?: string;
}

export function Registry({ initialBusca }: RegistryProps = {}) {
  const [docs, setDocs]             = useState<DocumentoView[]>([]);
  const [obras, setObras]           = useState<Obra[]>([]);
  const [loading, setLoading]       = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState(initialBusca ?? '');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterObra, setFilterObra]     = useState<string>('');
  const [filterType, setFilterType]     = useState<string>('');
  const [dateInicio, setDateInicio]     = useState('');
  const [dateFim, setDateFim]           = useState('');
  const [showDateRange, setShowDateRange] = useState(false);

  // UI state
  const [showExport, setShowExport]         = useState(false);
  const [anexoDoc, setAnexoDoc]             = useState<DocumentoView | null>(null);
  const [openMenuId, setOpenMenuId]         = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Debounce ref for busca
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Load obras once
  useEffect(() => {
    dataService.listObras().then(setObras).catch(console.error);
  }, []);

  // Sync initialBusca changes from parent (e.g. Header global search)
  useEffect(() => {
    if (initialBusca) setSearchTerm(initialBusca);
  }, [initialBusca]);

  // Debounce search term
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  // Build filtros and query
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const filtros: DocumentoFiltros = {};
      if (debouncedSearch) filtros.busca = debouncedSearch;
      if (filterStatus)    filtros.status = filterStatus as Status;
      if (filterObra)      filtros.obraId = filterObra;
      if (filterType)      filtros.tipo   = filterType as DocumentType;
      if (dateInicio)      filtros.dataInicio = dateInicio;
      if (dateFim)         filtros.dataFim    = dateFim;
      const result = await dataService.listDocumentos(filtros);
      setDocs(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, filterObra, filterType, dateInicio, dateFim]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // Active filters count
  const activeFilters = [filterStatus, filterObra, filterType, debouncedSearch, dateInicio || dateFim]
    .filter(Boolean);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterObra('');
    setFilterType('');
    setDateInicio('');
    setDateFim('');
    setShowDateRange(false);
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    try {
      await dataService.deleteDocumento(id);
      await fetchDocs();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const obraName = obras.find(o => o.id === filterObra)?.nome ?? '';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Confirm delete dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Confirmar exclusão</h3>
            <p className="text-sm text-slate-500">
              Esta ação é permanente. Deseja realmente excluir este documento?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 border-b-2 border-petroleum-500 inline-flex items-center pb-1">
            <Database className="w-6 h-6 mr-2 text-petroleum-600" /> Consulta Geral
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Explore, filtre e exporte todos os documentos lançados no sistema.
          </p>
        </div>
        <button
          onClick={() => setShowExport(true)}
          className="flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" /> Exportar Dados
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Colaborador, RM ou Motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-petroleum-500 focus:border-petroleum-500 transition-colors dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            {/* Status */}
            <div className="w-full sm:w-40">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg py-2.5 px-3 text-sm focus:ring-petroleum-500 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="">Todos os status</option>
                <option value="pendente">Em Análise</option>
                <option value="aprovado">Aprovado</option>
                <option value="reprovado">Reprovado</option>
                <option value="inconsistente">Inconsistente</option>
              </select>
            </div>

            {/* Tipo */}
            <div className="w-full sm:w-44">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg py-2.5 px-3 text-sm focus:ring-petroleum-500 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="">Todos os tipos</option>
                <option value="atestado">Atestado</option>
                <option value="declaracao">Declaração</option>
              </select>
            </div>

            {/* Obra */}
            <div className="w-full sm:w-56">
              <select
                value={filterObra}
                onChange={(e) => setFilterObra(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg py-2.5 px-3 text-sm focus:ring-petroleum-500 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="">Todas as obras</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nome} - {o.uf}</option>
                ))}
              </select>
            </div>

            {/* Calendar toggle */}
            <button
              onClick={() => setShowDateRange(v => !v)}
              title="Filtrar por data"
              className={cn(
                'flex items-center justify-center p-2.5 border rounded-lg transition-colors text-slate-500',
                showDateRange
                  ? 'border-petroleum-500 bg-petroleum-50 dark:bg-slate-700 text-petroleum-600'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50',
              )}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date range row */}
        {showDateRange && (
          <div className="flex flex-wrap gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500 whitespace-nowrap">De:</label>
              <input
                type="date"
                value={dateInicio}
                onChange={(e) => setDateInicio(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3 text-sm focus:ring-petroleum-500 focus:border-petroleum-500 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Até:</label>
              <input
                type="date"
                value={dateFim}
                onChange={(e) => setDateFim(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3 text-sm focus:ring-petroleum-500 focus:border-petroleum-500 dark:text-slate-200"
              />
            </div>
          </div>
        )}

        {/* Active filter tags */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-semibold text-slate-400">Filtros ativos:</span>
          {activeFilters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {debouncedSearch && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-petroleum-50 text-petroleum-700 text-xs font-medium">
                  <Filter className="w-3 h-3 mr-1" /> Busca: "{debouncedSearch}"
                </span>
              )}
              {filterStatus && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-petroleum-50 text-petroleum-700 text-xs font-medium">
                  <Filter className="w-3 h-3 mr-1" /> Status: {STATUS_LABELS[filterStatus] ?? filterStatus}
                </span>
              )}
              {filterType && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-petroleum-50 text-petroleum-700 text-xs font-medium">
                  <Filter className="w-3 h-3 mr-1" /> Tipo: {filterType === 'atestado' ? 'Atestado' : 'Declaração'}
                </span>
              )}
              {filterObra && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-petroleum-50 text-petroleum-700 text-xs font-medium">
                  <Filter className="w-3 h-3 mr-1" /> Obra: {obraName}
                </span>
              )}
              {(dateInicio || dateFim) && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-petroleum-50 text-petroleum-700 text-xs font-medium">
                  <Filter className="w-3 h-3 mr-1" /> Período: {dateInicio ? formatDate(dateInicio) : '...'} → {dateFim ? formatDate(dateFim) : '...'}
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-rose-500 hover:text-rose-700 font-medium ml-2 flex items-center"
              >
                <XCircle className="w-3 h-3 mr-1" /> Limpar Filtros
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Nenhum</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Registro</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Colaborador / Lotação</th>
                <th className="px-6 py-4 whitespace-nowrap">Tipo e Motivo</th>
                <th className="px-6 py-4 whitespace-nowrap">Lançamento</th>
                <th className="px-6 py-4 whitespace-nowrap">Afastamento</th>
                <th className="px-6 py-4 whitespace-nowrap">Anexo</th>
                <th className="px-6 py-4 w-12 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Carregando documentos...</span>
                    </div>
                  </td>
                </tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Ticket */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {doc.ticket}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border',
                        STATUS_CLASSES[doc.status] ?? 'bg-slate-100 text-slate-700 border-slate-200',
                      )}>
                        {STATUS_LABELS[doc.status] ?? doc.status}
                      </span>
                    </td>

                    {/* Colaborador */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{doc.colaboradorNome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {doc.obraNome} - {doc.obraUf}
                      </p>
                    </td>

                    {/* Tipo e Motivo */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {doc.tipo === 'atestado' ? 'Atestado' : 'Declaração'}
                      </p>
                      <p
                        className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]"
                        title={motivo(doc)}
                      >
                        {motivo(doc)}
                      </p>
                    </td>

                    {/* Lançamento */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatDate(doc.dataLancamento)}
                    </td>

                    {/* Afastamento */}
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">
                      {afastamento(doc)}
                    </td>

                    {/* Anexo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.anexo ? (
                        <button
                          onClick={() => setAnexoDoc(doc)}
                          className="inline-flex items-center gap-1.5 text-xs text-petroleum-600 hover:text-petroleum-800 font-medium"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          Ver anexo
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                        className="text-slate-400 hover:text-petroleum-600 transition-colors p-1 rounded hover:bg-petroleum-50"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {openMenuId === doc.id && (
                        <ActionMenu
                          doc={doc}
                          onViewAnexo={() => setAnexoDoc(doc)}
                          onDelete={() => setConfirmDeleteId(doc.id)}
                          onClose={() => setOpenMenuId(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? (
              'Carregando...'
            ) : (
              <>
                Mostrando <span className="font-medium">{docs.length}</span> registro{docs.length !== 1 ? 's' : ''}
              </>
            )}
          </p>
          <div className="flex space-x-2">
            <button className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Anexo modal */}
      {anexoDoc && <AnexoModal doc={anexoDoc} onClose={() => setAnexoDoc(null)} />}

      {/* Export modal */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          title="Exportar Consulta Geral"
          rows={docs}
        />
      )}
    </div>
  );
}

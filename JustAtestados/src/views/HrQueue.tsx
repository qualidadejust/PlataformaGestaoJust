import { useState, Fragment, useRef, MouseEvent, useEffect, useCallback } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Search, XCircle,
  Eye, MessageSquare, FileText, PenTool, Eraser,
  Paperclip,
} from 'lucide-react';
import { dataService } from '../services';
import type { DocumentoView, ResumoFila } from '../services';
import { useAuth } from '../context/AuthContext';
import { cn, openAnexo } from '../utils';
import { AnexoView } from '../components/AnexoView';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAfastamento(doc: DocumentoView): string {
  if (doc.tipo === 'atestado') {
    if (doc.dias != null) return `${doc.dias} dia${doc.dias !== 1 ? 's' : ''}`;
    return '—';
  }
  // declaracao
  if (doc.horas != null) return `${doc.horas}h`;
  if (doc.periodo) {
    const mapa: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', integral: 'Integral' };
    return mapa[doc.periodo] ?? doc.periodo;
  }
  return '—';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function motivoLabel(doc: DocumentoView): string {
  if (doc.tipo === 'atestado') {
    if (doc.cid) return `${doc.cid.codigo} - ${doc.cid.descricao}`;
    return 'Sem CID Informado';
  }
  return doc.local ?? '—';
}

// ── component ─────────────────────────────────────────────────────────────────

export function HrQueue() {
  const { user } = useAuth();
  const analista = user?.nome ?? 'RH';

  // ── data state ──────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<DocumentoView[]>([]);
  const [resumo, setResumo] = useState<ResumoFila>({ pendentes: 0, inconsistentes: 0, aprovadosHoje: 0 });
  const [loading, setLoading] = useState(true);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busca, setBusca] = useState('');

  // Modals
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);
  const [showAnexoModal, setShowAnexoModal] = useState<DocumentoView | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [rejectObs, setRejectObs] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'draw' | 'erase'>('draw');

  // ── data loading ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, res] = await Promise.all([
        dataService.listDocumentos({ status: undefined }),
        dataService.getResumoFila(),
      ]);
      // Queue shows pendente + inconsistente
      setQueue(docs.filter(d => d.status === 'pendente' || d.status === 'inconsistente'));
      setResumo(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── helpers ──────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const filteredQueue = queue.filter(item => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      item.colaboradorNome.toLowerCase().includes(q) ||
      item.ticket.toLowerCase().includes(q) ||
      item.matricula.toLowerCase().includes(q) ||
      motivoLabel(item).toLowerCase().includes(q)
    );
  });

  const pendentesInQueue = filteredQueue.filter(i => i.status === 'pendente');

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(pendentesInQueue.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // ── mutations ─────────────────────────────────────────────────────────────────

  const logEvento = (acao: string, detalhe: string) => {
    void dataService.logEvento({ usuario: analista, acao, modulo: 'Fila de Análise', detalhe }).catch(() => {});
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const doc = queue.find(d => d.id === id);
      await dataService.updateDocumento(id, { status: 'aprovado', analista });
      setShowApproveModal(null);
      setShowPreviewModal(null);
      setExpandedId(null);
      showToast('Documento aprovado com sucesso!');
      logEvento('Aprovação', `${doc?.ticket ?? id} de ${doc?.colaboradorNome ?? ''} aprovado`);
      await loadData();
    } catch {
      showToast('Erro ao aprovar documento.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectMotivo) return;
    setActionLoading(true);
    try {
      const doc = queue.find(d => d.id === id);
      const motivo = rejectObs.trim() ? `${rejectMotivo} — ${rejectObs.trim()}` : rejectMotivo;
      await dataService.updateDocumento(id, { status: 'reprovado', analista, motivo });
      setShowRejectModal(null);
      setShowPreviewModal(null);
      setExpandedId(null);
      setRejectMotivo('');
      setRejectObs('');
      showToast('Documento recusado e devolvido ao apontador.', 'error');
      logEvento('Recusa', `${doc?.ticket ?? id} de ${doc?.colaboradorNome ?? ''} recusado — motivo: ${motivo}`);
      await loadData();
    } catch {
      showToast('Erro ao recusar documento.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    setActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map(id => dataService.updateDocumento(id, { status: 'aprovado', analista }))
      );
      showToast(`${selectedIds.length} documento(s) aprovado(s) com sucesso!`);
      logEvento('Aprovação', `${selectedIds.length} documento(s) aprovados em lote`);
      setSelectedIds([]);
      await loadData();
    } catch {
      showToast('Erro ao aprovar documentos em lote.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    setActionLoading(true);
    try {
      const motivo = 'Recusado em lote — contate o RH para detalhes';
      await Promise.all(
        selectedIds.map(id => dataService.updateDocumento(id, { status: 'reprovado', analista, motivo }))
      );
      showToast(`${selectedIds.length} documento(s) recusado(s).`, 'error');
      logEvento('Recusa', `${selectedIds.length} documento(s) recusados em lote`);
      setSelectedIds([]);
      await loadData();
    } catch {
      showToast('Erro ao recusar documentos em lote.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Ver anexo ─────────────────────────────────────────────────────────────────

  const handleVerAnexo = (item: DocumentoView) => {
    if (!item.anexo) return;
    // Abre em nova aba (data URL → blob); se popup bloqueado, cai pro modal.
    if (!openAnexo(item.anexo)) {
      setShowAnexoModal(item);
    }
  };

  // ── Canvas drawing ────────────────────────────────────────────────────────────

  const startDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (drawMode === 'erase') {
      ctx.clearRect(e.nativeEvent.offsetX - 10, e.nativeEvent.offsetY - 10, 20, 20);
    } else {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Summary Cards (3) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pendente de Análise</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {loading ? '…' : resumo.pendentes}
            </h3>
          </div>
          <div className="p-2 bg-amber-50 rounded-lg"><Clock className="w-6 h-6 text-amber-500" /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inconsistentes</p>
            <h3 className="text-2xl font-bold text-rose-600">
              {loading ? '…' : resumo.inconsistentes}
            </h3>
          </div>
          <div className="p-2 bg-rose-50 rounded-lg"><AlertCircle className="w-6 h-6 text-rose-600" /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aprovados Hoje</p>
            <h3 className="text-2xl font-bold text-emerald-600">
              {loading ? '…' : resumo.aprovadosHoje}
            </h3>
          </div>
          <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
        </div>
      </div>

      {/* ── Queue Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
              placeholder="Buscar ticket, colaborador..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">

          {/* Bulk action bar */}
          {selectedIds.length > 0 && (
            <div className="bg-petroleum-50 dark:bg-petroleum-900/30 border-y border-petroleum-200 dark:border-petroleum-800 px-6 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-petroleum-800 dark:text-petroleum-200">
                {selectedIds.length} documento(s) selecionado(s)
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkApprove}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Aprovar Selecionados
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-600 text-rose-600 rounded text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shadow-sm disabled:opacity-50"
                >
                  Reprovar Selecionados
                </button>
              </div>
            </div>
          )}

          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap w-4">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-petroleum-600 focus:ring-petroleum-500"
                    checked={selectedIds.length > 0 && selectedIds.length === pendentesInQueue.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Colaborador / Obra</th>
                <th className="px-6 py-4 whitespace-nowrap">Documento</th>
                <th className="px-6 py-4 whitespace-nowrap">Afastamento</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">

              {/* Loading skeleton */}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Carregando documentos…
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
                      <p className="text-base font-medium text-slate-600 dark:text-slate-300">Nenhum documento na fila</p>
                      <p className="text-sm mt-1">Todos os documentos foram analisados ou nenhum foi enviado ainda.</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading && filteredQueue.map((item) => (
                <Fragment key={item.id}>
                  <tr
                    className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer",
                      expandedId === item.id ? "bg-slate-50 dark:bg-slate-800" : ""
                    )}
                    onClick={() => toggleExpand(item.id)}
                  >
                    {/* Checkbox */}
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      {item.status === 'pendente' && (
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-petroleum-600 focus:ring-petroleum-500"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                        />
                      )}
                    </td>

                    {/* Status badges */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status === 'pendente' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Em Análise</span>
                      )}
                      {item.status === 'inconsistente' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">Inconsistente</span>
                      )}
                      {item.cid == null && item.tipo === 'atestado' && (
                        <div className="mt-1 flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 w-max">
                          <AlertCircle className="w-3 h-3 mr-1" /> FALTANDO CID
                        </div>
                      )}
                    </td>

                    {/* Collaborator */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{item.colaboradorNome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.matricula} · {item.obraNome} - {item.obraUf}</p>
                    </td>

                    {/* Document */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-petroleum-700 capitalize">
                        {item.tipo === 'atestado' ? 'Atestado Médico' : 'Declaração'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{motivoLabel(item)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.ticket} · {formatDate(item.dataLancamento)}</p>
                    </td>

                    {/* Afastamento */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{formatAfastamento(item)}</p>
                      {item.tipo === 'atestado' && item.dias != null && item.dias > 2 && (
                        <p className="text-xs text-amber-600 font-medium">Atenção &gt; 2 dias</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-1.5 text-slate-400 hover:text-petroleum-600 hover:bg-petroleum-50 dark:hover:bg-petroleum-900/30 rounded font-medium text-sm"
                          title="Avaliar"
                        >
                          Avaliar
                        </button>
                        {/* Ver Anexo */}
                        {item.anexo ? (
                          <button
                            onClick={() => handleVerAnexo(item)}
                            className="p-1.5 text-petroleum-600 hover:bg-petroleum-50 dark:hover:bg-petroleum-900/30 rounded flex items-center gap-1 text-xs font-medium"
                            title="Ver anexo"
                          >
                            <Paperclip className="w-4 h-4" /> Ver anexo
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-1.5 text-slate-300 dark:text-slate-600 rounded flex items-center gap-1 text-xs font-medium cursor-not-allowed"
                            title="Sem anexo"
                          >
                            <Paperclip className="w-4 h-4" /> Sem anexo
                          </button>
                        )}
                        <button
                          onClick={() => setShowPreviewModal(item.id)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                          title="Ver Documento / Validação"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === item.id && (
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <td colSpan={6} className="p-0">
                        <div className="p-6 border-l-4 border-petroleum-500 bg-white dark:bg-slate-900 m-4 rounded-lg shadow-sm dark:shadow-none grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">

                          {/* Quick preview area */}
                          <div className="md:col-span-1 border-r border-slate-100 dark:border-slate-800 pr-6">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-slate-400" />
                              Anexo do Documento
                            </h4>
                            {item.anexo ? (
                              <>
                                <div
                                  className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg h-48 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                  onClick={() => handleVerAnexo(item)}
                                >
                                  <div className="text-center">
                                    <FileText className="w-8 h-8 text-petroleum-400 mx-auto mb-2" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate block px-2">{item.anexo.nome}</span>
                                    <span className="text-[10px] text-slate-400">{(item.anexo.tamanho / 1024).toFixed(0)} KB</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleVerAnexo(item)}
                                  className="mt-3 w-full text-xs font-medium text-petroleum-600 flex items-center justify-center gap-1 hover:underline"
                                >
                                  <Eye className="w-3 h-3" /> Abrir anexo
                                </button>
                              </>
                            ) : (
                              <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg h-48 flex items-center justify-center">
                                <div className="text-center">
                                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                  <span className="text-xs text-slate-400">Sem anexo disponível</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Analysis actions */}
                          <div className="md:col-span-2 flex flex-col justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                                <MessageSquare className="w-4 h-4 mr-2 text-slate-400" />
                                Detalhes da Avaliação
                              </h4>

                              <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-lg mb-4 text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
                                <p><strong className="font-semibold">Colaborador:</strong> {item.colaboradorNome}</p>
                                <p><strong className="font-semibold">Matrícula:</strong> {item.matricula}</p>
                                <p><strong className="font-semibold">Cargo:</strong> {item.cargo} · {item.setor}</p>
                                <p><strong className="font-semibold">Gestor:</strong> {item.gestor}</p>
                                {item.medicoNome && (
                                  <p><strong className="font-semibold">Médico Emissor:</strong> {item.medicoNome}{item.medicoCrm ? ` (CRM ${item.medicoCrm})` : ''}</p>
                                )}
                                <p><strong className="font-semibold">Lançamento:</strong> {formatDate(item.dataLancamento)}</p>
                                {item.dataEmissao && (
                                  <p><strong className="font-semibold">Emissão:</strong> {formatDate(item.dataEmissao)}</p>
                                )}
                                {item.cid == null && item.tipo === 'atestado' && (
                                  <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-medium flex items-start text-xs">
                                    <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                                    Verifique os dados com o emissor: o código CID é obrigatório para este tipo de documento.
                                  </div>
                                )}
                                {item.status === 'inconsistente' && (
                                  <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-medium flex items-start text-xs">
                                    <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                                    Este documento foi marcado como inconsistente e aguarda revisão ou reenvio.
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Observação interna (opcional)</label>
                                <textarea
                                  rows={2}
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
                                  placeholder="Adicione um comentário visível apenas para o RH..."
                                />
                              </div>
                            </div>

                            <div className="flex space-x-2 mt-6">
                              <button
                                onClick={() => setShowApproveModal(item.id)}
                                disabled={actionLoading}
                                className="flex items-center justify-center flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Aprovar
                              </button>
                              <button
                                onClick={() => setShowRejectModal(item.id)}
                                disabled={actionLoading}
                                className="flex items-center justify-center flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-rose-600 text-rose-600 rounded-md font-medium text-sm hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Recusar (devolver)
                              </button>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Carregando…' : (
              <>Exibindo <span className="font-medium text-slate-900 dark:text-slate-50">{filteredQueue.length}</span> documento(s) na fila</>
            )}
          </p>
        </div>
      </div>

      {/* ── Approve Modal ── */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900 dark:text-slate-50 mb-2">Confirmar Aprovação</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                O documento será aprovado e contabilizado nos indicadores de absenteísmo.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApproveModal(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleApprove(showApproveModal)}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-md font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
                >
                  {actionLoading ? 'Aguarde…' : 'Confirmar Aprovação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center">
                  <XCircle className="w-5 h-5 text-rose-500 mr-2" />
                  Reprovar Documento
                </h3>
                <button onClick={() => setShowRejectModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Motivo principal da recusa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={rejectMotivo}
                    onChange={(e) => setRejectMotivo(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400"
                  >
                    <option value="">Selecione um motivo...</option>
                    <option>Documento Ilegível</option>
                    <option>Ausência de Carimbo/Assinatura Médico</option>
                    <option>Sem identificação do colaborador</option>
                    <option>CRM Inválido/Inconsistente</option>
                    <option>Documento Alterado/Rasurado (Suspeita)</option>
                    <option>Fora do Prazo de Entrega</option>
                    <option>Dados do atestado inconsistentes</option>
                    <option>Outro motivo (explicar abaixo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Justificativa / Orientação ao colaborador</label>
                  <textarea
                    rows={3}
                    value={rejectObs}
                    onChange={(e) => setRejectObs(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:ring-rose-500 focus:border-rose-500"
                    placeholder="Explique o que falta ou está inconsistente para o apontador corrigir e reenviar..."
                  />
                </div>
              </div>

              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 mb-6 flex items-start">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 mr-2 shrink-0" />
                <p className="text-xs text-rose-800">
                  O documento será <strong>devolvido ao apontador</strong> com o motivo acima. Ele poderá corrigir e reenviar para nova análise.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(null)}
                  disabled={actionLoading}
                  className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={actionLoading || !rejectMotivo}
                  className="py-2 px-4 bg-rose-600 text-white rounded-md font-medium text-sm hover:bg-rose-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
                >
                  {actionLoading ? 'Aguarde…' : 'Recusar e devolver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview / Validation Modal ── */}
      {showPreviewModal && (() => {
        const item = filteredQueue.find(q => q.id === showPreviewModal);
        if (!item) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 animate-in fade-in p-4 lg:p-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full h-full max-w-7xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center">
                  <Eye className="w-5 h-5 text-petroleum-600 mr-2" />
                  Validação de Documento — {item.ticket}
                </h3>
                <button onClick={() => setShowPreviewModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-800">

                {/* Document viewer (left) */}
                <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center overflow-auto border-b lg:border-b-0 lg:border-r border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">

                  {/* Drawing tools */}
                  <div className="flex space-x-2 w-full max-w-3xl mb-3 justify-end items-center">
                    <span className="text-xs font-semibold text-slate-500 mr-2">Ferramentas de Revisão:</span>
                    <button
                      onClick={() => setDrawMode('draw')}
                      className={cn("p-1.5 rounded transition-colors", drawMode === 'draw' ? "bg-rose-100 text-rose-700" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}
                      title="Desenhar / Circular"
                    >
                      <PenTool className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDrawMode('erase')}
                      className={cn("p-1.5 rounded transition-colors", drawMode === 'erase' ? "bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}
                      title="Borracha"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                    {item.anexo && (
                      <button
                        onClick={() => handleVerAnexo(item)}
                        className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-petroleum-600 text-white rounded text-xs font-medium hover:bg-petroleum-700 transition-colors"
                      >
                        <Paperclip className="w-3 h-3" /> Abrir anexo original
                      </button>
                    )}
                  </div>

                  <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 aspect-[1/1.4] shadow-lg dark:shadow-none border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center flex-col text-slate-400 overflow-hidden cursor-crosshair">
                    {item.anexo ? (
                      <AnexoView anexo={item.anexo} className="absolute inset-0 w-full h-full object-contain" />
                    ) : (
                      <>
                        <FileText className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="font-medium text-slate-500 dark:text-slate-400">Nenhum anexo disponível</p>
                        <p className="text-sm mt-1">Use as ferramentas de desenho para marcar inconsistências.</p>
                      </>
                    )}

                    {/* Annotation overlay */}
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={1120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="absolute inset-0 w-full h-full opacity-70 z-10 touch-none"
                    />
                  </div>
                </div>

                {/* Details & actions (right) */}
                <div className="w-full lg:w-[400px] bg-white dark:bg-slate-900 shrink-0 flex flex-col h-full overflow-y-auto">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 border-b pb-2">Dados do Documento</h4>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-semibold">Colaborador</p>
                        <p className="font-medium text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">{item.colaboradorNome}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-semibold">Tipo</p>
                          <p className="font-medium text-slate-900 dark:text-slate-50 capitalize">{item.tipo === 'atestado' ? 'Atestado Médico' : 'Declaração'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-semibold">Lançamento</p>
                          <p className="font-medium text-slate-900 dark:text-slate-50">{formatDate(item.dataLancamento)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-semibold">Afastamento</p>
                          <p className="font-bold text-petroleum-700">{formatAfastamento(item)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-semibold">Médico/CRM</p>
                          <p className="font-medium text-slate-900 dark:text-slate-50">
                            {item.medicoNome ? `${item.medicoNome}${item.medicoCrm ? ` / ${item.medicoCrm}` : ''}` : '—'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-semibold">Motivo / CID</p>
                        <p className="font-medium text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">{motivoLabel(item)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-semibold">Obra</p>
                        <p className="font-medium text-slate-900 dark:text-slate-50">{item.obraNome} — {item.obraUf}</p>
                      </div>

                      {item.status === 'inconsistente' && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium flex items-start text-sm">
                          <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                          Documento marcado como inconsistente. Verifique os dados antes de aprovar ou reprovar.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="space-y-3">
                      <button
                        onClick={() => { setShowPreviewModal(null); setShowApproveModal(item.id); }}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprovar Documento
                      </button>
                      <button
                        onClick={() => { setShowPreviewModal(null); setShowRejectModal(item.id); }}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-900 border border-rose-600 text-rose-600 rounded-md font-medium text-sm hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Recusar (devolver)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Inline Anexo Modal (popup-blocked fallback) ── */}
      {showAnexoModal && showAnexoModal.anexo && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[60] animate-in fade-in p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-petroleum-600" />
                {showAnexoModal.anexo.nome}
              </h3>
              <button onClick={() => setShowAnexoModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4 min-h-[400px]">
              <AnexoView
                anexo={showAnexoModal.anexo}
                className={showAnexoModal.anexo.tipo.startsWith('image/')
                  ? "max-w-full max-h-[70vh] object-contain shadow-lg rounded"
                  : "w-full h-[70vh] border-0 rounded shadow-lg"}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={cn(
            "flex items-center px-4 py-3 rounded-lg shadow-lg dark:shadow-none border",
            toast.type === 'success'
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 mr-3" />
              : <AlertCircle className="w-5 h-5 mr-3" />
            }
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

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  CalendarDays, Clock, FilePlus, Upload, FileText,
  Search, X, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { cn } from '../utils';
import { DocumentType, Colaborador, Obra, Cid, Anexo, DocumentoView } from '../types';
import { dataService } from '../services';
import { useAuth } from '../context/AuthContext';

// ── Formatação de exibição ─────────────────────────────────────────────────────

/** ISO "AAAA-MM-DD" → "DD/MM/AAAA" (vazio se ausente). */
function fmtDataBR(iso?: string): string {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** CPF só-dígitos → "000.000.000-00" (devolve original se não tiver 11 dígitos). */
function fmtCpf(cpf?: string): string {
  const d = (cpf ?? '').replace(/\D/g, '');
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : (cpf ?? '');
}

function fmtSexo(s?: string): string {
  return s === 'M' ? 'Masculino' : s === 'F' ? 'Feminino' : '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState { message: string; type: 'success' | 'error' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcHoras(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const [ih, im] = inicio.split(':').map(Number);
  const [fh, fm] = fim.split(':').map(Number);
  const diff = (fh * 60 + fm) - (ih * 60 + im);
  return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// O anexo é gravado inline no Firestore (sem Firebase Storage no plano atual), que
// limita o documento a ~1 MiB. Mantemos o anexo abaixo de ~700 KB com folga: imagens
// são redimensionadas/recomprimidas; PDFs acima do limite são recusados.
const MAX_ANEXO_BYTES = 700 * 1024;
const MAX_IMG_DIM = 1600;

/** Tamanho aproximado em bytes do conteúdo de uma data URL base64. */
function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
    img.src = src;
  });
}

/** Redimensiona e recomprime uma imagem como JPEG até caber em MAX_ANEXO_BYTES. */
async function compressImage(file: File): Promise<Anexo> {
  const original = await fileToDataUrl(file);
  const img = await loadImage(original);

  let { width, height } = img;
  const maxSide = Math.max(width, height);
  if (maxSide > MAX_IMG_DIM) {
    const scale = MAX_IMG_DIM / maxSide;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { nome: file.name, tipo: file.type, tamanho: file.size, dataUrl: original };
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrlBytes(dataUrl) > MAX_ANEXO_BYTES && quality > 0.3) {
    quality -= 0.15;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const nome = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return { nome, tipo: 'image/jpeg', tamanho: dataUrlBytes(dataUrl), dataUrl };
}

// ── Component ─────────────────────────────────────────────────────────────────

// Rascunho vindo da Fila de Análise do JustDocs (doc do WhatsApp já no GED): pré-preenche o
// lançamento e referencia o doc existente (Opção A — não re-sobe arquivo).
export interface GedDraft {
  gedDocumentoId: string;
  colaboradorId: string;
  tipo: DocumentType;
  dataEmissao?: string;
  dias?: number;
  cidCodigo?: string;
  cidDescricao?: string;
  medicoNome?: string;
}

interface NewEntryProps {
  /** Quando presente, o formulário entra em modo edição/reenvio deste documento. */
  editDoc?: DocumentoView | null;
  /** Chamado após reenvio bem-sucedido (ex.: voltar para "Meus Envios"). */
  onResubmitDone?: () => void;
  /** Pré-preenchimento a partir de um doc do GED (ponte do JustDocs). */
  gedDraft?: GedDraft | null;
  /** Chamado após finalizar um lançamento criado a partir da ponte. */
  onGedDone?: () => void;
}

export function NewEntry({ editDoc = null, onResubmitDone, gedDraft = null, onGedDone }: NewEntryProps = {}) {
  const { user } = useAuth();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [docType, setDocType] = useState<DocumentType | null>(editDoc?.tipo ?? gedDraft?.tipo ?? null);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!docType) return;
    setLoadingData(true);
    Promise.all([dataService.listColaboradores(), dataService.listObras()])
      .then(([cols, obs]) => {
        setColaboradores(cols);
        setObras(obs);
      })
      .catch(() => showToast('Erro ao carregar dados. Tente novamente.', 'error'))
      .finally(() => setLoadingData(false));
  }, [docType, showToast]);

  // ── Colaborador picker ───────────────────────────────────────────────────────
  const [colSearch, setColSearch] = useState('');
  const [colDropOpen, setColDropOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState<Colaborador | null>(null);
  const colRef = useRef<HTMLDivElement>(null);

  const filteredCols = colSearch.trim().length > 0
    ? colaboradores.filter(c =>
        c.nome.toLowerCase().includes(colSearch.toLowerCase()) ||
        c.matricula.toLowerCase().includes(colSearch.toLowerCase())
      ).slice(0, 20)
    : [];

  function pickColaborador(col: Colaborador) {
    setSelectedCol(col);
    setColSearch(col.nome);
    setColDropOpen(false);
  }

  function clearColaborador() {
    setSelectedCol(null);
    setColSearch('');
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (colRef.current && !colRef.current.contains(e.target as Node)) {
        setColDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedObra = selectedCol
    ? obras.find(o => o.id === selectedCol.obraId) ?? null
    : null;

  // ── Atestado fields ──────────────────────────────────────────────────────────
  const [dataEmissao, setDataEmissao] = useState('');
  const [dias, setDias] = useState('');
  const [hasCID, setHasCID] = useState(false);
  const [cidSearch, setCidSearch] = useState('');
  const [cidResults, setCidResults] = useState<Cid[]>([]);
  const [cidDropOpen, setCidDropOpen] = useState(false);
  const [selectedCid, setSelectedCid] = useState<Cid | null>(null);
  const [medicoNome, setMedicoNome] = useState('');
  const [medicoCrm, setMedicoCrm] = useState('');
  const cidRef = useRef<HTMLDivElement>(null);
  const cidDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close CID dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (cidRef.current && !cidRef.current.contains(e.target as Node)) {
        setCidDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function handleCidChange(value: string) {
    setCidSearch(value);
    setSelectedCid(null);
    if (cidDebounce.current) clearTimeout(cidDebounce.current);
    if (value.trim().length < 2) {
      setCidResults([]);
      setCidDropOpen(false);
      return;
    }
    cidDebounce.current = setTimeout(async () => {
      try {
        const results = await dataService.searchCid(value.trim());
        setCidResults(results);
        setCidDropOpen(results.length > 0);
      } catch {
        setCidResults([]);
      }
    }, 300);
  }

  function pickCid(cid: Cid) {
    setSelectedCid(cid);
    setCidSearch(`${cid.codigo} — ${cid.descricao}`);
    setCidDropOpen(false);
  }

  // ── Declaração fields ────────────────────────────────────────────────────────
  const [dataComparecimento, setDataComparecimento] = useState('');
  const [periodo, setPeriodo] = useState<'manha' | 'tarde' | 'integral'>('manha');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [local, setLocal] = useState('');

  const horasCalculadas = calcHoras(horaInicio, horaFim);

  // ── Anexo ────────────────────────────────────────────────────────────────────
  const [anexo, setAnexo] = useState<Anexo | null>(editDoc?.anexo ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // ── Pré-preenchimento em modo edição/reenvio ─────────────────────────────────
  const prefilled = useRef(false);
  useEffect(() => {
    if (!editDoc || prefilled.current) return;
    prefilled.current = true;
    if (editDoc.tipo === 'atestado') {
      setDataEmissao(editDoc.dataEmissao ?? '');
      setDias(editDoc.dias != null ? String(editDoc.dias) : '');
      if (editDoc.cid) {
        setHasCID(true);
        setSelectedCid(editDoc.cid);
        setCidSearch(`${editDoc.cid.codigo} — ${editDoc.cid.descricao}`);
      }
      setMedicoNome(editDoc.medicoNome ?? '');
      setMedicoCrm(editDoc.medicoCrm ?? '');
      // Horário opcional, se houver.
      if (editDoc.periodo) setPeriodo(editDoc.periodo);
      setHoraInicio(editDoc.horaInicio ?? '');
      setHoraFim(editDoc.horaFim ?? '');
    } else {
      setDataComparecimento(editDoc.dataComparecimento ?? '');
      setPeriodo(editDoc.periodo ?? 'manha');
      setHoraInicio(editDoc.horaInicio ?? '');
      setHoraFim(editDoc.horaFim ?? '');
      setLocal(editDoc.local ?? '');
    }
  }, [editDoc]);

  // Seleciona o colaborador do documento assim que a lista carregar.
  useEffect(() => {
    if (!editDoc || selectedCol || colaboradores.length === 0) return;
    const col = colaboradores.find(c => c.id === editDoc.colaboradorId);
    if (col) { setSelectedCol(col); setColSearch(col.nome); }
  }, [editDoc, colaboradores, selectedCol]);

  // ── Pré-preenchimento via PONTE (doc do GED vindo do JustDocs) ────────────────
  const gedPrefilled = useRef(false);
  useEffect(() => {
    if (!gedDraft || gedPrefilled.current) return;
    gedPrefilled.current = true;
    if (gedDraft.tipo === 'atestado') {
      setDataEmissao(gedDraft.dataEmissao ?? '');
      if (gedDraft.dias != null) setDias(String(gedDraft.dias));
      if (gedDraft.cidCodigo) {
        setHasCID(true);
        const cid = { codigo: gedDraft.cidCodigo, descricao: gedDraft.cidDescricao ?? '' } as Cid;
        setSelectedCid(cid);
        setCidSearch(gedDraft.cidDescricao ? `${cid.codigo} — ${cid.descricao}` : cid.codigo);
      }
      if (gedDraft.medicoNome) setMedicoNome(gedDraft.medicoNome);
    }
  }, [gedDraft]);

  // Seleciona o colaborador do rascunho do GED quando a lista carregar.
  useEffect(() => {
    if (!gedDraft || selectedCol || colaboradores.length === 0) return;
    const col = colaboradores.find(c => c.id === gedDraft.colaboradorId);
    if (col) { setSelectedCol(col); setColSearch(col.nome); }
  }, [gedDraft, colaboradores, selectedCol]);

  async function processFile(file: File) {
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        if (compressed.tamanho > MAX_ANEXO_BYTES) {
          showToast('Imagem muito grande mesmo após compressão. Use uma foto menor.', 'error');
          return;
        }
        setAnexo(compressed);
        return;
      }

      // PDFs e demais: não dá para comprimir aqui — impõe o limite direto.
      if (file.size > MAX_ANEXO_BYTES) {
        showToast(
          `Arquivo de ${formatBytes(file.size)}. No plano atual o limite é ${formatBytes(MAX_ANEXO_BYTES)} — comprima o PDF ou envie uma foto.`,
          'error',
        );
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      setAnexo({ nome: file.name, tipo: file.type, tamanho: file.size, dataUrl });
    } catch {
      showToast('Não foi possível processar o arquivo. Tente outro.', 'error');
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be picked again after removing
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!docType) return;

    // Validate collaborator
    if (!selectedCol) {
      showToast('Selecione um colaborador antes de enviar.', 'error');
      return;
    }

    // Type-specific validation
    if (docType === 'atestado') {
      const missing: string[] = [];
      if (!dataEmissao) missing.push('Data de Emissão');
      if (!dias || Number(dias) <= 0) missing.push('Quantidade de Dias (> 0)');
      if (hasCID && !selectedCid) missing.push('CID (ou desmarque "Sim")');
      if (missing.length > 0) {
        showToast(`Campos obrigatórios: ${missing.join(', ')}.`, 'error');
        return;
      }
    } else {
      const missing: string[] = [];
      if (!dataComparecimento) missing.push('Data do Comparecimento');
      if (!horaInicio) missing.push('Horário Inicial');
      if (!horaFim) missing.push('Horário Final');
      if (!local.trim()) missing.push('Local / Motivo');
      if (missing.length > 0) {
        showToast(`Campos obrigatórios: ${missing.join(', ')}.`, 'error');
        return;
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    try {
      setSubmitting(true);

      // Campos específicos do tipo do documento.
      const campos = docType === 'atestado'
        ? {
            dataEmissao,
            dias: Number(dias),
            cid: hasCID ? (selectedCid ?? null) : null,
            medicoNome: medicoNome || undefined,
            medicoCrm: medicoCrm || undefined,
            // Horário opcional no atestado: só envia se preenchido.
            horaInicio: horaInicio || undefined,
            horaFim: horaFim || undefined,
            periodo: (horaInicio || horaFim) ? periodo : undefined,
            horas: (horaInicio && horaFim) ? horasCalculadas : undefined,
          }
        : {
            dataComparecimento,
            periodo,
            horaInicio,
            horaFim,
            horas: horasCalculadas,
            local: local.trim(),
          };

      if (editDoc) {
        // Reenvio: atualiza o documento devolvido e o devolve para análise.
        await dataService.updateDocumento(editDoc.id, {
          ...campos,
          anexo: anexo ?? null,
          status: 'pendente',
          motivo: '',
        });
        showToast(`Reenviado para análise — ${editDoc.ticket}`, 'success');
        void dataService.logEvento({
          usuario: user?.nome ?? 'Apontador',
          acao: 'Reenvio',
          modulo: 'Novo Lançamento',
          detalhe: `${editDoc.ticket} reenviado após correção (${selectedCol.nome})`,
        }).catch(() => {});
        onResubmitDone?.();
      } else {
        const base = {
          tipo: docType,
          status: 'pendente' as const,
          colaboradorId: selectedCol.id,
          dataLancamento: today,
          analista: undefined,
          apontadorId: user?.id,
          apontadorNome: user?.nome,
          // PONTE: referencia o doc já no GED (não re-sobe arquivo); senão usa o anexo do upload.
          anexo: gedDraft ? null : (anexo ?? null),
          gedDocumentoId: gedDraft?.gedDocumentoId,
        };
        const doc = await dataService.createDocumento({ ...base, ...campos });
        showToast(`Enviado para análise — ${doc.ticket}`, 'success');
        void dataService.logEvento({
          usuario: user?.nome ?? 'Apontador',
          acao: 'Lançamento',
          modulo: 'Novo Lançamento',
          detalhe: `${doc.ticket} (${docType}) enviado para ${selectedCol.nome}`,
        }).catch(() => {});
        if (gedDraft) onGedDone?.();
        else resetForm();
      }
    } catch {
      showToast('Erro ao enviar documento. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setDocType(null);
    setSelectedCol(null);
    setColSearch('');
    setDataEmissao('');
    setDias('');
    setHasCID(false);
    setCidSearch('');
    setSelectedCid(null);
    setCidResults([]);
    setMedicoNome('');
    setMedicoCrm('');
    setDataComparecimento('');
    setPeriodo('manha');
    setHoraInicio('');
    setHoraFim('');
    setLocal('');
    setAnexo(null);
  }

  // ── Ctrl+S ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        showToast('Rascunho salvo com sucesso (Ctrl+S)');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast]);

  const noColaboradores = !loadingData && colaboradores.length === 0 && docType !== null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {!docType ? (
        /* ── Chooser ── */
        <div className="space-y-6">
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              Qual tipo de documento deseja lançar?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A escolha correta impacta nos indicadores de absenteísmo, horas perdidas e na folha de pagamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setDocType('declaracao')}
              className="flex flex-col items-center p-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-amber-500 hover:shadow-lg hover:shadow-amber-100/50 transition-all group"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-100 transition-colors">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Declaração de Comparecimento</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Comprova presença em consulta, exame ou atendimento. Impacto em{' '}
                <strong className="text-slate-700 dark:text-slate-300">horas ou turnos</strong> (não afasta por dias inteiros).
              </p>
            </button>

            <button
              onClick={() => setDocType('atestado')}
              className="flex flex-col items-center p-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-petroleum-600 hover:shadow-lg hover:shadow-petroleum-100/50 transition-all group"
            >
              <div className="w-16 h-16 bg-petroleum-50 text-petroleum-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-petroleum-100 transition-colors">
                <CalendarDays size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Atestado Médico</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Informa necessidade de repouso por período. Impacta{' '}
                <strong className="text-slate-700 dark:text-slate-300">dias inteiros (afastamento)</strong> e aumenta o absenteísmo.
              </p>
            </button>
          </div>
        </div>
      ) : (
        /* ── Form ── */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center">
              <FilePlus className="mr-3 text-slate-400" />
              {docType === 'atestado' ? 'Novo Atestado Médico' : 'Nova Declaração de Comparecimento'}
            </h2>
            <button
              onClick={() => { resetForm(); setDocType(null); }}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700"
            >
              &larr; Voltar e escolher outro
            </button>
          </div>

          {/* No colaboradores notice */}
          {noColaboradores && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Nenhum colaborador cadastrado. Solicite ao RH o cadastro em Administração.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Main column ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Banner de reenvio — motivo da recusa do RH */}
              {editDoc && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
                      Documento {editDoc.ticket} devolvido para correção
                    </p>
                    <p className="text-sm text-rose-700 dark:text-rose-300 mt-0.5">
                      {editDoc.motivo || 'Sem motivo registrado.'}
                    </p>
                    <p className="text-xs text-rose-600/80 dark:text-rose-400 mt-1">
                      Corrija os campos abaixo e reenvie para nova análise do RH.
                    </p>
                  </div>
                </div>
              )}

              {/* Colaborador card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-6 py-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Dados do Colaborador</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Searchable picker */}
                  <div className="md:col-span-2" ref={colRef}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Buscar Colaborador <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={colSearch}
                        onChange={e => {
                          setColSearch(e.target.value);
                          setSelectedCol(null);
                          setColDropOpen(e.target.value.trim().length > 0);
                        }}
                        onFocus={() => {
                          if (colSearch.trim().length > 0 && !selectedCol) setColDropOpen(true);
                        }}
                        className="w-full pl-9 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        placeholder={loadingData ? 'Carregando...' : 'Nome ou Matrícula...'}
                        disabled={loadingData}
                      />
                      {selectedCol && (
                        <button
                          type="button"
                          onClick={clearColaborador}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {/* Dropdown */}
                      {colDropOpen && filteredCols.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-56 overflow-y-auto">
                          <ul className="py-1 text-sm">
                            {filteredCols.map(col => (
                              <li
                                key={col.id}
                                onMouseDown={() => pickColaborador(col)}
                                className="px-3 py-2 hover:bg-petroleum-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3"
                              >
                                <span className="font-mono text-xs text-slate-400 w-16 shrink-0">{col.matricula}</span>
                                <span className="text-slate-900 dark:text-slate-100 truncate">{col.nome}</span>
                                <span className="text-slate-400 dark:text-slate-500 text-xs truncate ml-auto shrink-0">{col.cargo}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {colDropOpen && colSearch.trim().length > 0 && filteredCols.length === 0 && !loadingData && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg px-3 py-2 text-sm text-slate-500">
                          Nenhum resultado encontrado.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Obra */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Obra / Alocação</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 dark:text-slate-400 sm:text-sm"
                      value={selectedObra ? `${selectedObra.codigo} - ${selectedObra.nome}` : ''}
                      placeholder="—"
                    />
                  </div>

                  {/* Cargo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cargo / Função</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 dark:text-slate-400 sm:text-sm"
                      value={selectedCol?.cargo ?? ''}
                      placeholder="—"
                    />
                  </div>

                  {/* Centro de Custo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Centro de Custo</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 dark:text-slate-400 sm:text-sm"
                      value={selectedCol?.centroCusto ?? ''}
                      placeholder="—"
                    />
                  </div>

                  {/* CPF */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CPF</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 dark:text-slate-400 sm:text-sm"
                      value={fmtCpf(selectedCol?.cpf)}
                      placeholder="—"
                    />
                  </div>

                  {/* Sexo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sexo</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 dark:text-slate-400 sm:text-sm"
                      value={fmtSexo(selectedCol?.sexo)}
                      placeholder="—"
                    />
                  </div>

                  {/* Data de Admissão */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Admissão</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 dark:text-slate-400 sm:text-sm"
                      value={fmtDataBR(selectedCol?.dataAdmissao)}
                      placeholder="—"
                    />
                  </div>

                  {/* Data de Nascimento */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Nascimento</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 dark:text-slate-400 sm:text-sm"
                      value={fmtDataBR(selectedCol?.dataNascimento)}
                      placeholder="—"
                    />
                  </div>
                </div>
              </div>

              {/* Document details card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-6 py-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Detalhes do Documento</h3>
                </div>

                {docType === 'declaracao' ? (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data do Comparecimento <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dataComparecimento}
                        onChange={e => setDataComparecimento(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Período / Turno</label>
                      <select
                        value={periodo}
                        onChange={e => setPeriodo(e.target.value as 'manha' | 'tarde' | 'integral')}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      >
                        <option value="manha">Manhã</option>
                        <option value="tarde">Tarde</option>
                        <option value="integral">Integral</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Horário Inicial <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={e => setHoraInicio(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Horário Final <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={horaFim}
                        onChange={e => setHoraFim(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Auto-calculated hours */}
                    {horaInicio && horaFim && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total de Horas</label>
                        <div className={cn(
                          "w-full rounded-md px-3 py-2 sm:text-sm font-medium border",
                          horasCalculadas > 0
                            ? "bg-petroleum-50 dark:bg-petroleum-900/20 border-petroleum-200 dark:border-petroleum-700 text-petroleum-800 dark:text-petroleum-300"
                            : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-400"
                        )}>
                          {horasCalculadas > 0
                            ? `${horasCalculadas}h (calculado automaticamente)`
                            : 'Horário Final deve ser posterior ao Inicial'}
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Local / Motivo do Atendimento <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={local}
                        onChange={e => setLocal(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        placeholder="Ex: Exame admissional, Consulta clínica, Doação de Sangue..."
                      />
                    </div>
                  </div>
                ) : (
                  /* Atestado fields */
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data de Emissão <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dataEmissao}
                        onChange={e => setDataEmissao(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Quantidade de Dias <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={dias}
                        onChange={e => setDias(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* CID toggle + autocomplete */}
                    <div className="md:col-span-2 mt-2">
                      <div className="flex items-center space-x-4 mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Documento possui CID informado?
                        </label>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setHasCID(true)}
                            className={cn(
                              "px-3 py-1 text-sm rounded-full font-medium border",
                              hasCID
                                ? "bg-petroleum-50 dark:bg-petroleum-900/30 border-petroleum-600 dark:border-petroleum-400 text-petroleum-700 dark:text-petroleum-300"
                                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >Sim</button>
                          <button
                            type="button"
                            onClick={() => { setHasCID(false); setSelectedCid(null); setCidSearch(''); }}
                            className={cn(
                              "px-3 py-1 text-sm rounded-full font-medium border",
                              !hasCID
                                ? "bg-slate-100 dark:bg-slate-800 border-slate-400 text-slate-700 dark:text-slate-300"
                                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >Não</button>
                        </div>
                      </div>

                      {hasCID && (
                        <div className="relative p-4 border border-petroleum-200 bg-petroleum-50/50 dark:bg-petroleum-900/10 dark:border-petroleum-800 rounded-lg" ref={cidRef}>
                          <label className="block text-sm font-medium text-petroleum-900 dark:text-petroleum-300 mb-1 flex items-center">
                            <Search className="w-4 h-4 mr-1 text-petroleum-600" /> Referência CID-10
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={cidSearch}
                              onChange={e => handleCidChange(e.target.value)}
                              onFocus={() => { if (cidResults.length > 0 && !selectedCid) setCidDropOpen(true); }}
                              className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 pr-8 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              placeholder="Digite código (ex: A09) ou descrição (ex: Diarreia)..."
                            />
                            {selectedCid && (
                              <button
                                type="button"
                                onClick={() => { setSelectedCid(null); setCidSearch(''); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {cidDropOpen && cidResults.length > 0 && (
                              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <ul className="py-1 text-sm text-slate-700 dark:text-slate-300">
                                  {cidResults.map(cid => (
                                    <li
                                      key={cid.codigo}
                                      onMouseDown={() => pickCid(cid)}
                                      className="px-3 py-2 hover:bg-petroleum-50 dark:hover:bg-slate-800 cursor-pointer flex gap-3"
                                    >
                                      <span className="font-semibold w-14 shrink-0 text-petroleum-700 dark:text-petroleum-400">{cid.codigo}</span>
                                      <span className="truncate">{cid.descricao}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Médico</label>
                        <input
                          type="text"
                          value={medicoNome}
                          onChange={e => setMedicoNome(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CRM/CRO</label>
                        <input
                          type="text"
                          value={medicoCrm}
                          onChange={e => setMedicoCrm(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Horário (opcional) */}
                    <div className="md:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Horário <span className="font-normal normal-case tracking-normal">(opcional)</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Período / Turno</label>
                          <select
                            value={periodo}
                            onChange={e => setPeriodo(e.target.value as 'manha' | 'tarde' | 'integral')}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                          >
                            <option value="manha">Manhã</option>
                            <option value="tarde">Tarde</option>
                            <option value="integral">Integral</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Inicial</label>
                          <input
                            type="time"
                            value={horaInicio}
                            onChange={e => setHoraInicio(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Final</label>
                          <input
                            type="time"
                            value={horaFim}
                            onChange={e => setHoraFim(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-6">
              {/* Anexo card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-6 py-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Anexo</h3>
                </div>
                <div className="p-6">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileInput}
                  />

                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group",
                      dragging
                        ? "border-petroleum-500 bg-petroleum-50 dark:bg-petroleum-900/20"
                        : "border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-petroleum-400"
                    )}
                  >
                    <div className="w-12 h-12 bg-petroleum-50 dark:bg-petroleum-900/30 text-petroleum-600 dark:text-petroleum-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Arraste a foto ou PDF aqui</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ou clique para procurar no computador</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Fotos são otimizadas automaticamente • PDF até ~700 KB</p>
                  </div>

                  {/* Selected file card */}
                  {anexo && (
                    <div className="mt-4 p-3 border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 rounded-lg flex items-start">
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-3 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300 truncate">{anexo.nome}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500">{formatBytes(anexo.tamanho)} — Pronto para envio.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAnexo(null)}
                        className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => showToast('Rascunho salvo com sucesso!')}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || noColaboradores}
                  className={cn(
                    "flex-1 px-4 py-2 bg-petroleum-600 text-white rounded-md font-medium text-sm shadow-sm dark:shadow-none transition-colors",
                    submitting || noColaboradores
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-petroleum-700"
                  )}
                >
                  {submitting ? 'Enviando...' : editDoc ? 'Reenviar p/ RH' : 'Enviar p/ RH'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={cn(
            "flex items-center px-4 py-3 rounded-lg shadow-lg border",
            toast.type === 'success'
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}>
            <CheckCircle2 className="w-5 h-5 mr-3" />
            <span className="font-medium text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

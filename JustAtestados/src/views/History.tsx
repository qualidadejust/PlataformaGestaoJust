import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, User, Briefcase, CalendarDays, Clock, FileText,
  CheckCircle2, XCircle, AlertCircle, Eye, MapPin, UserSquare2,
  Download, Loader2,
} from 'lucide-react';
import { cn, openAnexo } from '../utils';
import { ExportModal } from '../components/ExportModal';
import { dataService } from '../services';
import type { Colaborador, DocumentoView, Obra } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function currentYear(): number {
  return new Date().getFullYear();
}

function docYear(doc: DocumentoView): number {
  return new Date(doc.dataLancamento).getFullYear();
}

function periodoLabel(p: string | undefined): string {
  if (!p) return '—';
  const map: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', integral: 'Integral' };
  return map[p] ?? p;
}

// ── component ─────────────────────────────────────────────────────────────────

export function History() {
  const [showExport, setShowExport] = useState(false);

  // Search
  const [query, setQuery] = useState('');
  const [allColaboradores, setAllColaboradores] = useState<Colaborador[]>([]);
  const [suggestions, setSuggestions] = useState<Colaborador[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected state
  const [selected, setSelected] = useState<Colaborador | null>(null);
  const [obraMap, setObraMap] = useState<Record<string, Obra>>({});
  const [docs, setDocs] = useState<DocumentoView[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Load colaboradores + obras once
  useEffect(() => {
    Promise.all([
      dataService.listColaboradores(),
      dataService.listObras(),
    ]).then(([cols, obras]) => {
      setAllColaboradores(cols);
      const map: Record<string, Obra> = {};
      obras.forEach(o => { map[o.id] = o; });
      setObraMap(map);
    });
  }, []);

  // Filter suggestions as user types
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const matches = allColaboradores.filter(
      c =>
        c.nome.toLowerCase().includes(q) ||
        c.matricula.toLowerCase().includes(q),
    );
    setSuggestions(matches.slice(0, 8));
  }, [query, allColaboradores]);

  // Load documents when a colaborador is selected
  useEffect(() => {
    if (!selected) return;
    setLoadingDocs(true);
    dataService
      .listDocumentos()
      .then(all => {
        const filtered = all
          .filter(d => d.colaboradorId === selected.id)
          .sort(
            (a, b) =>
              new Date(b.dataLancamento).getTime() -
              new Date(a.dataLancamento).getTime(),
          );
        setDocs(filtered);
      })
      .finally(() => setLoadingDocs(false));
  }, [selected]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSelect = useCallback(
    (col: Colaborador) => {
      setSelected(col);
      setQuery(col.nome);
      setSuggestions([]);
      setShowDropdown(false);
    },
    [],
  );

  // Stats computed from this year's approved docs
  const year = currentYear();
  const yearDocs = docs.filter(d => docYear(d) === year);
  const atestadosAno = yearDocs.filter(d => d.tipo === 'atestado').length;
  const declaracoesAno = yearDocs.filter(d => d.tipo === 'declaracao').length;
  const diasPerdidos = yearDocs
    .filter(d => d.tipo === 'atestado' && d.status === 'aprovado' && d.dias)
    .reduce((acc, d) => acc + (d.dias ?? 0), 0);
  const horasPerdidas = yearDocs
    .filter(d => d.tipo === 'declaracao' && d.status === 'aprovado' && d.horas)
    .reduce((acc, d) => acc + (d.horas ?? 0), 0);

  // Build obra label for selected colaborador
  const obraLabel = selected
    ? (() => {
        const obra = obraMap[selected.obraId];
        return obra ? `${obra.codigo} - ${obra.nome} (${obra.uf})` : selected.obraId;
      })()
    : '';

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none flex items-center justify-between">
        <div ref={searchRef} className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            placeholder="Buscar colaborador por NOME ou MATRÍCULA..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map(col => (
                <li
                  key={col.id}
                  onMouseDown={() => handleSelect(col)}
                  className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{col.nome}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mat. {col.matricula} · {col.cargo} · {col.setor}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center text-sm font-medium text-petroleum-600 hover:text-petroleum-700 bg-petroleum-50 px-3 py-2 rounded-md"
          >
            <Download className="w-4 h-4 mr-1.5" /> Exportar Dados
          </button>
        </div>
      </div>

      {/* Empty prompt */}
      {!selected && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none p-16 flex flex-col items-center text-center">
          <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-base font-semibold text-slate-600 dark:text-slate-400">
            Nenhum colaborador selecionado
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Use a busca acima para localizar um colaborador pelo nome ou matrícula.
          </p>
        </div>
      )}

      {/* Profile Header */}
      {selected && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none overflow-hidden">
            <div className="p-6 lg:flex lg:items-start lg:justify-between">
              <div className="flex items-start space-x-5">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 border-2 border-white shadow-sm dark:shadow-none">
                  <User className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selected.nome}</h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center">
                      <UserSquare2 className="w-4 h-4 mr-1.5 text-slate-400" /> Matrícula: {selected.matricula}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1.5 text-slate-400" /> {obraLabel}
                    </span>
                    <span className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-1.5 text-slate-400" /> {selected.cargo}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Setor: {selected.setor}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      C.C.: {selected.centroCusto}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Gestor: {selected.gestor}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 lg:mt-0 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Atestados (Ano)</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-1">{atestadosAno}</p>
                </div>
                <div className="text-center border-l border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Declarações (Ano)</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-1">{declaracoesAno}</p>
                </div>
                <div className="text-center border-l border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dias Perdidos</p>
                  <p className={cn('text-xl font-bold mt-1', diasPerdidos > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-50')}>
                    {diasPerdidos}
                  </p>
                </div>
                <div className="text-center border-l border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Horas Perdidas</p>
                  <p className={cn('text-xl font-bold mt-1', horasPerdidas > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-slate-50')}>
                    {horasPerdidas > 0 ? `${horasPerdidas}h` : '0h'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* History Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Histórico de Lançamentos</h3>
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none p-6 overflow-hidden">
              {loadingDocs && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-petroleum-500 mr-2" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Carregando lançamentos...</span>
                </div>
              )}

              {!loadingDocs && docs.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-base font-semibold text-slate-600 dark:text-slate-400">Nenhum lançamento encontrado</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Este colaborador ainda não possui documentos registrados.</p>
                </div>
              )}

              {!loadingDocs && docs.length > 0 && (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8">
                  {docs.map(doc => {
                    // Build period / detail strings
                    const isAtestado = doc.tipo === 'atestado';
                    const periodText = isAtestado
                      ? doc.dias != null ? `${doc.dias} dia${doc.dias !== 1 ? 's' : ''}` : '—'
                      : doc.horas != null
                        ? `${periodoLabel(doc.periodo)} (${doc.horas}h)`
                        : periodoLabel(doc.periodo);

                    const detailText = isAtestado
                      ? doc.cid
                        ? `${doc.cid.codigo} - ${doc.cid.descricao}`
                        : doc.medicoNome ? `Dr(a). ${doc.medicoNome}` : '—'
                      : doc.local ?? '—';

                    const title = isAtestado ? 'Atestado Médico' : 'Declaração de Comparecimento';
                    const dateLabel = formatDate(doc.dataLancamento);
                    const hasAnexo = !!(doc.anexo?.dataUrl);

                    return (
                      <div key={doc.id} className="relative pl-8 sm:pl-10">
                        {/* Timeline Node */}
                        <span className={cn(
                          'absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-sm border',
                          isAtestado
                            ? 'bg-petroleum-50 border-petroleum-200 text-petroleum-600'
                            : 'bg-amber-50 border-amber-200 text-amber-600',
                        )}>
                          {isAtestado ? <CalendarDays className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </span>

                        {/* Content Card */}
                        <div className={cn(
                          'bg-white dark:bg-slate-900 border rounded-xl overflow-hidden transition-all hover:shadow-md',
                          doc.status === 'reprovado' ? 'border-rose-200 dark:border-rose-800' : 'border-slate-200 dark:border-slate-700',
                        )}>
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-y-2 mb-2">
                              <div className="flex items-center max-w-full flex-wrap gap-2">
                                <h4 className="text-base font-bold text-slate-900 dark:text-slate-50 mr-1 truncate">{title}</h4>
                                {doc.status === 'aprovado' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado
                                  </span>
                                )}
                                {doc.status === 'reprovado' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3 mr-1" /> Reprovado
                                  </span>
                                )}
                                {doc.status === 'pendente' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                    <AlertCircle className="w-3 h-3 mr-1" /> Pendente
                                  </span>
                                )}
                                {doc.status === 'inconsistente' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    <AlertCircle className="w-3 h-3 mr-1" /> Inconsistente
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {dateLabel}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider mb-1">
                                  {isAtestado ? 'Afastamento' : 'Período'}
                                </p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{periodText}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider mb-1">
                                  {isAtestado ? 'Diagnóstico / CID' : 'Local / Motivo'}
                                </p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{detailText}</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Ticket: <span className="text-slate-700 dark:text-slate-300">{doc.ticket}</span>
                              {doc.analista && (
                                <> · Analisado por {doc.analista}</>
                              )}
                            </span>
                            {hasAnexo ? (
                              <button
                                onClick={() => openAnexo(doc.anexo)}
                                className="flex items-center text-sm font-semibold text-petroleum-600 hover:text-petroleum-700 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm px-3 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Eye className="w-4 h-4 mr-1.5" />
                                Ver Documento
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex items-center text-sm font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md cursor-not-allowed"
                              >
                                <Eye className="w-4 h-4 mr-1.5" />
                                Sem anexo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} title="Exportar Histórico do Colaborador" />}
    </div>
  );
}

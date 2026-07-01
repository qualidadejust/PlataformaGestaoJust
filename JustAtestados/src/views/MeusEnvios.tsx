import { useState, useEffect, useCallback } from 'react';
import { FileText, AlertCircle, RotateCcw, Clock, CheckCircle2, Loader2, Paperclip } from 'lucide-react';
import { dataService } from '../services';
import type { DocumentoView } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn, openAnexo } from '../utils';

interface MeusEnviosProps {
  /** Abre o documento devolvido no formulário (modo reenvio). */
  onReenviar: (doc: DocumentoView) => void;
}

const DEVOLVIDO = (s: string) => s === 'reprovado' || s === 'inconsistente';

function fmtData(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function statusInfo(status: string): { label: string; cls: string } {
  switch (status) {
    case 'aprovado': return { label: 'Aprovado', cls: 'bg-emerald-100 text-emerald-800' };
    case 'pendente': return { label: 'Em análise', cls: 'bg-amber-100 text-amber-800' };
    case 'reprovado':
    case 'inconsistente': return { label: 'Devolvido', cls: 'bg-rose-100 text-rose-800' };
    default: return { label: status, cls: 'bg-slate-100 text-slate-700' };
  }
}

export function MeusEnvios({ onReenviar }: MeusEnviosProps) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentoView[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todos = await dataService.listDocumentos();
      // Apontador vê só os próprios envios; RH (se acessar) vê todos.
      const meus = user?.role === 'apontador'
        ? todos.filter(d => d.apontadorId === user.id)
        : todos;
      setDocs(meus);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const devolvidos = docs.filter(d => DEVOLVIDO(d.status));
  const outros = docs.filter(d => !DEVOLVIDO(d.status));

  const afast = (d: DocumentoView) =>
    d.tipo === 'atestado'
      ? (d.dias != null ? `${d.dias} dia(s)` : 'atestado')
      : (d.horas != null ? `${d.horas}h` : 'declaração');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Meus Envios</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Acompanhe seus documentos e corrija os que o RH devolveu.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...</div>
      ) : docs.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <FileText className="w-10 h-10 mb-3 opacity-40" />
          <p className="font-medium">Você ainda não enviou documentos.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Devolvidos para correção */}
          {devolvidos.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-600 mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" /> Devolvidos para correção ({devolvidos.length})
              </h2>
              <div className="space-y-3">
                {devolvidos.map(d => (
                  <div key={d.id} className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-700/60 rounded-xl p-4 shadow-sm dark:shadow-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-50">{d.ticket}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-medium">Devolvido</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                          {d.tipo === 'atestado' ? 'Atestado' : 'Declaração'} · {d.colaboradorNome} ({d.matricula}) · {afast(d)} · {fmtData(d.dataLancamento)}
                        </p>
                        <div className="mt-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-md px-3 py-2">
                          <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Motivo da devolução:</p>
                          <p className="text-sm text-rose-800 dark:text-rose-200">{d.motivo || 'Não informado.'}</p>
                          {d.analista && <p className="text-xs text-rose-500 mt-1">por {d.analista}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {d.anexo && (
                          <button onClick={() => openAnexo(d.anexo)} className="inline-flex items-center justify-center text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <Paperclip className="w-4 h-4 mr-1.5" /> Ver anexo
                          </button>
                        )}
                        <button onClick={() => onReenviar(d)} className="inline-flex items-center justify-center text-sm px-3 py-1.5 bg-petroleum-600 text-white rounded-md font-medium hover:bg-petroleum-700">
                          <RotateCcw className="w-4 h-4 mr-1.5" /> Corrigir e reenviar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Demais envios */}
          {outros.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Outros envios ({outros.length})</h2>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Ticket</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Enviado</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {outros.map(d => {
                      const s = statusInfo(d.status);
                      return (
                        <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">{d.ticket}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{d.colaboradorNome}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.tipo === 'atestado' ? 'Atestado' : 'Declaração'}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtData(d.dataLancamento)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', s.cls)}>
                              {d.status === 'aprovado' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

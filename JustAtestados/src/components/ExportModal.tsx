import { useState } from 'react';
import { XCircle, FileText, Download } from 'lucide-react';
import type { DocumentoView } from '../types';

interface ExportModalProps {
  onClose: () => void;
  title?: string;
  rows?: DocumentoView[];
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function motivo(doc: DocumentoView) {
  if (doc.tipo === 'atestado') {
    return doc.cid ? `${doc.cid.codigo} - ${doc.cid.descricao}` : 'Sem CID Informado';
  }
  return doc.local ?? '';
}

function afastamento(doc: DocumentoView) {
  if (doc.tipo === 'atestado') return doc.dias != null ? `${doc.dias}` : '';
  if (doc.horas != null) return `${doc.horas}h`;
  if (doc.periodo) {
    const map: Record<string, string> = { manha: 'Turno M', tarde: 'Turno T', integral: 'Integral' };
    return map[doc.periodo] ?? doc.periodo;
  }
  return '';
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Em Análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  inconsistente: 'Inconsistente',
};

function exportCsv(rows: DocumentoView[]) {
  const headers = [
    'Registro', 'Status', 'Colaborador', 'Matrícula', 'Cargo',
    'Obra', 'UF', 'Tipo', 'Motivo', 'Lançamento', 'Afastamento',
  ];

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const lines = [
    headers.map(escape).join(','),
    ...rows.map(doc =>
      [
        doc.ticket,
        STATUS_LABELS[doc.status] ?? doc.status,
        doc.colaboradorNome,
        doc.matricula,
        doc.cargo,
        doc.obraNome,
        doc.obraUf,
        doc.tipo === 'atestado' ? 'Atestado' : 'Declaração',
        motivo(doc),
        formatDate(doc.dataLancamento),
        afastamento(doc),
      ].map(escape).join(','),
    ),
  ];

  const bom = '﻿'; // UTF-8 BOM for Excel
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `consulta_geral_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportModal({ onClose, title = 'Exportar Relatório', rows = [] }: ExportModalProps) {
  const [format, setFormat] = useState('csv');

  const handleExport = () => {
    if (format === 'csv') {
      exportCsv(rows);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center">
            <Download className="w-5 h-5 text-petroleum-600 mr-2" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Formato do Arquivo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`border rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors ${format === 'pdf' ? 'border-petroleum-500 bg-petroleum-50 dark:bg-petroleum-900/30 dark:border-petroleum-400' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <input type="radio" className="sr-only" checked={format === 'pdf'} onChange={() => setFormat('pdf')} />
                <FileText className={`w-6 h-6 mb-1 ${format === 'pdf' ? 'text-petroleum-600 dark:text-petroleum-400' : 'text-slate-400'}`} />
                <span className="text-sm font-medium dark:text-slate-300">PDF (.pdf)</span>
                <span className="text-xs text-slate-400 mt-0.5">Em breve</span>
              </label>
              <label className={`border rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors ${format === 'csv' ? 'border-petroleum-500 bg-petroleum-50 dark:bg-petroleum-900/30 dark:border-petroleum-400' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <input type="radio" className="sr-only" checked={format === 'csv'} onChange={() => setFormat('csv')} />
                <FileText className={`w-6 h-6 mb-1 ${format === 'csv' ? 'text-petroleum-600 dark:text-petroleum-400' : 'text-slate-400'}`} />
                <span className="text-sm font-medium dark:text-slate-300">Planilha (.csv)</span>
              </label>
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Serão exportados <span className="font-semibold text-slate-700 dark:text-slate-200">{rows.length}</span> registro{rows.length !== 1 ? 's' : ''} conforme os filtros aplicados.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={format === 'pdf'}
            className="py-2 px-4 bg-petroleum-600 text-white rounded-md font-medium text-sm hover:bg-petroleum-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Gerar Arquivo
          </button>
        </div>
      </div>
    </div>
  );
}

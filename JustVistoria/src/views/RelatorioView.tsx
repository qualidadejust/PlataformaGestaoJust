import { useQuery, useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { ArrowLeft, Download, Archive } from "lucide-react";
import { api, ETAPA_LABEL, type Etapa, type NaoConformidade, type Termo, type Unidade } from "../lib/api.ts";

interface Relatorio {
  unidade_id: string;
  unidade_label: string;
  etapas: Etapa[];
  ncs: NaoConformidade[];
  termos: Termo[];
}

function montarPdf(rel: Relatorio, obra: string): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 18;
  let y = 20;
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(14, 33, 72);
  doc.text("Relatório de Entrega da Unidade", M, y); y += 7;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
  doc.text(`Unidade: ${rel.unidade_label}   ·   Obra: ${obra}`, M, y); y += 8;

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(14, 33, 72).text("Etapas", M, y); y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(20);
  for (const e of rel.etapas) {
    doc.text(`${ETAPA_LABEL[e.tipo]} — ${e.situacao}   (previsto ${e.previsto_de ?? "—"} → ${e.previsto_ate ?? "—"}${e.realizado_ate ? `, realizado ${e.realizado_ate}` : ""})`, M, y);
    y += 5.5;
  }
  y += 3;

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(14, 33, 72).text(`Não-conformidades (${rel.ncs.length})`, M, y); y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(20);
  if (!rel.ncs.length) { doc.text("Nenhuma.", M, y); y += 5.5; }
  for (const n of rel.ncs) {
    const linha = doc.splitTextToSize(`• [${n.severidade}/${n.status}] ${n.titulo}${n.descricao ? " — " + n.descricao : ""}`, 174);
    doc.text(linha, M, y); y += linha.length * 5 + 1;
    if (y > 270) { doc.addPage(); y = 20; }
  }
  y += 3;

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(14, 33, 72).text("Termos", M, y); y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(20);
  if (!rel.termos.length) { doc.text("Nenhum termo assinado.", M, y); y += 5.5; }
  for (const t of rel.termos) {
    doc.text(`${t.protocolo} — ${t.tipo}${t.modalidade ? ` (${t.modalidade})` : ""} — ${t.cliente_nome} — ${new Date(t.assinado_em).toLocaleString("pt-BR")}`, M, y);
    y += 5.5;
  }
  return doc;
}

export function RelatorioView({ unidade, onVoltar }: { unidade: Unidade; onVoltar: () => void }) {
  const relQ = useQuery({ queryKey: ["relatorio", unidade.id], queryFn: () => api.get<Relatorio>(`/api/unidades/${unidade.id}/relatorio`) });
  const obra = unidade.obra?.nome ?? "—";

  const baixar = () => {
    if (!relQ.data) return;
    montarPdf(relQ.data, obra).save(`relatorio_${unidade.identificador}.pdf`);
  };
  const arquivar = useMutation({
    mutationFn: async () => {
      const blob = montarPdf(relQ.data!, obra).output("blob");
      const fd = new FormData();
      fd.append("file", blob, `relatorio_${unidade.identificador}.pdf`);
      return api.postForm(`/api/unidades/${unidade.id}/relatorio/arquivar`, fd);
    },
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <button onClick={onVoltar} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> Voltar ao pipeline
      </button>
      <h1 className="text-lg font-bold text-brand-900 dark:text-slate-100">Relatório de Entrega — {unidade.identificador}</h1>
      <p className="mb-4 text-sm text-slate-500">{obra}</p>

      {relQ.isLoading && <p className="text-sm text-slate-400">Montando relatório…</p>}
      {relQ.data && (
        <>
          <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p><strong>{relQ.data.etapas.length}</strong> etapas · <strong>{relQ.data.ncs.length}</strong> não-conformidades · <strong>{relQ.data.termos.length}</strong> termos</p>
            <ul className="text-slate-500">
              {relQ.data.etapas.map((e) => (
                <li key={e.id}>{ETAPA_LABEL[e.tipo]}: {e.situacao}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={baixar} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              <Download className="size-4" /> Baixar PDF
            </button>
            <button onClick={() => arquivar.mutate()} disabled={arquivar.isPending} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800">
              <Archive className="size-4" /> {arquivar.isPending ? "Arquivando…" : arquivar.isSuccess ? "Arquivado no GED ✓" : "Arquivar no GED"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

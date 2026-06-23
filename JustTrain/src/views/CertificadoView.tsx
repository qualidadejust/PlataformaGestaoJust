import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { api } from "../lib/cn";
import { gerarCertificadoPdf, gerarCertificadoImg, type CertData } from "../lib/certificadoPdf";

export default function CertificadoView({ participacaoId, onBack }: { participacaoId: string; onBack: () => void }) {
  const cert = useQuery({ queryKey: ["cert", participacaoId], queryFn: () => api<CertData>(`/participacoes/${participacaoId}/certificado`) });
  // Preview = imagem do PDF gerado (mesma fonte do download/impressão: o que você vê = o que sai).
  const img = useQuery({
    queryKey: ["cert-img", participacaoId],
    queryFn: () => gerarCertificadoImg(cert.data!),
    enabled: !!cert.data,
    staleTime: Infinity,
  });
  const [gerando, setGerando] = useState(false);

  const c = cert.data;
  if (!c) return <p className="py-8 text-center text-sm text-slate-400">carregando…</p>;
  const { participacao: p, turma: t } = c;

  async function baixarPdf() {
    setGerando(true);
    try {
      const blob = await gerarCertificadoPdf(c!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${t.treinamento_codigo ?? "treinamento"}-${p.colaborador_nome}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGerando(false);
    }
  }

  // Imprimir usa o MESMO gerador do PDF e abre o arquivo pronto numa nova aba — imprimir
  // o HTML da tela via window.print() saía com a diagramação errada.
  async function imprimirPdf() {
    setGerando(true);
    try {
      const blob = await gerarCertificadoPdf(c!);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#0f2742]">
          <ArrowLeft className="size-4" /> voltar
        </button>
        <div className="flex gap-2">
          <button
            onClick={baixarPdf}
            disabled={gerando}
            className="flex items-center gap-2 rounded-lg border border-[#0f2742] px-4 py-2 text-sm font-semibold text-[#0f2742] hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="size-4" />
            {gerando ? "Gerando…" : "Baixar PDF"}
          </button>
          <button
            onClick={imprimirPdf}
            disabled={gerando}
            className="flex items-center gap-2 rounded-lg bg-[#0f2742] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a66] disabled:opacity-50"
          >
            <Printer className="size-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Preview: imagem do certificado (proporção A4 paisagem) */}
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900">
        {img.isLoading || !img.data ? (
          <div className="flex aspect-[1122/794] items-center justify-center text-sm text-slate-400">
            gerando certificado…
          </div>
        ) : (
          <img src={img.data} alt={`Certificado de ${p.colaborador_nome}`} className="block w-full" />
        )}
      </div>
    </div>
  );
}

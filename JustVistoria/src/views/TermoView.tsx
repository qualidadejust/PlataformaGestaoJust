import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api, type NaoConformidade, type Unidade } from "../lib/api.ts";
import { AssinaturaCanvas } from "../components/AssinaturaCanvas.tsx";

type Tipo = "vistoria_cliente" | "entrega_chaves";

const HOJE = () => new Date().toLocaleDateString("pt-BR");

function textoVistoria(nome: string, cpf: string, unidade: string, obra: string, comRessalva: boolean) {
  return [
    `Eu, ${nome || "_______________"}, portador(a) do CPF ${cpf || "___.___.___-__"}, declaro que o imóvel ` +
      `${unidade} localizado no empreendimento ${obra}, inspecionado em ${HOJE()}, ` +
      (comRessalva
        ? "encontra-se em condições de recebimento, RESSALVADOS os itens relacionados abaixo, que a Construtora se compromete a corrigir."
        : "encontra-se em perfeito estado de funcionamento, não apresentando nenhum vício ou defeito aparente."),
    "Declaro estar ciente de que vícios ocultos, não detectáveis nesta vistoria, permanecem cobertos nos prazos legais (CDC art. 26 e Código Civil), conforme o Manual do Proprietário e a NBR 15575.",
    "Aceito os serviços prestados, nada mais tendo a declarar sobre os mesmos nesta data.",
  ];
}

function textoEntrega(nome: string, cpf: string, unidade: string, obra: string) {
  return [
    `Eu, ${nome || "_______________"}, portador(a) do CPF ${cpf || "___.___.___-__"}, declaro ter recebido as chaves do imóvel ` +
      `${unidade}, do empreendimento ${obra}, em ${HOJE()}, em perfeitas condições de habitabilidade, tendo efetuado vistoria e constatado que as instalações estão em funcionamento.`,
    "Estou ciente de que, a partir desta data, passo a contar com as garantias e os prazos legais (90 dias para vícios aparentes — CDC; demais prazos por sistema conforme a NBR 15575 e o Manual de Uso, Operação e Manutenção do imóvel).",
    "As comunicações com a Construtora referentes a assistência técnica deverão ser feitas por escrito, via pedido de Assistência Técnica. Dou, por este termo, plena quitação quanto à entrega da unidade.",
  ];
}

export function TermoView({ unidade, tipo, ncsRessalva, onVoltar }: { unidade: Unidade; tipo: Tipo; ncsRessalva: NaoConformidade[]; onVoltar: () => void }) {
  const [nome, setNome] = useState(unidade.cliente?.nome ?? "");
  const [cpf, setCpf] = useState(unidade.cliente?.cpf ?? "");
  const [assinatura, setAssinatura] = useState("");
  const [comRessalva, setComRessalva] = useState(ncsRessalva.length > 0);
  const [itens, setItens] = useState<{ item: string; qtd: number }[]>(
    tipo === "entrega_chaves"
      ? [
          { item: "Chaves de portas externas", qtd: 1 },
          { item: "Chaves de portas internas", qtd: 1 },
          { item: "Controle/portão da garagem", qtd: 1 },
          { item: "Manual do Proprietário", qtd: 1 },
        ]
      : [],
  );
  const obra = unidade.obra?.nome ?? "—";
  const titulo = tipo === "entrega_chaves" ? "Termo de Entrega das Chaves" : "Termo de Vistoria do Cliente";

  const paragrafos = tipo === "entrega_chaves" ? textoEntrega(nome, cpf, unidade.identificador, obra) : textoVistoria(nome, cpf, unidade.identificador, obra, comRessalva);

  const gerarPdf = (): Blob => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const M = 18;
    let y = 20;
    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(14, 33, 72);
    doc.text(titulo, M, y);
    y += 7;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
    doc.text(`Empreendimento: ${obra}`, M, y); y += 5;
    doc.text(`Unidade: ${unidade.identificador}`, M, y); y += 5;
    doc.text(`Cliente: ${nome || "—"}   CPF: ${cpf || "—"}`, M, y); y += 5;
    doc.text(`Data: ${HOJE()}`, M, y); y += 8;

    doc.setTextColor(20).setFontSize(10.5);
    for (const p of paragrafos) {
      const linhas = doc.splitTextToSize(p, 174);
      doc.text(linhas, M, y);
      y += linhas.length * 5 + 3;
    }

    if (tipo === "vistoria_cliente" && comRessalva && ncsRessalva.length) {
      doc.setFont("helvetica", "bold").text("Ressalvas (não-conformidades a corrigir):", M, y); y += 5;
      doc.setFont("helvetica", "normal");
      ncsRessalva.forEach((n, i) => { doc.text(`${i + 1}. ${n.titulo}${n.descricao ? " — " + n.descricao : ""} [${n.severidade}]`, M + 2, y); y += 5; });
      y += 2;
    }
    if (tipo === "entrega_chaves" && itens.length) {
      doc.setFont("helvetica", "bold").text("Itens entregues:", M, y); y += 5;
      doc.setFont("helvetica", "normal");
      itens.forEach((it) => { doc.text(`(${it.qtd}) ${it.item}`, M + 2, y); y += 5; });
      y += 2;
    }

    if (assinatura) {
      const sigY = Math.min(y + 6, 250);
      try { doc.addImage(assinatura, "PNG", M, sigY, 70, 28); } catch { /* ignore */ }
      doc.setDrawColor(120).line(M, sigY + 30, M + 80, sigY + 30);
      doc.setFontSize(9).setTextColor(80).text(nome || "Assinatura do cliente", M, sigY + 35);
    }
    return doc.output("blob");
  };

  const enviar = useMutation({
    mutationFn: async () => {
      const pdf = gerarPdf();
      const fd = new FormData();
      fd.append("file", pdf, `${tipo}.pdf`);
      fd.append("unidade_id", unidade.id);
      fd.append("unidade_label", unidade.identificador);
      if (unidade.cliente_id) fd.append("cliente_id", unidade.cliente_id);
      fd.append("cliente_nome", nome);
      fd.append("cliente_cpf", cpf);
      fd.append("tipo", tipo);
      if (tipo === "vistoria_cliente") fd.append("modalidade", comRessalva ? "aceite_com_ressalvas" : "aceite");
      fd.append("assinatura_img", assinatura);
      fd.append("assinado_em", new Date().toISOString());
      fd.append("conteudo", JSON.stringify({ titulo, paragrafos, itens, ressalvas: comRessalva ? ncsRessalva.map((n) => n.titulo) : [] }));
      return api.postForm("/api/termos", fd);
    },
    onSuccess: onVoltar,
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <button onClick={onVoltar} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> Voltar ao pipeline
      </button>
      <h1 className="text-lg font-bold text-brand-900 dark:text-slate-100">{titulo}</h1>
      <p className="mb-4 text-sm text-slate-500">{unidade.identificador} · {obra}</p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Nome do cliente</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">CPF</span>
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800" />
        </label>
      </div>

      {tipo === "vistoria_cliente" && (
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={comRessalva} onChange={(e) => setComRessalva(e.target.checked)} />
          Aceite <strong>com ressalvas</strong> {ncsRessalva.length > 0 && `(${ncsRessalva.length} NC em aberto serão listadas)`}
        </label>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {paragrafos.map((p, i) => (
          <p key={i} className="mb-2">{p}</p>
        ))}
        {tipo === "vistoria_cliente" && comRessalva && ncsRessalva.length > 0 && (
          <ul className="ml-4 list-disc text-slate-500">
            {ncsRessalva.map((n) => (
              <li key={n.id}>{n.titulo} [{n.severidade}]</li>
            ))}
          </ul>
        )}
      </div>

      {tipo === "entrega_chaves" && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-brand-900 dark:text-slate-100">Itens entregues</h3>
          <div className="space-y-1.5">
            {itens.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="number" min={0} value={it.qtd} onChange={(e) => setItens((a) => a.map((x, j) => (j === i ? { ...x, qtd: Number(e.target.value) } : x)))} className="w-16 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" />
                <input value={it.item} onChange={(e) => setItens((a) => a.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" />
                <button onClick={() => setItens((a) => a.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => setItens((a) => [...a, { item: "", qtd: 1 }])} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
              <Plus className="size-3.5" /> Adicionar item
            </button>
          </div>
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold text-brand-900 dark:text-slate-100">Assinatura do cliente</h3>
      <AssinaturaCanvas onChange={setAssinatura} />

      <div className="mt-4 flex items-center justify-end gap-3">
        {enviar.isError && <span className="text-sm text-red-600">{(enviar.error as Error).message}</span>}
        <button
          onClick={() => enviar.mutate()}
          disabled={!nome || !assinatura || enviar.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {enviar.isPending ? "Gerando e arquivando…" : "Confirmar assinatura e arquivar"}
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { useColaboradores, useEpis, useCreateEntrega, type FichaDetalhe } from "../hooks/useEpi";
import { FingerprintCapture } from "./FingerprintCapture";
import type { CaptureResult } from "../lib/fingerprint";

// Troca do EPI a partir da própria ficha: registra uma entrega com motivo 'troca'
// (que baixa esta ficha e abre a nova), assinada pela digital do colaborador.
export function TrocaModal({ ficha, onClose, onTrocado }: {
  ficha: FichaDetalhe;
  onClose: () => void;
  onTrocado: (novaFichaId: number) => void;
}) {
  const { data: colaboradores = [] } = useColaboradores();
  const { data: epis = [] } = useEpis();
  const criar = useCreateEntrega();
  const [observacao, setObservacao] = useState("");
  const [assinatura, setAssinatura] = useState<CaptureResult | null>(null);

  // Prefere dados atuais do Core (validade pode ter mudado); cai no snapshot da ficha.
  const colab = colaboradores.find((c) => c.id === ficha.colaborador_id);
  const epi = epis.find((e) => e.id === ficha.epi_id);

  const podeSalvar = !!assinatura && !criar.isPending;

  async function salvar() {
    if (!assinatura) return;
    const nova = await criar.mutateAsync({
      colaborador_id: ficha.colaborador_id ?? "",
      colaborador_nome: ficha.colaborador_nome,
      colaborador_matricula: colab?.matricula ?? null,
      colaborador_cargo: ficha.colaborador_cargo ?? colab?.cargo?.nome ?? null,
      empresa_nome: ficha.empresa_nome ?? colab?.empresa?.razao_social ?? null,
      epi_id: ficha.epi_id ?? "",
      epi_nome: epi?.nome ?? ficha.epi_nome,
      epi_ca: epi?.ca ?? ficha.epi_ca,
      quantidade: 1,
      motivo: "troca",
      tipo_controle: epi?.tipo_controle ?? ficha.tipo_controle,
      validade_dias: epi?.validade_dias ?? ficha.validade_dias,
      alerta_dias: epi?.alerta_dias ?? ficha.alerta_dias,
      assinatura_img: assinatura.dataUrl,
      assinatura_tipo: assinatura.tipo,
      observacao: observacao || "Troca registrada a partir da ficha.",
    });
    if (nova.ficha_id) onTrocado(nova.ficha_id);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg my-8 rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-slate-900">Trocar EPI</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            A ficha atual será <strong>baixada por troca</strong> e uma nova ficha será aberta para o mesmo EPI.
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Colaborador</p>
              <p className="text-slate-800 font-medium">{ficha.colaborador_nome}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">EPI</p>
              <p className="text-slate-800 font-medium">{epi?.nome ?? ficha.epi_nome}{(epi?.ca ?? ficha.epi_ca) ? ` · C.A. ${epi?.ca ?? ficha.epi_ca}` : ""}</p>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Motivo / observação (opcional)</span>
            <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: troca por desgaste"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </label>

          <FingerprintCapture
            value={assinatura}
            onChange={setAssinatura}
            disabledHint=""
          />

          {criar.isError && <p className="text-sm text-rose-600">{(criar.error as Error).message}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={salvar} disabled={!podeSalvar}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40">
            {criar.isPending ? "Registrando troca…" : "Confirmar troca"}
          </button>
        </div>
      </div>
    </div>
  );
}

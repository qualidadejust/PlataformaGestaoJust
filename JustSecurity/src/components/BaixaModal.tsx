import { useState } from "react";
import { X, ArrowDownCircle } from "lucide-react";
import { useBaixarFicha, type FichaDetalhe } from "../hooks/useEpi";

// Motivos de baixa manual (troca = via entrega; inspecao = via inspeção).
const MOTIVOS = [
  { value: "desgaste", label: "Desgaste / fim de vida útil" },
  { value: "vencimento", label: "Vencimento" },
  { value: "desligamento", label: "Desligamento do colaborador" },
  { value: "perda", label: "Perda / extravio" },
];

export function BaixaModal({ ficha, onClose }: { ficha: FichaDetalhe; onClose: () => void }) {
  const baixar = useBaixarFicha(ficha.id);
  const [motivo, setMotivo] = useState("desgaste");
  const [observacao, setObservacao] = useState("");

  async function salvar() {
    await baixar.mutateAsync({ motivo, observacao: observacao || undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-slate-900">Baixar ficha de EPI</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-500">
            {ficha.epi_nome}{ficha.epi_ca ? ` · C.A. ${ficha.epi_ca}` : ""} — {ficha.colaborador_nome}
          </p>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Motivo da baixa</span>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              {MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Observação (opcional)</span>
            <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </label>

          {baixar.isError && <p className="text-sm text-rose-600">{(baixar.error as Error).message}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={salvar} disabled={baixar.isPending}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
            {baixar.isPending ? "Baixando…" : "Confirmar baixa"}
          </button>
        </div>
      </div>
    </div>
  );
}

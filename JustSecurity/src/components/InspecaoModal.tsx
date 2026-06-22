import { useState } from "react";
import { X, ClipboardCheck } from "lucide-react";
import { useCreateInspecao, useColaboradores, type FichaDetalhe } from "../hooks/useEpi";
import { FingerprintCapture } from "./FingerprintCapture";
import type { CaptureResult } from "../lib/fingerprint";

const OPCOES: { value: string; label: string; hint: string }[] = [
  { value: "aprovado", label: "Aprovado", hint: "Próxima inspeção na data normal do EPI." },
  { value: "aprovado_ressalva", label: "Aprovado com ressalva", hint: "Encurta o prazo até a próxima inspeção." },
  { value: "trocar", label: "Indicar troca", hint: "EPI marcado para troca imediata (aguarda nova entrega)." },
  { value: "baixar", label: "Solicitar baixa", hint: "Baixa a ficha (EPI reprovado / fora de uso)." },
];

function addDaysInput(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InspecaoModal({ ficha, onClose }: { ficha: FichaDetalhe; onClose: () => void }) {
  const criar = useCreateInspecao(ficha.id);
  const { data: colaboradores = [] } = useColaboradores();
  const [resultado, setResultado] = useState("aprovado");
  const validade = ficha.validade_dias ?? 180;
  const [proxima, setProxima] = useState(addDaysInput(validade));
  const [inspetorId, setInspetorId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [assinatura, setAssinatura] = useState<CaptureResult | null>(null);

  const precisaData = resultado === "aprovado" || resultado === "aprovado_ressalva";
  const podeSalvar = !!inspetorId && !!assinatura && !criar.isPending;

  async function salvar() {
    if (!podeSalvar || !assinatura) return;
    const inspetor = colaboradores.find((c) => c.id === inspetorId);
    await criar.mutateAsync({
      resultado,
      proxima_inspecao_em: precisaData ? new Date(proxima + "T12:00:00").toISOString() : null,
      inspetor: inspetor?.nome,
      inspetor_id: inspetorId,
      assinatura_img: assinatura.dataUrl,
      assinatura_tipo: assinatura.tipo,
      observacao: observacao || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg my-8 rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-brand-700" />
            <h2 className="font-bold text-slate-900">Inspecionar EPI</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-500">
            {ficha.epi_nome}{ficha.epi_ca ? ` · C.A. ${ficha.epi_ca}` : ""} — {ficha.colaborador_nome}
          </p>

          <div className="space-y-2">
            {OPCOES.map((o) => (
              <label key={o.value} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/50">
                <input type="radio" name="resultado" value={o.value} checked={resultado === o.value}
                  onChange={(e) => setResultado(e.target.value)} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium text-slate-800">{o.label}</span>
                  <span className="block text-xs text-slate-500">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {precisaData && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Próxima inspeção</span>
              <input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </label>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Inspetor</span>
              <select value={inspetorId} onChange={(e) => setInspetorId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Selecione…</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` (${c.cargo.nome})` : ""}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Observação (opcional)</span>
              <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: desgaste leve na costura"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </label>
          </div>

          <FingerprintCapture
            value={assinatura}
            onChange={setAssinatura}
            disabled={!inspetorId}
            disabledHint="Selecione o inspetor antes de validar a digital."
          />

          {criar.isError && <p className="text-sm text-rose-600">{(criar.error as Error).message}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={salvar} disabled={!podeSalvar}
            className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40">
            {criar.isPending ? "Registrando…" : "Registrar inspeção"}
          </button>
        </div>
      </div>
    </div>
  );
}

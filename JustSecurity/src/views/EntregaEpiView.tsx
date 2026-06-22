import { useState } from "react";
import { HardHat, Send, CheckCircle2, RefreshCw, ShieldAlert, Fingerprint } from "lucide-react";
import { useColaboradores, useEpis, useCreateEntrega, TIPO_CONTROLE_LABEL, biometriaSelo, type MotivoEntrega } from "../hooks/useEpi";
import { FingerprintCapture } from "../components/FingerprintCapture";
import type { CaptureResult } from "../lib/fingerprint";

const MOTIVOS: { value: MotivoEntrega; label: string; hint: string }[] = [
  { value: "inicial", label: "Entrega inicial", hint: "Primeira entrega deste EPI ao colaborador." },
  { value: "complementar", label: "Entrega complementar", hint: "EPI adicional, sem substituir um anterior." },
  { value: "troca", label: "Troca", hint: "Substitui o EPI atual — a ficha anterior é baixada automaticamente." },
];

export function EntregaEpiView() {
  const { data: colaboradores = [] } = useColaboradores();
  const { data: epis = [] } = useEpis();
  const criar = useCreateEntrega();

  const [colaboradorId, setColaboradorId] = useState("");
  const [epiId, setEpiId] = useState("");
  const [motivo, setMotivo] = useState<MotivoEntrega>("inicial");
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [assinatura, setAssinatura] = useState<CaptureResult | null>(null);
  const [ok, setOk] = useState(false);

  const epiSel = epis.find((e) => e.id === epiId);
  const podeSalvar = colaboradorId && epiId && assinatura && !criar.isPending;

  function limpar() {
    setColaboradorId("");
    setEpiId("");
    setMotivo("inicial");
    setQuantidade(1);
    setObservacao("");
    setAssinatura(null);
  }

  async function salvar() {
    if (!podeSalvar || !assinatura) return;
    const colab = colaboradores.find((c) => c.id === colaboradorId);
    const epi = epis.find((e) => e.id === epiId);
    if (!colab || !epi) return;
    await criar.mutateAsync({
      // snapshot do Core no momento da entrega (mantém o termo fiel ao que era verdade)
      colaborador_id: colab.id,
      colaborador_nome: colab.nome,
      colaborador_matricula: colab.matricula,
      colaborador_cargo: colab.cargo?.nome ?? null,
      empresa_nome: colab.empresa?.razao_social ?? null,
      epi_id: epi.id,
      epi_nome: epi.nome,
      epi_ca: epi.ca,
      quantidade,
      motivo,
      tipo_controle: epi.tipo_controle,
      validade_dias: epi.validade_dias,
      alerta_dias: epi.alerta_dias,
      assinatura_img: assinatura.dataUrl,
      assinatura_tipo: assinatura.tipo,
      observacao: observacao || undefined,
    });
    setOk(true);
    limpar();
    setTimeout(() => setOk(false), 3500);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-lg bg-brand-900 flex items-center justify-center">
          <HardHat className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Entrega de EPI</h1>
          <p className="text-sm text-slate-500">Registre a entrega e colha a assinatura por digital do colaborador.</p>
        </div>
      </div>

      {ok && (
        <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Entrega registrada e assinada com sucesso.
          </div>
          {criar.data && (() => {
            const selo = biometriaSelo(criar.data);
            return (
              <div className="flex items-center gap-1.5 pl-7 text-xs">
                <Fingerprint className="w-3.5 h-3.5" />
                {selo.estado === "confirmada" ? (
                  <span className="text-emerald-700 font-medium">
                    Identidade confirmada por biometria (score {selo.score?.toFixed(0)})
                  </span>
                ) : selo.estado === "nao_cadastrado" ? (
                  <span className="text-amber-700">
                    Colaborador sem cadastro biométrico — assinatura não conferida na base.
                  </span>
                ) : (
                  <span className="text-amber-700">Verificação biométrica indisponível neste registro.</span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Colaborador</span>
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Selecione…</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.matricula ? `· ${c.matricula}` : ""} {c.cargo ? `(${c.cargo.nome})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">EPI</span>
            <select
              value={epiId}
              onChange={(e) => setEpiId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Selecione…</option>
              {epis.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} {e.ca ? `· ${e.ca}` : ""}
                </option>
              ))}
            </select>
            {epiSel && (
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                {TIPO_CONTROLE_LABEL[epiSel.tipo_controle] ?? epiSel.tipo_controle}
                {epiSel.validade_dias ? ` · ${epiSel.validade_dias} dias` : ""}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Motivo</span>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoEntrega)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <span className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
              {motivo === "troca" && <RefreshCw className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
              {MOTIVOS.find((m) => m.value === motivo)?.hint}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Quantidade</span>
            <input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Observação (opcional)</span>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: troca por desgaste"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>
        </div>

        <FingerprintCapture
          value={assinatura}
          onChange={setAssinatura}
          disabled={!colaboradorId || !epiId}
          disabledHint="Selecione o colaborador e o EPI antes de assinar."
        />

        {criar.isError && (
          <p className="text-sm text-rose-600">{(criar.error as Error).message}</p>
        )}

        <div className="flex justify-end">
          <button
            onClick={salvar}
            disabled={!podeSalvar}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {criar.isPending ? "Salvando…" : "Registrar entrega"}
          </button>
        </div>
      </div>
    </div>
  );
}

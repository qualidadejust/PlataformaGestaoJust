import { useEffect, useRef, useState } from "react";
import { Fingerprint, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { createRealReader, gerarSimulado, type CaptureResult, type ReaderHandle } from "../lib/fingerprint";
import { cn } from "../lib/utils";

type Estado = "ocioso" | "conectando" | "aguardando" | "capturado" | "indisponivel";

interface Props {
  value: CaptureResult | null;
  onChange: (r: CaptureResult | null) => void;
  /** Bloqueia a assinatura até os pré-requisitos serem atendidos (ex.: colaborador + EPI). */
  disabled?: boolean;
  disabledHint?: string;
}

export function FingerprintCapture({ value, onChange, disabled, disabledHint }: Props) {
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [status, setStatus] = useState("");
  const readerRef = useRef<ReaderHandle | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function limparTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  async function pararLeitor() {
    limparTimeout();
    await readerRef.current?.stop();
    readerRef.current = null;
  }

  function indisponivel(msg: string) {
    setEstado("indisponivel");
    setStatus(msg);
  }

  async function assinar() {
    onChange(null);
    setEstado("conectando");
    setStatus("Conectando ao leitor…");
    try {
      const reader = await createRealReader({
        onStatus: (m) => setStatus(m),
        onError: (m) => setStatus(m),
        onUnavailable: (m) => {
          pararLeitor();
          indisponivel(m);
        },
        onAlive: () => limparTimeout(),
        onSample: (r) => {
          pararLeitor();
          onChange(r);
          setEstado("capturado");
          setStatus("Digital capturada com sucesso.");
        },
      });
      readerRef.current = reader;
      await reader.start();
      setEstado("aguardando");
      setStatus("Encoste o dedo no leitor…");
      // Sem sinal de vida do agente em ~4s → indisponível.
      timeoutRef.current = setTimeout(() => {
        pararLeitor();
        indisponivel("Leitor não respondeu (agente DigitalPersona não detectado).");
      }, 4000);
    } catch (err) {
      console.error("[FingerprintCapture] falha ao iniciar leitor:", err);
      indisponivel("Leitor não detectado (agente DigitalPersona não instalado/parado).");
    }
  }

  async function cancelar() {
    await pararLeitor();
    setEstado("ocioso");
    setStatus("");
  }

  function simular() {
    onChange(gerarSimulado());
    setEstado("capturado");
    setStatus("Captura simulada gerada (modo de teste).");
  }

  // Garante que o leitor é liberado se o componente sair da tela.
  useEffect(() => {
    return () => {
      pararLeitor();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ocupado = estado === "conectando" || estado === "aguardando";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
        <Fingerprint className="w-5 h-5 text-brand-700" />
        Assinatura por digital
      </h3>

      <div className="flex items-center gap-5">
        <div
          className={cn(
            "w-32 h-40 rounded-lg border-2 flex items-center justify-center overflow-hidden shrink-0",
            value ? "border-emerald-400 bg-emerald-50" : "border-dashed border-slate-300 bg-slate-50"
          )}
        >
          {value ? (
            <img src={value.dataUrl} alt="Digital capturada" className="w-full h-full object-contain" />
          ) : ocupado ? (
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          ) : (
            <Fingerprint className="w-12 h-12 text-slate-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Status */}
          {status && (
            <div
              className={cn(
                "text-sm flex items-center gap-2 mb-3",
                estado === "capturado" && "text-emerald-700",
                estado === "indisponivel" && "text-amber-700",
                ocupado && "text-slate-600"
              )}
            >
              {estado === "capturado" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {estado === "indisponivel" && <AlertTriangle className="w-4 h-4 shrink-0" />}
              {ocupado && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
              <span>{status}</span>
            </div>
          )}

          {value && (
            <p className="text-xs text-slate-500 mb-3">
              Tipo: <strong>{value.tipo === "digital" ? "Digital real (HID 4500)" : "Simulado (teste)"}</strong>
            </p>
          )}

          {/* Ações por estado */}
          {(estado === "ocioso" || estado === "capturado") && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={assinar}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Fingerprint className="w-4 h-4" />
                {value ? "Refazer assinatura" : "Assinar com digital"}
              </button>
              {disabled && disabledHint && !value && (
                <span className="text-xs text-slate-500">{disabledHint}</span>
              )}
            </div>
          )}

          {ocupado && (
            <button
              type="button"
              onClick={cancelar}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          )}

          {estado === "indisponivel" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={assinar}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  <Fingerprint className="w-4 h-4" /> Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={simular}
                  className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Simular captura (teste)
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Verifique se o leitor está conectado e o agente DigitalPersona está em execução.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

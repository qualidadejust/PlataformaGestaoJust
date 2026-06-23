import { useEffect, useRef, useState } from "react";
import { Fingerprint, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { createRealReader, gerarSimulado, type CaptureResult, type ReaderHandle } from "../lib/fingerprint";
import { cn } from "../lib/cn";

// Reaproveitado do JustSecurity (assinatura de EPI por digital HID 4500). A imagem da
// digital capturada vira o `assinatura_img` e também o probe da verificação 1:1.
type Estado = "ocioso" | "conectando" | "aguardando" | "capturado" | "indisponivel";

interface Props {
  value: CaptureResult | null;
  onChange: (r: CaptureResult | null) => void;
  disabled?: boolean;
}

export function FingerprintCapture({ value, onChange, disabled }: Props) {
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

  useEffect(() => {
    return () => {
      pararLeitor();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ocupado = estado === "conectando" || estado === "aguardando";

  return (
    <div className="flex items-center gap-5">
      <div
        className={cn(
          "flex h-40 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2",
          value ? "border-emerald-400 bg-emerald-50" : "border-dashed border-slate-300 bg-slate-50 dark:bg-slate-800/40",
        )}
      >
        {value ? (
          <img src={value.dataUrl} alt="Digital capturada" className="h-full w-full object-contain" />
        ) : ocupado ? (
          <Loader2 className="size-8 animate-spin text-teal-400" />
        ) : (
          <Fingerprint className="size-12 text-slate-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {status && (
          <div
            className={cn(
              "mb-3 flex items-center gap-2 text-sm",
              estado === "capturado" && "text-emerald-700",
              estado === "indisponivel" && "text-amber-700",
              ocupado && "text-slate-600",
            )}
          >
            {estado === "capturado" && <CheckCircle2 className="size-4 shrink-0" />}
            {estado === "indisponivel" && <AlertTriangle className="size-4 shrink-0" />}
            {ocupado && <Loader2 className="size-4 shrink-0 animate-spin" />}
            <span>{status}</span>
          </div>
        )}
        {value && (
          <p className="mb-3 text-xs text-slate-500">
            Tipo: <strong>{value.tipo === "digital" ? "Digital real (HID 4500)" : "Simulado (teste)"}</strong>
          </p>
        )}

        {(estado === "ocioso" || estado === "capturado") && (
          <button
            type="button"
            onClick={assinar}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f2742] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173456] disabled:opacity-40"
          >
            <Fingerprint className="size-4" />
            {value ? "Refazer captura" : "Capturar digital"}
          </button>
        )}
        {ocupado && (
          <button
            type="button"
            onClick={cancelar}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <X className="size-4" /> Cancelar
          </button>
        )}
        {estado === "indisponivel" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={assinar}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f2742] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173456]"
              >
                <Fingerprint className="size-4" /> Tentar novamente
              </button>
              <button
                type="button"
                onClick={simular}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Simular captura (teste)
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Verifique se o leitor está conectado e o agente DigitalPersona está em execução.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

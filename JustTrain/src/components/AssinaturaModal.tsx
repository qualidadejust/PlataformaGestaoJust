import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, PenLine, Fingerprint, ShieldCheck } from "lucide-react";
import { api, cn } from "../lib/cn";
import { SignaturePad } from "./SignaturePad";
import { FingerprintCapture } from "./FingerprintCapture";
import type { CaptureResult } from "../lib/fingerprint";

interface Participante {
  id: string;
  colaborador_nome: string;
  colaborador_id?: string | null;
}
interface Props {
  participante: Participante;
  onClose: () => void;
  onDone: () => void;
}

type Metodo = "tela" | "digital";

export function AssinaturaModal({ participante, onClose, onDone }: Props) {
  const [metodo, setMetodo] = useState<Metodo>("tela");
  const [manuscrita, setManuscrita] = useState<string | null>(null);
  const [digital, setDigital] = useState<CaptureResult | null>(null);

  const assinar = useMutation({
    mutationFn: () => {
      const img = metodo === "tela" ? manuscrita : digital?.dataUrl;
      const tipo = metodo === "tela" ? "manuscrita" : (digital?.tipo ?? "digital");
      if (!img) throw new Error("Capture a assinatura antes de confirmar.");
      return api(`/participacoes/${participante.id}/assinar`, {
        method: "POST",
        body: JSON.stringify({ assinatura_img: img, assinatura_tipo: tipo }),
      });
    },
    onSuccess: onDone,
  });

  const semDigitalCadastrada = metodo === "digital" && !participante.colaborador_id;
  const pronto = metodo === "tela" ? !!manuscrita : !!digital;

  const aba = (m: Metodo, label: string, Icon: typeof PenLine) => (
    <button
      onClick={() => setMetodo(m)}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
        metodo === m ? "bg-[#0f2742] text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f2742] dark:text-teal-300">Assinar presença</h2>
            <p className="text-sm text-slate-500">{participante.colaborador_nome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {aba("tela", "Assinar na tela", PenLine)}
          {aba("digital", "Leitor de digital", Fingerprint)}
        </div>

        {metodo === "tela" ? (
          <SignaturePad onChange={setManuscrita} />
        ) : (
          <>
            <FingerprintCapture value={digital} onChange={setDigital} />
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              {participante.colaborador_id
                ? "A digital é conferida 1:1 com o cadastro do colaborador no Core."
                : "Colaborador sem ID do Core — não há cadastro para conferir a digital."}
            </p>
          </>
        )}

        {assinar.isError && <p className="mt-3 text-sm text-red-600">{(assinar.error as Error).message}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 dark:border-slate-700">
            Cancelar
          </button>
          <button
            onClick={() => assinar.mutate()}
            disabled={!pronto || assinar.isPending || semDigitalCadastrada}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
          >
            {assinar.isPending ? "Confirmando…" : "Confirmar presença"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * Captura de assinatura em tela (canvas HTML5, sem dependência externa). Funciona com
 * mouse e toque (pointer events). `onChange` recebe o PNG dataURL (ou "" quando limpo).
 */
export function AssinaturaCanvas({ onChange, height = 200 }: { onChange: (dataUrl: string) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const cv = ref.current!;
    // resolução real para traço nítido
    const escala = window.devicePixelRatio || 1;
    cv.width = cv.clientWidth * escala;
    cv.height = height * escala;
    const ctx = cv.getContext("2d")!;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0e2148";
  }, [height]);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const inicio = (e: React.PointerEvent) => {
    desenhando.current = true;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const mover = (e: React.PointerEvent) => {
    if (!desenhando.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!temTraco) setTemTraco(true);
  };
  const fim = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  };

  const limpar = () => {
    const cv = ref.current!;
    cv.getContext("2d")!.clearRect(0, 0, cv.width, cv.height);
    setTemTraco(false);
    onChange("");
  };

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-100">
        {!temTraco && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-light text-slate-200 select-none">
            Assinatura
          </span>
        )}
        <canvas
          ref={ref}
          style={{ height, touchAction: "none" }}
          className="w-full"
          onPointerDown={inicio}
          onPointerMove={mover}
          onPointerUp={fim}
          onPointerLeave={fim}
        />
      </div>
      <button onClick={limpar} type="button" className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 hover:text-red-500">
        <Eraser className="size-3.5" /> Limpar assinatura
      </button>
    </div>
  );
}

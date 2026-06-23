import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

// Assinatura manuscrita "na tela": desenha num <canvas> (mouse ou toque) e devolve o PNG
// em base64 (mesmo formato que a imagem da digital — vai pro campo assinatura_img).
interface Props {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function SignaturePad({ onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f2742";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const inicio = (e: React.PointerEvent) => {
    if (disabled) return;
    desenhando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const mover = (e: React.PointerEvent) => {
    if (!desenhando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!temTraco) setTemTraco(true);
  };
  const fim = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    if (temTraco) onChange(canvasRef.current!.toDataURL("image/png"));
  };

  const limpar = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setTemTraco(false);
    onChange(null);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
        <canvas
          ref={canvasRef}
          width={520}
          height={180}
          onPointerDown={inicio}
          onPointerMove={mover}
          onPointerUp={fim}
          onPointerLeave={fim}
          className="h-44 w-full touch-none"
          style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <PenLine className="size-3.5" /> Assine no quadro acima
        </span>
        <button onClick={limpar} type="button" className="flex items-center gap-1 hover:text-red-600">
          <Eraser className="size-3.5" /> limpar
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { cn } from "../lib/utils";

type Props = { variant?: "dark" | "white"; className?: string };

/**
 * Logo oficial da JUST Construtora.
 * Coloque os arquivos oficiais em `public/logos/`:
 *   public/logos/logo-just.png        (marinho — fundos claros)
 *   public/logos/logo-just-white.png  (branco — Sidebar / fundos escuros)
 * Enquanto os arquivos não estiverem presentes, cai num wordmark de texto on-brand.
 */
export function Logo({ variant = "dark", className }: Props) {
  const [failed, setFailed] = useState(false);
  const src = variant === "white" ? "/logos/logo-just-white.png" : "/logos/logo-just.png";

  if (failed) {
    const main = variant === "white" ? "text-white" : "text-brand-900";
    const sub = variant === "white" ? "text-slate-300" : "text-slate-500";
    return (
      <div className={cn("flex flex-col leading-none", className)} aria-label="JUST Construtora">
        <span className={cn("text-2xl font-black tracking-tight", main)}>JUST</span>
        <span className={cn("text-[9px] font-semibold tracking-[0.35em]", sub)}>CONSTRUTORA</span>
      </div>
    );
  }

  return (
    <img src={src} alt="JUST Construtora" onError={() => setFailed(true)} className={cn("w-auto object-contain", className)} />
  );
}

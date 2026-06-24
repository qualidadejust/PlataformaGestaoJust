import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Anexo } from "./types";
import { fetchBlobUrl } from "./api-base";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** data URL base64 → Blob. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Abre anexo em nova aba. Navegadores bloqueiam navegação top-level para
 * `data:` URL (abre aba em branco) — converte para `blob:` antes. URLs remotas
 * abrem direto. Retorna false se o popup foi bloqueado (chamador mostra modal).
 */
export function openAnexo(anexo: Anexo | null | undefined): boolean {
  if (!anexo?.dataUrl) return false;
  // Anexo base64 (legado/upload em memória): abre direto via blob.
  if (anexo.dataUrl.startsWith("data:")) {
    const url = URL.createObjectURL(dataUrlToBlob(anexo.dataUrl));
    const w = window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return !!w;
  }
  // Anexo no GED do Core (download mediado + sensível): navegação direta não manda o token,
  // então abrimos a aba e injetamos o blob autenticado quando ele chega.
  const w = window.open("", "_blank");
  fetchBlobUrl(anexo.dataUrl).then((blob) => {
    if (blob && w) {
      w.location.href = blob;
      setTimeout(() => URL.revokeObjectURL(blob), 60_000);
    } else if (w) {
      w.document.body.style.cssText = "font-family:sans-serif;padding:2rem;color:#334155";
      w.document.body.innerText = "Não foi possível carregar o anexo (sem permissão ou indisponível).";
    }
  });
  return !!w;
}

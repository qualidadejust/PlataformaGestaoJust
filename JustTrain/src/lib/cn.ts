import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API do próprio JustTrain (proxy /api → 4600).
export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch("/api" + path, {
    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
    ...opts,
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as any).error ?? r.statusText);
  }
  return r.status === 204 ? (null as T) : ((await r.json()) as T);
}

// API do Core (cadastros-mestre + GED), via proxy /core → 4100.
export async function core<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const isForm = opts?.body instanceof FormData;
  const r = await fetch("/core/api" + path, {
    headers: opts?.body && !isForm ? { "Content-Type": "application/json" } : undefined,
    ...opts,
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as any).error ?? r.statusText);
  }
  return r.status === 204 ? (null as T) : ((await r.json()) as T);
}

export const SETORES: Record<string, string> = {
  sst: "Saúde e Segurança do Trabalho",
  rh: "Recursos Humanos",
  qualidade: "Qualidade",
  engenharia: "Engenharia",
  projetos: "Projetos",
  suprimentos: "Suprimentos",
  ambiental: "Meio Ambiente",
};

export const TIPOS: Record<string, string> = {
  nr: "Norma Regulamentadora",
  integracao: "Integração",
  qualidade: "Qualidade",
  sistema: "Sistema",
  procedimento: "Procedimento",
  it: "Instrução de Trabalho",
};

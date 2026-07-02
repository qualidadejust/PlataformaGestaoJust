// Derivação de status de qualidade de uma tarefa (compartilhado entre Gestão, Cobertura e Dashboard).
import type { FormularioInstancia } from "./types.ts";

export type QualidadeStatus =
  | "a_abrir"
  | "rascunho"
  | "conforme"
  | "pendencia_nc"
  | "bloqueada"
  | "sem_modelo";

export interface StatusConfig {
  label: string;
  // cor para badge (fundo+texto)
  badge: string;
  // cor sólida para célula da matriz / gráfico
  solida: string;
  // cor hex para SVG (donut)
  hex: string;
}

export const STATUS: Record<QualidadeStatus, StatusConfig> = {
  a_abrir:      { label: "A abrir",     badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",   solida: "bg-slate-300 dark:bg-slate-600",   hex: "#cbd5e1" },
  rascunho:     { label: "Rascunho",    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",   solida: "bg-amber-400",                     hex: "#fbbf24" },
  conforme:     { label: "Conforme",    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",   solida: "bg-green-500",                     hex: "#22c55e" },
  pendencia_nc: { label: "NC pendente", badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",           solida: "bg-red-500",                       hex: "#ef4444" },
  bloqueada:    { label: "Bloqueada",   badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", solida: "bg-purple-500",                  hex: "#a855f7" },
  sem_modelo:   { label: "Sem modelo",  badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300", solida: "bg-orange-400",                 hex: "#fb923c" },
};

// Ordem de "gravidade" para escolher o status representativo de uma célula com várias tarefas.
const GRAVIDADE: QualidadeStatus[] = ["pendencia_nc", "bloqueada", "a_abrir", "rascunho", "conforme", "sem_modelo"];

export function derivarStatus(instancias: FormularioInstancia[], bloqueada: boolean, temModelo = true): QualidadeStatus {
  if (!temModelo && instancias.length === 0) return "sem_modelo";
  if (instancias.length === 0) return bloqueada ? "bloqueada" : "a_abrir";
  const concluidas = instancias.filter((i) => !!i.preenchido_em);
  if (concluidas.length === 0) return "rascunho";
  if (concluidas.some((i) => i.total_nc > 0)) return "pendencia_nc";
  return "conforme";
}

// Dado um conjunto de status (várias tarefas na mesma célula serviço×local), escolhe o mais grave.
export function statusRepresentativo(lista: QualidadeStatus[]): QualidadeStatus | null {
  for (const g of GRAVIDADE) if (lista.includes(g)) return g;
  return lista[0] ?? null;
}

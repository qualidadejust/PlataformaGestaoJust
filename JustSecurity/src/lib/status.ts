// Metadados visuais dos status operacionais da ficha de EPI.
export interface StatusMeta {
  label: string;
  badge: string; // classes Tailwind do badge
  dot: string; // classe de cor do ponto
}

export const STATUS_META: Record<string, StatusMeta> = {
  em_dia: { label: "Em dia", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  vencimento_proximo: { label: "Vence em breve", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  inspecao_proxima: { label: "Inspeção próxima", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  inspecionar: { label: "Inspecionar", badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  troca_imediata: { label: "Troca imediata", badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  baixada: { label: "Baixada", badge: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
  consumida: { label: "Uso único", badge: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

export function statusMeta(codigo: string): StatusMeta {
  return STATUS_META[codigo] ?? { label: codigo, badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
}

export const MOTIVO_BAIXA_LABEL: Record<string, string> = {
  troca: "Troca",
  desgaste: "Desgaste",
  vencimento: "Vencimento",
  desligamento: "Desligamento",
  perda: "Perda / extravio",
  inspecao: "Reprovado em inspeção",
};

export const RESULTADO_INSPECAO_LABEL: Record<string, string> = {
  aprovado: "Aprovado",
  aprovado_ressalva: "Aprovado com ressalva",
  trocar: "Indicar troca",
  baixar: "Solicitar baixa",
};

export function fmtData(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function fmtDataHora(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

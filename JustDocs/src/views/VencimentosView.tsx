import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

interface Doc {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  tipo_codigo?: string;
  categoria: string;
  nome_original: string;
  valido_ate?: string;
  download_url: string;
}

const diasAte = (iso: string) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(iso + "T00:00:00");
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
};

export default function VencimentosView() {
  const docs = useQuery({ queryKey: ["docs", "vigentes-all"], queryFn: () => api<Doc[]>("/documentos?vigente=true") });
  const lista = (docs.data ?? [])
    .filter((d) => d.valido_ate)
    .map((d) => ({ ...d, dias: diasAte(d.valido_ate!) }))
    .sort((a, b) => a.dias - b.dias);

  const venc = lista.filter((d) => d.dias < 0).length;
  const breve = lista.filter((d) => d.dias >= 0 && d.dias <= 30).length;

  const badge = (dias: number) => {
    if (dias < 0)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertTriangle className="size-3" /> vencido há {Math.abs(dias)}d
        </span>
      );
    if (dias <= 30)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <Clock className="size-3" /> vence em {dias}d
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="size-3" /> {dias}d
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap gap-3">
        <div className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
          <div className="text-2xl font-bold text-red-600">{venc}</div>
          <div className="text-xs text-slate-500">vencidos</div>
        </div>
        <div className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
          <div className="text-2xl font-bold text-amber-600">{breve}</div>
          <div className="text-xs text-slate-500">vencem em ≤ 30 dias</div>
        </div>
        <div className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{lista.length}</div>
          <div className="text-xs text-slate-500">com validade</div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">Documentos com validade</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2">Validade</th>
              <th className="px-2 py-2">Situação</th>
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Entidade</th>
              <th className="px-2 py-2">Arquivo</th>
              <th className="px-2 py-2 text-right">Abrir</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id} className={cn("border-t border-slate-100 dark:border-slate-800", d.dias < 0 && "bg-red-50/50 dark:bg-red-950/20")}>
                <td className="px-2 py-1.5">{d.valido_ate}</td>
                <td className="px-2 py-1.5">{badge(d.dias)}</td>
                <td className="px-2 py-1.5">{d.tipo_codigo ?? d.categoria}</td>
                <td className="px-2 py-1.5 text-slate-500">
                  {d.entidade_tipo}: <span className="text-xs">{d.entidade_id.slice(0, 8)}</span>
                </td>
                <td className="max-w-xs truncate px-2 py-1.5">{d.nome_original}</td>
                <td className="px-2 py-1.5 text-right">
                  <a href={d.download_url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">
                    abrir
                  </a>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-xs text-slate-400">
                  nenhum documento com data de validade cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

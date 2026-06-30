import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import type { Obra, FormularioInstancia } from "../lib/types.ts";

function fmtData(raw: string | null) {
  if (!raw) return "—";
  return new Date(raw).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ preenchido, nc }: { preenchido: boolean; nc: number }) {
  if (!preenchido) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        <Clock className="size-3" /> Rascunho
      </span>
    );
  }
  if (nc > 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
        <XCircle className="size-3" /> {nc} NC{nc !== 1 ? "s" : ""}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
      <CheckCircle2 className="size-3" /> Conforme
    </span>
  );
}

export default function FvsListaView() {
  const { data: obras } = useQuery<Obra[]>({ queryKey: ["obras"], queryFn: () => api("/obras") });
  const [obraId, setObraId] = useState("");

  // Carrega todas as FVS do escopo fvs, entidade tarefa
  const { data: instancias, isLoading } = useQuery<FormularioInstancia[]>({
    queryKey: ["fvs-instancias", obraId],
    queryFn: async () => {
      const todas = await api<FormularioInstancia[]>("/formularios/instancias?escopo=fvs&entidade_tipo=tarefa");
      // Filtra por obra: entidade_label contém a obra (formato definido no NovoFvsView)
      // Se não há filtro de obra, retorna tudo
      if (!obraId) return todas;
      return todas.filter((i) => i.entidade_label?.startsWith(`obra:${obraId}`));
    },
    enabled: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="size-5 text-teal-600 dark:text-teal-400" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Fichas FVS emitidas</h2>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtrar por obra</label>
        <select
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Todas as obras</option>
          {obras?.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Carregando fichas…
        </div>
      )}

      {instancias && instancias.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <ClipboardCheck className="mx-auto mb-2 size-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400">Nenhuma FVS emitida ainda.</p>
          <p className="mt-1 text-xs text-slate-400">Abra o Cronograma e clique em "FVS" em uma tarefa para iniciar.</p>
        </div>
      )}

      {instancias && instancias.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-left">Modelo</th>
                <th className="px-4 py-2.5 text-left">Tarefa</th>
                <th className="px-4 py-2.5 text-left">Autor</th>
                <th className="px-4 py-2.5 text-left">Preenchida em</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {instancias.map((i) => {
                const label = i.entidade_label?.replace(/^obra:[^|]+\|/, "") ?? "—";
                return (
                  <tr key={i.id} className={cn("bg-white dark:bg-slate-900", "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                    <td className="px-4 py-2.5 font-medium">{i.modelo_codigo}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-slate-500">{label}</td>
                    <td className="px-4 py-2.5 text-slate-500">{i.autor_nome ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtData(i.preenchido_em)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge preenchido={!!i.preenchido_em} nc={i.total_nc} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

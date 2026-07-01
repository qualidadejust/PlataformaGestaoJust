import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListChecks, AlertTriangle, Users, Filter } from "lucide-react";
import { api, DISCIPLINAS, SEVERIDADE_LABEL, NC_STATUS_LABEL, type NaoConformidade } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

type Aba = "pendencias" | "criticas";

const SEV_COR: Record<NaoConformidade["severidade"], string> = {
  baixa: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  alta: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  critica: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};
const ORIGEM_LABEL: Record<string, string> = {
  construcao: "Construção",
  inspecao_final: "Inspeção Final",
  vistoria_cliente: "Vistoria",
  manual: "Manual",
};

/** Lista de gestão das pendências/NCs abertas em todas as unidades, categorizada por
 *  disciplina e distribuível às equipes de resolução. */
export function PendenciasView() {
  const qc = useQueryClient();
  const [aba, setAba] = useState<Aba>("pendencias");
  const [catFiltro, setCatFiltro] = useState("");

  const sev = aba === "criticas" ? "critica" : "pendencia";
  const { data = [], isLoading } = useQuery({
    queryKey: ["pendencias", aba],
    queryFn: () => api.get<NaoConformidade[]>(`/api/ncs?abertas=1&severidade=${sev}`),
    refetchInterval: 20000,
  });

  const atualizar = useMutation({
    mutationFn: (v: { id: string } & Partial<NaoConformidade>) => api.put(`/api/ncs/${v.id}`, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendencias"] }),
  });

  const filtradas = catFiltro ? data.filter((n) => (n.categoria ?? "Sem categoria") === catFiltro) : data;

  const grupos = useMemo(() => {
    const m = new Map<string, NaoConformidade[]>();
    for (const n of filtradas) {
      const k = n.categoria ?? "Sem categoria";
      (m.get(k) ?? m.set(k, []).get(k)!).push(n);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtradas]);

  return (
    <div className="p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-brand-900 dark:text-slate-100">
            <ListChecks className="size-5 text-brand-600" /> Lista de Pendências
          </h1>
          <p className="text-sm text-slate-500">Pendências e NCs abertas em todas as unidades, por disciplina/equipe.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAba("pendencias")} className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium", aba === "pendencias" ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-slate-800" : "border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800")}>
            Pendências
          </button>
          <button onClick={() => setAba("criticas")} className={cn("flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium", aba === "criticas" ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950" : "border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800")}>
            <AlertTriangle className="size-4" /> NCs críticas
          </button>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <Filter className="size-4 text-slate-400" />
        <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">Todas as disciplinas ({data.length})</option>
          {DISCIPLINAS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Carregando…</p>}
      {!isLoading && filtradas.length === 0 && <p className="text-sm text-slate-400">Nenhuma {aba === "criticas" ? "NC crítica" : "pendência"} em aberto. 🎉</p>}

      <div className="space-y-6">
        {grupos.map(([cat, ncs]) => (
          <section key={cat}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{cat} · {ncs.length}</h2>
            <div className="space-y-2">
              {ncs.map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-brand-900 dark:text-slate-100">{n.unidade_label}</span>
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", SEV_COR[n.severidade])}>{SEVERIDADE_LABEL[n.severidade]}</span>
                        {n.origem && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">{ORIGEM_LABEL[n.origem] ?? n.origem}</span>}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{n.titulo}</p>
                      {n.descricao && <p className="text-xs text-slate-400">{n.descricao}</p>}
                    </div>
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-slate-500">{NC_STATUS_LABEL[n.status]}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-slate-400" />
                      <input
                        defaultValue={n.equipe ?? ""}
                        placeholder="Equipe/empreiteiro…"
                        onBlur={(e) => { if (e.target.value !== (n.equipe ?? "")) atualizar.mutate({ id: n.id, equipe: e.target.value }); }}
                        className="w-44 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <select
                      value={n.categoria ?? ""}
                      onChange={(e) => atualizar.mutate({ id: n.id, categoria: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="">Disciplina…</option>
                      {DISCIPLINAS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={n.status}
                      onChange={(e) => atualizar.mutate({ id: n.id, status: e.target.value as NaoConformidade["status"] })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      {(["aberta", "em_correcao", "reverificar", "corrigida", "aceita"] as const).map((s) => (
                        <option key={s} value={s}>{NC_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

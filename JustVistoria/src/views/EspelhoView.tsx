import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, AlertTriangle, CheckCircle2, Loader2, Filter } from "lucide-react";
import { api, type EspelhoLinha, type Etapa } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

const ORDEM: Etapa["tipo"][] = ["construcao", "inspecao_final", "vistoria_cliente", "entrega_chaves"];
const CURTO: Record<Etapa["tipo"], string> = { construcao: "Const.", inspecao_final: "Insp.", vistoria_cliente: "Vist.", entrega_chaves: "Entrega" };
const COR: Record<string, string> = {
  concluida: "bg-emerald-500",
  em_andamento: "bg-sky-500",
  nao_iniciada: "bg-slate-300 dark:bg-slate-600",
  desconsiderada: "bg-slate-200 dark:bg-slate-700",
};

/** ordena pavimentos por número ("2º ANDAR" < "10º ANDAR"); não-numéricos por último. */
function chavePav(p: string | null | undefined): number {
  const m = (p ?? "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

export function EspelhoView({ onSelect }: { onSelect: (id: string) => void }) {
  const { data = [], isLoading } = useQuery({ queryKey: ["espelho"], queryFn: () => api.get<EspelhoLinha[]>("/api/espelho"), refetchInterval: 20000 });
  const [soPend, setSoPend] = useState(false);

  const filtradas = soPend ? data.filter((l) => l.nc_abertas > 0 || (l.etapas.entrega_chaves ?? "nao_iniciada") !== "concluida") : data;

  const grupos = useMemo(() => {
    const m = new Map<string, EspelhoLinha[]>();
    for (const l of filtradas) {
      const k = l.pavimento ?? l.bloco ?? "Outros";
      (m.get(k) ?? m.set(k, []).get(k)!).push(l);
    }
    return [...m.entries()].sort((a, b) => chavePav(a[0]) - chavePav(b[0]));
  }, [filtradas]);

  const kpis = useMemo(() => {
    const tot = data.length;
    const entregues = data.filter((l) => l.etapas.entrega_chaves === "concluida").length;
    const criticas = data.reduce((s, l) => s + l.nc_criticas, 0);
    const emAndamento = data.filter((l) => l.iniciado && l.etapas.entrega_chaves !== "concluida").length;
    return { tot, entregues, criticas, emAndamento };
  }, [data]);

  return (
    <div className="p-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-brand-900 dark:text-slate-100">
            <LayoutGrid className="size-5 text-brand-600" /> Espelho de Entrega
          </h1>
          <p className="text-sm text-slate-500">Visão geral das unidades e o andamento das 4 etapas.</p>
        </div>
        <button
          onClick={() => setSoPend((v) => !v)}
          className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium", soPend ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-slate-800" : "border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800")}
        >
          <Filter className="size-4" /> {soPend ? "Mostrando pendentes" : "Só pendentes"}
        </button>
      </header>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Unidades", v: kpis.tot, Icon: LayoutGrid, cor: "text-brand-600" },
          { t: "Em andamento", v: kpis.emAndamento, Icon: Loader2, cor: "text-sky-600" },
          { t: "Entregues", v: kpis.entregues, Icon: CheckCircle2, cor: "text-emerald-600" },
          { t: "NCs críticas", v: kpis.criticas, Icon: AlertTriangle, cor: "text-red-600" },
        ].map((k) => (
          <div key={k.t} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{k.t}</span>
              <k.Icon className={cn("size-4", k.cor)} />
            </div>
            <p className="mt-1 text-2xl font-bold text-brand-900 dark:text-slate-100">{k.v}</p>
          </div>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Carregando espelho…</p>}
      {!isLoading && data.length === 0 && <p className="text-sm text-slate-400">Nenhuma unidade. Importe o cronograma do Prevision ou cadastre no JustCore.</p>}

      <div className="space-y-6">
        {grupos.map(([pav, linhas]) => (
          <section key={pav}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{pav} · {linhas.length}</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {linhas
                .sort((a, b) => a.identificador.localeCompare(b.identificador, "pt", { numeric: true }))
                .map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onSelect(l.id)}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-brand-900 dark:text-slate-100">{l.identificador}</span>
                      {l.nc_abertas > 0 && (
                        <span className={cn("flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium", l.nc_criticas > 0 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300")}>
                          <AlertTriangle className="size-3" /> {l.nc_abertas}
                        </span>
                      )}
                    </div>
                    <span className="mb-2 truncate text-[11px] text-slate-400">{l.cliente_nome ?? (l.iniciado ? "—" : "não iniciado")}</span>
                    <div className="mt-auto grid grid-cols-4 gap-1">
                      {ORDEM.map((tipo) => {
                        const sit = l.etapas[tipo] ?? "nao_iniciada";
                        return (
                          <div key={tipo} className="flex flex-col items-center gap-1" title={`${CURTO[tipo]}: ${sit.replace("_", " ")}`}>
                            <span className={cn("h-1.5 w-full rounded-full", COR[sit] ?? COR.nao_iniciada)} />
                            <span className="text-[9px] leading-none text-slate-400">{CURTO[tipo]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

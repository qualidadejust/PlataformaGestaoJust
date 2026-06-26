import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, LogOut, LayoutGrid, ListChecks } from "lucide-react";
import { api, type Unidade } from "./lib/api.ts";
import { useAuth } from "./auth.tsx";
import { cn } from "./lib/cn.ts";
import { Logo } from "./components/Logo.tsx";
import { PipelineView } from "./views/PipelineView.tsx";
import { EspelhoView } from "./views/EspelhoView.tsx";
import { PendenciasView } from "./views/PendenciasView.tsx";

type Geral = "espelho" | "pendencias";

export default function App() {
  const { user, logout } = useAuth();
  const [sel, setSel] = useState<Unidade | null>(null);
  const [geral, setGeral] = useState<Geral>("espelho");
  const [busca, setBusca] = useState("");

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: () => api.get<Unidade[]>("/core/api/unidades"),
  });

  const filtradas = unidades.filter((u) =>
    [u.identificador, u.obra?.nome, u.cliente?.nome].filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase()),
  );
  const nome = user?.colaborador?.nome ?? user?.email;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-brand-900 px-4 py-3 dark:border-slate-800">
          <Logo variant="white" className="h-7" />
          <span className="ml-1 text-xs font-medium text-brand-200/80">Vistoria & Entrega</span>
        </div>
        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <button
            onClick={() => { setSel(null); setGeral("espelho"); }}
            className={cn(
              "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              !sel && geral === "espelho" ? "bg-brand-50 text-brand-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            <LayoutGrid className="size-4" /> Espelho (visão geral)
          </button>
          <button
            onClick={() => { setSel(null); setGeral("pendencias"); }}
            className={cn(
              "mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              !sel && geral === "pendencias" ? "bg-brand-50 text-brand-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            <ListChecks className="size-4" /> Lista de pendências
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar unidade…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-2">
          {isLoading && <p className="px-3 py-2 text-sm text-slate-400">Carregando…</p>}
          {!isLoading && filtradas.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">Nenhuma unidade. Cadastre/importe no JustCore.</p>
          )}
          {filtradas.map((u) => (
            <button
              key={u.id}
              onClick={() => setSel(u)}
              className={cn(
                "mb-0.5 flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors",
                sel?.id === u.id ? "bg-brand-50 text-brand-900 dark:bg-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800/60",
              )}
            >
              <span className="text-sm font-medium">{u.identificador}</span>
              <span className="truncate text-xs text-slate-400">
                {u.obra?.nome ?? "—"}
                {u.cliente?.nome ? ` · ${u.cliente.nome}` : ""}
              </span>
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
          <span className="truncate">{nome}</span>
          <button onClick={logout} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {sel ? (
          <PipelineView unidade={sel} />
        ) : geral === "pendencias" ? (
          <PendenciasView />
        ) : (
          <EspelhoView onSelect={(id) => setSel(unidades.find((u) => u.id === id) ?? null)} />
        )}
      </main>
    </div>
  );
}

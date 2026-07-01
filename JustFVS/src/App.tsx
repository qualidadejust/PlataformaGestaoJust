import { useState } from "react";
import { ClipboardCheck, CalendarDays, ListChecks, LogOut, LayoutDashboard, AlertTriangle } from "lucide-react";
import { cn } from "./lib/cn.ts";
import { useAuth } from "./auth.tsx";
import CronogramaView from "./views/CronogramaView.tsx";
import FvsListaView from "./views/FvsListaView.tsx";
import NovoFvsView from "./views/NovoFvsView.tsx";
import GestaoView from "./views/GestaoView.tsx";
import PendenciasView from "./views/PendenciasView.tsx";

export type Tab = "gestao" | "cronograma" | "lista" | "pendencias";

export interface NavState {
  tab: Tab;
  tarefaId?: string;
  tarefaLabel?: string;
  origem?: Tab; // aba de onde a FVS foi aberta (p/ voltar corretamente)
}

export default function App() {
  const { user, logout } = useAuth();
  const [nav, setNav] = useState<NavState>({ tab: "gestao" });

  const tabs = [
    { id: "gestao" as Tab,     label: "Gestão",     icon: LayoutDashboard },
    { id: "cronograma" as Tab, label: "Cronograma", icon: CalendarDays    },
    { id: "lista" as Tab,      label: "Fichas FVS", icon: ListChecks      },
    { id: "pendencias" as Tab, label: "Pendências", icon: AlertTriangle   },
  ];

  // Preserva a aba de origem (Gestão ou Cronograma) para retornar a ela ao concluir/cancelar.
  const irParaNovaFvs = (tarefaId: string, tarefaLabel: string) =>
    setNav((prev) => ({ tab: prev.tab, tarefaId, tarefaLabel, origem: prev.tab }));

  const voltarParaOrigem = () => setNav({ tab: nav.origem ?? "gestao" });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-[#0f2742] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="size-6 text-teal-300" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">JustFVS</h1>
              <p className="text-xs text-slate-300">Fichas de Verificação de Serviço · Qualidade de obra</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
            title={`Sair (${user?.email})`}
          >
            <LogOut className="size-3.5" />
            Sair
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setNav({ tab: t.id })}
              className={cn(
                "flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition",
                nav.tab === t.id && !nav.tarefaId
                  ? "bg-slate-50 text-[#0f2742] dark:bg-slate-950 dark:text-teal-300"
                  : "text-slate-200 hover:bg-white/10",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {nav.tarefaId ? (
          <NovoFvsView
            tarefaId={nav.tarefaId}
            tarefaLabel={nav.tarefaLabel ?? ""}
            onConcluir={voltarParaOrigem}
            onCancelar={voltarParaOrigem}
          />
        ) : nav.tab === "gestao" ? (
          <GestaoView onAbrirFvs={irParaNovaFvs} />
        ) : nav.tab === "cronograma" ? (
          <CronogramaView onNovaFvs={irParaNovaFvs} />
        ) : nav.tab === "pendencias" ? (
          <PendenciasView />
        ) : (
          <FvsListaView />
        )}
      </main>
    </div>
  );
}

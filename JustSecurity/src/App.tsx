import { useState } from "react";
import { ShieldCheck, HardHat, History } from "lucide-react";
import { EntregaEpiView } from "./views/EntregaEpiView";
import { HistoricoView } from "./views/HistoricoView";
import { cn } from "./lib/utils";

type View = "entrega" | "historico";

export default function App() {
  const [view, setView] = useState<View>("entrega");

  const itens = [
    { id: "entrega" as const, label: "Entrega de EPI", icon: HardHat },
    { id: "historico" as const, label: "Histórico", icon: History },
  ];

  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-brand-900 text-brand-100 flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-300" />
          <span className="text-lg font-bold text-white leading-none">
            Just<span className="text-brand-300">Security</span>
          </span>
        </div>
        <div className="px-3 py-3">
          <p className="px-3 text-[11px] font-semibold text-brand-300/70 uppercase tracking-wider mb-2">
            Segurança do Trabalho
          </p>
          <nav className="space-y-0.5">
            {itens.map((i) => {
              const Icon = i.icon;
              const active = view === i.id;
              return (
                <button
                  key={i.id}
                  onClick={() => setView(i.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-white/10 text-white" : "text-brand-200/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {i.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {view === "entrega" ? <EntregaEpiView /> : <HistoricoView />}
      </main>
    </div>
  );
}

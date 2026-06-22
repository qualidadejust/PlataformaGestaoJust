import { useState } from "react";
import { Truck, BookOpen, Receipt, PieChart, Car } from "lucide-react";
import { cn } from "./lib/cn.ts";
import DiarioView from "./views/DiarioView.tsx";
import CustosView from "./views/CustosView.tsx";
import RateioView from "./views/RateioView.tsx";
import CustoVeiculoView from "./views/CustoVeiculoView.tsx";

type Tab = "diario" | "custos" | "custo-veiculo" | "rateio";

const TABS: { id: Tab; label: string; icon: typeof Truck }[] = [
  { id: "diario", label: "Diário de bordo", icon: BookOpen },
  { id: "custos", label: "Custos", icon: Receipt },
  { id: "custo-veiculo", label: "Custo/veículo", icon: Car },
  { id: "rateio", label: "Rateio", icon: PieChart },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("diario");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-[#0f2742] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
          <Truck className="size-6 text-teal-300" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">JustFrota</h1>
            <p className="text-xs text-slate-300">Gestão de frota · rateio por km entre obras</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition",
                tab === t.id ? "bg-slate-50 text-[#0f2742] dark:bg-slate-950 dark:text-teal-300" : "text-slate-200 hover:bg-white/10",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        {tab === "diario" && <DiarioView />}
        {tab === "custos" && <CustosView />}
        {tab === "custo-veiculo" && <CustoVeiculoView />}
        {tab === "rateio" && <RateioView />}
      </main>
    </div>
  );
}

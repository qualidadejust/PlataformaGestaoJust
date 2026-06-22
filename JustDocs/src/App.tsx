import { useState } from "react";
import { FolderOpen, FileText, CalendarClock } from "lucide-react";
import { cn } from "./lib/cn.ts";
import DocumentosView from "./views/DocumentosView.tsx";
import VencimentosView from "./views/VencimentosView.tsx";

type Tab = "documentos" | "vencimentos";

export default function App() {
  const [tab, setTab] = useState<Tab>("documentos");
  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "documentos", label: "Documentos", icon: FolderOpen },
    { id: "vencimentos", label: "Vencimentos", icon: CalendarClock },
  ];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-[#0f2742] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
          <FileText className="size-6 text-teal-300" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">JustDocs</h1>
            <p className="text-xs text-slate-300">GED · gestão eletrônica de documentos (arquivos no SharePoint)</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition",
                tab === t.id
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
        {tab === "documentos" && <DocumentosView />}
        {tab === "vencimentos" && <VencimentosView />}
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { GraduationCap, BookOpen, CalendarDays, ClipboardCheck, CalendarRange } from "lucide-react";
import { cn } from "./lib/cn.ts";
import TreinamentosView from "./views/TreinamentosView.tsx";
import TurmasView from "./views/TurmasView.tsx";
import TurmaDetalheView from "./views/TurmaDetalheView.tsx";
import CertificadoView from "./views/CertificadoView.tsx";
import MatrizView from "./views/MatrizView.tsx";
import CalendarioView from "./views/CalendarioView.tsx";
import FinalizarExternoView from "./views/FinalizarExternoView.tsx";

type Tab = "turmas" | "treinamentos" | "matriz" | "calendario";
// Navegação simples por estado (padrão JustDocs): turmas → detalhe → certificado.
type Tela = { v: "tabs" } | { v: "turma"; id: string } | { v: "cert"; id: string } | { v: "ged"; id: string };

export default function App() {
  const [tab, setTab] = useState<Tab>("turmas");
  const [tela, setTela] = useState<Tela>({ v: "tabs" });

  // PONTE do JustDocs: ?ged=<docId> → finalizar treinamento externo a partir do certificado no GED.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("ged");
    if (id) {
      window.history.replaceState({}, "", window.location.pathname);
      setTela({ v: "ged", id });
    }
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "turmas", label: "Turmas", icon: CalendarDays },
    { id: "treinamentos", label: "Treinamentos", icon: BookOpen },
    { id: "matriz", label: "Matriz", icon: ClipboardCheck },
    { id: "calendario", label: "Calendário", icon: CalendarRange },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-[#0f2742] text-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <GraduationCap className="size-6 text-amber-300" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">JustTrain</h1>
            <p className="text-xs text-slate-300">Treinamentos · presença assinada (tela ou digital) · certificados</p>
          </div>
        </div>
        {tela.v === "tabs" && (
          <nav className="mx-auto flex max-w-5xl gap-1 px-3">
            {tabs.map((t) => (
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
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        {tela.v === "tabs" && tab === "turmas" && <TurmasView onOpen={(id) => setTela({ v: "turma", id })} />}
        {tela.v === "tabs" && tab === "treinamentos" && <TreinamentosView />}
        {tela.v === "tabs" && tab === "matriz" && <MatrizView />}
        {tela.v === "tabs" && tab === "calendario" && <CalendarioView />}
        {tela.v === "turma" && (
          <TurmaDetalheView turmaId={tela.id} onBack={() => setTela({ v: "tabs" })} onCert={(id) => setTela({ v: "cert", id })} />
        )}
        {tela.v === "cert" && <CertificadoView participacaoId={tela.id} onBack={() => setTela({ v: "tabs" })} />}
        {tela.v === "ged" && <FinalizarExternoView gedId={tela.id} onDone={() => setTela({ v: "tabs" })} />}
      </main>
    </div>
  );
}

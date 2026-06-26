import { useState } from "react";
import { Database, Fingerprint, ShieldCheck, ClipboardList } from "lucide-react";
import { ENTITIES } from "./entities";
import { EntityAdmin } from "./components/EntityAdmin";
import { BiometriaView } from "./views/BiometriaView";
import { AcessosView } from "./views/AcessosView";
import { FormulariosView } from "./views/FormulariosView";
import { useAuth } from "./auth.tsx";
import { cn } from "./lib/utils";

type View = "entity" | "bio" | "acessos" | "formularios";

export default function App() {
  const { pode } = useAuth();
  const [path, setPath] = useState(ENTITIES[0].path);
  const [view, setView] = useState<View>("entity");
  const config = ENTITIES.find((e) => e.path === path)!;
  const podeAcesso = pode("acesso.admin");
  const podeFormularios = pode("formularios.read") || pode("core.cadastro.read");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 bg-brand-900 text-brand-100 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2 shrink-0">
          <Database className="w-6 h-6 text-brand-300" />
          <span className="text-lg font-bold text-white leading-none">
            Just<span className="text-brand-300">Core</span>
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          <p className="px-3 text-[11px] font-semibold text-brand-300/70 uppercase tracking-wider mb-2">Cadastros</p>
          <nav className="space-y-0.5">
            {ENTITIES.map((e) => {
              const Icon = e.icon;
              const active = view === "entity" && path === e.path;
              return (
                <button
                  key={e.path}
                  onClick={() => { setView("entity"); setPath(e.path); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-white/10 text-white" : "text-brand-200/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {e.label}
                </button>
              );
            })}
          </nav>

          {podeFormularios && (
            <>
              <p className="px-3 mt-4 text-[11px] font-semibold text-brand-300/70 uppercase tracking-wider mb-2">Motor de formulários</p>
              <button
                onClick={() => setView("formularios")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  view === "formularios" ? "bg-white/10 text-white" : "text-brand-200/80 hover:bg-white/5 hover:text-white"
                )}
              >
                <ClipboardList className="w-5 h-5 shrink-0" />
                Formulários
              </button>
            </>
          )}

          <p className="px-3 mt-4 text-[11px] font-semibold text-brand-300/70 uppercase tracking-wider mb-2">Segurança</p>
          <button
            onClick={() => setView("bio")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              view === "bio" ? "bg-white/10 text-white" : "text-brand-200/80 hover:bg-white/5 hover:text-white"
            )}
          >
            <Fingerprint className="w-5 h-5 shrink-0" />
            Biometria
          </button>
          {podeAcesso && (
            <button
              onClick={() => setView("acessos")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                view === "acessos" ? "bg-white/10 text-white" : "text-brand-200/80 hover:bg-white/5 hover:text-white"
              )}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              Controle de acesso
            </button>
          )}
        </div>
        <div className="shrink-0 px-5 py-3 text-[11px] text-brand-300/60 border-t border-white/10">
          Dados-mestre da plataforma · API :4100
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {view === "bio" ? (
          <BiometriaView />
        ) : view === "acessos" ? (
          <AcessosView />
        ) : view === "formularios" ? (
          <FormulariosView />
        ) : (
          <EntityAdmin key={config.path} config={config} />
        )}
      </main>
    </div>
  );
}

import { useState } from "react";
import { Database, Fingerprint } from "lucide-react";
import { ENTITIES } from "./entities";
import { EntityAdmin } from "./components/EntityAdmin";
import { BiometriaView } from "./views/BiometriaView";
import { cn } from "./lib/utils";

export default function App() {
  const [path, setPath] = useState(ENTITIES[0].path);
  const [bio, setBio] = useState(false);
  const config = ENTITIES.find((e) => e.path === path)!;

  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-brand-900 text-brand-100 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <Database className="w-6 h-6 text-brand-300" />
          <span className="text-lg font-bold text-white leading-none">
            Just<span className="text-brand-300">Core</span>
          </span>
        </div>
        <div className="px-3 py-3">
          <p className="px-3 text-[11px] font-semibold text-brand-300/70 uppercase tracking-wider mb-2">Cadastros</p>
          <nav className="space-y-0.5">
            {ENTITIES.map((e) => {
              const Icon = e.icon;
              const active = !bio && path === e.path;
              return (
                <button
                  key={e.path}
                  onClick={() => { setBio(false); setPath(e.path); }}
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

          <p className="px-3 mt-4 text-[11px] font-semibold text-brand-300/70 uppercase tracking-wider mb-2">Segurança</p>
          <button
            onClick={() => setBio(true)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              bio ? "bg-white/10 text-white" : "text-brand-200/80 hover:bg-white/5 hover:text-white"
            )}
          >
            <Fingerprint className="w-5 h-5 shrink-0" />
            Biometria
          </button>
        </div>
        <div className="mt-auto px-5 py-3 text-[11px] text-brand-300/60 border-t border-white/10">
          Dados-mestre da plataforma · API :4100
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {bio ? <BiometriaView /> : <EntityAdmin key={config.path} config={config} />}
      </main>
    </div>
  );
}

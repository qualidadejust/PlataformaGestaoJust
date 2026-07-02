import { useQuery } from "@tanstack/react-query";
import {
  Database,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  FolderTree,
  Truck,
  MessageCircle,
  Stethoscope,
  ClipboardCheck,
  ArrowUpRight,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { MODULOS, type Modulo } from "./modules.ts";
import { Logo } from "./components/Logo.tsx";
import { useAuth } from "./auth.tsx";
import { cn } from "./lib/cn.ts";

const ICONS: Record<string, LucideIcon> = {
  Database,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  FolderTree,
  Truck,
  MessageCircle,
  Stethoscope,
  ClipboardCheck,
};

// Indicador de status: pinga o /api/health (CORS habilitado) com timeout curto.
function useHealth(url?: string) {
  return useQuery({
    queryKey: ["health", url],
    enabled: !!url,
    refetchInterval: 15000,
    queryFn: async () => {
      const r = await fetch(url!, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    },
  });
}

function StatusDot({ healthUrl }: { healthUrl?: string }) {
  const h = useHealth(healthUrl);
  if (!healthUrl)
    return <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">app</span>;
  const cor = h.isLoading ? "bg-slate-300" : h.data ? "bg-emerald-500" : "bg-red-400";
  const txt = h.isLoading ? "verificando" : h.data ? "no ar" : "offline";
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
      <span className={cn("size-2 rounded-full", cor, h.data && "shadow-[0_0_0_3px] shadow-emerald-500/15")} />
      {txt}
    </span>
  );
}

function Card({ m }: { m: Modulo }) {
  const Icon = ICONS[m.icon] ?? Database;
  const semUI = !m.url;
  const conteudo = (
    <>
      <div className="flex items-start justify-between">
        <span className="grid size-11 place-items-center rounded-xl bg-slate-100 ring-1 ring-slate-200/70 transition-colors group-hover:bg-brand-50 dark:bg-slate-800 dark:ring-slate-700">
          <Icon className={cn("size-6", m.cor)} />
        </span>
        {semUI ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">sem interface</span>
        ) : (
          <StatusDot healthUrl={m.healthUrl} />
        )}
      </div>
      <div className="mt-4 flex-1">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-semibold text-brand-900 dark:text-slate-100">{m.nome}</h2>
          {!semUI && (
            <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-brand-500 dark:text-slate-600" />
          )}
        </div>
        <p className="mt-1.5 text-sm leading-snug text-slate-500 dark:text-slate-400">{m.descricao}</p>
      </div>
      <span className="mt-4 inline-block self-start rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {m.tag}
      </span>
    </>
  );

  const base =
    "group flex flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900";
  if (semUI) return <div className={cn(base, "opacity-70")}>{conteudo}</div>;
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noreferrer"
      className={cn(base, "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md hover:shadow-brand-900/5")}
    >
      {conteudo}
    </a>
  );
}

export default function App() {
  const { user, logout } = useAuth();
  const nome = user?.colaborador?.nome ?? user?.email;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-brand-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <Logo variant="white" className="h-9 sm:h-10" />
            <div className="hidden h-9 w-px bg-white/15 sm:block" />
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold">Plataforma de Gestão</p>
              <p className="text-xs text-brand-200/70">Portal de módulos</p>
            </div>
          </div>
          {nome && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-brand-100/90 sm:inline">{nome}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
              >
                <LogOut className="size-3.5" />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-brand-900 dark:text-slate-100">Módulos da plataforma</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Escolha um módulo para entrar — o status indica se o serviço está no ar.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => (
            <Card key={m.key} m={m} />
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">
          Suba o <strong className="font-semibold text-slate-500 dark:text-slate-400">JustCore</strong> primeiro — os
          demais módulos dependem dele para os cadastros.
        </p>
      </main>
    </div>
  );
}

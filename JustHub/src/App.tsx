import { useQuery } from "@tanstack/react-query";
import {
  Database,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  FolderTree,
  Truck,
  MessageCircle,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { MODULOS, type Modulo } from "./modules.ts";
import { cn } from "./lib/cn.ts";

const ICONS: Record<string, LucideIcon> = {
  Database,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  FolderTree,
  Truck,
  MessageCircle,
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
  if (!healthUrl) return <span className="text-[10px] uppercase tracking-wide text-slate-400">app</span>;
  const cor = h.isLoading ? "bg-slate-300" : h.data ? "bg-emerald-500" : "bg-red-400";
  const txt = h.isLoading ? "verificando" : h.data ? "no ar" : "offline";
  return (
    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400">
      <span className={cn("size-2 rounded-full", cor)} /> {txt}
    </span>
  );
}

function Card({ m }: { m: Modulo }) {
  const Icon = ICONS[m.icon] ?? Database;
  const semUI = !m.url;
  const conteudo = (
    <>
      <div className="flex items-start justify-between">
        <Icon className={cn("size-8", m.cor)} />
        {semUI ? (
          <span className="text-[10px] uppercase tracking-wide text-slate-400">sem interface</span>
        ) : (
          <StatusDot healthUrl={m.healthUrl} />
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-semibold text-[#0f2742] dark:text-slate-100">{m.nome}</h2>
          {!semUI && <ExternalLink className="size-3.5 text-slate-300" />}
        </div>
        <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{m.descricao}</p>
      </div>
      <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {m.tag}
      </span>
    </>
  );

  const base =
    "flex flex-col rounded-2xl bg-white p-5 shadow-sm transition dark:bg-slate-900";
  if (semUI) return <div className={cn(base, "opacity-70")}>{conteudo}</div>;
  return (
    <a href={m.url} target="_blank" rel="noreferrer" className={cn(base, "hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-teal-400")}>
      {conteudo}
    </a>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="bg-[#0f2742] text-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-2xl font-bold leading-tight">
            Just<span className="text-teal-300">Hub</span>
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Plataforma de Gestão · Construtora JUST — escolha um módulo para entrar
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => (
            <Card key={m.key} m={m} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">
          Suba o <strong>JustCore</strong> primeiro — os demais módulos dependem dele para os cadastros.
        </p>
      </main>
    </div>
  );
}

import { useState } from "react";
import { Building2, HardHat, Star, ChevronLeft, Users, Briefcase, ShieldCheck, Database } from "lucide-react";
import { cn } from "../lib/utils";
import { useObras, useObra, type PapelObra } from "../hooks/useObras";

const PAPEL_LABEL: Record<string, string> = {
  residente: "Engenheiro Residente",
  mestre: "Mestre / Contramestre",
  mao_de_obra: "Mão de obra",
  administrativo: "Administrativo",
};

const PAPEL_BADGE: Record<string, string> = {
  residente: "bg-brand-100 text-brand-800 border-brand-200",
  mestre: "bg-amber-50 text-amber-700 border-amber-200",
  mao_de_obra: "bg-slate-100 text-slate-600 border-slate-200",
  administrativo: "bg-slate-100 text-slate-500 border-slate-200",
};

const PAPEL_ORDER: PapelObra[] = ["residente", "mestre", "mao_de_obra", "administrativo"];

// Aviso: cadastro/alocação são gerenciados no JustCore (fonte única).
function AvisoCore() {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
      <Database className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <span>
        Obras e alocações são cadastradas no <strong>JustCore</strong> (porta 4101). Esta tela é somente
        leitura — reflete os dados sincronizados.
      </span>
    </div>
  );
}

function ObraDetalhe({ obraId, onBack }: { obraId: string; onBack: () => void }) {
  const { data: obra, isLoading } = useObra(obraId);

  if (isLoading || !obra) {
    return <div className="p-12 text-center text-slate-400">Carregando obra…</div>;
  }

  const grupos = PAPEL_ORDER
    .map(p => ({ papel: p, itens: obra.alocacoes.filter(a => a.papel_na_obra === p) }))
    .filter(g => g.itens.length > 0);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Todas as obras
      </button>

      <div className="flex items-center gap-4">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", obra.tipo === "sede" ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700")}>
          {obra.tipo === "sede" ? <Briefcase className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{obra.nome}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {obra.alocacoes.length} alocados · {obra.tipo === "sede" ? "Sede / Administrativo" : "Canteiro de obra"}
            {obra.cost_center ? ` · ${obra.cost_center}` : ""}
          </p>
        </div>
      </div>

      <AvisoCore />

      {grupos.map(g => (
        <div key={g.papel} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">{PAPEL_LABEL[g.papel]}</h2>
            <span className="text-xs font-medium text-slate-400">{g.itens.length}</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {g.itens.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                  {a.employee?.name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{a.employee?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{a.employee?.role}</p>
                </div>
                {a.responsavel && (a.papel_na_obra === "mestre" || a.papel_na_obra === "residente") && (
                  <span className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[11px] font-bold text-brand-700 bg-brand-50" title="Responsável por avaliar o nível abaixo nesta obra">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Avaliador</span>
                  </span>
                )}
                {a.principal && (
                  <span title="Obra principal deste colaborador" className="p-1.5 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ObrasView() {
  const { data: obras = [], isLoading } = useObras();
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      {selected ? (
        <ObraDetalhe obraId={selected} onBack={() => setSelected(undefined)} />
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Obras &amp; Alocação</h1>
            <p className="text-sm text-slate-500 mt-1">Quem trabalha em cada obra e em que papel — base da matriz de avaliação.</p>
          </div>

          <div className="mb-6"><AvisoCore /></div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Carregando obras…</div>
          ) : obras.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Nenhuma obra cadastrada ainda.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {obras.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className="text-left bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", o.tipo === "sede" ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700")}>
                      {o.tipo === "sede" ? <Briefcase className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{o.nome}</h3>
                      <p className="text-xs text-slate-400">{o.tipo === "sede" ? "Sede / Administrativo" : "Canteiro de obra"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{o.total_alocados ?? 0}</span> alocados
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PAPEL_ORDER.filter(p => o.by_papel?.[p]).map(p => (
                      <span key={p} className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border", PAPEL_BADGE[p])}>
                        {p === "mestre" && <HardHat className="w-3 h-3" />}
                        {o.by_papel?.[p]} {PAPEL_LABEL[p]}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

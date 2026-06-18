import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, CheckCircle2, ChevronRight, Building2, AlertCircle, ClipboardCheck } from "lucide-react";
import { usePortal } from "../hooks/usePortal";
import { EvaluationFormView } from "./EvaluationFormView";
import { Logo } from "../components/Logo";
import { cn } from "../lib/utils";

const DONE = new Set(["submitted", "completed"]);

export function EvaluatorPortal({ token }: { token: string }) {
  const { data, isLoading, isError } = usePortal(token);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | undefined>();

  const backToQueue = () => {
    setSelected(undefined);
    qc.invalidateQueries({ queryKey: ["portal", token] });
  };

  if (selected) {
    return (
      <div className="min-h-screen bg-slate-50">
        <EvaluationFormView evalId={selected} onBack={backToQueue} onNavigate={backToQueue} />
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Carregando…</div>;
  }

  if (isError || !data?.evaluator) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-800">Link inválido ou expirado</h1>
        <p className="text-sm text-slate-500 max-w-xs">Peça ao RH um novo link de acesso às suas avaliações.</p>
      </div>
    );
  }

  const { evaluator, titulo, evaluations } = data;
  const pendentes = evaluations.filter(e => !DONE.has(e.status));
  const concluidas = evaluations.filter(e => DONE.has(e.status));
  const total = evaluations.length;
  const pct = total > 0 ? Math.round((concluidas.length / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topo de marca */}
      <div className="bg-brand-900 text-white px-5 pt-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Logo variant="white" className="h-7" />
            <span className="text-base font-bold tracking-tight text-white leading-none">Just<span className="text-brand-300 font-semibold">Eleva</span></span>
          </div>
          <p className="text-brand-200 text-sm">Olá,</p>
          <h1 className="text-2xl font-bold leading-tight">{evaluator.name.split(" ")[0]}</h1>
          <p className="text-brand-200 text-sm mt-0.5">{titulo}</p>

          <div className="mt-5 bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-brand-100 font-medium">Seu progresso</span>
              <span className="font-bold">{concluidas.length}/{total}</span>
            </div>
            <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-4 pb-16">
        {pendentes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Tudo concluído! 🎉</h2>
            <p className="text-sm text-slate-500 mt-1">Você finalizou todas as suas avaliações deste ciclo.</p>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> A fazer ({pendentes.length})
            </h2>
            <div className="space-y-2.5">
              {pendentes.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 hover:border-brand-300 active:scale-[0.99] transition-all"
                >
                  <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {e.employee_name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{e.employee_name}</p>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      {e.employee_role}
                      {e.obra_nome && <><span className="text-slate-300">·</span><Building2 className="w-3 h-3" />{e.obra_nome}</>}
                    </p>
                  </div>
                  {e.status === "draft" && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">Rascunho</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {concluidas.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-8 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Concluídas ({concluidas.length})
            </h2>
            <div className="space-y-2">
              {concluidas.map(e => (
                <div key={e.id} className={cn("bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3 opacity-75")}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.employee_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

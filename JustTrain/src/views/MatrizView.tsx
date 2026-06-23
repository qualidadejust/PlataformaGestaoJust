import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Clock, ShieldQuestion } from "lucide-react";
import { api, core, cn, TIPOS } from "../lib/cn";

// Painel de conformidade: cruza os requisitos do cargo (Manual de Cargos) com os
// treinamentos concluídos pelo colaborador. Status: em dia | vencido | pendente.
interface Colab {
  id: string;
  nome: string;
  cargo?: { nome: string } | null;
}
interface Linha {
  id: string;
  treinamento_codigo: string;
  treinamento_nome: string;
  condicional: boolean;
  status: string;
  valido_ate?: string | null;
}
interface Matriz {
  requisitos: Linha[];
  resumo?: { total: number; em_dia: number; vencido: number; pendente: number };
}

const badge = (s: string) => {
  if (s === "em_dia")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="size-3" /> em dia
      </span>
    );
  if (s === "vencido")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="size-3" /> vencido
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="size-3" /> pendente
    </span>
  );
};

export default function MatrizView() {
  const colabs = useQuery({ queryKey: ["core-colaboradores"], queryFn: () => core<Colab[]>("/colaboradores") });
  const [colabId, setColabId] = useState("");
  const colab = colabs.data?.find((c) => c.id === colabId);
  const cargo = colab?.cargo?.nome ?? "";

  const matriz = useQuery({
    queryKey: ["matriz", colabId, cargo],
    enabled: !!colabId && !!cargo,
    queryFn: () => api<Matriz>(`/matriz?colaborador_id=${colabId}&cargo=${encodeURIComponent(cargo)}`),
  });

  const linhas = matriz.data?.requisitos ?? [];
  const r = matriz.data?.resumo;

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">Conformidade de treinamentos por colaborador</h2>
        <label className="text-xs text-slate-500">
          Colaborador (cargo vem do Core)
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={colabId}
            onChange={(e) => setColabId(e.target.value)}
          >
            <option value="">— selecione —</option>
            {colabs.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}{c.cargo?.nome ? ` · ${c.cargo.nome}` : ""}</option>
            ))}
          </select>
        </label>
        {colab && !cargo && (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <ShieldQuestion className="size-3.5" /> colaborador sem cargo definido no Core — não há matriz a aplicar.
          </p>
        )}
      </section>

      {colabId && cargo && (
        <>
          {r && (
            <section className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
                <div className="text-2xl font-bold text-green-600">{r.em_dia}</div>
                <div className="text-xs text-slate-500">em dia</div>
              </div>
              <div className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
                <div className="text-2xl font-bold text-amber-600">{r.pendente}</div>
                <div className="text-xs text-slate-500">pendentes</div>
              </div>
              <div className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
                <div className="text-2xl font-bold text-red-600">{r.vencido}</div>
                <div className="text-xs text-slate-500">vencidos</div>
              </div>
              <div className="rounded-xl bg-white px-5 py-3 shadow-sm dark:bg-slate-900">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{r.total}</div>
                <div className="text-xs text-slate-500">exigidos ({cargo})</div>
              </div>
            </section>
          )}

          <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2">Treinamento exigido</th>
                  <th className="px-2 py-2">Situação</th>
                  <th className="px-2 py-2">Validade</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id} className={cn("border-t border-slate-100 dark:border-slate-800", l.status === "vencido" && "bg-red-50/50 dark:bg-red-950/20")}>
                    <td className="px-2 py-1.5">
                      {l.treinamento_nome}
                      {l.condicional && <span className="ml-1 text-xs text-slate-400">(se aplicável)</span>}
                    </td>
                    <td className="px-2 py-1.5">{badge(l.status)}</td>
                    <td className="px-2 py-1.5 text-xs text-slate-500">{l.valido_ate ?? "—"}</td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-6 text-center text-xs text-slate-400">
                      nenhum requisito cadastrado para o cargo “{cargo}” (rode o seed da matriz ou ajuste o nome do cargo)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">
              “se aplicável” = exigido só em certas obras/funções (ex.: NR-35 quando há trabalho em altura). Tipos: {Object.values(TIPOS).join(" · ")}.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

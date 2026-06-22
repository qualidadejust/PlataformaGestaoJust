import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.ts";

const inp =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";
const brl = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Rateio {
  total_km: number;
  total_viagens: number;
  custo_total: number;
  custo_origem: string;
  custos: { combustivel?: number; manutencao?: number; fixo?: number; total?: number; manual?: number };
  obras: { obra: string; km: number; pct: number; viagens: number; custo_alocado: number | null }[];
}

export default function RateioView() {
  const [inicio, setInicio] = useState("2026-05-01");
  const [fim, setFim] = useState("2026-05-31");
  const [custo, setCusto] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");

  // opções dos filtros derivadas das próprias viagens (só quem realmente aparece)
  const viagens = useQuery({ queryKey: ["viagens"], queryFn: () => api<any[]>("/api/viagens") });
  const distintos = (campoId: string, campoNome: string) =>
    [...new Map((viagens.data ?? []).filter((v) => v[campoId]).map((v) => [v[campoId], v[campoNome]])).entries()];
  const optVeiculos = distintos("veiculo_id", "veiculo_nome");
  const optMotoristas = distintos("motorista_id", "motorista_nome");

  const q = new URLSearchParams({
    inicio,
    fim,
    ...(custo ? { custo } : {}),
    ...(veiculoId ? { veiculo_id: veiculoId } : {}),
    ...(motoristaId ? { motorista_id: motoristaId } : {}),
  }).toString();
  const rateio = useQuery({
    queryKey: ["rateio", inicio, fim, custo, veiculoId, motoristaId],
    queryFn: () => api<Rateio>(`/api/rateio?${q}`),
  });
  const d = rateio.data;

  const periodo = (i: string, f: string, label: string) => (
    <button
      onClick={() => {
        setInicio(i);
        setFim(f);
      }}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">Rateio por km rodado</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Início
            <input type="date" className={`block ${inp}`} value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Fim
            <input type="date" className={`block ${inp}`} value={fim} onChange={(e) => setFim(e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Veículo
            <select className={`block ${inp}`} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
              <option value="">Todos</option>
              {optVeiculos.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome ?? id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Motorista
            <select className={`block ${inp}`} value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}>
              <option value="">Todos</option>
              {optMotoristas.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome ?? id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Custo total (opcional — sobrepõe os lançados)
            <input
              type="number"
              placeholder="usa custos lançados"
              className={`block w-56 ${inp}`}
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
            />
          </label>
          <div className="flex gap-2 pb-0.5">
            {periodo("2026-05-01", "2026-05-31", "Maio")}
            {periodo("2026-06-01", "2026-06-30", "Junho")}
          </div>
        </div>
      </section>

      {d && (
        <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <span>
              <span className="text-slate-400">Total km: </span>
              <strong>{d.total_km}</strong>
            </span>
            <span>
              <span className="text-slate-400">Viagens: </span>
              <strong>{d.total_viagens}</strong>
            </span>
            <span>
              <span className="text-slate-400">Custo total: </span>
              <strong>{brl(d.custo_total)}</strong>{" "}
              <em className="text-xs text-slate-400">({d.custo_origem === "manual" ? "informado" : "custos lançados"})</em>
            </span>
            {d.custo_origem !== "manual" && (
              <span className="text-xs text-slate-400">
                combustível {brl(d.custos.combustivel ?? 0)} · manutenção {brl(d.custos.manutencao ?? 0)} · fixo{" "}
                {brl(d.custos.fixo ?? 0)}
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Obra / centro de custo</th>
                <th className="px-2 py-2 text-right">Km</th>
                <th className="px-2 py-2 text-right">%</th>
                <th className="px-2 py-2 text-right">Viagens</th>
                <th className="px-2 py-2 text-right">Custo alocado</th>
              </tr>
            </thead>
            <tbody>
              {d.obras.map((o) => (
                <tr key={o.obra} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1.5">{o.obra}</td>
                  <td className="px-2 py-1.5 text-right">{o.km}</td>
                  <td className="px-2 py-1.5 text-right">{o.pct}%</td>
                  <td className="px-2 py-1.5 text-right text-slate-500">{o.viagens}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{brl(o.custo_alocado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-400">
            Base: km rodado. custo_alocado(obra) = custo_total × km(obra) / km_total. Viagens com km inconsistente ficam
            fora.
          </p>
        </section>
      )}
      {rateio.isError && <p className="text-sm text-red-600">{(rateio.error as Error).message}</p>}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, RefreshCw } from "lucide-react";
import { api } from "../lib/api.ts";

const inp = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";
const brl = (n: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

interface Linha {
  veiculo_id: string;
  veiculo_nome: string;
  placa: string | null;
  modelo: string | null;
  km: number;
  viagens: number;
  combustivel: number;
  manutencao: number;
  depreciacao: number;
  outros_fixos: number;
  motorista: number;
  custo_total: number;
  custo_km: number | null;
}
interface Resumo {
  periodo: { inicio: string | null; fim: string | null; meses: number };
  veiculos: Linha[];
  totais: {
    km: number;
    combustivel: number;
    manutencao: number;
    depreciacao: number;
    outros_fixos: number;
    motorista: number;
    custo_total: number;
    custo_km: number | null;
  };
}
interface GeracaoDeprec {
  competencia: string;
  gerados: { veiculo: string; valor: number }[];
  pulados: { veiculo: string; motivo: string }[];
}

// último dia "seguro" do mês p/ limite superior de data (string compare)
const fimDoMes = (comp: string) => `${comp}-31`;

export default function CustoVeiculoView() {
  const qc = useQueryClient();
  const [competencia, setCompetencia] = useState("2026-05");
  const inicio = `${competencia}-01`;
  const fim = fimDoMes(competencia);

  const q = new URLSearchParams({ inicio, fim }).toString();
  const resumo = useQuery({
    queryKey: ["custo-veiculo", inicio, fim],
    queryFn: () => api<Resumo>(`/api/custos/por-veiculo?${q}`),
  });

  const gerarDeprec = useMutation({
    mutationFn: () => api<GeracaoDeprec>(`/api/depreciacao/gerar?competencia=${competencia}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custo-veiculo"] });
      qc.invalidateQueries({ queryKey: ["custos-fixos"] });
    },
  });

  const d = resumo.data;
  const t = d?.totais;

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">Custo por veículo</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Competência
            <input type="month" className={`block ${inp}`} value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
          </label>
          <div className="flex gap-2 pb-0.5">
            <button onClick={() => setCompetencia("2026-05")} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Maio</button>
            <button onClick={() => setCompetencia("2026-06")} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Junho</button>
          </div>
          <button
            onClick={() => gerarDeprec.mutate()}
            disabled={gerarDeprec.isPending}
            title="Lê valor de aquisição/vida útil do Core e gera a parcela de depreciação deste mês"
            className="ml-auto flex items-center gap-2 rounded-lg border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50 dark:text-teal-300 dark:hover:bg-teal-950/30"
          >
            {gerarDeprec.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Calculator className="size-4" />}
            Gerar depreciação do mês
          </button>
        </div>
        {gerarDeprec.data && (
          <p className="mt-2 text-xs text-slate-500">
            Depreciação {gerarDeprec.data.competencia}: {gerarDeprec.data.gerados.length} gerada(s)
            {gerarDeprec.data.gerados.length > 0 && (
              <> — {gerarDeprec.data.gerados.map((g) => `${g.veiculo} ${brl(g.valor)}`).join(" · ")}</>
            )}
            {gerarDeprec.data.pulados.length > 0 && (
              <span className="text-amber-600">
                {" "}· {gerarDeprec.data.pulados.length} sem dados de patrimônio no Core (preencha aquisição/vida útil no veículo).
              </span>
            )}
          </p>
        )}
        {gerarDeprec.isError && <p className="mt-2 text-xs text-red-600">{(gerarDeprec.error as Error).message}</p>}
      </section>

      {d && (
        <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <span><span className="text-slate-400">Custo total da frota: </span><strong>{brl(t!.custo_total)}</strong></span>
            <span><span className="text-slate-400">Km: </span><strong>{t!.km}</strong></span>
            <span><span className="text-slate-400">Custo médio/km: </span><strong>{brl(t!.custo_km)}</strong></span>
            <span className="text-xs text-slate-400">
              combustível {brl(t!.combustivel)} · manutenção {brl(t!.manutencao)} · depreciação {brl(t!.depreciacao)} · outros fixos {brl(t!.outros_fixos)} · motorista {brl(t!.motorista)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2">Veículo</th>
                  <th className="px-2 py-2 text-right">Km</th>
                  <th className="px-2 py-2 text-right">Combustível</th>
                  <th className="px-2 py-2 text-right">Manutenção</th>
                  <th className="px-2 py-2 text-right">Depreciação</th>
                  <th className="px-2 py-2 text-right">Outros fixos</th>
                  <th className="px-2 py-2 text-right">Motorista</th>
                  <th className="px-2 py-2 text-right">Custo total</th>
                  <th className="px-2 py-2 text-right">Custo/km</th>
                </tr>
              </thead>
              <tbody>
                {d.veiculos.map((l) => (
                  <tr key={l.veiculo_id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5">
                      <span className="font-medium">{l.veiculo_nome}</span>
                      <span className="ml-1 text-xs text-slate-400">{l.placa}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-500">{l.km}</td>
                    <td className="px-2 py-1.5 text-right">{brl(l.combustivel)}</td>
                    <td className="px-2 py-1.5 text-right">{brl(l.manutencao)}</td>
                    <td className="px-2 py-1.5 text-right">{brl(l.depreciacao)}</td>
                    <td className="px-2 py-1.5 text-right">{brl(l.outros_fixos)}</td>
                    <td className="px-2 py-1.5 text-right">{brl(l.motorista)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{brl(l.custo_total)}</td>
                    <td className="px-2 py-1.5 text-right">{brl(l.custo_km)}</td>
                  </tr>
                ))}
                {d.veiculos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-6 text-center text-xs text-slate-400">
                      nenhum movimento ou custo lançado neste mês
                    </td>
                  </tr>
                )}
              </tbody>
              {t && d.veiculos.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold dark:border-slate-700">
                    <td className="px-2 py-2">Total</td>
                    <td className="px-2 py-2 text-right">{t.km}</td>
                    <td className="px-2 py-2 text-right">{brl(t.combustivel)}</td>
                    <td className="px-2 py-2 text-right">{brl(t.manutencao)}</td>
                    <td className="px-2 py-2 text-right">{brl(t.depreciacao)}</td>
                    <td className="px-2 py-2 text-right">{brl(t.outros_fixos)}</td>
                    <td className="px-2 py-2 text-right">{brl(t.motorista)}</td>
                    <td className="px-2 py-2 text-right">{brl(t.custo_total)}</td>
                    <td className="px-2 py-2 text-right">{brl(t.custo_km)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Custo total = combustível + manutenção + depreciação + outros fixos + motorista. O custo do motorista vem do
            cadastro de custo por cargo do Core (custo mensal × meses), rateado pela fração de km que cada motorista rodou
            no veículo. Depreciação é gerada do patrimônio do Core (valor de aquisição/vida útil) pelo botão acima.
          </p>
        </section>
      )}
      {resumo.isError && <p className="text-sm text-red-600">{(resumo.error as Error).message}</p>}
    </div>
  );
}

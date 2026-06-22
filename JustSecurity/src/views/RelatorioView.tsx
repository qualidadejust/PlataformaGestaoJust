import { useMemo, useState } from "react";
import { FileBarChart, Printer, Fingerprint, PenLine } from "lucide-react";
import { useEntregas, type Entrega } from "../hooks/useEpi";
import { fmtData } from "../lib/status";

const MOTIVO_LABEL: Record<string, string> = {
  inicial: "Inicial",
  complementar: "Complementar",
  troca: "Troca",
};

function mesAtual(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export function RelatorioView() {
  const { data: entregas = [], isLoading } = useEntregas();
  const [mes, setMes] = useState(mesAtual());

  const doMes = useMemo(
    () => entregas.filter((e) => (e.entregue_em ?? "").slice(0, 7) === mes),
    [entregas, mes]
  );

  // Agrupa por colaborador
  const grupos = useMemo(() => {
    const map = new Map<string, { nome: string; cargo: string | null; empresa: string | null; itens: Entrega[] }>();
    for (const e of doMes) {
      const chave = e.colaborador_id ?? e.colaborador_nome;
      if (!map.has(chave)) map.set(chave, { nome: e.colaborador_nome, cargo: e.colaborador_cargo, empresa: e.empresa_nome, itens: [] });
      map.get(chave)!.itens.push(e);
    }
    return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [doMes]);

  const rotuloMes = new Date(mes + "-02").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-brand-900 flex items-center justify-center">
            <FileBarChart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Relatório mensal de EPIs</h1>
            <p className="text-sm text-slate-500">Entregas do mês por colaborador — comprovante assinado por digital.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      <div className="print-area">
      {/* Cabeçalho de impressão (com logo JUST) */}
      <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-3 mb-4">
        <img src="/logos/logo-just.png" alt="JUST" className="h-10 object-contain" />
        <div className="text-right">
          <h1 className="text-base font-bold text-slate-900">Relatório mensal de entrega de EPIs</h1>
          <p className="text-sm text-slate-600">{rotuloMes}</p>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        {rotuloMes} · <strong className="text-slate-700">{doMes.length}</strong> entrega(s) ·{" "}
        <strong className="text-slate-700">{grupos.length}</strong> colaborador(es)
      </p>

      {isLoading ? (
        <div className="p-10 text-center text-slate-400">Carregando…</div>
      ) : grupos.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          Nenhuma entrega registrada em {rotuloMes}.
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <div key={g.nome} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden break-inside-avoid">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{g.nome}</h2>
                  <p className="text-xs text-slate-400">{[g.cargo, g.empresa].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <span className="text-xs font-medium text-slate-400">{g.itens.length} item(ns)</span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-2 font-semibold">EPI</th>
                    <th className="px-5 py-2 font-semibold">C.A.</th>
                    <th className="px-5 py-2 font-semibold">Motivo</th>
                    <th className="px-5 py-2 font-semibold">Data</th>
                    <th className="px-5 py-2 font-semibold">Assinatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {g.itens.map((e) => (
                    <tr key={e.id}>
                      <td className="px-5 py-2 text-slate-800">{e.epi_nome}</td>
                      <td className="px-5 py-2 text-slate-500">{e.epi_ca ?? "—"}</td>
                      <td className="px-5 py-2 text-slate-600">{MOTIVO_LABEL[e.motivo ?? "inicial"] ?? e.motivo}</td>
                      <td className="px-5 py-2 text-slate-600">{fmtData(e.entregue_em)}</td>
                      <td className="px-5 py-2">
                        {e.assinatura_tipo === "digital" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <Fingerprint className="w-3.5 h-3.5" /> Digital
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <PenLine className="w-3.5 h-3.5" /> {e.assinatura_tipo ?? "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

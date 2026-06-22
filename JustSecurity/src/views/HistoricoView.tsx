import { useState } from "react";
import { History, Fingerprint, FileText, Printer, X, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { useEntregas, useVerificacao, useEmpresas, biometriaSelo, type Entrega } from "../hooks/useEpi";
import { TermoEntrega } from "../components/TermoEntrega";

function SeloBiometria({ e }: { e: Entrega }) {
  const s = biometriaSelo(e);
  if (s.estado === "confirmada")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700" title={`Identidade confirmada por biometria (score ${s.score?.toFixed(0)})`}>
        <Fingerprint className="w-3 h-3" /> conferida {s.score != null ? `· ${s.score.toFixed(0)}` : ""}
      </span>
    );
  if (s.estado === "nao_cadastrado")
    return <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500" title="Colaborador sem cadastro biométrico">sem cadastro</span>;
  return <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400" title="Sem verificação biométrica neste registro">—</span>;
}

// Normaliza razão social para casar o nome da empresa (snapshot) com o cadastro do Core.
const normEmpresa = (s?: string | null) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export function HistoricoView() {
  const { data: entregas = [], isLoading } = useEntregas();
  const { data: verif, isFetching, refetch } = useVerificacao();
  const { data: empresas = [] } = useEmpresas();
  const [termo, setTermo] = useState<Entrega | null>(null);

  // CNPJ da obra/empresa do termo aberto (casa o snapshot da entrega com o Core).
  const cnpjPorEmpresa = new Map(empresas.map((emp) => [normEmpresa(emp.razao_social), emp.cnpj]));
  const termoCnpj = termo ? cnpjPorEmpresa.get(normEmpresa(termo.empresa_nome)) ?? null : null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-brand-900 flex items-center justify-center">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Histórico de entregas</h1>
            <p className="text-sm text-slate-500">Log jurídico das entregas de EPI assinadas por digital.</p>
          </div>
        </div>

        {/* Selo de integridade da cadeia */}
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          title="Reverificar a cadeia de hash"
        >
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          ) : verif?.ok ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : verif ? (
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          )}
          <span className={verif ? (verif.ok ? "text-emerald-700" : "text-rose-700") : "text-slate-600"}>
            {verif
              ? verif.ok
                ? `Integridade OK (${verif.total} registros)`
                : `Adulteração detectada (${verif.quebras.length})`
              : "Verificar integridade"}
          </span>
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Carregando…</p>
      ) : entregas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 text-sm">
          Nenhuma entrega registrada ainda.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">EPI</th>
                <th className="px-4 py-3 font-medium">Qtd</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Assinatura</th>
                <th className="px-4 py-3 font-medium">Biometria</th>
                <th className="px-4 py-3 font-medium text-right">Termo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entregas.map((e) => {
                const adulterado = verif && !verif.ok && verif.quebras.includes(e.id);
                return (
                  <tr key={e.id} className={adulterado ? "bg-rose-50" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{e.colaborador_nome}</div>
                      <div className="text-xs text-slate-500">
                        {e.colaborador_matricula ? `${e.colaborador_matricula} · ` : ""}
                        {e.colaborador_cargo ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{e.epi_nome}</div>
                      <div className="text-xs text-slate-500">{e.epi_ca ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.quantidade}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(e.entregue_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {e.assinatura_img ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={e.assinatura_img}
                            alt="Assinatura"
                            className="w-9 h-11 object-contain rounded border border-slate-200 bg-slate-50"
                          />
                          <span
                            className={
                              "text-[11px] px-1.5 py-0.5 rounded " +
                              (e.assinatura_tipo === "digital"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700")
                            }
                          >
                            {e.assinatura_tipo === "digital" ? "digital" : "simulado"}
                          </span>
                        </div>
                      ) : (
                        <Fingerprint className="w-5 h-5 text-slate-300" />
                      )}
                    </td>
                    <td className="px-4 py-3"><SeloBiometria e={e} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setTermo(e)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="w-3.5 h-3.5" /> Ver termo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal do termo */}
      {termo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4"
          onClick={() => setTermo(null)}
        >
          <div
            className="bg-slate-100 rounded-xl shadow-xl my-6 w-full max-w-3xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="no-print flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Termo de Entrega de EPI</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setTermo(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <TermoEntrega e={termo} empresaCnpj={termoCnpj} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

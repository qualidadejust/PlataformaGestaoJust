import { Fingerprint } from "lucide-react";
import type { Entrega } from "../hooks/useEpi";
import { biometriaSelo } from "../hooks/useEpi";

function fmtData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

/**
 * Termo de Entrega e Responsabilidade de EPI — documento com valor jurídico,
 * imprimível (PDF). Inclui texto da NR-06, assinatura biométrica e o hash de
 * autenticidade (cadeia à prova de adulteração).
 *
 * O cabeçalho identifica o grupo (Construtora JUST) e a OBRA/empresa em que o
 * colaborador está alocado (razão social + CNPJ vindos do Core, snapshot da entrega).
 */
export function TermoEntrega({ e, empresaCnpj }: { e: Entrega; empresaCnpj?: string | null }) {
  const protocolo = `JSEC-EPI-${String(e.id).padStart(6, "0")}`;

  return (
    <div className="termo-print bg-white text-slate-900 mx-auto" style={{ maxWidth: "780px" }}>
      <div className="p-8 text-[13px] leading-relaxed">
        {/* Cabeçalho */}
        <header className="flex items-start justify-between border-b border-slate-300 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <img src="/logos/logo-just.png" alt="Construtora JUST" className="h-12 w-auto object-contain" />
            <div>
              <div className="font-bold text-base text-slate-900">Construtora JUST — Obra</div>
              <div className="text-sm font-semibold text-slate-800">{e.empresa_nome ?? "—"}</div>
              <div className="text-xs text-slate-600">CNPJ: {empresaCnpj ?? "—"}</div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div>Protocolo</div>
            <div className="font-mono font-semibold text-slate-800">{protocolo}</div>
          </div>
        </header>

        <h1 className="text-center font-bold text-base uppercase tracking-wide mb-1">
          Termo de Entrega e Responsabilidade de EPI
        </h1>
        <p className="text-center text-xs text-slate-600 mb-5">
          Equipamento de Proteção Individual — Norma Regulamentadora NR-06
        </p>

        {/* Colaborador */}
        <section className="mb-4">
          <h2 className="font-semibold text-slate-800 mb-1">1. Colaborador</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div><span className="text-slate-500">Nome:</span> <strong>{e.colaborador_nome}</strong></div>
            <div><span className="text-slate-500">Matrícula:</span> {e.colaborador_matricula ?? "—"}</div>
            <div><span className="text-slate-500">Função/Cargo:</span> {e.colaborador_cargo ?? "—"}</div>
            <div><span className="text-slate-500">Empresa:</span> {e.empresa_nome ?? "—"}</div>
          </div>
        </section>

        {/* EPI */}
        <section className="mb-4">
          <h2 className="font-semibold text-slate-800 mb-1">2. Equipamento entregue</h2>
          <table className="w-full border border-slate-300 border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-1 text-left">EPI</th>
                <th className="border border-slate-300 px-2 py-1 text-left">C.A.</th>
                <th className="border border-slate-300 px-2 py-1 text-center">Qtd.</th>
                <th className="border border-slate-300 px-2 py-1 text-left">Data/hora da entrega</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-1">{e.epi_nome}</td>
                <td className="border border-slate-300 px-2 py-1">{e.epi_ca ?? "—"}</td>
                <td className="border border-slate-300 px-2 py-1 text-center">{e.quantidade}</td>
                <td className="border border-slate-300 px-2 py-1">{fmtData(e.entregue_em)}</td>
              </tr>
            </tbody>
          </table>
          {e.observacao && (
            <p className="text-xs text-slate-600 mt-1">Observação: {e.observacao}</p>
          )}
        </section>

        {/* Declaração legal */}
        <section className="mb-5">
          <h2 className="font-semibold text-slate-800 mb-1">3. Declaração de recebimento e responsabilidade</h2>
          <p className="text-justify text-slate-700">
            Declaro, para os devidos fins, ter recebido gratuitamente o(s) Equipamento(s) de Proteção
            Individual (EPI) acima especificado(s), em perfeito estado de conservação e funcionamento,
            estando ciente de que, nos termos da Norma Regulamentadora NR-06 e dos artigos 158 e 166 da
            CLT, comprometo-me a: (a) utilizá-lo(s) obrigatoriamente durante toda a jornada de trabalho,
            apenas para a finalidade a que se destina(m); (b) responsabilizar-me por sua guarda e
            conservação; (c) comunicar ao empregador qualquer alteração que o(s) torne(m) impróprio(s)
            para uso; e (d) devolvê-lo(s) quando solicitado ou no desligamento. Estou ciente de que o
            não cumprimento destas obrigações constitui ato faltoso, sujeito às penalidades cabíveis.
          </p>
        </section>

        {/* Assinatura biométrica */}
        <section className="mb-5">
          <h2 className="font-semibold text-slate-800 mb-2">4. Assinatura biométrica</h2>
          <div className="flex items-end gap-4">
            <div className="border border-slate-300 rounded p-1 bg-slate-50">
              {e.assinatura_img ? (
                <img src={e.assinatura_img} alt="Impressão digital" className="w-24 h-28 object-contain" />
              ) : (
                <Fingerprint className="w-24 h-28 text-slate-300" />
              )}
            </div>
            <div className="text-xs text-slate-600 pb-1">
              <div className="flex items-center gap-1 text-slate-800 font-medium">
                <Fingerprint className="w-3.5 h-3.5" />
                {e.assinatura_tipo === "digital"
                  ? "Assinado por impressão digital"
                  : "Captura simulada (sem valor probatório)"}
              </div>
              <div>Leitor biométrico: HID DigitalPersona U.are.U 4500</div>
              <div>Coletado em: {fmtData(e.entregue_em)}</div>
              {(() => {
                const s = biometriaSelo(e);
                if (s.estado === "confirmada")
                  return (
                    <div className="text-emerald-700 font-medium">
                      Identidade verificada por biometria 1:1 (SourceAFIS · score {s.score?.toFixed(0)})
                    </div>
                  );
                if (s.estado === "nao_cadastrado")
                  return <div className="text-slate-500">Colaborador sem cadastro biométrico (não verificado).</div>;
                return null;
              })()}
            </div>
          </div>
        </section>

        {/* Autenticidade */}
        <section className="border-t border-slate-300 pt-3 text-[11px] text-slate-600">
          <h2 className="font-semibold text-slate-700 mb-1">5. Autenticidade e integridade</h2>
          <p className="mb-1">
            Documento gerado eletronicamente. A integridade deste registro é protegida por uma cadeia
            de hash criptográfico (SHA-256): qualquer alteração no conteúdo invalida a verificação.
          </p>
          <div className="font-mono break-all">
            <div><span className="text-slate-500">Hash do registro:</span> {e.hash ?? "—"}</div>
            <div><span className="text-slate-500">Hash anterior (cadeia):</span> {e.hash_anterior ?? "—"}</div>
            <div><span className="text-slate-500">Protocolo:</span> {protocolo}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

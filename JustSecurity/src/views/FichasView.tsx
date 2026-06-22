import { useState } from "react";
import {
  ShieldCheck, Search, ChevronLeft, ChevronRight, ClipboardCheck, ArrowDownCircle,
  AlertTriangle, RefreshCw, CheckCircle2, FileSignature, Clock,
} from "lucide-react";
import { useFichas, useFichaResumo, useFicha, useEpis, type Ficha } from "../hooks/useEpi";
import { statusMeta, fmtData, fmtDataHora, MOTIVO_BAIXA_LABEL, RESULTADO_INSPECAO_LABEL } from "../lib/status";
import { TIPO_CONTROLE_LABEL } from "../hooks/useEpi";
import { InspecaoModal } from "../components/InspecaoModal";
import { BaixaModal } from "../components/BaixaModal";
import { TrocaModal } from "../components/TrocaModal";
import { cn } from "../lib/utils";

type Filtro = "todas_ativas" | "troca_imediata" | "inspecionar" | "alerta" | "em_dia" | "baixadas";

const CHIPS: { value: Filtro; label: string }[] = [
  { value: "todas_ativas", label: "Ativas" },
  { value: "troca_imediata", label: "Troca imediata" },
  { value: "inspecionar", label: "Inspecionar" },
  { value: "alerta", label: "Vence em breve" },
  { value: "em_dia", label: "Em dia" },
  { value: "baixadas", label: "Baixadas" },
];

function Badge({ codigo }: { codigo: string }) {
  const m = statusMeta(codigo);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold", m.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function ResumoCard({ icon: Icon, valor, label, cor, ativo, onClick }: {
  icon: any; valor: number; label: string; cor: string; ativo: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={cn("flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-colors",
        ativo ? "border-brand-400 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-300")}>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", cor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold leading-none text-slate-900">{valor}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </button>
  );
}

export function FichasView() {
  const [filtro, setFiltro] = useState<Filtro>("todas_ativas");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const statusBack = filtro === "baixadas" ? "baixada" : "ativa";
  const { data: fichas = [], isLoading } = useFichas({ status: statusBack, q: q || undefined });
  const { data: resumo } = useFichaResumo();

  if (selected != null) return <FichaDetalhe id={selected} onBack={() => setSelected(null)} onNavigate={setSelected} />;

  const por = resumo?.por_status ?? {};
  const alerta = (por.vencimento_proximo ?? 0) + (por.inspecao_proxima ?? 0);

  const filtradas = fichas.filter((f) => {
    if (filtro === "todas_ativas" || filtro === "baixadas") return true;
    if (filtro === "alerta") return ["vencimento_proximo", "inspecao_proxima"].includes(f.status_calc.codigo);
    return f.status_calc.codigo === filtro;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-lg bg-brand-900 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fichas &amp; Validade</h1>
          <p className="text-sm text-slate-500">Status dos EPIs entregues, validade e inspeções.</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <ResumoCard icon={CheckCircle2} valor={por.em_dia ?? 0} label="Em dia" cor="bg-emerald-50 text-emerald-600"
          ativo={filtro === "em_dia"} onClick={() => setFiltro("em_dia")} />
        <ResumoCard icon={ClipboardCheck} valor={por.inspecionar ?? 0} label="A inspecionar" cor="bg-sky-50 text-sky-600"
          ativo={filtro === "inspecionar"} onClick={() => setFiltro("inspecionar")} />
        <ResumoCard icon={RefreshCw} valor={por.troca_imediata ?? 0} label="Troca imediata" cor="bg-rose-50 text-rose-600"
          ativo={filtro === "troca_imediata"} onClick={() => setFiltro("troca_imediata")} />
        <ResumoCard icon={AlertTriangle} valor={alerta} label="Vence em breve" cor="bg-amber-50 text-amber-600"
          ativo={filtro === "alerta"} onClick={() => setFiltro("alerta")} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3 bg-slate-50">
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button key={c.value} onClick={() => setFiltro(c.value)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filtro === c.value ? "bg-brand-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300")}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar colaborador ou EPI…"
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 w-64" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Carregando…</div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Nenhuma ficha neste filtro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="px-5 py-3">Colaborador</th>
                  <th className="px-5 py-3">EPI</th>
                  <th className="px-5 py-3">Controle</th>
                  <th className="px-5 py-3">Vence / Próx. inspeção</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((f) => <LinhaFicha key={f.id} f={f} onOpen={() => setSelected(f.id)} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LinhaFicha({ f, onOpen }: { f: Ficha; onOpen: () => void }) {
  const alvo = f.tipo_controle === "inspecao" ? f.proxima_inspecao_em : f.vence_em;
  const dias = f.status_calc.dias_restantes;
  return (
    <tr onClick={onOpen} className="hover:bg-slate-50 cursor-pointer group">
      <td className="px-5 py-3">
        <p className="text-sm font-medium text-slate-900">{f.colaborador_nome}</p>
        <p className="text-xs text-slate-400">{f.colaborador_cargo ?? "—"}</p>
      </td>
      <td className="px-5 py-3">
        <p className="text-sm text-slate-700">{f.epi_nome}</p>
        <p className="text-xs text-slate-400">{f.epi_ca ? `C.A. ${f.epi_ca}` : "—"}</p>
      </td>
      <td className="px-5 py-3 text-sm text-slate-600">{TIPO_CONTROLE_LABEL[f.tipo_controle] ?? f.tipo_controle}</td>
      <td className="px-5 py-3 text-sm text-slate-600">
        {fmtData(alvo)}
        {dias != null && f.status !== "baixada" && (
          <span className={cn("ml-2 text-xs", dias < 0 ? "text-rose-500" : dias <= 7 ? "text-amber-600" : "text-slate-400")}>
            {dias < 0 ? `${Math.abs(dias)}d atrás` : `em ${dias}d`}
          </span>
        )}
      </td>
      <td className="px-5 py-3"><Badge codigo={f.status_calc.codigo} /></td>
      <td className="px-5 py-3 text-right">
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 ml-auto" />
      </td>
    </tr>
  );
}

function FichaDetalhe({ id, onBack, onNavigate }: { id: number; onBack: () => void; onNavigate: (id: number) => void }) {
  const { data: ficha, isLoading } = useFicha(id);
  const { data: epis = [] } = useEpis();
  const [modal, setModal] = useState<null | "inspecao" | "baixa" | "troca">(null);

  if (isLoading || !ficha) return <div className="p-12 text-center text-slate-400">Carregando ficha…</div>;

  const ativa = ficha.status === "ativa";
  // "Inspecionável" é definido no cadastro do EPI (Core). Cai no tipo de controle
  // se o EPI não estiver mais no catálogo.
  const epi = epis.find((e) => e.id === ficha.epi_id);
  const podeInspecionar = ativa && (epi ? epi.inspecionavel : ficha.tipo_controle === "inspecao");
  const alvo = ficha.tipo_controle === "inspecao" ? ficha.proxima_inspecao_em : ficha.vence_em;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ChevronLeft className="w-4 h-4" /> Todas as fichas
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{ficha.epi_nome}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {ficha.epi_ca ? `C.A. ${ficha.epi_ca} · ` : ""}{ficha.colaborador_nome}
            {ficha.colaborador_cargo ? ` · ${ficha.colaborador_cargo}` : ""}
          </p>
        </div>
        <Badge codigo={ficha.status_calc.codigo} />
      </div>

      {/* Infos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Info label="Origem" valor={{ inicial: "Entrega inicial", complementar: "Complementar", troca: "Troca" }[ficha.origem] ?? ficha.origem} />
        <Info label="Controle" valor={TIPO_CONTROLE_LABEL[ficha.tipo_controle] ?? ficha.tipo_controle} />
        <Info label="Entregue em" valor={fmtData(ficha.entregue_em)} />
        <Info label={ficha.tipo_controle === "inspecao" ? "Próx. inspeção" : "Vence em"} valor={fmtData(alvo)} />
      </div>

      {/* Ações */}
      {ativa && (
        <div className="flex flex-wrap gap-2">
          {podeInspecionar && (
            <button onClick={() => setModal("inspecao")}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
              <ClipboardCheck className="w-4 h-4" /> Inspecionar
            </button>
          )}
          <button onClick={() => setModal("troca")}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">
            <RefreshCw className="w-4 h-4" /> Trocar EPI
          </button>
          <button onClick={() => setModal("baixa")}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
            <ArrowDownCircle className="w-4 h-4" /> Baixar
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Histórico do EPI</h2>
        </div>
        <ol className="p-5 space-y-4">
          <EventoTimeline icone={FileSignature} cor="bg-brand-100 text-brand-700"
            titulo={`Entrega — ${{ inicial: "inicial", complementar: "complementar", troca: "troca" }[ficha.origem] ?? ficha.origem}`}
            quando={ficha.entregue_em}
            detalhe={ficha.entrega ? `Assinada por digital · entrega #${ficha.entrega.id}` : undefined} />

          {ficha.inspecoes.map((i) => (
            <EventoTimeline key={i.id} icone={i.resultado.startsWith("aprovado") ? CheckCircle2 : i.resultado === "trocar" ? RefreshCw : ArrowDownCircle}
              cor={i.resultado.startsWith("aprovado") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
              titulo={`Inspeção — ${RESULTADO_INSPECAO_LABEL[i.resultado] ?? i.resultado}`}
              quando={i.data}
              detalhe={[
                i.inspetor ? `Inspetor: ${i.inspetor}${i.assinatura_img ? " (digital ✓)" : ""}` : null,
                i.observacao,
                i.proxima_inspecao_em ? `Próxima: ${fmtData(i.proxima_inspecao_em)}` : null,
              ].filter(Boolean).join(" · ") || undefined} />
          ))}

          {ficha.status === "baixada" && (
            <EventoTimeline icone={ArrowDownCircle} cor="bg-slate-200 text-slate-600"
              titulo={`Baixa — ${MOTIVO_BAIXA_LABEL[ficha.baixa_motivo ?? ""] ?? ficha.baixa_motivo}`}
              quando={ficha.baixa_em} detalhe={ficha.baixa_obs ?? undefined} />
          )}
        </ol>
      </div>

      {modal === "inspecao" && <InspecaoModal ficha={ficha} onClose={() => setModal(null)} />}
      {modal === "baixa" && <BaixaModal ficha={ficha} onClose={() => setModal(null)} />}
      {modal === "troca" && (
        <TrocaModal ficha={ficha} onClose={() => setModal(null)}
          onTrocado={(novaId) => { setModal(null); onNavigate(novaId); }} />
      )}
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{valor}</p>
    </div>
  );
}

function EventoTimeline({ icone: Icon, cor, titulo, quando, detalhe }: {
  icone: any; cor: string; titulo: string; quando?: string | null; detalhe?: string;
}) {
  return (
    <li className="flex gap-3">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full shrink-0", cor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 -mt-0.5">
        <p className="text-sm font-medium text-slate-800">{titulo}</p>
        <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
          <Clock className="w-3 h-3" /> {fmtDataHora(quando)}
        </p>
        {detalhe && <p className="text-xs text-slate-500 mt-1">{detalhe}</p>}
      </div>
    </li>
  );
}

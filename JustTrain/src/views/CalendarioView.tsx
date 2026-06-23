import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardCheck, AlertTriangle, Clock } from "lucide-react";
import { api } from "../lib/cn";

interface TurmaAgendada {
  id: string;
  treinamento_nome: string;
  treinamento_codigo?: string;
  data: string;
  instrutor?: string;
  local?: string;
  origem: string;
  entidade_externa?: string;
  _count?: { participacoes: number };
}

interface EficaciaPendente {
  id: string;
  treinamento_nome: string;
  treinamento_codigo?: string;
  data: string;
  eficacia_avaliar_em: string;
}

interface CertVencendo {
  id: string;
  colaborador_nome: string;
  colaborador_cargo?: string;
  certificado_valido_ate: string;
  turma?: { treinamento_nome: string; treinamento_codigo?: string };
}

interface CalendarioData {
  turmas_agendadas: TurmaAgendada[];
  eficacias_pendentes: EficaciaPendente[];
  certificados_vencendo: CertVencendo[];
}

function mesLabel(iso: string) {
  const [ano, mes] = iso.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[Number(mes) - 1]} ${ano}`;
}

function diasAteFmt(iso: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(iso + "T00:00:00");
  const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return `há ${-diff} dias`;
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff <= 30) return `em ${diff} dias`;
  if (diff <= 60) return "em ~1 mês";
  return `em ~${Math.round(diff / 30)} meses`;
}

function urgenciaCor(iso: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(iso + "T00:00:00");
  const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return "text-red-600";
  if (diff <= 30) return "text-red-500";
  if (diff <= 90) return "text-amber-600";
  return "text-slate-500";
}

// Agrupa uma lista de items por mês (campo `campo` = YYYY-MM-DD).
function agruparPorMes<T>(items: T[], campo: (i: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const mes = campo(item).slice(0, 7); // YYYY-MM
    if (!map.has(mes)) map.set(mes, []);
    map.get(mes)!.push(item);
  }
  return map;
}

export default function CalendarioView() {
  const cal = useQuery({ queryKey: ["calendario"], queryFn: () => api<CalendarioData>("/calendario") });

  if (cal.isLoading) return <p className="py-8 text-center text-sm text-slate-400">carregando…</p>;
  if (cal.isError) return <p className="py-8 text-center text-sm text-red-500">Erro ao carregar calendário</p>;

  const { turmas_agendadas = [], eficacias_pendentes = [], certificados_vencendo = [] } = cal.data ?? {};
  const total = turmas_agendadas.length + eficacias_pendentes.length + certificados_vencendo.length;

  const agrupadas = agruparPorMes(turmas_agendadas, (t) => t.data);
  const eficAgrp = agruparPorMes(eficacias_pendentes, (t) => t.eficacia_avaliar_em);
  const certAgrp = agruparPorMes(certificados_vencendo, (c) => c.certificado_valido_ate);

  // União ordenada de todos os meses presentes.
  const todosMeses = Array.from(
    new Set([...agrupadas.keys(), ...eficAgrp.keys(), ...certAgrp.keys()])
  ).sort();

  return (
    <div className="space-y-6">
      {/* Sumário */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <CalendarDays className="size-4 text-teal-500" /> Turmas agendadas
          </div>
          <p className="mt-1 text-2xl font-bold text-[#0f2742] dark:text-teal-300">{turmas_agendadas.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <ClipboardCheck className="size-4 text-amber-500" /> Eficácias pendentes
          </div>
          <p className="mt-1 text-2xl font-bold text-[#0f2742] dark:text-teal-300">{eficacias_pendentes.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <AlertTriangle className="size-4 text-red-500" /> Certificados vencendo
          </div>
          <p className="mt-1 text-2xl font-bold text-[#0f2742] dark:text-teal-300">{certificados_vencendo.length}</p>
        </div>
      </div>

      {total === 0 && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
          <p className="text-sm text-slate-400">Nenhum evento no horizonte de 12 meses.</p>
        </div>
      )}

      {/* Timeline por mês */}
      {todosMeses.map((mes) => {
        const turmasMes = agrupadas.get(mes) ?? [];
        const eficsMes = eficAgrp.get(mes) ?? [];
        const certsMes = certAgrp.get(mes) ?? [];
        return (
          <section key={mes} className="rounded-xl bg-white shadow-sm dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 bg-[#0f2742] px-5 py-2.5">
              <CalendarDays className="size-4 text-amber-300" />
              <span className="text-sm font-semibold text-white">{mesLabel(mes)}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Turmas agendadas */}
              {turmasMes.map((t) => (
                <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-teal-500" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                        {t.treinamento_codigo ? `${t.treinamento_codigo} · ` : ""}{t.treinamento_nome}
                      </span>
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                        agendado
                      </span>
                      {t.origem === "externa" && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                          Externo{t.entidade_externa ? `: ${t.entidade_externa}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t.data}{t.instrutor ? ` · ${t.instrutor}` : ""}{t.local ? ` · ${t.local}` : ""}
                      {t._count ? ` · ${t._count.participacoes} participantes` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-teal-600 font-medium">{diasAteFmt(t.data)}</span>
                </div>
              ))}

              {/* Eficácias pendentes */}
              {eficsMes.map((t) => (
                <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                        {t.treinamento_codigo ? `${t.treinamento_codigo} · ` : ""}{t.treinamento_nome}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        eficácia pendente
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Turma: {t.data} · avaliar em {t.eficacia_avaliar_em}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${urgenciaCor(t.eficacia_avaliar_em)}`}>
                    {diasAteFmt(t.eficacia_avaliar_em)}
                  </span>
                </div>
              ))}

              {/* Certificados vencendo */}
              {certsMes.map((c) => (
                <div key={c.id} className="flex items-start gap-3 px-5 py-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                        {c.colaborador_nome}
                      </span>
                      {c.colaborador_cargo && (
                        <span className="text-xs text-slate-400">{c.colaborador_cargo}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {c.turma?.treinamento_codigo ? `${c.turma.treinamento_codigo} · ` : ""}{c.turma?.treinamento_nome ?? "—"}
                      · vence {c.certificado_valido_ate}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${urgenciaCor(c.certificado_valido_ate)}`}>
                    {diasAteFmt(c.certificado_valido_ate)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

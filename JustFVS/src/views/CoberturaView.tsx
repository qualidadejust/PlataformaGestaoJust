import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3x3, AlertTriangle } from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { STATUS, derivarStatus, statusRepresentativo, type QualidadeStatus } from "../lib/qualidade.ts";
import type { Obra, Tarefa, FormularioInstancia, FormularioModelo } from "../lib/types.ts";

// Uma coluna = um Local (zona/pavimento). Agrupamos as colunas por zona no cabeçalho.
interface Coluna {
  localId: string;
  zona: string;
  pavimento: string;
}

interface Celula {
  status: QualidadeStatus | null; // null = combinação serviço×local não existe no cronograma
  tarefaIds: string[];
}

export default function CoberturaView() {
  const { data: obras } = useQuery<Obra[]>({ queryKey: ["obras"], queryFn: () => api("/obras") });
  const [obraId, setObraId] = useState("");

  const { data: tarefas, isLoading: loadingTarefas } = useQuery<Tarefa[]>({
    queryKey: ["tarefas", obraId],
    queryFn: () => api(`/tarefas?obra_id=${obraId}`),
    enabled: !!obraId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: instancias } = useQuery<FormularioInstancia[]>({
    queryKey: ["fvs-instancias-obra", obraId],
    queryFn: () => api(`/formularios/instancias?escopo=fvs&entidade_tipo=tarefa`),
    enabled: !!obraId,
    staleTime: 60 * 1000,
    select: (todas) => todas.filter((i) => i.entidade_label?.startsWith(`obra:${obraId}`)),
  });

  const { data: bloqueios } = useQuery<Record<string, string>>({
    queryKey: ["fvs-gate-lote", obraId],
    queryFn: () => api(`/formularios/gate/lote?obra_id=${obraId}`),
    enabled: !!obraId,
    staleTime: 60 * 1000,
  });

  // Modelos FVS publicados → conjunto de siglas que TÊM modelo (para marcar "sem modelo")
  const { data: modelos } = useQuery<FormularioModelo[]>({
    queryKey: ["fvs-modelos-publicados"],
    queryFn: () => api(`/formularios?escopo=fvs&publicado=true`),
    staleTime: 5 * 60 * 1000,
  });
  const siglasComModelo = useMemo(
    () => new Set((modelos ?? []).map((m) => m.servico_sigla).filter(Boolean) as string[]),
    [modelos],
  );

  // instâncias por tarefa
  const instPorTarefa = useMemo(() => {
    const m = new Map<string, FormularioInstancia[]>();
    for (const i of instancias ?? []) {
      if (!i.entidade_id) continue;
      if (!m.has(i.entidade_id)) m.set(i.entidade_id, []);
      m.get(i.entidade_id)!.push(i);
    }
    return m;
  }, [instancias]);

  // Colunas (locais) e linhas (serviços)
  const { colunas, servicos, matriz, resumo } = useMemo(() => {
    const colsMap = new Map<string, Coluna>();
    const servMap = new Map<string, string>(); // sigla -> nome
    const cell = new Map<string, Celula>(); // `${sigla}|${localId}` -> celula

    for (const t of tarefas ?? []) {
      const sigla = t.servico?.sigla_prancha;
      if (!sigla || !t.local) continue;
      colsMap.set(t.local.id, { localId: t.local.id, zona: t.local.zona, pavimento: t.local.pavimento });
      servMap.set(sigla, t.servico.nome ?? sigla);

      const inst = instPorTarefa.get(t.id) ?? [];
      const bloqueada = !!bloqueios?.[t.id];
      const temModelo = siglasComModelo.has(sigla);
      const st = derivarStatus(inst, bloqueada, temModelo);

      const key = `${sigla}|${t.local.id}`;
      const prev = cell.get(key);
      if (prev) {
        prev.tarefaIds.push(t.id);
        prev.status = statusRepresentativo([prev.status!, st]);
      } else {
        cell.set(key, { status: st, tarefaIds: [t.id] });
      }
    }

    const colunas = [...colsMap.values()].sort(
      (a, b) => a.zona.localeCompare(b.zona) || a.pavimento.localeCompare(b.pavimento, "pt-BR", { numeric: true }),
    );
    const servicos = [...servMap.entries()].map(([sigla, nome]) => ({ sigla, nome })).sort((a, b) => a.sigla.localeCompare(b.sigla));

    const matriz = new Map<string, Celula>();
    for (const [k, v] of cell) matriz.set(k, v);

    // Resumo de cobertura
    let previstas = 0, conformes = 0, semModelo = 0, comNc = 0, aAbrir = 0;
    for (const c of cell.values()) {
      previstas++;
      if (c.status === "conforme") conformes++;
      else if (c.status === "sem_modelo") semModelo++;
      else if (c.status === "pendencia_nc") comNc++;
      else if (c.status === "a_abrir" || c.status === "bloqueada" || c.status === "rascunho") aAbrir++;
    }
    const pctCobertura = previstas ? Math.round((conformes / previstas) * 100) : 0;

    return { colunas, servicos, matriz, resumo: { previstas, conformes, semModelo, comNc, aAbrir, pctCobertura } };
  }, [tarefas, instPorTarefa, bloqueios, siglasComModelo]);

  // Agrupa colunas por zona (para o cabeçalho em 2 níveis)
  const zonas = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of colunas) m.set(c.zona, (m.get(c.zona) ?? 0) + 1);
    return [...m.entries()];
  }, [colunas]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra</label>
        <select
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecione a obra…</option>
          {obras?.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>

      {!obraId && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <Grid3x3 className="mx-auto mb-2 size-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400">Selecione uma obra para ver a cobertura de FVS por serviço × local.</p>
        </div>
      )}

      {obraId && loadingTarefas && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Montando matriz de cobertura…
        </div>
      )}

      {obraId && !loadingTarefas && servicos.length > 0 && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <ResumoCard label="Cobertura conforme" valor={`${resumo.pctCobertura}%`} destaque />
            <ResumoCard label="Células previstas" valor={resumo.previstas} />
            <ResumoCard label="A abrir/pendente" valor={resumo.aAbrir} cor="text-slate-600 dark:text-slate-300" />
            <ResumoCard label="Com NC" valor={resumo.comNc} cor="text-red-600 dark:text-red-400" />
            <ResumoCard label="Sem modelo" valor={resumo.semModelo} cor="text-orange-600 dark:text-orange-400" />
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {(Object.keys(STATUS) as QualidadeStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn("inline-block size-3 rounded-sm", STATUS[s].solida)} />
                {STATUS[s].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-sm border border-dashed border-slate-300 dark:border-slate-600" />
              Não previsto
            </span>
          </div>

          {resumo.semModelo > 0 && (
            <p className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              <AlertTriangle className="size-3.5 shrink-0" />
              Há serviços previstos sem modelo FVS publicado. Cadastre e publique o modelo no JustCore → Formulários para poder verificá-los.
            </p>
          )}

          {/* Matriz */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Serviço
                  </th>
                  {zonas.map(([zona, span]) => (
                    <th key={zona} colSpan={span} className="border-l border-slate-200 bg-slate-50 px-2 py-1 text-center font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                      {zona}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-100 px-3 py-1 dark:bg-slate-800" />
                  {colunas.map((c) => (
                    <th key={c.localId} className="border-l border-t border-slate-200 bg-slate-50 px-2 py-1 text-center font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900/60" title={`${c.zona} / ${c.pavimento}`}>
                      {c.pavimento}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.sigla} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-teal-700 dark:bg-slate-900 dark:text-teal-400" title={s.nome}>
                      {s.sigla}
                    </td>
                    {colunas.map((c) => {
                      const cel = matriz.get(`${s.sigla}|${c.localId}`);
                      if (!cel || !cel.status) {
                        return <td key={c.localId} className="border-l border-slate-100 bg-white p-0 dark:border-slate-800 dark:bg-slate-900" />;
                      }
                      const cfg = STATUS[cel.status];
                      return (
                        <td key={c.localId} className="border-l border-slate-100 p-1 text-center dark:border-slate-800">
                          <span
                            className={cn("mx-auto block size-5 rounded-sm", cfg.solida)}
                            title={`${s.sigla} · ${c.zona}/${c.pavimento} — ${cfg.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            {servicos.length} serviço(s) × {colunas.length} local(is). Cada célula é a combinação serviço×local prevista no cronograma; célula em branco = não previsto.
          </p>
        </>
      )}

      {obraId && !loadingTarefas && servicos.length === 0 && (
        <p className="text-sm text-slate-400">Nenhuma tarefa encontrada para esta obra. Importe o cronograma Prevision primeiro (Core → Integrações).</p>
      )}
    </div>
  );
}

function ResumoCard({ label, valor, cor, destaque }: { label: string; valor: string | number; cor?: string; destaque?: boolean }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-center", destaque ? "border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40" : "border-slate-200 dark:border-slate-800")}>
      <p className={cn("text-2xl font-bold", destaque ? "text-teal-700 dark:text-teal-300" : cor ?? "text-slate-700 dark:text-slate-200")}>{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

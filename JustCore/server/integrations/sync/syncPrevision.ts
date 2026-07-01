import { prisma } from "../../lib/prisma.ts";
import { mapPrevisionRows, type MappedTarefa } from "../mappers/prevision.ts";
import { parsePrevisionCsv, type PrevisionRow } from "../previsionClient.ts";

export interface SyncResult {
  locais: { created: number; updated: number };
  servicos: { created: number; updated: number };
  tarefas: { created: number; updated: number };
  errors: string[];
}

/**
 * Upsert idempotente (RI-01): processa as linhas do Prevision e sincroniza
 * Local, Servico e Tarefa no Core. Pode ser chamado N vezes com o mesmo input.
 */
export async function syncPrevision(
  rows: PrevisionRow[],
  obra_id: string
): Promise<SyncResult> {
  const result: SyncResult = {
    locais: { created: 0, updated: 0 },
    servicos: { created: 0, updated: 0 },
    tarefas: { created: 0, updated: 0 },
    errors: [],
  };

  const { locais, servicos, tarefas } = mapPrevisionRows(rows, obra_id);

  // 1. Upsert Locais
  const localIdMap = new Map<string, string>(); // "zona||pavimento" → id
  for (const l of locais) {
    try {
      const record = await (prisma as any).local.upsert({
        where: { obra_id_zona_pavimento: { obra_id: l.obra_id, zona: l.zona, pavimento: l.pavimento } },
        update: { nome: l.nome },
        create: l,
      });
      localIdMap.set(`${l.zona}||${l.pavimento}`, record.id);
      // distingue se foi criado ou atualizado
      const age = Date.now() - new Date(record.created_at).getTime();
      if (age < 5000) result.locais.created++;
      else result.locais.updated++;
    } catch (e) {
      result.errors.push(`Local (${l.zona}/${l.pavimento}): ${(e as Error).message}`);
    }
  }

  // 2. Upsert Servicos (por sigla_prancha — chave única global)
  const servicoIdMap = new Map<string, string>(); // sigla → id
  for (const s of servicos) {
    try {
      const record = await (prisma as any).servico.upsert({
        where: { sigla_prancha: s.sigla_prancha },
        update: { nome: s.nome },
        create: s,
      });
      servicoIdMap.set(s.sigla_prancha, record.id);
      const age = Date.now() - new Date(record.created_at).getTime();
      if (age < 5000) result.servicos.created++;
      else result.servicos.updated++;
    } catch (e) {
      result.errors.push(`Servico (${s.sigla_prancha}): ${(e as Error).message}`);
    }
  }

  // 3. Upsert Tarefas
  for (const t of tarefas) {
    const local_id = localIdMap.get(`${t.zona}||${t.pavimento}`);
    const servico_id = servicoIdMap.get(t.sigla_prancha);

    if (!local_id || !servico_id) {
      result.errors.push(`Tarefa ${t.external_id}: local ou serviço não resolvido`);
      continue;
    }

    const data = buildTarefaData(t, local_id, servico_id);
    try {
      const record = await (prisma as any).tarefa.upsert({
        where: { external_id: t.external_id },
        update: {
          baseline_inicio: data.baseline_inicio,
          baseline_fim: data.baseline_fim,
          real_inicio: data.real_inicio,
          real_fim: data.real_fim,
          duracao: data.duracao,
          critico: data.critico,
          predecessores: data.predecessores,
          successores: data.successores,
          material_resources: data.material_resources,
          job: data.job,
        },
        create: data,
      });
      const age = Date.now() - new Date(record.created_at).getTime();
      if (age < 5000) result.tarefas.created++;
      else result.tarefas.updated++;
    } catch (e) {
      result.errors.push(`Tarefa ${t.external_id}: ${(e as Error).message}`);
    }
  }

  return result;
}

function buildTarefaData(t: MappedTarefa, local_id: string, servico_id: string) {
  return {
    obra_id: t.obra_id,
    local_id,
    servico_id,
    external_id: t.external_id,
    origem: t.origem,
    job: t.job,
    baseline_inicio: t.baseline_inicio,
    baseline_fim: t.baseline_fim,
    real_inicio: t.real_inicio,
    real_fim: t.real_fim,
    duracao: t.duracao,
    critico: t.critico,
    predecessores: t.predecessores,
    successores: t.successores,
    material_resources: t.material_resources,
  };
}

// Importador do cronograma Prevision (linha de base) → Core + JustVistoria. Idempotente.
//
// Uso:  npm run import -- [caminho-do-csv]
//   ex: npm run import -- "C:/Users/.../cronograma_blank-residence-by-just.csv"
//   env: OBRA_NOME (default "Blank Residence"), PREVISION_CSV, CORE_URL, INTERNAL_TOKEN
//
// O que faz:
//   1) garante a OBRA no Core (acha por nome ou cria);
//   2) cria as UNIDADES vendáveis no Core (roster das tarefas "PER - UNIDADE NNN"), idempotente;
//   3) grava as tarefas em CronogramaTarefa (app), ligando unidade_id quando a tarefa é da unidade.
//   Fonte trocável (CSV hoje, API amanhã) — ver server/lib/cronograma.ts.
import "dotenv/config";
import { prisma } from "../server/lib/prisma.ts";
import { CsvFonte } from "../server/lib/cronograma.ts";
import { coreObras, coreUnidades, corePost, type CoreRef } from "../server/core.ts";

const db = prisma as any;
const OBRA_NOME = process.env.OBRA_NOME ?? "Blank Residence";
const CSV = process.argv[2] ?? process.env.PREVISION_CSV ?? "prisma/data/cronograma.csv";

async function main() {
  console.log(`Fonte: CSV (${CSV})  |  Obra: ${OBRA_NOME}`);
  const fonte = new CsvFonte(CSV);
  const tarefas = await fonte.listar();
  console.log(`Tarefas lidas: ${tarefas.length}`);

  // 1) Obra no Core
  const obras = await coreObras();
  let obra = obras.find((o: CoreRef) => (o.nome as string)?.toLowerCase() === OBRA_NOME.toLowerCase());
  if (!obra) {
    obra = (await corePost<CoreRef>("/api/obras", { nome: OBRA_NOME, tipo: "obra", status: "ativa" })) ?? undefined;
    if (!obra) throw new Error("Não consegui criar a obra no Core. O Core está no ar e o INTERNAL_TOKEN confere?");
    console.log(`Obra criada no Core: ${obra.id}`);
  } else {
    console.log(`Obra encontrada no Core: ${obra.id}`);
  }
  const obra_id = obra.id;

  // 2) Unidades vendáveis (roster) no Core
  const roster = new Map<string, string>(); // numero -> pavimento
  for (const t of tarefas) if (t.unidade_numero && t.pavimento) roster.set(t.unidade_numero, t.pavimento);
  console.log(`Unidades no roster: ${roster.size}`);

  const existentes = (await coreUnidades()).filter((u: CoreRef) => u.obra_id === obra_id);
  const porIdent = new Map(existentes.map((u: CoreRef) => [u.identificador as string, u]));
  const numeroParaId = new Map<string, string>();

  for (const [numero, pavimento] of [...roster.entries()].sort()) {
    const identificador = `APTO ${numero}`;
    const achada = porIdent.get(identificador) as CoreRef | undefined;
    if (achada) {
      numeroParaId.set(numero, achada.id);
      continue;
    }
    const criada = await corePost<CoreRef>("/api/unidades", {
      obra_id,
      identificador,
      categoria: "apartamento",
      pavimento,
      codigo: numero,
    });
    if (criada) {
      numeroParaId.set(numero, criada.id);
      console.log(`  + Unidade ${identificador}`);
    }
  }

  // 3) Cronograma no app (upsert por prevision_id)
  let gravadas = 0;
  for (const t of tarefas) {
    if (!t.prevision_id) continue;
    const unidade_id = t.unidade_numero ? numeroParaId.get(t.unidade_numero) ?? null : null;
    await db.cronogramaTarefa.upsert({
      where: { prevision_id: t.prevision_id },
      update: { servico: t.servico, pacote: t.pacote, job: t.job, local: t.local, inicio: t.inicio, fim: t.fim, critico: t.critico, predecessores: t.predecessores, obra_id, unidade_id },
      create: { prevision_id: t.prevision_id, servico: t.servico, pacote: t.pacote, job: t.job, local: t.local, inicio: t.inicio, fim: t.fim, critico: t.critico, predecessores: t.predecessores, obra_id, unidade_id },
    });
    gravadas++;
  }
  console.log(`Cronograma gravado: ${gravadas} tarefa(s). Unidades vinculadas: ${numeroParaId.size}.`);
  console.log("OK. Abra o JustVistoria e inicie o pipeline de uma unidade.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Falha no import:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

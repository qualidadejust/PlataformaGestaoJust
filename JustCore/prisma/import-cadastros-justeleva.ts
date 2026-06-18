/**
 * Transfere para o Core os CADASTROS/REFERÊNCIA que ainda viviam só no JustEleva:
 *  - Catálogo de INDICADORES (SMART) — IDs preservados (p/ as atribuições do
 *    JustEleva ligarem ao Core quando o app for religado).
 *  - SETORES — normalizados a partir dos setores dos indicadores + departamentos
 *    dos colaboradores.
 * Não move dados transacionais (atribuições, realizações, avaliações).
 * Reexecutável (reseta indicadores/setores do Core e recarrega).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { prisma } from "../server/lib/prisma.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JL_DB = path.resolve(__dirname, "../../JustEleva/app/prisma/dev.db");

async function main() {
  const jl = new Database(JL_DB, { readonly: true });
  const indicadores = jl.prepare("SELECT * FROM indicadores").all() as any[];
  const departamentos = (jl.prepare("SELECT DISTINCT department AS d FROM employees WHERE department IS NOT NULL").all() as any[])
    .map((r) => r.d as string);
  jl.close();

  // setores dos colaboradores que já estão no Core
  const colabs = await prisma.colaborador.findMany({ select: { setor: true } });

  // -------- SETORES (união normalizada) --------
  const nomesSetor = new Set<string>();
  for (const i of indicadores) if (i.setor) nomesSetor.add(String(i.setor).trim());
  for (const d of departamentos) if (d) nomesSetor.add(String(d).trim());
  for (const c of colabs) if (c.setor) nomesSetor.add(String(c.setor).trim());

  await prisma.setor.deleteMany();
  for (const nome of [...nomesSetor].sort()) {
    await prisma.setor.create({ data: { nome } });
  }

  // -------- INDICADORES (catálogo, id preservado) --------
  await prisma.indicador.deleteMany();
  for (const i of indicadores) {
    await prisma.indicador.create({
      data: {
        id: i.id,
        nome: i.nome,
        descricao: i.descricao ?? null,
        setor: i.setor ?? null,
        unidade: i.unidade ?? null,
        direcao: i.direcao ?? "maior",
        meta: i.meta ?? null,
        periodicidade: i.periodicidade ?? null,
        formula: i.formula ?? null,
        responsavel: i.responsavel ?? null,
        cargo_alvo: i.cargo_alvo ?? null,
        acumula: !!i.acumula,
        ativo: i.ativo == null ? true : !!i.ativo,
      },
    });
  }

  console.log("=== Cadastros transferidos do JustEleva ===");
  console.log(`Setores:     ${await prisma.setor.count()}`);
  console.log(`Indicadores: ${await prisma.indicador.count()}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

// Repara o mojibake (UTF-8 gravado como Latin-1) nos dados do backbone já importados do Prevision.
// Idempotente: só atualiza linhas onde fixMojibake muda o valor. Seguro rodar N vezes.
// Uso: npm run db:fix-mojibake
import { prisma } from "../server/lib/prisma.ts";
import { fixMojibake } from "../server/lib/fix-mojibake.ts";

const db = prisma as any;

async function repararTabela(
  nome: string,
  registros: any[],
  campos: string[],
  update: (id: string, data: Record<string, string>) => Promise<any>,
) {
  let alteradas = 0;
  let erros = 0;
  for (const r of registros) {
    const data: Record<string, string> = {};
    for (const c of campos) {
      const antes = r[c];
      if (typeof antes !== "string") continue;
      const depois = fixMojibake(antes);
      if (depois !== antes) data[c] = depois;
    }
    if (Object.keys(data).length === 0) continue;
    try {
      await update(r.id, data);
      alteradas++;
    } catch (e) {
      erros++;
      console.warn(`  ! ${nome} ${r.id}: ${(e as Error).message}`);
    }
  }
  console.log(`${nome}: ${alteradas} corrigido(s)${erros ? ` · ${erros} erro(s)` : ""} (de ${registros.length})`);
  return alteradas;
}

async function main() {
  const servicos = await db.servico.findMany();
  const locais = await db.local.findMany();
  const tarefas = await db.tarefa.findMany();

  let total = 0;
  total += await repararTabela("Servico", servicos, ["nome", "sigla_prancha"],
    (id, data) => db.servico.update({ where: { id }, data }));
  total += await repararTabela("Local", locais, ["zona", "pavimento", "nome"],
    (id, data) => db.local.update({ where: { id }, data }));
  total += await repararTabela("Tarefa", tarefas, ["job", "material_resources"],
    (id, data) => db.tarefa.update({ where: { id }, data }));

  console.log(`\nTotal: ${total} registro(s) corrigido(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

/**
 * Backfill idempotente: cria Obras a partir dos centros de custo existentes
 * e aloca cada colaborador na obra correspondente (alocação principal).
 *
 * Rodar com: npx tsx prisma/backfill-obras.ts
 * Pode rodar várias vezes sem duplicar (usa upsert por cost_center e
 * checa alocação existente antes de criar).
 */
import { prisma } from '../server/lib/prisma.js';

// Nome amigável + tipo por centro de custo conhecido. Os demais entram como obra.
const KNOWN: Record<string, { nome: string; tipo: 'obra' | 'sede' }> = {
  'BLANK RESIDENCE BY JUST': { nome: 'Blank Residence', tipo: 'obra' },
  'MATERA EMPREEND. IMOBILIARIOS SPE LTDA.': { nome: 'Matera', tipo: 'obra' },
  'JUST CONST E EMP - GFIP 150': { nome: 'JUST · Sede / Administrativo', tipo: 'sede' },
};

function inferPapel(role: string, tipo: 'obra' | 'sede'): string {
  if (tipo === 'sede') return 'administrativo';
  const r = role.toLowerCase();
  if (/mestre/.test(r)) return 'mestre';
  if (/engenheiro|residente/.test(r)) return 'residente';
  return 'mao_de_obra';
}

async function main() {
  const employees = await prisma.employee.findMany();
  const centers = [...new Set(employees.map(e => e.cost_center).filter((c): c is string => !!c))];

  // 1) cria/atualiza uma Obra por centro de custo
  const obraByCenter = new Map<string, string>();
  for (const cc of centers) {
    const meta = KNOWN[cc] ?? { nome: cc, tipo: 'obra' as const };
    const obra = await prisma.obra.upsert({
      where: { cost_center: cc },
      update: {}, // não sobrescreve nome editado manualmente
      create: { nome: meta.nome, cost_center: cc, tipo: meta.tipo, status: 'ativa' },
    });
    obraByCenter.set(cc, obra.id);
  }

  // 2) aloca cada colaborador com cost_center na obra (principal), se ainda não tiver
  let criadas = 0;
  for (const e of employees) {
    if (!e.cost_center) continue;
    const obraId = obraByCenter.get(e.cost_center);
    if (!obraId) continue;
    const ja = await prisma.alocacao.findFirst({ where: { employee_id: e.id, obra_id: obraId } });
    if (ja) continue;
    const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { tipo: true } });
    await prisma.alocacao.create({
      data: {
        employee_id: e.id,
        obra_id: obraId,
        papel_na_obra: inferPapel(e.role, (obra?.tipo as 'obra' | 'sede') ?? 'obra'),
        principal: true,
        data_inicio: e.admission_date ?? null,
      },
    });
    criadas++;
  }

  const totalObras = await prisma.obra.count();
  const totalAloc = await prisma.alocacao.count();
  console.log(`Obras: ${totalObras} | Alocações totais: ${totalAloc} | criadas agora: ${criadas}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

import { prisma } from "../server/lib/prisma.ts";

async function main() {
  const jaTem = await prisma.empresa.count();
  if (jaTem > 0) {
    console.log("Seed ignorado: já existem empresas cadastradas.");
    return;
  }

  // ---- Empresas ----
  const just = await prisma.empresa.create({
    data: {
      razao_social: "Construtora JUST Ltda",
      nome_fantasia: "Construtora JUST",
      cnpj: "12.345.678/0001-90",
      cidade: "São Paulo",
      uf: "SP",
    },
  });
  const justInc = await prisma.empresa.create({
    data: {
      razao_social: "JUST Incorporações Ltda",
      nome_fantasia: "JUST Incorporações",
      cnpj: "12.345.678/0002-70",
      cidade: "São Paulo",
      uf: "SP",
    },
  });

  // ---- Cargos ----
  const cargosDef = [
    { nome: "Servente", nivel: "operacional" },
    { nome: "Pedreiro", nivel: "operacional" },
    { nome: "Eletricista", nivel: "tecnico" },
    { nome: "Mestre de Obras", nivel: "lideranca" },
    { nome: "Engenheiro Residente", nivel: "lideranca" },
    { nome: "Auxiliar Administrativo", nivel: "administrativo" },
    { nome: "Diretor", nivel: "diretoria" },
  ];
  const cargos: Record<string, string> = {};
  for (const c of cargosDef) {
    const row = await prisma.cargo.create({ data: c });
    cargos[c.nome] = row.id;
  }

  // ---- Obras / Centros de custo ----
  const obraCentro = await prisma.obra.create({
    data: { nome: "Obra Centro", cost_center: "OBR-001", tipo: "obra", empresa_id: just.id, cidade: "São Paulo", uf: "SP" },
  });
  const obraNorte = await prisma.obra.create({
    data: { nome: "Obra Norte", cost_center: "OBR-002", tipo: "obra", empresa_id: justInc.id, cidade: "Guarulhos", uf: "SP" },
  });
  await prisma.obra.create({
    data: { nome: "Sede Administrativa", cost_center: "SEDE-000", tipo: "sede", empresa_id: just.id, cidade: "São Paulo", uf: "SP" },
  });

  // ---- Colaboradores (+ alocação principal) ----
  const colabsDef = [
    { nome: "João da Silva", matricula: "0001", cargo: "Pedreiro", obra: obraCentro.id, papel: "mao_de_obra" },
    { nome: "Maria Oliveira", matricula: "0002", cargo: "Mestre de Obras", obra: obraCentro.id, papel: "mestre", responsavel: true, lider: true },
    { nome: "Carlos Souza", matricula: "0003", cargo: "Servente", obra: obraNorte.id, papel: "mao_de_obra" },
    { nome: "Ana Pereira", matricula: "0004", cargo: "Eletricista", obra: obraNorte.id, papel: "mao_de_obra" },
    { nome: "Roberto Lima", matricula: "0005", cargo: "Engenheiro Residente", obra: obraNorte.id, papel: "residente", responsavel: true, lider: true },
  ];
  for (const c of colabsDef) {
    const colab = await prisma.colaborador.create({
      data: {
        nome: c.nome,
        matricula: c.matricula,
        cargo_id: cargos[c.cargo],
        empresa_id: just.id,
        is_lideranca: c.lider ?? false,
        data_admissao: "2024-01-15",
      },
    });
    await prisma.alocacao.create({
      data: {
        colaborador_id: colab.id,
        obra_id: c.obra,
        papel_na_obra: c.papel,
        principal: true,
        responsavel: c.responsavel ?? false,
      },
    });
  }

  // ---- Fornecedores ----
  const forn1 = await prisma.fornecedor.create({
    data: { nome: "EPI Brasil Distribuidora", cnpj: "98.765.432/0001-10", contato: "Vendas", telefone: "(11) 4000-1000" },
  });
  const forn2 = await prisma.fornecedor.create({
    data: { nome: "MaterCon Materiais de Construção", cnpj: "98.765.432/0001-29", contato: "Comercial" },
  });

  // ---- Insumos (EPIs com C.A. + materiais) ----
  const insumos = [
    { nome: "Capacete de segurança", categoria: "epi", unidade: "un", ca: "CA 31469", validade_dias: 1825, fornecedor_id: forn1.id },
    { nome: "Luva de raspa", categoria: "epi", unidade: "par", ca: "CA 28011", validade_dias: 180, fornecedor_id: forn1.id },
    { nome: "Botina de segurança", categoria: "epi", unidade: "par", ca: "CA 42007", validade_dias: 365, fornecedor_id: forn1.id },
    { nome: "Óculos de proteção", categoria: "epi", unidade: "un", ca: "CA 15700", validade_dias: 365, fornecedor_id: forn1.id },
    { nome: "Protetor auricular", categoria: "epi", unidade: "par", ca: "CA 5745", validade_dias: 180, fornecedor_id: forn1.id },
    { nome: "Cimento CP-II 50kg", categoria: "material", unidade: "un", fornecedor_id: forn2.id },
    { nome: "Areia média", categoria: "material", unidade: "m2", fornecedor_id: forn2.id },
    { nome: "Furadeira de impacto", categoria: "ferramenta", unidade: "un", fornecedor_id: forn2.id },
  ];
  for (const i of insumos) await prisma.insumo.create({ data: i });

  console.log("Seed concluído:");
  console.log(`  empresas: ${await prisma.empresa.count()}`);
  console.log(`  cargos: ${await prisma.cargo.count()}`);
  console.log(`  obras: ${await prisma.obra.count()}`);
  console.log(`  colaboradores: ${await prisma.colaborador.count()}`);
  console.log(`  alocacoes: ${await prisma.alocacao.count()}`);
  console.log(`  fornecedores: ${await prisma.fornecedor.count()}`);
  console.log(`  insumos: ${await prisma.insumo.count()}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

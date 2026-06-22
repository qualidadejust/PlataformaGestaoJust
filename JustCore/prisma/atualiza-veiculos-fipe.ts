// Atualiza a frota com os dados da tabela FIPE/estudo de frota e cadastra a Montana.
// Re-executável (upsert por placa). Uso: npx tsx prisma/atualiza-veiculos-fipe.ts
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

// placa atual no banco -> dados corretos (imagem FIPE). placa_nova ajusta divergências.
const ALVOS: {
  placa: string; // placa para localizar no banco (null = só por identificacao)
  placa_nova?: string;
  identificacao: string;
  modelo: string;
  marca: string;
  tipo: string;
  ano: number;
  combustivel: string;
  fipe_codigo: string;
  valor_fipe: number;
  criarSeNaoExistir?: boolean;
  novoStatus?: string;
}[] = [
  {
    placa: "AZK-3266",
    identificacao: "GOL AZK",
    modelo: "Gol Trendline 1.6 T. Flex 8V 5p",
    marca: "Volkswagen",
    tipo: "carro",
    ano: 2015,
    combustivel: "flex",
    fipe_codigo: "005397-0",
    valor_fipe: 41034,
  },
  {
    placa: "AZK-3269",
    identificacao: "SAVEIRO AZK",
    modelo: "Saveiro Trendline 1.6 T. Flex 8V (CS)",
    marca: "Volkswagen",
    tipo: "utilitario",
    ano: 2015,
    combustivel: "flex",
    fipe_codigo: "005386-4",
    valor_fipe: 45505,
  },
  {
    placa: "AUB-5111", // banco atual; imagem traz AUB-6891 -> corrige a placa
    placa_nova: "AUB-6891",
    identificacao: "SAVEIRO AUB",
    modelo: "Saveiro 1.6 Mi Total Flex 8V (CE)",
    marca: "Volkswagen",
    tipo: "utilitario",
    ano: 2012,
    combustivel: "flex",
    fipe_codigo: "005298-1",
    valor_fipe: 40689,
  },
  {
    placa: "AYZ4E57",
    identificacao: "MONTANA AYZ",
    modelo: "Montana LS 1.4 Econoflex 8V",
    marca: "Chevrolet",
    tipo: "utilitario",
    ano: 2015,
    combustivel: "flex",
    fipe_codigo: "004370-2",
    valor_fipe: 43896,
    criarSeNaoExistir: true,
    novoStatus: "ativo",
  },
];

async function main() {
  for (const v of ALVOS) {
    const existente = await db.veiculo.findUnique({ where: { placa: v.placa } });
    const dados = {
      placa: v.placa_nova ?? v.placa,
      identificacao: v.identificacao,
      modelo: v.modelo,
      marca: v.marca,
      tipo: v.tipo,
      ano: v.ano,
      combustivel: v.combustivel,
      fipe_codigo: v.fipe_codigo,
      valor_fipe: v.valor_fipe,
      ...(v.novoStatus ? { status: v.novoStatus } : {}),
    };

    if (existente) {
      await db.veiculo.update({ where: { id: existente.id }, data: dados });
      console.log(`atualizado: ${v.identificacao} (${v.placa}${v.placa_nova ? ` -> ${v.placa_nova}` : ""}) FIPE ${v.fipe_codigo} R$ ${v.valor_fipe}`);
    } else if (v.criarSeNaoExistir) {
      await db.veiculo.create({ data: { ...dados, status: v.novoStatus ?? "ativo" } });
      console.log(`criado: ${v.identificacao} (${dados.placa}) FIPE ${v.fipe_codigo} R$ ${v.valor_fipe}`);
    } else {
      console.warn(`NÃO encontrado e não marcado p/ criação: ${v.identificacao} (${v.placa}) — pulado`);
    }
  }

  const total = await db.veiculo.count();
  console.log(`\nveículos no Core: ${total}`);
}

main().finally(() => db.$disconnect());

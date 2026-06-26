// Seed do JustVistoria: modelo de checklist FVC (Ficha de Vistoria do Cliente / inspeção
// final interna). Idempotente por (codigo, versao). Uso: npm run db:seed
// Grupos alinhados aos pacotes de acabamento do cronograma Prevision (PIN, CER, PIS, POR,
// ESQ, MET, BAC, FOR, ILUM/TOMADAS, GAS, LIM...).
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

const FVC = {
  codigo: "FVC",
  nome: "FVC — Ficha de Vistoria do Cliente (inspeção final)",
  versao: 1,
  estrutura: [
    { grupo: "OBSERVAÇÕES", itens: ["De acordo com o manual descritivo / memorial"] },
    { grupo: "SALA", itens: ["Piso", "Rodapé", "Pintura parede", "Pintura teto / forro", "Janelas e esquadrias", "Tomadas e interruptores", "Iluminação"] },
    { grupo: "COZINHA", itens: ["Bancada / cuba / metais", "Revestimento", "Piso", "Pontos hidráulicos", "Pontos elétricos", "Ponto de gás"] },
    { grupo: "QUARTO", itens: ["Piso", "Pintura parede", "Pintura teto", "Porta e fechadura", "Janela / esquadria", "Tomadas e interruptores"] },
    { grupo: "SUÍTE", itens: ["Piso", "Pintura parede", "Pintura teto", "Porta e fechadura", "Janela / esquadria", "Tomadas e interruptores"] },
    { grupo: "BANHEIRO", itens: ["Louças (bacia / cuba)", "Metais", "Revestimento parede", "Piso", "Box / vidro", "Ventilação / exaustão"] },
    { grupo: "ÁREA DE SERVIÇO", itens: ["Tanque", "Pontos hidráulicos", "Piso", "Pintura"] },
    { grupo: "SACADA / VARANDA", itens: ["Piso", "Guarda-corpo", "Pintura", "Esquadrias / envidraçamento", "Ponto de gás (churrasqueira)"] },
    { grupo: "GERAL", itens: ["Portas internas", "Fechaduras e chaves", "Forro de gesso", "Quadro de disjuntores", "Infra de ar-condicionado", "Limpeza final"] },
  ],
};

async function main() {
  const existente = await db.formularioModelo.findFirst({ where: { codigo: FVC.codigo, versao: FVC.versao } });
  if (existente) {
    await db.formularioModelo.update({ where: { id: existente.id }, data: { nome: FVC.nome, estrutura: JSON.stringify(FVC.estrutura), ativo: true } });
    console.log(`Modelo ${FVC.codigo} v${FVC.versao} atualizado.`);
  } else {
    await db.formularioModelo.create({ data: { codigo: FVC.codigo, nome: FVC.nome, versao: FVC.versao, estrutura: JSON.stringify(FVC.estrutura) } });
    console.log(`Modelo ${FVC.codigo} v${FVC.versao} criado.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

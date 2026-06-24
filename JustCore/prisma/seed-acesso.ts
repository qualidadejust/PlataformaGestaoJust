// Seed do controle de acesso: permissões, perfis (RBAC) e usuário admin. Idempotente (upsert).
// Uso: npm run db:seed-acesso
// Admin: ADMIN_EMAIL / ADMIN_SENHA no .env (ou defaults abaixo). Senha temporária = troca no 1º acesso.
import { prisma } from "../server/lib/prisma.ts";
import { hashSenha } from "../server/lib/auth.ts";

const db = prisma as any;

const PERMISSOES: [string, string][] = [
  ["core.cadastro.read", "Ver cadastros (empresas, obras, colaboradores, EPIs...)"],
  ["core.cadastro.write", "Editar cadastros"],
  ["core.sensivel.read", "Ver dado pessoal sensível (CPF, PIS, RG)"],
  ["ged.documento.read", "Ver/baixar documentos não sensíveis"],
  ["ged.documento.write", "Enviar/versionar documentos"],
  ["ged.sensivel.read", "Baixar documento sensível (ASO, atestado, CID)"],
  ["security.read", "Ver entregas/fichas de EPI"],
  ["security.write", "Registrar entrega/inspeção/baixa de EPI"],
  ["train.read", "Ver treinamentos"],
  ["train.write", "Gerenciar treinamentos/turmas"],
  ["frota.read", "Ver frota e custos"],
  ["frota.write", "Lançar viagens/custos da frota"],
  ["eleva.read", "Ver avaliações de desempenho"],
  ["eleva.write", "Gerenciar avaliações de desempenho"],
  ["atestados.read", "Ver atestados/declarações"],
  ["atestados.write", "Lançar atestado/declaração (apontador)"],
  ["atestados.aprovar", "Aprovar/recusar atestado (RH)"],
  ["acesso.admin", "Gerenciar usuários e perfis"],
];

// perfil -> chaves de permissão ("*" = todas)
const PERFIS: Record<string, string[]> = {
  admin: ["*"],
  rh: ["core.cadastro.read", "core.cadastro.write", "core.sensivel.read", "eleva.read", "eleva.write", "ged.documento.read", "ged.sensivel.read", "atestados.read", "atestados.write", "atestados.aprovar"],
  sst: ["security.read", "security.write", "ged.documento.read", "ged.sensivel.read", "core.cadastro.read"],
  qualidade: ["ged.documento.read", "ged.documento.write", "core.cadastro.read"],
  gestor_obra: ["frota.read", "core.cadastro.read", "eleva.read", "ged.documento.read"],
  apontador: ["atestados.read", "atestados.write", "core.cadastro.read"],
  leitura: PERMISSOES.map(([k]) => k).filter((k) => k.endsWith(".read")),
};

async function main() {
  // 1) permissões
  const permId = new Map<string, string>();
  for (const [chave, descricao] of PERMISSOES) {
    const p = await db.permissao.upsert({ where: { chave }, update: { descricao }, create: { chave, descricao } });
    permId.set(chave, p.id);
  }
  // 2) perfis + vínculos
  for (const [nome, chaves] of Object.entries(PERFIS)) {
    const perfil = await db.perfil.upsert({ where: { nome }, update: {}, create: { nome } });
    const alvo = chaves.includes("*") ? [...permId.keys()] : chaves;
    for (const chave of alvo) {
      const permissao_id = permId.get(chave);
      if (!permissao_id) continue;
      await db.perfilPermissao.upsert({
        where: { perfil_id_permissao_id: { perfil_id: perfil.id, permissao_id } },
        update: {},
        create: { perfil_id: perfil.id, permissao_id },
      });
    }
  }
  // 3) usuário admin
  const email = (process.env.ADMIN_EMAIL ?? "admin@just.local").toLowerCase().trim();
  const senha = process.env.ADMIN_SENHA ?? "JustAdmin@2026";
  const senha_hash = await hashSenha(senha);
  const admin = await db.usuario.upsert({
    where: { email },
    update: {}, // não reseta a senha se já existe
    create: { email, senha_hash, ativo: true, senha_temporaria: true },
  });
  const perfilAdmin = await db.perfil.findUnique({ where: { nome: "admin" } });
  await db.usuarioPerfil.upsert({
    where: { usuario_id_perfil_id: { usuario_id: admin.id, perfil_id: perfilAdmin.id } },
    update: {},
    create: { usuario_id: admin.id, perfil_id: perfilAdmin.id },
  });

  console.log(`Permissões: ${PERMISSOES.length} | Perfis: ${Object.keys(PERFIS).length}`);
  console.log(`Admin: ${email}  (senha ${process.env.ADMIN_SENHA ? "do .env" : `padrão "${senha}"`}, troca no 1º acesso)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

// Catálogo de treinamentos + matriz cargo × treinamento da JUST, derivados dos documentos
// do SGQ: Manual de Cargos e Funções (rev.17), Treinamentos e Capacitação (ITs), Instruções
// de Integração e PQO. Re-executável (upsert). Uso: npx tsx prisma/seed-treinamentos.ts
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

// codigo, nome, tipo, setor, carga_horaria, validade_meses
type C = [string, string, string, string, number, number | null];
const CATALOGO: C[] = [
  // ── Integração / Qualidade / RH ──────────────────────────────────────────
  ["integracao_f1", "Integração Fase 1 (admissional)", "integracao", "rh", 1, null],
  ["integracao_f2", "Integração Fase 2 (segurança)", "integracao", "sst", 2, null],
  ["politica_qualidade", "Política da Qualidade", "qualidade", "qualidade", 1, null],
  ["sgq", "Sistema de Gestão da Qualidade", "qualidade", "qualidade", 4, null],
  ["regimento_siac_nbr15575", "Regimento SIAC e NBR 15575 (Desempenho)", "qualidade", "qualidade", 4, null],
  ["servicos_controlados", "Serviços Controlados / Inspeção", "qualidade", "qualidade", 2, null],
  ["nocoes_rh", "Noções Básicas de RH", "procedimento", "rh", 2, null],
  // ── Sistemas ─────────────────────────────────────────────────────────────
  ["pacote_office", "Pacote Office", "sistema", "rh", 8, null],
  ["sienge", "Sistema Sienge", "sistema", "suprimentos", 8, null],
  ["autocad", "AutoCAD", "sistema", "projetos", 16, null],
  // ── Suprimentos / Terceiros ──────────────────────────────────────────────
  ["tabela_materiais_controlados", "Tabela de Compras, Inspeção, Manuseio e Armazenamento de Materiais Controlados", "procedimento", "suprimentos", 2, null],
  ["terceiros_contratacao", "Contratação, Medição e Rescisão de Terceiros", "procedimento", "suprimentos", 2, null],
  // ── NR / Segurança do Trabalho ───────────────────────────────────────────
  ["nr06_epi", "NR-06 — Uso de EPI", "nr", "sst", 1, null],
  ["nr10_eletrica", "NR-10 — Segurança em Instalações e Serviços de Eletricidade", "nr", "sst", 40, 24],
  ["nr12_maquinas", "NR-12 — Segurança em Máquinas e Equipamentos", "nr", "sst", 8, null],
  ["nr18_admissional", "NR-18 — Treinamento Admissional (canteiro)", "nr", "sst", 6, null],
  ["nr35_altura", "NR-35 — Trabalho em Altura", "nr", "sst", 8, 24],
  ["op_grua", "Operador de Grua", "nr", "sst", 16, null],
  ["op_betoneira", "Operador de Betoneira", "nr", "sst", 8, null],
  ["op_cremalheira", "Operador de Cremalheira / Guincheiro", "nr", "sst", 16, null],
  ["primeiros_socorros", "Primeiros Socorros", "nr", "sst", 4, 12],
  ["combate_incendio", "Princípio e Combate a Incêndio", "nr", "sst", 4, 12],
  // ── Instruções de Trabalho (execução de obras) ───────────────────────────
  ["it_execucao", "Instruções de Trabalho (da função)", "it", "engenharia", 2, null],
  ["it_compactacao_aterro", "IT — Compactação de Aterro", "it", "engenharia", 2, null],
  ["it_locacao_obra", "IT — Locação de Obra", "it", "engenharia", 2, null],
  ["it_fundacao_profunda", "IT — Fundação Profunda", "it", "engenharia", 2, null],
  ["it_forma_madeira", "IT — Execução de Formas de Madeira", "it", "engenharia", 2, null],
  ["it_montagem_armadura", "IT — Montagem de Armadura", "it", "engenharia", 2, null],
  ["it_concretagem", "IT — Concretagem de Peça Estrutural", "it", "engenharia", 2, null],
  ["it_alvenaria_estrutural", "IT — Alvenaria Estrutural", "it", "engenharia", 2, null],
  ["it_alvenaria_nao_estrutural", "IT — Alvenaria Não Estrutural", "it", "engenharia", 2, null],
  ["it_revestimento_argamassado", "IT — Revestimento Argamassado", "it", "engenharia", 2, null],
  ["it_revest_ceramico_interno", "IT — Revestimento Cerâmico/Porcelanato Parede Interna", "it", "engenharia", 2, null],
  ["it_revest_ceramico_externo", "IT — Revestimento Cerâmico/Pastilha Parede Externa", "it", "engenharia", 2, null],
  ["it_regularizacao_piso", "IT — Regularização de Piso", "it", "engenharia", 2, null],
  ["it_revest_ceramico_piso", "IT — Revestimento Cerâmico/Porcelanato para Piso", "it", "engenharia", 2, null],
  ["it_piso_laminado", "IT — Piso Laminado", "it", "engenharia", 2, null],
  ["it_piso_concreto", "IT — Piso em Concreto", "it", "engenharia", 2, null],
  ["it_impermeabilizacao", "IT — Execução de Impermeabilização", "it", "engenharia", 2, null],
  ["it_forro_gesso", "IT — Forro em Gesso", "it", "engenharia", 2, null],
  ["it_divisorias_drywall", "IT — Divisórias Leves em Drywall", "it", "engenharia", 2, null],
  ["it_cobertura_madeira", "IT — Cobertura com Estrutura de Madeira", "it", "engenharia", 2, null],
  ["it_cobertura_metalica", "IT — Cobertura com Estrutura Metálica", "it", "engenharia", 2, null],
  ["it_porta_madeira", "IT — Colocação de Batente e Porta de Madeira", "it", "engenharia", 2, null],
  ["it_esquadrias", "IT — Colocação de Esquadrias", "it", "engenharia", 2, null],
  ["it_pintura_interna", "IT — Pintura Interna de Parede e Teto", "it", "engenharia", 2, null],
  ["it_pintura_externa", "IT — Pintura Externa", "it", "engenharia", 2, null],
  ["it_pintura_metal_madeira", "IT — Pintura sobre Superfície Metálica e de Madeira", "it", "engenharia", 2, null],
  ["it_instalacao_eletrica", "IT — Instalação Elétrica", "it", "engenharia", 2, null],
  ["it_instalacao_hidrossanitaria", "IT — Instalação Hidrossanitária", "it", "engenharia", 2, null],
  ["it_bancada_louca_metal", "IT — Colocação de Bancada, Louça e Metal Sanitário", "it", "engenharia", 2, null],
  ["it_instalacao_gas", "IT — Instalação de Gás", "it", "engenharia", 2, null],
  ["it_guarda_corpo", "IT — Instalação de Guarda-Corpo", "it", "engenharia", 2, null],
  ["it_revestimento_gesso", "IT — Revestimento em Pó de Gesso", "it", "engenharia", 2, null],
];

const NOME = new Map(CATALOGO.map((c) => [c[0], c[1]]));

// Matriz cargo → treinamentos exigidos (Manual de Cargos e Funções). BASE = comum a todos.
// [codigo] ou [codigo, true] quando "se aplicável"/"caso necessário".
const BASE: [string, boolean?][] = [["integracao_f1"], ["politica_qualidade"]];
const REQS: Record<string, [string, boolean?][]> = {
  "Advogado": [["pacote_office"]],
  "Almoxarife": [["tabela_materiais_controlados"]],
  "Analista de Marketing": [["sienge"]],
  "Apontador de Mão de Obra": [["tabela_materiais_controlados"], ["terceiros_contratacao"], ["nocoes_rh"], ["sienge"]],
  "Armador": [["it_execucao"], ["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true]],
  "Arquiteto": [["pacote_office"], ["autocad"]],
  "Assistente Financeiro": [["pacote_office"], ["sienge"]],
  "Assistente de RH": [["sienge"]],
  "Auxiliar Administrativo": [["pacote_office"], ["sienge"]],
  "Auxiliar Administrativo Aprendiz": [["pacote_office"]],
  "Auxiliar de Compras": [["pacote_office"], ["sienge"], ["tabela_materiais_controlados"]],
  "Auxiliar de Departamento Pessoal": [["pacote_office"], ["sienge"]],
  "Azulejista": [["nr12_maquinas"], ["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Carpinteiro": [["nr12_maquinas"], ["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Comprador": [["pacote_office"], ["sienge"], ["tabela_materiais_controlados"]],
  "Contra Mestre": [["tabela_materiais_controlados"], ["it_execucao"], ["nr18_admissional"], ["nr35_altura"], ["nr12_maquinas", true], ["nr10_eletrica", true]],
  "Coordenador de Contabilidade": [["pacote_office"], ["sienge"]],
  "Eletricista": [["nr10_eletrica"], ["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Engenheiro Civil": [["pacote_office"], ["sienge"], ["autocad"], ["tabela_materiais_controlados"], ["it_execucao"], ["nr18_admissional"], ["nr35_altura"]],
  "Engenheiro Civil Qualidade e Manutenção": [["pacote_office"], ["sienge"], ["autocad"], ["sgq"], ["regimento_siac_nbr15575"], ["nr18_admissional"], ["nr35_altura"]],
  "Engenheiro Civil Coordenador": [["pacote_office"], ["sienge"], ["autocad"], ["tabela_materiais_controlados"], ["it_execucao"], ["nr18_admissional"], ["nr35_altura"]],
  "Estagiário": [["nr18_admissional", true], ["nr35_altura", true]],
  "Gesseiro": [["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true], ["it_execucao"]],
  "Graniteiro / Marmorista": [["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas"], ["it_execucao"]],
  "Guincheiro / Operador de Cremalheira": [["nr18_admissional"], ["nr35_altura"], ["op_cremalheira"], ["it_execucao"]],
  "Meio Oficial": [["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Meio Oficial Armador": [["it_execucao"], ["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true]],
  "Meio Oficial Apontador": [["tabela_materiais_controlados"], ["sienge"]],
  "Meio Oficial de Carpinteiro": [["nr12_maquinas"], ["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Meio Oficial de Limpeza": [["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Meio Oficial Operador de Betoneira": [["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true], ["op_betoneira"]],
  "Meio Oficial de Pedreiro": [["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true], ["nr10_eletrica", true], ["servicos_controlados"]],
  "Mestre de Obras": [["tabela_materiais_controlados"], ["it_execucao"], ["nr18_admissional"], ["nr35_altura"], ["nr12_maquinas", true], ["nr10_eletrica", true]],
  "Oficial de Limpeza": [["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Operador de Betoneira": [["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true], ["op_betoneira"]],
  "Operador de Grua": [["nr18_admissional"], ["nr35_altura"], ["nr12_maquinas", true], ["nr10_eletrica", true], ["op_grua"]],
  "Orçamentista": [["pacote_office"], ["sienge"], ["autocad"]],
  "Pedreiro": [["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true], ["nr10_eletrica", true], ["it_execucao"]],
  "Pedreiro de Manutenção": [["nr18_admissional"], ["nr35_altura", true], ["nr12_maquinas", true], ["nr10_eletrica", true], ["it_execucao"]],
  "Pintor": [["nr18_admissional"], ["nr35_altura", true], ["it_execucao"]],
  "Recepcionista": [["pacote_office"]],
  "Serralheiro": [["nr18_admissional"], ["it_execucao"]],
  "Servente de Obras": [["nr18_admissional"], ["it_execucao"]],
  "Supervisor de Obras": [["tabela_materiais_controlados"], ["it_execucao"], ["nr18_admissional"], ["nr35_altura"], ["nr12_maquinas", true], ["nr10_eletrica", true]],
  "Técnico de Segurança": [["nr18_admissional"], ["nr35_altura"], ["nr12_maquinas"], ["nr10_eletrica"]],
  "Zelador": [],
};

async function main() {
  for (const [codigo, nome, tipo, setor, carga_horaria, validade_meses] of CATALOGO) {
    const data = { nome, tipo, setor, carga_horaria, validade_meses };
    await db.treinamento.upsert({ where: { codigo }, update: data, create: { codigo, ...data } });
  }
  console.log(`✅ ${CATALOGO.length} treinamentos no catálogo.`);

  let nReq = 0;
  for (const [cargo, extras] of Object.entries(REQS)) {
    const all = [...BASE, ...extras];
    for (const [codigo, condicional] of all) {
      await db.requisitoTreinamento.upsert({
        where: { cargo_treinamento_codigo: { cargo, treinamento_codigo: codigo } },
        update: { treinamento_nome: NOME.get(codigo) ?? codigo, condicional: !!condicional },
        create: { cargo, treinamento_codigo: codigo, treinamento_nome: NOME.get(codigo) ?? codigo, condicional: !!condicional },
      });
      nReq++;
    }
  }
  console.log(`✅ ${nReq} requisitos de treinamento (matriz de ${Object.keys(REQS).length} cargos).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

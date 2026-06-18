import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, 'dev.db');

const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Gestores
  await prisma.employee.upsert({ where: { id: 'mgr1' }, update: {}, create: { id: 'mgr1', name: 'Roberto Lima',   role: 'Diretor de Obras',      department: 'Diretoria',   email: 'roberto.lima@just.com.br',   admission_date: '2018-01-10', is_manager: true  } });
  await prisma.employee.upsert({ where: { id: 'mgr2' }, update: {}, create: { id: 'mgr2', name: 'Fernanda Costa', role: 'Gerente de Projetos',    department: 'Engenharia',  email: 'fernanda.costa@just.com.br', admission_date: '2020-03-15', is_manager: true  } });

  // Colaboradores
  await prisma.employee.upsert({ where: { id: 'emp1' }, update: {}, create: { id: 'emp1', name: 'Carlos Silva',   role: 'Mestre de Obras',        department: 'Obras',       email: 'carlos.silva@just.com.br',   admission_date: '2021-02-15', is_manager: false } });
  await prisma.employee.upsert({ where: { id: 'emp2' }, update: {}, create: { id: 'emp2', name: 'Mariana Souza',  role: 'Engenheira Civil JR',    department: 'Engenharia',  email: 'mariana.souza@just.com.br',  admission_date: '2024-05-10', is_manager: false } });
  await prisma.employee.upsert({ where: { id: 'emp3' }, update: {}, create: { id: 'emp3', name: 'Ana Oliveira',   role: 'Arquiteta Pleno',        department: 'Arquitetura', email: 'ana.oliveira@just.com.br',   admission_date: '2022-08-22', is_manager: false } });
  await prisma.employee.upsert({ where: { id: 'emp4' }, update: {}, create: { id: 'emp4', name: 'Pedro Santos',   role: 'Técnico de Segurança',   department: 'Segurança',   email: 'pedro.santos@just.com.br',   admission_date: '2023-11-03', is_manager: false } });
  await prisma.employee.upsert({ where: { id: 'emp5' }, update: {}, create: { id: 'emp5', name: 'Lucas Ferreira', role: 'Pedreiro SR',            department: 'Obras',       email: 'lucas.ferreira@just.com.br', admission_date: '2019-07-20', is_manager: false } });
  await prisma.employee.upsert({ where: { id: 'emp6' }, update: {}, create: { id: 'emp6', name: 'Juliana Alves',  role: 'Técnica em Edificações', department: 'Engenharia',  email: 'juliana.alves@just.com.br',  admission_date: '2023-03-08', is_manager: false } });

  // Ciclos
  await prisma.cycle.upsert({ where: { id: 'cycle-2025'   }, update: {}, create: { id: 'cycle-2025',   name: 'Avaliação Anual 2025', start_date: '2025-01-01', end_date: '2025-12-31', status: 'completed' } });
  await prisma.cycle.upsert({ where: { id: 'cycle-2026-1' }, update: {}, create: { id: 'cycle-2026-1', name: '1º Semestre 2026',     start_date: '2026-01-01', end_date: '2026-06-30', status: 'completed' } });
  await prisma.cycle.upsert({ where: { id: 'cycle-2026-2' }, update: {}, create: { id: 'cycle-2026-2', name: '2º Semestre 2026',     start_date: '2026-07-01', end_date: '2026-12-31', status: 'active'    } });

  // Modelo de avaliação padrão (instrumento real Construtora JUST — Rev 03, escala 1–5 + N/S)
  const DEFAULT_TEMPLATE: { title: string; questions: string[] }[] = [
    { title: 'Competências Técnicas', questions: [
      'O colaborador demonstra domínio técnico necessário para executar suas atividades?',
      'A qualidade do trabalho entregue atende aos padrões esperados?',
      'Consegue resolver problemas inerentes à função e propor soluções eficazes para as demandas do dia a dia?',
      'O colaborador acompanha as atualizações e tendências da sua área de atuação?',
    ] },
    { title: 'Competências Comportamentais', questions: [
      'O colaborador mantém postura profissional em situações de pressão?',
      'Demonstra responsabilidade e comprometimento com suas atividades?',
      'O colaborador age com proatividade e resiliência diante de desafios e mudanças?',
      'Respeita normas, políticas e valores da organização?',
    ] },
    { title: 'Relacionamento Interpessoal', questions: [
      'O colaborador contribui para um ambiente de cooperação e confiança?',
      'Compartilha conhecimento e apoia o desenvolvimento dos demais?',
      'Demonstra abertura para conhecer e interagir com diferentes setores da empresa?',
      'O colaborador busca soluções construtivas em situações de conflitos?',
    ] },
    { title: 'Comunicação', questions: [
      'Expressa ideias de forma clara e objetiva, oralmente e por escrito?',
      'Adapta a comunicação conforme o perfil do interlocutor?',
      'Compartilha informações relevantes com os envolvidos nos processos?',
      'Demonstra atenção ao ouvir colegas e superiores?',
    ] },
    { title: 'Desenvolvimento e Aprendizado', questions: [
      'Demonstra curiosidade, interesse e iniciativa para aprender novas ferramentas ou métodos?',
      'Está aberto a feedbacks e busca melhorar continuamente?',
      'O colaborador propõe ideias que contribuem para melhorias nos processos?',
      'Demonstra autonomia para iniciar ações sem depender de direcionamentos constantes?',
    ] },
    { title: 'Planejamento e Organização', questions: [
      'Planeja as atividades diárias com antecedência e de forma realista?',
      'O colaborador mantém foco nas atividades, evitando distrações frequentes?',
      'Ajusta seu planejamento quando surgem imprevistos, mantendo a qualidade das entregas?',
      'Consegue identificar e priorizar tarefas críticas?',
    ] },
  ];

  await prisma.evaluationTemplate.upsert({
    where: { id: 'tpl-default' },
    update: {},
    create: {
      id: 'tpl-default',
      name: 'Avaliação de Desempenho — Padrão (Rev 03)',
      description: 'Instrumento oficial da Construtora JUST. Escala 1–5 + N/S.',
      scale_max: 5,
      applies_to: 'default',
    },
  });
  // Só cria blocos/perguntas se o modelo ainda não tiver nenhum (idempotente)
  const existingBlocks = await prisma.evaluationBlock.count({ where: { template_id: 'tpl-default' } });
  if (existingBlocks === 0) {
    for (let bi = 0; bi < DEFAULT_TEMPLATE.length; bi++) {
      const block = DEFAULT_TEMPLATE[bi];
      await prisma.evaluationBlock.create({
        data: {
          template_id: 'tpl-default',
          title: block.title,
          sort_order: bi,
          manager_only: false,
          questions: { create: block.questions.map((text, qi) => ({ text, sort_order: qi })) },
        },
      });
    }
  }

  // ---------- Pesquisa de Clima: formulário padrão + rodada histórica Abril/2025 ----------
  const surveyFormCount = await prisma.surveyForm.count();
  if (surveyFormCount === 0) {
    type Q = { text: string; kind?: 'scale' | 'enps'; medias?: number[] };
    // médias por obra: [NEO HOUSE, BLANK RESIDENCE, MATERA, CASA EDUARDO]
    const DIMS: { title: string; questions: Q[] }[] = [
      { title: 'Condições de Trabalho', questions: [
        { text: 'Distribuição e disposição do espaço físico para as atividades', medias: [3.9, 4.3, 4.3, 3.8] },
        { text: 'Áreas de convivência (refeitórios, banheiros, chuveiros)', medias: [3.9, 4.1, 4.5, 3.8] },
        { text: 'Condições e disponibilidade de ferramentas, equipamentos e máquinas', medias: [4.1, 4.3, 4.6, 4.3] },
        { text: 'Relacionamento com os colegas (relacionamento interpessoal)', medias: [4.4, 4.6, 4.6, 4.3] },
        { text: 'Clareza e qualidade da informação para execução das tarefas', medias: [4.5, 4.5, 4.6, 4.3] },
        { text: 'Organização dos materiais e ferramentas no canteiro de obras', medias: [3.7, 4.2, 4.6, 4.0] },
      ] },
      { title: 'Medicina e Segurança no Trabalho', questions: [
        { text: 'Equipamentos de Proteção Individual - disponibilidade e condições', medias: [4.5, 4.6, 4.9, 4.0] },
        { text: 'Uniformes', medias: [4.8, 4.3, 4.6, 3.8] },
        { text: 'Treinamentos e esclarecimentos de dúvidas', medias: [4.3, 4.5, 4.9, 4.3] },
        { text: 'Condições de higiene e limpeza no ambiente de trabalho', medias: [4.3, 4.0, 4.6, 4.3] },
        { text: 'Atuação da CIPA no canteiro de obras', medias: [3.5, 3.9, 4.3, 3.0] },
      ] },
      { title: 'Motivação para o Trabalho', questions: [
        { text: 'Motivação para aprender novas técnicas, novas formas de trabalho', medias: [4.7, 4.6, 4.4, 4.3] },
        { text: 'Motivação para trabalhar em equipe e dividir conhecimento', medias: [4.4, 4.6, 4.9, 4.5] },
        { text: 'Motivação para cursos e treinamentos fora do horário de trabalho', medias: [4.2, 4.4, 4.1, 4.0] },
        { text: 'Motivação para sugerir melhorias no ambiente de trabalho', medias: [4.4, 4.3, 4.6, 3.8] },
      ] },
      { title: 'Satisfação Geral com a Empresa', questions: [
        { text: 'Relacionamento com o Administrativo da Obra (Engenheiros, Mestre e Contra Mestres)', medias: [4.5, 4.6, 4.8, 4.8] },
        { text: 'Envolvimento e conhecimento da direção com as atividades', medias: [4.5, 4.4, 4.4, 4.5] },
        { text: 'Atendimento às solicitações e dúvidas pessoais', medias: [4.3, 4.4, 4.5, 4.0] },
        { text: 'Oportunidade de crescimento profissional', medias: [4.4, 4.2, 4.6, 4.5] },
        { text: 'Cumprimento das Leis Trabalhistas e Convenções Coletivas de Trabalho', medias: [4.5, 4.5, 4.9, 3.8] },
      ] },
      { title: 'Engajamento', questions: [
        { text: 'Em uma escala de 0 a 10, o quanto você recomendaria a Just como um lugar para se trabalhar?', kind: 'enps' },
      ] },
    ];

    const form = await prisma.surveyForm.create({
      data: {
        name: 'Pesquisa de Satisfação — Clientes Internos',
        dimensions: {
          create: DIMS.map((d, di) => ({
            title: d.title, sort_order: di,
            questions: { create: d.questions.map((q, qi) => ({ text: q.text, kind: q.kind ?? 'scale', sort_order: qi })) },
          })),
        },
      },
      include: { dimensions: { include: { questions: { orderBy: { sort_order: 'asc' } } }, orderBy: { sort_order: 'asc' } } },
    });

    const campaign = await prisma.surveyCampaign.create({
      data: { name: 'Pesquisa de Clima — Abril/2025', revision: '06', form_id: form.id, start_date: '2025-04-14', end_date: '2025-04-25', status: 'closed', min_n: 5 },
    });

    const obras = ['NEO HOUSE', 'BLANK RESIDENCE', 'MATERA', 'CASA EDUARDO'];
    const nByObra: Record<string, number> = { 'NEO HOUSE': 20, 'BLANK RESIDENCE': 55, 'MATERA': 17, 'CASA EDUARDO': 8 };
    let imported = 0;
    for (const dim of form.dimensions) {
      const dimData = DIMS.find(d => d.title === dim.title)!;
      for (let qi = 0; qi < dim.questions.length; qi++) {
        const qMedias = dimData.questions[qi].medias;
        if (!qMedias) continue; // eNPS não tem histórico
        for (let oi = 0; oi < obras.length; oi++) {
          await prisma.surveyImportedResult.create({
            data: { campaign_id: campaign.id, question_id: dim.questions[qi].id, cost_center: obras[oi], n: nByObra[obras[oi]], media: qMedias[oi] },
          });
          imported++;
        }
      }
    }
    console.log(`Pesquisa de Clima: formulário + campanha Abril/2025 (${imported} médias importadas).`);
  }

  console.log('Seed concluído.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

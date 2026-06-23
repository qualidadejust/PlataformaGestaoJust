// Taxonomia controlada do GED (vocabulário fixo da Construtora JUST). Fonte única dos eixos
// de classificação usados tanto na coluna (`natureza`, `setor`) quanto no JSON `metadados`
// (`processo`, `classificacao`) do modelo Documento. Espelha a PGQ - Lista Mestra e o Mapa
// de Controle de Registros do SGQ. Ver skill `ged-documentos`.

export interface Opcao {
  value: string;
  label: string;
}

// Natureza do documento (ISO 9001 / PBQP-H cl. 7.5): o modelo vs a evidência preenchida.
export const NATUREZAS: Opcao[] = [
  { value: "padrao", label: "Documento padrão (controlado)" },
  { value: "registro", label: "Registro (evidência)" },
];

// Setores/áreas — primeiro nível de navegação das pastas (espelha a árvore do SharePoint).
export const SETORES: Opcao[] = [
  { value: "qualidade", label: "Qualidade" },
  { value: "engenharia", label: "Engenharia" },
  { value: "projetos", label: "Projetos" },
  { value: "suprimentos", label: "Suprimentos / Aquisição" },
  { value: "rh", label: "Recursos Humanos" },
  { value: "sst", label: "Saúde e Segurança do Trabalho" },
  { value: "comercial", label: "Comercial / Vendas" },
  { value: "pos_entrega", label: "Pós-entrega / Assistência Técnica" },
  { value: "ambiental", label: "Meio Ambiente / Resíduos" },
  { value: "financeiro", label: "Financeiro" },
  { value: "juridico", label: "Jurídico / Documentação" },
  { value: "diretoria", label: "Diretoria / Estratégico" },
];

// Processos do SGQ — usados pelos documentos PADRÃO (coluna PROCESSO da Lista Mestra).
export const PROCESSOS: Opcao[] = [
  { value: "gestao_qualidade", label: "Gestão da Qualidade" },
  { value: "gestao_recursos", label: "Gestão de Recursos" },
  { value: "execucao_obras", label: "Execução de Obras" },
  { value: "aquisicao", label: "Aquisição de Insumos" },
  { value: "gestao_projetos", label: "Gestão de Projetos" },
  { value: "gestao_residuos", label: "Gestão de Resíduos Sólidos" },
  { value: "incorporacao", label: "Incorporação" },
  { value: "vendas", label: "Vendas" },
  { value: "assistencia_tecnica", label: "Assistência Técnica" },
];

// Classificações do documento PADRÃO (coluna CLASSIFICAÇÃO DO DOCUMENTO da Lista Mestra).
export const CLASSIFICACOES: Opcao[] = [
  { value: "manual", label: "Manual" },
  { value: "politica", label: "Política" },
  { value: "procedimento", label: "Procedimento" },
  { value: "instrucao_trabalho", label: "Instrução de Trabalho" },
  { value: "formulario", label: "Formulário" },
  { value: "lista", label: "Lista" },
  { value: "quadro", label: "Quadro" },
  { value: "plano", label: "Plano" },
  { value: "cartilha", label: "Cartilha" },
  { value: "relatorio", label: "Relatório" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "questionario", label: "Questionário" },
];

export const TAXONOMIA = { NATUREZAS, SETORES, PROCESSOS, CLASSIFICACOES };

export const labelDe = (lista: Opcao[], value?: string | null) =>
  lista.find((o) => o.value === value)?.label ?? value ?? "—";

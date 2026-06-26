import {
  Building2,
  Briefcase,
  HardHat,
  Users,
  Boxes,
  Truck,
  MapPinned,
  Network,
  Gauge,
  Car,
  Coins,
  FileText,
  Contact,
  Home,
  ClipboardList,
  FolderTree,
  type LucideIcon,
} from "lucide-react";
import type { Row } from "./hooks/useEntity";

export type FieldType = "text" | "number" | "textarea" | "boolean" | "select" | "ref";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** mostra como coluna na tabela */
  inList?: boolean;
  /** opções para type 'select' */
  options?: { value: string; label: string }[];
  /** entidade de origem para type 'ref' (FK) */
  refPath?: string;
  refLabel?: (row: Row) => string;
  /** render customizado da célula na tabela (ex.: relação aninhada) */
  render?: (row: Row) => string;
}

export interface EntityConfig {
  path: string;
  label: string;
  singular: string;
  icon: LucideIcon;
  /** título de uma linha (ex.: para confirmação de exclusão) */
  title: (row: Row) => string;
  fields: Field[];
}

const NIVEIS = ["operacional", "tecnico", "administrativo", "lideranca", "diretoria"].map((v) => ({
  value: v,
  label: v[0].toUpperCase() + v.slice(1),
}));

const STATUS_COLAB = ["ativo", "afastado", "desligado"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

const CATEGORIAS = [
  { value: "epi", label: "EPI" },
  { value: "material", label: "Material" },
  { value: "ferramenta", label: "Ferramenta" },
  { value: "equipamento", label: "Equipamento" },
  { value: "consumivel", label: "Consumível" },
];

const UNIDADES = ["un", "par", "m", "m2", "kg", "L", "cx", "pct"].map((v) => ({ value: v, label: v }));

const TIPOS_CONTROLE = [
  { value: "prazo", label: "Troca por prazo" },
  { value: "inspecao", label: "Inspeção periódica" },
  { value: "uso_unico", label: "Uso único" },
];

const PAPEIS = [
  { value: "residente", label: "Residente" },
  { value: "mestre", label: "Mestre" },
  { value: "mao_de_obra", label: "Mão de obra" },
  { value: "administrativo", label: "Administrativo" },
];

const TIPOS_VEICULO = [
  { value: "carro", label: "Carro" },
  { value: "utilitario", label: "Utilitário" },
  { value: "caminhao", label: "Caminhão" },
  { value: "moto", label: "Moto" },
  { value: "maquina", label: "Máquina" },
];

const COMBUSTIVEIS = [
  { value: "gasolina", label: "Gasolina" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "flex", label: "Flex" },
];

const STATUS_VEICULO = [
  { value: "ativo", label: "Ativo" },
  { value: "manutencao", label: "Manutenção" },
  { value: "inativo", label: "Inativo" },
];

export const ENTITIES: EntityConfig[] = [
  {
    path: "empresas",
    label: "Empresas",
    singular: "Empresa",
    icon: Building2,
    title: (r) => r.nome_fantasia ?? r.razao_social,
    fields: [
      { key: "razao_social", label: "Razão social", type: "text", required: true, inList: true },
      { key: "nome_fantasia", label: "Nome fantasia", type: "text", inList: true },
      { key: "cnpj", label: "CNPJ", type: "text", inList: true },
      { key: "cidade", label: "Cidade", type: "text", inList: true },
      { key: "uf", label: "UF", type: "text" },
      { key: "telefone", label: "Telefone", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "cargos",
    label: "Cargos",
    singular: "Cargo",
    icon: Briefcase,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "nivel", label: "Nível", type: "select", options: NIVEIS, inList: true },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "obras",
    label: "Obras",
    singular: "Obra",
    icon: HardHat,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "cost_center", label: "Centro de custo", type: "text", inList: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        options: [
          { value: "obra", label: "Obra" },
          { value: "sede", label: "Sede" },
        ],
        inList: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ativa", label: "Ativa" },
          { value: "encerrada", label: "Encerrada" },
        ],
        inList: true,
      },
      {
        key: "empresa_id",
        label: "Empresa",
        type: "ref",
        refPath: "empresas",
        refLabel: (e) => e.nome_fantasia ?? e.razao_social,
        inList: true,
        render: (r) => r.empresa?.nome_fantasia ?? r.empresa?.razao_social ?? "—",
      },
      { key: "cidade", label: "Cidade", type: "text" },
      { key: "uf", label: "UF", type: "text" },
    ],
  },
  {
    path: "colaboradores",
    label: "Colaboradores",
    singular: "Colaborador",
    icon: Users,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "matricula", label: "Matrícula", type: "text", inList: true },
      { key: "cpf", label: "CPF", type: "text" },
      {
        key: "cargo_id",
        label: "Cargo",
        type: "ref",
        refPath: "cargos",
        refLabel: (c) => c.nome,
        inList: true,
        render: (r) => r.cargo?.nome ?? "—",
      },
      {
        key: "empresa_id",
        label: "Empresa",
        type: "ref",
        refPath: "empresas",
        refLabel: (e) => e.nome_fantasia ?? e.razao_social,
        inList: true,
        render: (r) => r.empresa?.nome_fantasia ?? "—",
      },
      { key: "setor", label: "Setor", type: "text" },
      { key: "is_lideranca", label: "Liderança", type: "boolean", inList: true },
      { key: "status", label: "Status", type: "select", options: STATUS_COLAB, inList: true },
      { key: "data_admissao", label: "Admissão (AAAA-MM-DD)", type: "text" },
      { key: "data_nascimento", label: "Nascimento (AAAA-MM-DD)", type: "text" },
      { key: "sexo", label: "Sexo", type: "select", options: [
        { value: "M", label: "Masculino" },
        { value: "F", label: "Feminino" },
      ] },
      { key: "estado_civil", label: "Estado civil", type: "text" },
      { key: "pis", label: "PIS", type: "text" },
      { key: "rg", label: "RG", type: "text" },
      { key: "rg_emissor", label: "Emissor RG", type: "text" },
      { key: "rg_uf", label: "UF RG", type: "text" },
      { key: "endereco", label: "Endereço", type: "text" },
      { key: "numero", label: "Número", type: "text" },
      { key: "cep", label: "CEP", type: "text" },
      { key: "situacao", label: "Situação (folha)", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "telefone", label: "Telefone", type: "text" },
    ],
  },
  {
    path: "alocacoes",
    label: "Alocações",
    singular: "Alocação",
    icon: MapPinned,
    title: (r) => `${r.colaborador?.nome ?? ""} → ${r.obra?.nome ?? ""}`,
    fields: [
      {
        key: "colaborador_id",
        label: "Colaborador",
        type: "ref",
        refPath: "colaboradores",
        refLabel: (c) => c.nome,
        required: true,
        inList: true,
        render: (r) => r.colaborador?.nome ?? "—",
      },
      {
        key: "obra_id",
        label: "Obra",
        type: "ref",
        refPath: "obras",
        refLabel: (o) => o.nome,
        required: true,
        inList: true,
        render: (r) => r.obra?.nome ?? "—",
      },
      { key: "papel_na_obra", label: "Papel", type: "select", options: PAPEIS, inList: true },
      { key: "principal", label: "Principal", type: "boolean", inList: true },
      { key: "responsavel", label: "Responsável", type: "boolean", inList: true },
    ],
  },
  {
    path: "setores",
    label: "Setores",
    singular: "Setor",
    icon: Network,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "descricao", label: "Descrição", type: "textarea", inList: true },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "indicadores",
    label: "Indicadores",
    singular: "Indicador",
    icon: Gauge,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "setor", label: "Setor", type: "text", inList: true },
      { key: "meta", label: "Meta", type: "text", inList: true },
      { key: "unidade", label: "Unidade", type: "text", inList: true },
      {
        key: "direcao",
        label: "Direção",
        type: "select",
        options: [
          { value: "maior", label: "Maior é melhor" },
          { value: "menor", label: "Menor é melhor" },
        ],
      },
      { key: "periodicidade", label: "Periodicidade", type: "text", inList: true },
      { key: "cargo_alvo", label: "Cargo alvo", type: "text" },
      { key: "responsavel", label: "Responsável", type: "text" },
      { key: "formula", label: "Fórmula / como medir", type: "textarea" },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "acumula", label: "Acumula no ano", type: "boolean" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "fornecedores",
    label: "Fornecedores",
    singular: "Fornecedor",
    icon: Truck,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "cnpj", label: "CNPJ", type: "text", inList: true },
      { key: "contato", label: "Contato", type: "text", inList: true },
      { key: "telefone", label: "Telefone", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "insumos",
    label: "Insumos / EPIs",
    singular: "Insumo",
    icon: Boxes,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIAS, inList: true },
      { key: "unidade", label: "Unidade", type: "select", options: UNIDADES, inList: true },
      { key: "ca", label: "C.A. (EPI)", type: "text", inList: true },
      { key: "cod_sienge", label: "Cód. Sienge", type: "text" },
      { key: "tipo_controle", label: "Controle", type: "select", options: TIPOS_CONTROLE, inList: true },
      { key: "inspecionavel", label: "Inspecionável", type: "boolean", inList: true },
      { key: "validade_dias", label: "Durabilidade (dias)", type: "number" },
      { key: "alerta_dias", label: "Alerta (dias antes)", type: "number" },
      {
        key: "fornecedor_id",
        label: "Fornecedor",
        type: "ref",
        refPath: "fornecedores",
        refLabel: (f) => f.nome,
        inList: true,
        render: (r) => r.fornecedor?.nome ?? "—",
      },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "veiculos",
    label: "Veículos",
    singular: "Veículo",
    icon: Car,
    title: (r) => r.identificacao ?? r.placa ?? r.modelo,
    fields: [
      { key: "identificacao", label: "Identificação (apelido)", type: "text", required: true, inList: true },
      { key: "placa", label: "Placa", type: "text", inList: true },
      { key: "modelo", label: "Modelo", type: "text", inList: true },
      { key: "marca", label: "Marca", type: "text" },
      { key: "tipo", label: "Tipo", type: "select", options: TIPOS_VEICULO, inList: true },
      { key: "ano", label: "Ano", type: "number" },
      { key: "combustivel", label: "Combustível", type: "select", options: COMBUSTIVEIS },
      { key: "km_atual", label: "Km atual", type: "number", inList: true },
      {
        key: "empresa_id",
        label: "Empresa",
        type: "ref",
        refPath: "empresas",
        refLabel: (e) => e.nome_fantasia ?? e.razao_social,
        render: (r) => r.empresa?.nome_fantasia ?? r.empresa?.razao_social ?? "—",
      },
      { key: "status", label: "Status", type: "select", options: STATUS_VEICULO, inList: true },
      { key: "fipe_codigo", label: "Código FIPE", type: "text" },
      { key: "valor_fipe", label: "Valor FIPE (R$)", type: "number", inList: true },
      { key: "consumo_kml", label: "Consumo (km/L)", type: "number" },
      { key: "valor_aquisicao", label: "Valor de aquisição (R$)", type: "number" },
      { key: "valor_residual", label: "Valor residual (R$)", type: "number" },
      { key: "vida_util_anos", label: "Vida útil (anos)", type: "number" },
      { key: "observacao", label: "Observação", type: "textarea" },
    ],
  },
  {
    path: "tipos-documento",
    label: "Tipos de documento (GED)",
    singular: "Tipo de documento",
    icon: FileText,
    title: (r) => r.nome,
    fields: [
      { key: "codigo", label: "Código (slug)", type: "text", required: true, inList: true },
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "entidade_tipo", label: "Aplica-se a", type: "text", required: true, inList: true },
      { key: "sensivel_padrao", label: "Sensível (LGPD)", type: "boolean", inList: true },
      { key: "versionavel", label: "Versionável", type: "boolean", inList: true },
      { key: "vence", label: "Tem validade", type: "boolean", inList: true },
      { key: "retencao_dias", label: "Retenção (dias)", type: "number" },
      { key: "obrigatorio", label: "Obrigatório", type: "boolean" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "custos-cargo",
    label: "Custos por cargo",
    singular: "Custo por cargo",
    icon: Coins,
    title: (r) => `${r.cargo} (${r.competencia})`,
    fields: [
      { key: "cargo", label: "Cargo", type: "text", required: true, inList: true },
      { key: "competencia", label: "Competência (AAAA-MM)", type: "text", required: true, inList: true },
      { key: "salario_base", label: "Salário base (R$)", type: "number", inList: true },
      { key: "custo_mensal", label: "Custo mensal + provisões (R$)", type: "number", required: true, inList: true },
      { key: "jornada_horas", label: "Jornada (h/mês)", type: "number" },
      { key: "fonte", label: "Fonte (anexo)", type: "text", inList: true },
      { key: "observacao", label: "Observação", type: "textarea" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "clientes",
    label: "Clientes (compradores)",
    singular: "Cliente",
    icon: Contact,
    title: (r) => r.nome,
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "cpf", label: "CPF", type: "text", inList: true },
      { key: "email", label: "E-mail", type: "text", inList: true },
      { key: "telefone", label: "Telefone", type: "text", inList: true },
    ],
  },
  {
    path: "unidades",
    label: "Unidades",
    singular: "Unidade",
    icon: Home,
    title: (r) => r.identificador,
    fields: [
      {
        key: "obra_id",
        label: "Obra",
        type: "ref",
        refPath: "obras",
        refLabel: (o) => o.nome,
        required: true,
        inList: true,
        render: (r) => r.obra?.nome ?? "—",
      },
      { key: "identificador", label: "Identificador", type: "text", required: true, inList: true },
      {
        key: "categoria",
        label: "Categoria",
        type: "select",
        options: [
          { value: "apartamento", label: "Apartamento" },
          { value: "area_comum", label: "Área comum" },
          { value: "garagem", label: "Garagem" },
          { value: "fachada", label: "Fachada" },
          { value: "pavimento", label: "Pavimento" },
        ],
        inList: true,
      },
      { key: "bloco", label: "Bloco", type: "text", inList: true },
      { key: "pavimento", label: "Pavimento", type: "text", inList: true },
      { key: "codigo", label: "Código do local", type: "text" },
      {
        key: "cliente_id",
        label: "Cliente (comprador)",
        type: "ref",
        refPath: "clientes",
        refLabel: (c) => c.nome,
        render: (r) => r.cliente?.nome ?? "—",
        inList: true,
      },
      { key: "area_m2", label: "Área (m²)", type: "number" },
    ],
  },
  {
    path: "formulario-tipos",
    label: "Tipos de formulário",
    singular: "Tipo de formulário",
    icon: ClipboardList,
    title: (r) => r.nome,
    fields: [
      { key: "codigo", label: "Código (slug)", type: "text", required: true, inList: true },
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "sigla", label: "Sigla", type: "text", inList: true },
      {
        key: "categoria",
        label: "Categoria",
        type: "select",
        options: [
          { value: "Inspeção", label: "Inspeção" },
          { value: "Avaliação de Fornecedores", label: "Avaliação de Fornecedores" },
          { value: "Qualificação", label: "Qualificação" },
          { value: "Survey", label: "Survey / Pesquisa" },
          { value: "Outros", label: "Outros" },
        ],
        inList: true,
      },
      { key: "titulo_relatorio", label: "Título no relatório", type: "text" },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
  {
    path: "formulario-grupos",
    label: "Grupos de inspeção",
    singular: "Grupo de inspeção",
    icon: FolderTree,
    title: (r) => r.nome,
    fields: [
      { key: "codigo", label: "Código", type: "text", required: true, inList: true },
      { key: "nome", label: "Nome", type: "text", required: true, inList: true },
      { key: "sigla", label: "Sigla", type: "text", inList: true },
      { key: "descricao", label: "Descrição", type: "textarea", inList: true },
      { key: "ativo", label: "Ativo", type: "boolean", inList: true },
    ],
  },
];

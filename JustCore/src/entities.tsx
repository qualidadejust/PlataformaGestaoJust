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

const UNIDADES = ["un", "par", "m", "m2", "kg", "L", "cx"].map((v) => ({ value: v, label: v }));

const PAPEIS = [
  { value: "residente", label: "Residente" },
  { value: "mestre", label: "Mestre" },
  { value: "mao_de_obra", label: "Mão de obra" },
  { value: "administrativo", label: "Administrativo" },
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
      { key: "validade_dias", label: "Validade (dias)", type: "number" },
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
];

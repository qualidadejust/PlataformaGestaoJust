// Mapa das entidades do Core que podem receber documentos (para o seletor).
export interface EntidadeDef {
  tipo: string;
  label: string;
  path: string; // rota de cadastro no Core
  nome: (r: any) => string;
}

export const ENTIDADES: EntidadeDef[] = [
  { tipo: "colaborador", label: "Colaborador", path: "/colaboradores", nome: (r) => r.nome },
  { tipo: "obra", label: "Obra", path: "/obras", nome: (r) => r.nome },
  { tipo: "veiculo", label: "Veículo", path: "/veiculos", nome: (r) => r.identificacao ?? r.placa ?? r.id },
  { tipo: "fornecedor", label: "Fornecedor", path: "/fornecedores", nome: (r) => r.nome },
];

export const entidadeDef = (tipo: string) => ENTIDADES.find((e) => e.tipo === tipo);

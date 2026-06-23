// Catálogo dos módulos da Plataforma JUST exibidos no portal. `url` = onde o app roda
// (porta do front em dev); `healthUrl` = endpoint /api/health do back (CORS habilitado) para
// o indicador de status — opcional (apps front-only não têm). Em produção, troque por
// subdomínios/paths. Cores em classes Tailwind (par claro/escuro tratado no card).
export interface Modulo {
  key: string;
  nome: string;
  descricao: string;
  icon: string; // nome do ícone lucide (resolvido no App)
  cor: string; // classe de cor do ícone/realce
  url?: string; // undefined = sem interface (ex.: gateway)
  healthUrl?: string;
  tag: string;
}

export const MODULOS: Modulo[] = [
  {
    key: "core",
    nome: "JustCore",
    descricao: "Dados-mestre: empresas, obras, colaboradores, cargos, EPIs, biometria.",
    icon: "Database",
    cor: "text-sky-600",
    url: "http://localhost:4101",
    healthUrl: "http://localhost:4100/api/health",
    tag: "Cadastros",
  },
  {
    key: "eleva",
    nome: "JustEleva",
    descricao: "Gestão de desempenho: avaliações, PDI, feedback, clima e indicadores.",
    icon: "TrendingUp",
    cor: "text-violet-600",
    url: "http://localhost:3000",
    healthUrl: "http://localhost:3001/api/health",
    tag: "RH / Desempenho",
  },
  {
    key: "security",
    nome: "JustSecurity",
    descricao: "Segurança do Trabalho: entrega de EPI assinada por digital, fichas, inspeção.",
    icon: "ShieldCheck",
    cor: "text-emerald-600",
    url: "http://localhost:4000",
    healthUrl: "http://localhost:4001/api/health",
    tag: "SST",
  },
  {
    key: "train",
    nome: "JustTrain",
    descricao: "Treinamentos: turmas, presença assinada (tela ou digital) e certificados.",
    icon: "GraduationCap",
    cor: "text-amber-600",
    url: "http://localhost:4601",
    healthUrl: "http://localhost:4600/api/health",
    tag: "Treinamentos",
  },
  {
    key: "docs",
    nome: "JustDocs",
    descricao: "GED: pastas (SGQ/Obras/Pessoas/Empresa), documentos, versões e vencimentos.",
    icon: "FolderTree",
    cor: "text-teal-600",
    url: "http://localhost:4400",
    tag: "Documentos",
  },
  {
    key: "frota",
    nome: "JustFrota",
    descricao: "Frota: diário de bordo, abastecimento/manutenção e rateio por km entre obras.",
    icon: "Truck",
    cor: "text-orange-600",
    url: "http://localhost:4301",
    healthUrl: "http://localhost:4300/api/health",
    tag: "Frota",
  },
  {
    key: "gate",
    nome: "JustGate",
    descricao: "Gateway WhatsApp (Meta Cloud API): identifica o remetente no Core e roteia.",
    icon: "MessageCircle",
    cor: "text-green-600",
    tag: "Integração",
  },
];

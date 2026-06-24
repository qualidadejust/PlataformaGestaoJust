// Catálogo dos módulos da Plataforma JUST exibidos no portal. `url` = onde o app roda
// (porta do front em dev); `healthUrl` = endpoint /api/health do back (CORS habilitado) para
// o indicador de status — opcional (apps front-only não têm). Cores em classes Tailwind.
//
// Em PRODUÇÃO (Render), os links e o health vêm de env no build do static site do Hub:
//   VITE_GATEWAY      = host do gateway (ex.: just-gateway.onrender.com) → monta os healthUrl
//   VITE_URL_<KEY>    = URL do static site de cada front (ex.: VITE_URL_CORE)
// Sem esses env (dev), cai nos defaults localhost abaixo.
const env = (import.meta as any).env ?? {};

/** Normaliza um host vindo do Render: `fromService property: host` às vezes traz só o NOME do
 *  serviço (ex.: "just-gateway"), sem domínio. Tira protocolo/barra e completa `.onrender.com`. */
const normHost = (h: string): string => {
  const limpo = h.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return limpo.includes(".") ? limpo : `${limpo}.onrender.com`;
};
const GW: string | undefined = env.VITE_GATEWAY ? normHost(env.VITE_GATEWAY) : undefined;

/** URL do front: usa VITE_URL_<KEY> em produção (aceita host sem esquema, via fromService),
 *  senão o default de dev. */
const frontUrl = (key: string, devUrl: string): string => {
  const v: string | undefined = env[`VITE_URL_${key.toUpperCase()}`];
  if (!v) return devUrl;
  return v.startsWith("http") ? v : `https://${normHost(v)}`;
};
/** healthUrl: via gateway em produção (prefixo do backend), senão o default de dev. */
const health = (prefix: string, devUrl: string, path = "/api/health"): string =>
  GW ? `https://${GW}${prefix}${path}` : devUrl;

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
    url: frontUrl("core", "http://localhost:4101"),
    healthUrl: health("/core", "http://localhost:4100/api/health"),
    tag: "Cadastros",
  },
  {
    key: "eleva",
    nome: "JustEleva",
    descricao: "Gestão de desempenho: avaliações, PDI, feedback, clima e indicadores.",
    icon: "TrendingUp",
    cor: "text-violet-600",
    url: frontUrl("eleva", "http://localhost:3002"),
    healthUrl: health("/eleva", "http://localhost:3001/api/health"),
    tag: "RH / Desempenho",
  },
  {
    key: "security",
    nome: "JustSecurity",
    descricao: "Segurança do Trabalho: entrega de EPI assinada por digital, fichas, inspeção.",
    icon: "ShieldCheck",
    cor: "text-emerald-600",
    url: frontUrl("security", "http://localhost:4000"),
    healthUrl: health("/security", "http://localhost:4001/api/health"),
    tag: "SST",
  },
  {
    key: "train",
    nome: "JustTrain",
    descricao: "Treinamentos: turmas, presença assinada (tela ou digital) e certificados.",
    icon: "GraduationCap",
    cor: "text-amber-600",
    url: frontUrl("train", "http://localhost:4601"),
    healthUrl: health("/train", "http://localhost:4600/api/health"),
    tag: "Treinamentos",
  },
  {
    key: "docs",
    nome: "JustDocs",
    descricao: "GED: pastas (SGQ/Obras/Pessoas/Empresa), documentos, versões e vencimentos.",
    icon: "FolderTree",
    cor: "text-teal-600",
    url: frontUrl("docs", "http://localhost:4400"),
    tag: "Documentos",
  },
  {
    key: "frota",
    nome: "JustFrota",
    descricao: "Frota: diário de bordo, abastecimento/manutenção e rateio por km entre obras.",
    icon: "Truck",
    cor: "text-orange-600",
    url: frontUrl("frota", "http://localhost:4301"),
    healthUrl: health("/frota", "http://localhost:4300/api/health"),
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

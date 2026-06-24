// Interceptor de fetch da Plataforma JUST (JustAtestados). Faz duas coisas:
// 1) PRODUÇÃO: prefixa chamadas relativas `/api` (back do app) e `/core` (JustCore) com a URL
//    do gateway (VITE_GATEWAY + VITE_API_PREFIX). Em dev é no-op (segue o proxy do Vite).
// 2) AUTH: injeta `Authorization: Bearer <token>` (do localStorage) em toda chamada /api e /core,
//    exceto o login; e em 401 limpa o token e volta pro login.
const env = (import.meta as any).env ?? {};
let gw: string | undefined = env.VITE_GATEWAY;
// Render às vezes injeta `fromService property: host` só com o NOME do serviço (ex.: "just-gateway"),
// sem o domínio. Normaliza: tira protocolo/barra final e completa `.onrender.com` quando vier sem ponto.
if (gw) {
  gw = gw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!gw.includes(".")) gw = `${gw}.onrender.com`;
}
const apiPrefix: string = env.VITE_API_PREFIX ?? "";
const API_BASE = gw ? `https://${gw}${apiPrefix}` : "";
const CORE_BASE = gw ? `https://${gw}` : "";

export const TOKEN_KEY = "just_token";

const orig = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : null;
  const ehApi = !!url && (url.startsWith("/api") || url.startsWith("/core"));
  const ehLogin = !!url && url.includes("/auth/login");

  if (!ehApi) return orig(input as any, init);

  const headers = new Headers(init.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !ehLogin && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  let alvo: string = url!;
  if (url!.startsWith("/core")) alvo = CORE_BASE + url!;
  else if (url!.startsWith("/api")) alvo = API_BASE + url!;

  const res = await orig(alvo, { ...init, headers });
  if (res.status === 401 && !ehLogin) {
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== "undefined") window.location.reload();
  }
  return res;
};

// Baixa um recurso protegido (ex.: anexo no GED) com o token e devolve um blob: URL.
// Navegação direta (<a>/<img src>) não manda o Bearer — por isso buscamos via fetch.
export async function fetchBlobUrl(downloadUrl: string): Promise<string | null> {
  try {
    const r = await fetch(downloadUrl);
    if (!r.ok) return null;
    return URL.createObjectURL(await r.blob());
  } catch {
    return null;
  }
}

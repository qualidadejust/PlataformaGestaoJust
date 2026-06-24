// Interceptor de fetch da Plataforma JUST. Faz duas coisas:
// 1) PRODUÇÃO: prefixa chamadas relativas `/api` (backend do app) e `/core` (JustCore) com a URL
//    do gateway (VITE_GATEWAY + VITE_API_PREFIX). Em dev é no-op (segue o proxy do Vite).
// 2) AUTH: injeta `Authorization: Bearer <token>` (do localStorage) em toda chamada /api e /core,
//    exceto o próprio login; e em resposta 401 limpa o token e volta pro login.
const env = (import.meta as any).env ?? {};
const gw: string | undefined = env.VITE_GATEWAY;
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

  // injeta o token (menos no login)
  const headers = new Headers(init.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !ehLogin && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  // reescreve a base em produção
  let alvo: string = url!;
  if (url!.startsWith("/core")) alvo = CORE_BASE + url!;
  else if (url!.startsWith("/api")) alvo = API_BASE + url!;

  const res = await orig(alvo, { ...init, headers });
  if (res.status === 401 && !ehLogin) {
    localStorage.removeItem(TOKEN_KEY);
    // recarrega p/ cair no LoginGate (token expirado/inválido)
    if (typeof window !== "undefined") window.location.reload();
  }
  return res;
};

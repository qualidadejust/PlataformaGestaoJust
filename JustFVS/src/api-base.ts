// Interceptor de fetch da Plataforma JUST (cópia compartilhada entre os fronts).
// 1) PRODUÇÃO: prefixa /api e /core com VITE_GATEWAY; 2) AUTH: injeta Bearer token.
const env = (import.meta as any).env ?? {};
let gw: string | undefined = env.VITE_GATEWAY;
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

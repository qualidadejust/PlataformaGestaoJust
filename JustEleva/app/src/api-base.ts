// Interceptor de fetch para PRODUÇÃO (deploy no Render): prefixa as chamadas relativas
// `/api/...` (backend do próprio app) e `/core/...` (JustCore) com a URL do gateway.
// Em DEV não há VITE_GATEWAY → no-op: os caminhos relativos seguem o proxy do Vite.
//
// Config no build (static site do Render):
//   VITE_GATEWAY     = host do gateway (ex.: just-gateway.onrender.com) — via fromService
//   VITE_API_PREFIX  = prefixo do backend deste app no gateway (ex.: "/core", "/security")
const env = (import.meta as any).env ?? {};
const gw: string | undefined = env.VITE_GATEWAY;
const apiPrefix: string = env.VITE_API_PREFIX ?? "";

if (gw) {
  const base = `https://${gw}`;
  const API_BASE = base + apiPrefix; // backend próprio do app
  const CORE_BASE = base; // JustCore (chamadas /core/...)
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : null;
    if (url) {
      if (url.startsWith("/core")) return orig(CORE_BASE + url, init);
      if (url.startsWith("/api")) return orig(API_BASE + url, init);
    }
    return orig(input, init);
  };
}

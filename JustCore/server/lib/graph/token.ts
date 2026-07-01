// Token do Microsoft Graph (OAuth2 client-credentials, app-only) — credencial ÚNICA do M365
// reusada por todas as integrações Graph da plataforma (SharePoint/storage, e-mail/sendMail...).
// Configurado por env: SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET.
// O segredo vive só no servidor (.env), nunca versionado/no front.

export function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não configurado (integração Microsoft Graph exige ${name})`);
  return v;
}

let cache: { value: string; exp: number } | null = null;

// Devolve um access token válido (app-only, scope .default), com cache em memória até ~60s
// antes de expirar. Compartilhado para não duplicar a aquisição de token entre integrações.
export async function getGraphToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cache && cache.exp - 60 > now) return cache.value;
  const tenant = reqEnv("SP_TENANT_ID");
  const body = new URLSearchParams({
    client_id: reqEnv("SP_CLIENT_ID"),
    client_secret: reqEnv("SP_CLIENT_SECRET"),
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token Graph falhou (${r.status}): ${await r.text()}`);
  const j = (await r.json()) as { access_token: string; expires_in?: number };
  cache = { value: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return cache.value;
}

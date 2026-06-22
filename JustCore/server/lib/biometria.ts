// Cliente do serviço local de biometria (SourceAFIS, .NET) em 127.0.0.1:4002.
// O Core usa só a extração de template no cadastro; o match (verificação) é feito
// pelo JustSecurity, que lê os templates do Core.
const BIOMETRIA_URL = process.env.BIOMETRIA_URL ?? "http://127.0.0.1:4002";

export async function biometriaOnline(): Promise<boolean> {
  try {
    const r = await fetch(BIOMETRIA_URL + "/health", { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

// PNG (base64/dataURL) -> template SourceAFIS (base64).
export async function extractTemplate(image: string): Promise<string> {
  const r = await fetch(BIOMETRIA_URL + "/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as any).error ?? `extração falhou (${r.status})`);
  }
  const data = (await r.json()) as { template: string };
  return data.template;
}

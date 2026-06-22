// O JustDocs é só front: tudo vem da API do Core (proxy /api → 4100).
export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const isForm = opts?.body instanceof FormData;
  const r = await fetch("/api" + path, {
    headers: opts?.body && !isForm ? { "Content-Type": "application/json" } : undefined,
    ...opts,
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as any).error ?? r.statusText);
  }
  return r.status === 204 ? (null as T) : ((await r.json()) as T);
}

// upload multipart (arquivo + campos) para /api/documentos
export async function uploadDoc(form: FormData) {
  return api("/documentos", { method: "POST", body: form });
}

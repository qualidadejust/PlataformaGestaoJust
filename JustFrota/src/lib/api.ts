// Camada de dados: /api → JustFrota (4300); /core/api → JustCore (4100), via proxy do Vite.
export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as any).error ?? r.statusText);
  }
  return r.status === 204 ? (null as T) : ((await r.json()) as T);
}

export const core = <T = any>(path: string) => api<T>("/core" + path);

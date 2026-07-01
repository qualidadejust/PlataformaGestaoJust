// Acesso ao JustCore (fonte única dos cadastros). O JustFrota consome veículos, obras e
// colaboradores do Core para popular selects e para casar nomes na importação do diário.
const CORE_URL = process.env.CORE_URL ?? "http://127.0.0.1:4100";

async function get<T>(path: string): Promise<T[]> {
  try {
    const r = await fetch(`${CORE_URL}${path}`, {
      headers: { "x-internal-token": process.env.INTERNAL_TOKEN ?? "" },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    return (await r.json()) as T[];
  } catch {
    return [];
  }
}

export interface CoreRef {
  id: string;
  nome?: string;
  identificacao?: string;
  placa?: string;
  [k: string]: unknown;
}

export const coreVeiculos = () => get<CoreRef>("/api/veiculos");
export const coreObras = () => get<CoreRef>("/api/obras");
export const coreColaboradores = () => get<CoreRef>("/api/colaboradores");

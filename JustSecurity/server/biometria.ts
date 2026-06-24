// Verificação biométrica do JustSecurity. Os TEMPLATES vêm do JustCore (cadastro
// é lá, junto do colaborador); o match roda no serviço SourceAFIS (.NET, 4002).
const BIOMETRIA_URL = process.env.BIOMETRIA_URL ?? "http://127.0.0.1:4002";
const CORE_URL = process.env.CORE_URL ?? "http://127.0.0.1:4100";

// Limiar de aceitação. SourceAFIS: ~40 ≈ FMR 0,01%. Configurável por env.
export const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 40);

// O serviço de matching está no ar?
export async function biometriaOnline(): Promise<boolean> {
  try {
    const r = await fetch(BIOMETRIA_URL + "/health", { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

// Templates cadastrados do colaborador (no Core).
async function templatesDoColaborador(colaboradorId: string): Promise<string[]> {
  const r = await fetch(`${CORE_URL}/api/biometria/colaboradores/${colaboradorId}/templates`, {
    headers: { "x-internal-token": process.env.INTERNAL_TOKEN ?? "" },
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) throw new Error(`Core retornou ${r.status} ao buscar templates`);
  return (await r.json()) as string[];
}

export interface VerifyResult {
  enrolled: boolean; // o colaborador tem digitais cadastradas no Core?
  match: boolean; // a digital bateu com alguma cadastrada?
  score: number; // melhor score
  threshold: number;
}

// Verifica uma digital (imagem) contra os templates do colaborador (do Core).
// Sem cadastro → enrolled=false (quem chama decide; usamos "verify-if-enrolled").
export async function verificarDigital(colaboradorId: string, image: string): Promise<VerifyResult> {
  const candidates = await templatesDoColaborador(colaboradorId);
  if (candidates.length === 0) {
    return { enrolled: false, match: false, score: 0, threshold: MATCH_THRESHOLD };
  }
  const r = await fetch(BIOMETRIA_URL + "/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ probe: image, candidates }),
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as any).error ?? `match falhou (${r.status})`);
  }
  const data = (await r.json()) as { bestScore: number; bestIndex: number };
  return {
    enrolled: true,
    match: data.bestScore >= MATCH_THRESHOLD,
    score: data.bestScore,
    threshold: MATCH_THRESHOLD,
  };
}

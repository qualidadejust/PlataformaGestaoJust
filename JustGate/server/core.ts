// Identificação do remetente: o JustGate NÃO tem cadastro próprio — consulta o JustCore
// (fonte única) para descobrir QUEM mandou a mensagem pelo número de telefone.
const CORE_URL = process.env.CORE_URL ?? "http://127.0.0.1:4100";

function digits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export interface CoreColaborador {
  id: string;
  nome: string;
  telefone?: string | null;
  [k: string]: unknown;
}

// Acha o colaborador pelo telefone. A Cloud API entrega o número em E.164 (ex.: 5531988887777);
// o cadastro pode estar em formatos variados, então comparamos pelos últimos 8 dígitos.
export async function identifyByPhone(phone: string): Promise<CoreColaborador | null> {
  const tail = digits(phone).slice(-8);
  if (tail.length < 8) return null;
  try {
    const r = await fetch(`${CORE_URL}/api/colaboradores`, {
      headers: { "x-internal-token": process.env.INTERNAL_TOKEN ?? "" },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const list = (await r.json()) as CoreColaborador[];
    return list.find((c) => digits(c.telefone).slice(-8) === tail) ?? null;
  } catch {
    return null;
  }
}

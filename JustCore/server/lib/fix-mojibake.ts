// Corrige "mojibake" — texto UTF-8 que foi decodificado como Latin-1/Windows-1252 em algum
// ponto do caminho (ex.: "PreparaÃ§Ã£o" → "Preparação"). Ocorre em CSVs do Prevision.
//
// É CONSERVADOR: só reverte quando encontra a assinatura inconfundível do mojibake UTF-8→Latin-1
// (um byte-líder 0xC2–0xDF seguido de um byte de continuação 0x80–0xBF, que viram os caracteres
// U+00C2–U+00DF seguidos de U+0080–U+00BF). Assim, texto já correto (ex.: "café", "São") não é
// tocado, pois não contém essa sequência.

// Assinatura: líder de 2 bytes (U+00C2–U+00DF) seguido de um byte de continuação (U+0080–U+00BF).
const MOJIBAKE = /[Â-ß][-¿]/;

export function fixMojibake(s: string): string {
  if (typeof s !== "string" || !s || !MOJIBAKE.test(s)) return s;
  try {
    const revertido = Buffer.from(s, "latin1").toString("utf8");
    // Se a reversão introduziu o caractere de substituição (U+FFFD), o palpite estava errado → mantém.
    if (revertido.includes("�")) return s;
    return revertido;
  } catch {
    return s;
  }
}

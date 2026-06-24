// Cliente mínimo da API do Google Gemini (REST, fetch nativo do Node — sem SDK).
// Usado pela triagem do GED para LER o conteúdo de um PDF/imagem (visão) e devolver JSON
// estruturado. A chave vive só aqui no Core (GEMINI_API_KEY), nunca no front.
//
// LGPD: isto envia o conteúdo do documento (possivelmente sensível) ao Google. Preferir
// projeto/tier do Gemini que NÃO treina com os dados, e registrar a trilha (logAcesso) no caller.
const MODELO = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não configurado (a triagem por IA exige ${name})`);
  return v;
}

// A IA só "enxerga" PDF e imagem; o resto (Office, zip…) não vai para o Gemini.
export const mimeSuportado = (m: string) => m === "application/pdf" || m.startsWith("image/");

// Limite do envio inline do Gemini (~20 MB de payload). Acima disso, orientar upload manual.
export const LIMITE_INLINE = 15 * 1024 * 1024;

export interface GerarJsonInput {
  buffer: Buffer;
  mimeType: string;
  prompt: string;
  schema: Record<string, unknown>; // responseSchema (subset OpenAPI do Gemini)
}

// Manda o arquivo + prompt e força saída JSON conforme o schema. Devolve o objeto parseado.
export async function gerarJson({ buffer, mimeType, prompt, schema }: GerarJsonInput): Promise<any> {
  const key = reqEnv("GEMINI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${key}`;
  const body = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType, data: buffer.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0 },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Gemini falhou (${r.status}): ${await r.text()}`);
  const j = (await r.json()) as any;
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini não retornou conteúdo (resposta vazia ou bloqueada)");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini retornou JSON inválido: ${text.slice(0, 200)}`);
  }
}

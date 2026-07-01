// Cliente da WhatsApp Cloud API (Meta). Em dev sem token configurado, cai em modo
// "simulado" (loga no console) — assim dá para testar o fluxo sem mandar mensagem real.
const VERSION = () => process.env.WA_API_VERSION ?? "v21.0";
const PHONE_ID = () => process.env.WA_PHONE_NUMBER_ID ?? "";
const TOKEN = () => process.env.WA_TOKEN ?? "";

export function waConfigured(): boolean {
  return !!(TOKEN() && PHONE_ID());
}

// Brasil: a Cloud API às vezes entrega o wa_id do celular SEM o 9 (12 dígitos: 55+DDD+8).
// Para enviar de volta, recompõe o 9 (13 dígitos) — caso contrário a Meta não casa o número.
export function normalizeBr(to: string): string {
  const d = to.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("55")) return d.slice(0, 4) + "9" + d.slice(4);
  return d;
}

function graph(pathSuffix: string): string {
  return `https://graph.facebook.com/${VERSION()}/${pathSuffix}`;
}

// Envia uma mensagem de texto. Obs.: fora da janela de 24h só passam templates aprovados;
// para resposta a uma mensagem recebida (dentro da janela), texto livre funciona.
export async function sendText(to: string, body: string): Promise<void> {
  if (!waConfigured()) {
    console.log(`[wa:simulado] -> ${to}: ${body}`);
    return;
  }
  const r = await fetch(graph(`${PHONE_ID()}/messages`), {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: normalizeBr(to), type: "text", text: { body } }),
  });
  if (!r.ok) console.error("envio WhatsApp falhou:", r.status, await r.text());
}

// Envia uma mensagem com BOTÕES de resposta (reply buttons). Funcionam DENTRO da janela de
// 24h (mensagem de sessão) — não exigem template aprovado. Máx. 3 botões; título ≤ 20 chars.
// Cada botão volta no webhook como type=interactive → interactive.button_reply.id.
export async function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<void> {
  if (!waConfigured()) {
    console.log(`[wa:simulado] -> ${to}: ${body} [botões: ${buttons.map((b) => b.title).join(" | ")}]`);
    return;
  }
  const r = await fetch(graph(`${PHONE_ID()}/messages`), {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeBr(to),
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) },
      },
    }),
  });
  if (!r.ok) console.error("envio de botões WhatsApp falhou:", r.status, await r.text());
}

// Baixa uma mídia recebida (foto de atestado, PDF…) pelo media id. Usado adiante para
// arquivar no GED (POST /api/documentos do Core). Retorna o buffer + content-type.
export async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer; contentType?: string } | null> {
  if (!waConfigured()) return null;
  const meta = await fetch(graph(mediaId), { headers: { Authorization: `Bearer ${TOKEN()}` } });
  if (!meta.ok) return null;
  const { url } = (await meta.json()) as { url?: string };
  if (!url) return null;
  const file = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` } });
  if (!file.ok) return null;
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    contentType: file.headers.get("content-type") ?? undefined,
  };
}

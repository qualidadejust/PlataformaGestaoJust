import { getGraphToken, reqEnv } from "../graph/token.ts";
import type { EmailDriver, EmailInput, EmailResult } from "./types.ts";

// Driver de PROD: envia via Microsoft 365 (Microsoft Graph sendMail), reusando a credencial
// app-only do Graph (../graph/token.ts) — a mesma do SharePoint. Ver docs/integracao-email.md.
//   EMAIL_FROM  = caixa remetente (compartilhada, ex.: naoresponda@construtorajust.com.br).
//                 A app precisa de Mail.Send + Application Access Policy restringindo a essa caixa.
//   EMAIL_REPLY_TO = (opcional) responder-para padrão, sobreposto por input.replyTo.
const GRAPH = "https://graph.microsoft.com/v1.0";

function recipients(v: string | string[] | undefined): { emailAddress: { address: string } }[] {
  if (!v) return [];
  return [v].flat().map((address) => ({ emailAddress: { address } }));
}

export class GraphEmail implements EmailDriver {
  readonly name = "graph" as const;

  async enviar(input: EmailInput): Promise<EmailResult> {
    const from = reqEnv("EMAIL_FROM");
    const token = await getGraphToken();
    const to = Array.isArray(input.to) ? input.to : [input.to];
    const replyTo = input.replyTo ?? process.env.EMAIL_REPLY_TO;

    const message: Record<string, unknown> = {
      subject: input.subject,
      body: input.html
        ? { contentType: "HTML", content: input.html }
        : { contentType: "Text", content: input.texto ?? "" },
      toRecipients: recipients(to),
    };
    if (input.cc) message.ccRecipients = recipients(input.cc);
    if (replyTo) message.replyTo = recipients(replyTo);

    const url = `${GRAPH}/users/${encodeURIComponent(from)}/sendMail`;
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
    if (!r.ok) throw new Error(`envio de e-mail (Graph) falhou (${r.status}): ${await r.text()}`);
    return { ok: true, driver: this.name, destinatarios: to.length };
  }
}

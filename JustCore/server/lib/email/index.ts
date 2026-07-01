import { ConsoleEmail } from "./console.ts";
import { GraphEmail } from "./graph.ts";
import type { EmailDriver, EmailInput, EmailResult } from "./types.ts";

export type { EmailInput, EmailResult } from "./types.ts";

// Instâncias preguiçosas: o driver Graph só é instanciado quando usado (não exige env em dev).
const console_ = new ConsoleEmail();
let graph: GraphEmail | null = null;

// Driver padrão definido por EMAIL_DRIVER (default `console` — dev/sem M365).
export function getEmailDriver(): EmailDriver {
  if ((process.env.EMAIL_DRIVER ?? "console") === "graph") return (graph ??= new GraphEmail());
  return console_;
}

// API pública: qualquer rota/app dispara e-mail por aqui, sem conhecer o driver.
export async function enviarEmail(input: EmailInput): Promise<EmailResult> {
  if (!input.to || [input.to].flat().filter(Boolean).length === 0)
    throw new Error("e-mail sem destinatário (to)");
  if (!input.subject) throw new Error("e-mail sem assunto (subject)");
  if (!input.html && !input.texto) throw new Error("e-mail sem corpo (html ou texto)");
  return getEmailDriver().enviar(input);
}

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ESCAPE[c]);
}

// Wrapper HTML pt-BR com a marca JUST — base reutilizável para qualquer e-mail da plataforma.
// `corpo` é HTML já confiável (montado pelo chamador); `titulo`/cta.texto são escapados.
export function layoutPtBr(opts: {
  titulo: string;
  corpo: string;
  cta?: { texto: string; url: string };
}): string {
  const cta = opts.cta
    ? `<p style="margin:24px 0"><a href="${esc(opts.cta.url)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;display:inline-block">${esc(opts.cta.texto)}</a></p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
      <tr><td style="background:#0f172a;color:#fff;padding:20px 28px;font-size:18px;font-weight:700">Plataforma de Gestão JUST</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:20px">${esc(opts.titulo)}</h1>
        <div style="font-size:15px;line-height:1.6">${opts.corpo}</div>
        ${cta}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0">
        Mensagem automática da Plataforma de Gestão JUST — Construtora JUST. Não responda a este e-mail.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

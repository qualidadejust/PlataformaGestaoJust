import type { EmailDriver, EmailInput, EmailResult } from "./types.ts";

// Driver de DEV: não envia nada — só loga no console. É o default (EMAIL_DRIVER ausente),
// para o fluxo/rota/template/auditoria poderem ser testados sem credencial M365.
// Espelha o "modo simulado" do JustGate (whatsapp.ts).
export class ConsoleEmail implements EmailDriver {
  readonly name = "console" as const;

  async enviar(input: EmailInput): Promise<EmailResult> {
    const to = Array.isArray(input.to) ? input.to : [input.to];
    console.log(
      `[email:console] para=${to.join(", ")} | assunto="${input.subject}"` +
        (input.cc ? ` | cc=${[input.cc].flat().join(", ")}` : ""),
    );
    if (input.html) console.log(`[email:console] (HTML, ${input.html.length} chars não enviado)`);
    return { ok: true, driver: this.name, destinatarios: to.length };
  }
}

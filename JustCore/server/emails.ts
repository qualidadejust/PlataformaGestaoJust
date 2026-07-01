// Serviço de e-mail transversal do Core (Microsoft 365 via Graph sendMail; console em dev).
// Qualquer app dispara e-mail chamando estas rotas server-to-server (x-internal-token),
// como já faz com o GED. Ver server/lib/email/ e docs/integracao-email.md.
//   POST /api/emails/enviar   corpo EmailInput { to, subject, html|texto, cc?, replyTo? }
//   POST /api/emails/testar   manda um e-mail-modelo (valida a config M365 ponta a ponta)
import type { Express, Request, RequestHandler } from "express";
import { logAcesso, type TokenPayload } from "./lib/auth.ts";
import { rateLimit } from "./lib/rate-limit.ts";
import { enviarEmail, layoutPtBr, type EmailInput } from "./lib/email/index.ts";

const ipDe = (req: Request) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || undefined;
const atorDe = (req: Request) => ((req as any).user as TokenPayload | undefined)?.sub ?? null;

export function registerEmails(app: Express, perm: (chave: string) => RequestHandler) {
  const escrever = perm("core.email.write");

  // Rate limit anti-abuso (e-mail é abusável: spam/relay interno). Por ator (usuário/IP);
  // chamadas internas app→Core são isentas (apps confiáveis, um digest pode disparar em lote).
  // Configurável por env; defaults conservadores.
  const limite = rateLimit({
    max: Number(process.env.EMAIL_RATE_MAX ?? 60),
    windowMs: Number(process.env.EMAIL_RATE_WINDOW_MS ?? 60_000),
  });

  // Envio genérico. Usado por telas (JWT) e por outros apps (x-internal-token).
  app.post("/api/emails/enviar", escrever, limite, async (req, res) => {
    const input = req.body as EmailInput;
    try {
      const r = await enviarEmail(input);
      await logAcesso(atorDe(req), "email_enviado", { recurso: "core.email", ip: ipDe(req) });
      res.json(r);
    } catch (e: any) {
      await logAcesso(atorDe(req), "email_falha", { recurso: "core.email", ip: ipDe(req), sucesso: false });
      res.status(400).json({ error: e?.message ?? "falha ao enviar e-mail" });
    }
  });

  // Teste de configuração: manda um e-mail-modelo para o endereço informado (`para`) — sem
  // depender de nenhum gatilho de negócio. Prova credencial M365 + template + auditoria.
  app.post("/api/emails/testar", escrever, limite, async (req, res) => {
    const para = (req.body?.para ?? req.body?.to) as string | undefined;
    if (!para) return res.status(400).json({ error: "informe 'para' (e-mail de destino)" });
    try {
      const html = layoutPtBr({
        titulo: "E-mail de teste da Plataforma JUST",
        corpo: "<p>Se você recebeu esta mensagem, o envio de e-mail está configurado corretamente.</p>",
      });
      const r = await enviarEmail({ to: para, subject: "[JUST] E-mail de teste", html });
      await logAcesso(atorDe(req), "email_teste", { recurso: "core.email", ip: ipDe(req) });
      res.json(r);
    } catch (e: any) {
      await logAcesso(atorDe(req), "email_falha", { recurso: "core.email", ip: ipDe(req), sucesso: false });
      res.status(400).json({ error: e?.message ?? "falha ao enviar e-mail de teste" });
    }
  });
}

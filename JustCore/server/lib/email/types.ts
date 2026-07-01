// Tipos do serviço de e-mail transversal do Core. Mesma filosofia do storage:
// uma interface, drivers escolhidos por env (console em dev, graph/M365 em prod).

export type EmailDriverName = "console" | "graph";

export interface EmailInput {
  to: string | string[];
  subject: string;
  // Forneça html (preferido) e/ou texto. Sem nenhum dos dois, é erro.
  html?: string;
  texto?: string;
  cc?: string | string[];
  replyTo?: string;
}

export interface EmailResult {
  ok: boolean;
  driver: EmailDriverName;
  // Quantidade de destinatários (para auditoria/log).
  destinatarios: number;
}

export interface EmailDriver {
  readonly name: EmailDriverName;
  enviar(input: EmailInput): Promise<EmailResult>;
}

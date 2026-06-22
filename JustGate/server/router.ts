import type { CoreColaborador } from "./core.ts";

// Mensagem recebida, já normalizada a partir do payload da Cloud API.
export interface Inbound {
  from: string; // número E.164 do remetente
  name?: string; // nome do perfil do WhatsApp
  type: string; // text | image | document | audio | ...
  text?: string; // corpo (quando type=text)
  mediaId?: string; // id da mídia (quando image/document/...)
}

// Núcleo do JustGate: decide PARA ONDE encaminhar e o que responder. Por ora é um esqueleto
// com identificação + intenção; os módulos (JustAtestados, JustAccess, GED) plugam aqui.
export function route(msg: Inbound, colaborador: CoreColaborador | null): string {
  if (!colaborador) {
    return "Olá! Não reconheci seu número na base da Just. Peça ao RH para cadastrar seu telefone no JustCore para usar os serviços por aqui.";
  }
  const quem = colaborador.nome?.split(" ")[0] ?? "colaborador";

  if (msg.type === "image" || msg.type === "document") {
    // TODO(GED): baixar a mídia (whatsapp.downloadMedia) e POST /api/documentos no Core
    // (ex.: categoria=atestado, tipo_codigo=atestado, sensivel herda do tipo).
    return `Recebi seu arquivo, ${quem}. Em breve vou arquivá-lo automaticamente. [rota: GED/JustAtestados]`;
  }

  const t = (msg.text ?? "").toLowerCase();
  if (t.includes("acesso")) {
    // TODO(JustAccess): validar permissão de quem pede e abrir o acesso/janela do terceiro.
    return `${quem}, pedido de acesso identificado. [rota: JustAccess — em breve]`;
  }
  if (t.includes("atestado")) {
    return `${quem}, pode mandar a foto do atestado aqui que eu registro. [rota: JustAtestados — em breve]`;
  }
  return `Oi, ${quem}! JustGate no ar ✅. Ainda estou aprendendo a rotear. Você disse: "${msg.text ?? ""}".`;
}

// Orquestração do fluxo de documentos por WhatsApp (Fase 1):
//   foto/PDF de colaborador CADASTRADO → IA classifica (Core) → cria proposta pendente →
//   manda BOTÕES "Confirmar/Cancelar". No clique, grava no GED na FILA DE ANÁLISE (Confirmar)
//   ou descarta (Cancelar). Tudo amarrado ao colaborador que mandou (segurança).
//
// O JustGate não tem banco: o estado (pendente) e a gravação moram no Core, chamados aqui
// servidor-a-servidor com x-internal-token. Ver skill `justgate-whatsapp`.
import type { CoreColaborador } from "./core.ts";
import type { Inbound } from "./router.ts";
import { downloadMedia, sendButtons, sendText } from "./whatsapp.ts";

const CORE_URL = process.env.CORE_URL ?? "http://127.0.0.1:4100";
const INTERNAL = () => process.env.INTERNAL_TOKEN ?? "";

function fmtData(s?: string): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

interface Triagem {
  arquivo: string;
  tipo_codigo: string;
  sensivel: boolean;
  valido_ate: string;
  confianca: string;
  resumo: string;
  dados_extraidos: Record<string, string>;
  // colaborador detectado NO documento (a IA casa o nome com o cadastro do Core)
  colaborador_id?: string | null;
  colaborador_nome?: string;
  match?: string; // exato | parcial | sem
}
interface Pendente {
  id: string;
  telefone: string;
  media_id: string;
  status: string;
  arquivo: string;
  destino: string;
  doc_id?: string | null;
}

// --- chamadas ao Core (internas) ---------------------------------------------------------
async function coreJson<T>(path: string, init: RequestInit): Promise<T> {
  const r = await fetch(CORE_URL + path, {
    ...init,
    headers: { "x-internal-token": INTERNAL(), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`Core ${path} -> ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

async function classificar(buffer: Buffer, filename: string, contentType: string): Promise<Triagem> {
  const fd = new FormData();
  fd.append("file", new Blob([buffer], { type: contentType }), filename);
  fd.append("entidade_tipo", "colaborador");
  return coreJson<Triagem>("/api/triagem/documento", { method: "POST", body: fd });
}

async function criarPendente(payload: Record<string, unknown>): Promise<Pendente & { jaExistia: boolean }> {
  return coreJson("/api/gate/pendente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const getPendente = (id: string) => coreJson<Pendente>(`/api/gate/pendente/${id}`, { method: "GET" });

async function confirmarPendente(id: string, buffer: Buffer, filename: string, contentType: string) {
  const fd = new FormData();
  fd.append("file", new Blob([buffer], { type: contentType }), filename);
  return coreJson<{ doc_id: string; destino: string }>(`/api/gate/pendente/${id}/confirmar`, {
    method: "POST",
    body: fd,
  });
}

const cancelarPendente = (id: string) =>
  coreJson(`/api/gate/pendente/${id}/cancelar`, { method: "POST" });

const tail8 = (s: string) => s.replace(/\D/g, "").slice(-8);

// --- 1) chegou uma mídia (foto/PDF) ------------------------------------------------------
export async function processarMidia(msg: Inbound, colaborador: CoreColaborador): Promise<void> {
  const quem = colaborador.nome?.split(" ")[0] ?? "colaborador";
  if (!msg.mediaId) return;

  const media = await downloadMedia(msg.mediaId);
  if (!media) {
    await sendText(msg.from, `${quem}, não consegui baixar o arquivo. Pode reenviar?`);
    return;
  }
  const filename = msg.filename || (media.contentType?.startsWith("image/") ? "foto.jpg" : "documento.pdf");
  const contentType = media.contentType ?? "application/octet-stream";

  let ia: Triagem;
  try {
    ia = await classificar(media.buffer, filename, contentType);
  } catch (e) {
    console.error("[fluxo] triagem falhou:", (e as Error).message);
    await sendText(msg.from, `${quem}, recebi seu arquivo mas não consegui analisá-lo agora. Tente de novo em instantes.`);
    return;
  }

  // DONO do documento: se a IA reconheceu QUEM é o documento (nome casado no Core), usa essa
  // pessoa — não o remetente. Ex.: RH manda o atestado do José → vai pro José, não pro RH.
  // Sem match (ou admissão de pessoa nova), cai no remetente. O RH ainda confere na Fila.
  const temMatch = !!ia.colaborador_id && (ia.match ?? "sem") !== "sem";
  const donoId = temMatch ? (ia.colaborador_id as string) : colaborador.id;
  const donoNome = temMatch ? (ia.colaborador_nome as string) : colaborador.nome;

  try {
    const pend = await criarPendente({
      telefone: msg.from,
      colaborador_id: donoId,
      colaborador_nome: donoNome,
      media_id: msg.mediaId,
      arquivo: filename,
      entidade_tipo: "colaborador",
      tipo_codigo: ia.tipo_codigo,
      sensivel: ia.sensivel,
      valido_ate: ia.valido_ate,
      dados_extraidos: ia.dados_extraidos,
      resumo: ia.resumo,
      confianca: ia.confianca,
      message_id: msg.id ?? `${msg.from}-${msg.mediaId}`,
    });
    // idempotência: webhook reenviado → não manda os botões de novo
    if (pend.jaExistia) return;

    await sendButtons(msg.from, montarResumo(quem, ia), [
      { id: `confirmar:${pend.id}`, title: "✅ Confirmar" },
      { id: `cancelar:${pend.id}`, title: "✖️ Cancelar" },
    ]);
  } catch (e) {
    console.error("[fluxo] criar pendente/botões falhou:", (e as Error).message);
    await sendText(msg.from, `${quem}, recebi e li o documento, mas falhei ao registrar a proposta. Tente de novo em instantes.`);
  }
}

// Texto do card de confirmação: o que a IA entendeu + os campos detectados.
function montarResumo(quem: string, ia: Triagem): string {
  const d = ia.dados_extraidos ?? {};
  const ehAdmissao = /admiss|contrato.*trabalho|ficha.*func/.test((ia.tipo_codigo ?? "").toLowerCase());

  if (ehAdmissao) {
    const linhas = [`${quem}, identifiquei uma *admissão* (novo colaborador):`];
    if (d.nome_completo) linhas.push(`👤 ${d.nome_completo}`);
    if (d.cpf) linhas.push(`CPF: ${d.cpf}`);
    if (d.cargo) linhas.push(`Cargo: ${d.cargo}`);
    if (d.data_admissao) linhas.push(`Admissão: ${fmtData(d.data_admissao)}`);
    linhas.push("", "Confirma o envio para o RH iniciar o cadastro?");
    return linhas.join("\n");
  }

  const linhas = [`${quem}, identifiquei o seguinte:`];
  if (ia.resumo) linhas.push(`📄 ${ia.resumo}`);
  if (ia.tipo_codigo) linhas.push(`Tipo: ${ia.tipo_codigo}`);
  if (d.cid) linhas.push(`CID: ${d.cid}`);
  if (d.dias_afastamento) linhas.push(`Afastamento: ${d.dias_afastamento} dia(s)`);
  if (d.horas) linhas.push(`Horas: ${d.horas}`);
  if (d.data_inicio) linhas.push(`Início: ${fmtData(d.data_inicio)}`);
  if (d.data_realizacao) linhas.push(`Realização: ${fmtData(d.data_realizacao)}`);
  if (d.instrutor) linhas.push(`Instrutor: ${d.instrutor}`);
  if (d.carga_horaria) linhas.push(`Carga horária: ${d.carga_horaria}`);
  if (ia.valido_ate) linhas.push(`Validade: ${fmtData(ia.valido_ate)}`);
  linhas.push("", "Confirma o envio para análise?");
  return linhas.join("\n");
}

// --- 2) clicou num botão (confirmar/cancelar) --------------------------------------------
export async function processarBotao(msg: Inbound, colaborador: CoreColaborador): Promise<void> {
  const quem = colaborador.nome?.split(" ")[0] ?? "colaborador";
  const [acao, id] = (msg.interactiveId ?? "").split(":");
  if (!id) return;

  let pend: Pendente;
  try {
    pend = await getPendente(id);
  } catch {
    await sendText(msg.from, "Essa proposta não está mais disponível. Reenvie o documento, por favor.");
    return;
  }
  // segurança: só quem mandou pode confirmar/cancelar a própria proposta
  if (tail8(pend.telefone) !== tail8(msg.from)) return;

  if (acao === "cancelar") {
    await cancelarPendente(id).catch(() => {});
    await sendText(msg.from, `Ok, ${quem}, cancelei. Nada foi lançado.`);
    return;
  }
  if (acao !== "confirmar") return;

  if (pend.status === "confirmado") {
    await sendText(msg.from, `${quem}, esse documento já está na fila de análise ✅.`);
    return;
  }
  if (pend.status !== "aguardando") {
    await sendText(msg.from, "Essa proposta expirou ou foi cancelada. Reenvie o documento, por favor.");
    return;
  }

  const media = await downloadMedia(pend.media_id);
  if (!media) {
    await sendText(msg.from, `${quem}, não consegui recuperar o arquivo (pode ter expirado). Reenvie, por favor.`);
    return;
  }
  const contentType = media.contentType ?? "application/octet-stream";
  try {
    await confirmarPendente(id, media.buffer, pend.arquivo, contentType);
    await sendText(
      msg.from,
      `Pronto, ${quem}! ✅ Enviei para a *fila de análise*. O RH vai conferir e finalizar o lançamento.`,
    );
  } catch (e) {
    console.error("[fluxo] confirmar falhou:", (e as Error).message);
    await sendText(msg.from, `${quem}, deu um problema ao registrar. Tente novamente em instantes.`);
  }
}

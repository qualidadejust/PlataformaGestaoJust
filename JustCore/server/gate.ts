// Triagem pendente do JustGate (WhatsApp). O JustGate (gateway WhatsApp) chama estas rotas
// servidor-a-servidor (x-internal-token). Fluxo: a IA classifica → cria o pendente → o
// colaborador confirma pelo botão no zap → grava no GED na FILA DE ANÁLISE (analise=pendente).
//
//   POST /api/gate/pendente                 cria a proposta (idempotente por message_id)
//   POST /api/gate/pendente/:id/confirmar    multipart file → grava no GED, marca confirmado
//   POST /api/gate/pendente/:id/cancelar     descarta a proposta
//
// LGPD: o arquivo só é gravado no confirmar (até lá guardamos só o media_id da Meta). Atestado
// é dado de saúde (sensivel) → herda o download mediado do GED. Ver skill `justgate-whatsapp`.
import type { Express, RequestHandler } from "express";
import multer from "multer";
import { prisma } from "./lib/prisma.ts";
import { getStorage } from "./lib/storage/index.ts";
import { randomUUID } from "node:crypto";
import { fixFilename } from "./documentos.ts";

const db = prisma as any;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// Janela para o colaborador confirmar no WhatsApp antes de a proposta expirar.
const TTL_MIN = 60;

// Deriva o app dono (a "ponte") a partir do tipo classificado. Atestado/declaração → JustAtestados;
// treinamento/certificado → JustTrain; o resto fica só no GED.
function destinoDoTipo(tipo_codigo: string | null | undefined): string {
  const t = (tipo_codigo ?? "").toLowerCase();
  if (/atestado|declarac|afastamento/.test(t)) return "atestados";
  if (/treinamento|certificad|capacitac|nr\d/.test(t)) return "treinamento";
  return "ged";
}

export function registerGate(app: Express, perm: (chave: string) => RequestHandler) {
  const escrever = perm("ged.documento.write");

  // Cria a proposta pendente. Idempotente: se o mesmo message_id já veio (a Meta reenvia o
  // webhook), devolve o pendente existente em vez de duplicar.
  app.post("/api/gate/pendente", escrever, async (req, res) => {
    try {
      const {
        telefone,
        colaborador_id,
        colaborador_nome,
        media_id,
        arquivo,
        entidade_tipo,
        tipo_codigo,
        sensivel,
        valido_ate,
        dados_extraidos,
        resumo,
        confianca,
        message_id,
      } = req.body ?? {};
      if (!telefone || !colaborador_id || !media_id || !message_id)
        return res
          .status(400)
          .json({ error: "telefone, colaborador_id, media_id e message_id são obrigatórios" });

      const existente = await db.triagemPendente.findUnique({ where: { message_id } });
      if (existente) return res.json({ ...existente, jaExistia: true });

      const pend = await db.triagemPendente.create({
        data: {
          telefone,
          colaborador_id,
          colaborador_nome: colaborador_nome ?? "",
          media_id,
          arquivo: arquivo ?? "documento",
          entidade_tipo: entidade_tipo ?? "colaborador",
          tipo_codigo: tipo_codigo || null,
          destino: destinoDoTipo(tipo_codigo),
          sensivel: sensivel === true || sensivel === "true",
          valido_ate: valido_ate || null,
          dados_extraidos:
            typeof dados_extraidos === "string" ? dados_extraidos : JSON.stringify(dados_extraidos ?? {}),
          resumo: resumo || null,
          confianca: confianca || null,
          message_id,
          status: "aguardando",
          expira_em: new Date(Date.now() + TTL_MIN * 60_000),
        },
      });
      res.status(201).json({ ...pend, jaExistia: false });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // Lê o pendente (o JustGate usa para recuperar o media_id e re-baixar no confirmar).
  app.get("/api/gate/pendente/:id", escrever, async (req, res) => {
    try {
      const pend = await db.triagemPendente.findUnique({ where: { id: req.params.id } });
      if (!pend) return res.status(404).json({ error: "pendente não encontrado" });
      res.json(pend);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  // Confirma: recebe o arquivo (re-baixado da Meta pelo JustGate) e grava no GED na fila de
  // análise. Idempotente: se já confirmado, devolve o doc_id existente sem regravar.
  app.post("/api/gate/pendente/:id/confirmar", escrever, upload.single("file"), async (req, res) => {
    try {
      const pend = await db.triagemPendente.findUnique({ where: { id: req.params.id } });
      if (!pend) return res.status(404).json({ error: "pendente não encontrado" });
      if (pend.status === "confirmado")
        return res.json({ ok: true, doc_id: pend.doc_id, jaConfirmado: true });
      if (pend.status === "cancelado") return res.status(409).json({ error: "proposta já cancelada" });

      const f = (req as any).file as Express.Multer.File | undefined;
      if (!f) return res.status(400).json({ error: "arquivo (campo 'file') é obrigatório" });
      const nomeArquivo = fixFilename(f.originalname) || pend.arquivo;

      // metadados do doc carregam os campos detectados (para a ponte pré-preencher o app dono).
      const meta: Record<string, any> = {
        origem: "whatsapp",
        destino: pend.destino,
        telefone: pend.telefone,
        colaborador_nome: pend.colaborador_nome,
      };
      try {
        const d = JSON.parse(pend.dados_extraidos || "{}");
        if (d && typeof d === "object" && Object.keys(d).length) meta.dados_extraidos = d;
      } catch {
        /* dados_extraidos inválido — ignora */
      }

      const categoria = pend.tipo_codigo || "outro";
      const storage = getStorage();
      const ref = await storage.put({
        entidade_tipo: pend.entidade_tipo,
        entidade_id: pend.colaborador_id,
        entidade_label: pend.colaborador_nome || undefined,
        categoria,
        nome_original: nomeArquivo,
        content_type: f.mimetype,
        buffer: f.buffer,
      });

      let doc;
      try {
        doc = await db.documento.create({
          data: {
            entidade_tipo: pend.entidade_tipo,
            entidade_id: pend.colaborador_id,
            categoria,
            tipo_codigo: pend.tipo_codigo || null,
            natureza: "registro",
            nome_original: nomeArquivo,
            content_type: f.mimetype,
            tamanho: ref.tamanho,
            sensivel: pend.sensivel,
            metadados: JSON.stringify(meta),
            grupo_id: randomUUID(),
            versao: 1,
            status: "vigente",
            origem: "whatsapp",
            analise: "pendente", // entra na FILA DE ANÁLISE do JustDocs
            valido_ate: pend.valido_ate || null,
            storage_driver: ref.driver,
            sp_drive_id: ref.drive_id,
            sp_item_id: ref.item_id,
            sp_web_url: ref.web_url,
          },
        });
      } catch (e) {
        await storage.remove({ drive_id: ref.drive_id, item_id: ref.item_id }).catch(() => {});
        throw e;
      }

      await db.triagemPendente.update({
        where: { id: pend.id },
        data: { status: "confirmado", doc_id: doc.id },
      });
      res.status(201).json({ ok: true, doc_id: doc.id, destino: pend.destino });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/gate/pendente/:id/cancelar", escrever, async (req, res) => {
    try {
      const pend = await db.triagemPendente.findUnique({ where: { id: req.params.id } });
      if (!pend) return res.status(404).json({ error: "pendente não encontrado" });
      if (pend.status === "aguardando")
        await db.triagemPendente.update({ where: { id: pend.id }, data: { status: "cancelado" } });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}

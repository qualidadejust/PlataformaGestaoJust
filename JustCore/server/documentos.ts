import type { Express } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { prisma } from "./lib/prisma.ts";
import { getStorage, storageByDriver } from "./lib/storage/index.ts";
import { TAXONOMIA } from "./lib/ged-taxonomia.ts";

const db = prisma as any;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// O multer/busboy decodifica o `filename` do multipart como Latin-1; nomes com acento chegam
// como mojibake (ex.: "Certidão" → "CertidÃ£o"). Reinterpreta como UTF-8 só quando isso produz
// texto válido — preservando nomes já corretos (round-trip seguro/idempotente).
export function fixFilename(s: string): string {
  if (!s) return s;
  try {
    const reinterpreted = Buffer.from(s, "latin1").toString("utf8");
    if (reinterpreted.includes("�")) return s; // re-decode quebrou → original já era UTF-8
    return reinterpreted;
  } catch {
    return s;
  }
}

// Remove os ponteiros internos do storage da resposta da API e decide o que expor:
// link direto só para arquivo NÃO sensível; sensível sempre via download mediado.
// Devolve `metadados` como objeto (o banco guarda JSON em texto).
function publicDoc(d: any) {
  const { sp_item_id, sp_drive_id, sp_web_url, metadados, ...rest } = d;
  let meta: unknown = null;
  if (metadados) {
    try {
      meta = JSON.parse(metadados);
    } catch {
      meta = metadados;
    }
  }
  return {
    ...rest,
    metadados: meta,
    web_url: d.sensivel ? null : (sp_web_url ?? null),
    download_url: `/api/documentos/${d.id}/download`,
  };
}

/**
 * Rotas de arquivos. O byte vive no storage (disco em dev, SharePoint em prod);
 * o banco guarda o ponteiro + a relação de negócio. Ver seção 10 do resumo.
 *   POST   /api/documentos              upload (multipart: file + campos)
 *   GET    /api/documentos              lista metadados (filtros por query)
 *   GET    /api/documentos/:id          metadados de um
 *   GET    /api/documentos/:id/download download MEDIADO pelo back-end
 *   DELETE /api/documentos/:id          remove do storage + banco
 */
export function registerDocumentos(app: Express) {
  // Vocabulário controlado do GED (eixos de classificação/navegação) — consumido pelo JustDocs.
  app.get("/api/ged/taxonomia", (_req, res) => res.json(TAXONOMIA));

  app.post("/api/documentos", upload.single("file"), async (req, res) => {
    try {
      const f = (req as any).file as Express.Multer.File | undefined;
      const {
        entidade_tipo,
        entidade_id,
        entidade_label, // rótulo legível p/ a pasta (ex.: nome do colaborador)
        categoria,
        sensivel,
        uploaded_by,
        retido_ate,
        tipo_codigo,
        metadados,
        valido_ate,
        natureza, // padrao | registro (default vem do tipo do catálogo)
        setor, // eixo de navegação (default vem do tipo)
        processo, // SGQ (doc padrão) -> metadados
        classificacao, // SGQ (doc padrão) -> metadados
        codigo_doc, // código PGQ (ex.: "PEO 05") -> metadados
        revisao, // revisão do SGQ (ex.: "19") -> metadados
        observacao, // -> metadados
        substitui_id, // id do documento que esta versão substitui (versionamento)
      } = req.body ?? {};
      if (!f) return res.status(400).json({ error: "arquivo (campo 'file') é obrigatório" });
      if (!entidade_tipo || !entidade_id || !categoria)
        return res.status(400).json({ error: "entidade_tipo, entidade_id e categoria são obrigatórios" });
      // corrige o nome do arquivo (multipart vem em Latin-1) antes de usar/gravar
      const nomeArquivo = fixFilename(f.originalname);

      // classificação: o tipo do catálogo define defaults (natureza, setor, sensível, retenção)
      const tipo = tipo_codigo ? await db.tipoDocumento.findUnique({ where: { codigo: tipo_codigo } }) : null;
      const isSensivel =
        sensivel === undefined ? !!tipo?.sensivel_padrao : sensivel === true || sensivel === "true";
      const naturezaFinal = natureza || tipo?.natureza || "registro";
      const setorFinal = setor || tipo?.setor || null;
      let retencao = retido_ate ?? null;
      if (!retencao && tipo?.retencao_dias)
        retencao = new Date(Date.now() + tipo.retencao_dias * 86400000).toISOString();

      // metadados: JSON livre + campos do SGQ (só relevantes ao doc padrão) dobrados aqui,
      // em vez de virarem colunas que só servem a um tipo (ver skill ged-documentos).
      let metaObj: Record<string, any> = {};
      if (metadados) {
        try {
          metaObj = JSON.parse(metadados);
        } catch {
          metaObj = { _raw: metadados };
        }
      }
      for (const [k, v] of Object.entries({ processo, classificacao, codigo_doc, revisao, observacao })) {
        if (v !== undefined && v !== null && v !== "") metaObj[k] = v;
      }
      const metadadosStr = Object.keys(metaObj).length ? JSON.stringify(metaObj) : null;

      // versionamento: nova versão herda o grupo e incrementa; senão abre grupo novo
      let grupo_id = randomUUID();
      let versao = 1;
      let supersede: any = null;
      if (substitui_id) {
        supersede = await db.documento.findUnique({ where: { id: substitui_id } });
        if (!supersede) return res.status(400).json({ error: "substitui_id não encontrado" });
        grupo_id = supersede.grupo_id;
        versao = supersede.versao + 1;
      }

      const storage = getStorage();
      const ref = await storage.put({
        entidade_tipo,
        entidade_id,
        entidade_label: entidade_label || undefined,
        categoria,
        nome_original: nomeArquivo,
        content_type: f.mimetype,
        buffer: f.buffer,
      });

      let doc;
      try {
        doc = await db.documento.create({
          data: {
            entidade_tipo,
            entidade_id,
            categoria,
            tipo_codigo: tipo_codigo ?? null,
            natureza: naturezaFinal,
            setor: setorFinal,
            nome_original: nomeArquivo,
            content_type: f.mimetype,
            tamanho: ref.tamanho,
            sensivel: isSensivel,
            metadados: metadadosStr,
            grupo_id,
            versao,
            status: "vigente",
            valido_ate: valido_ate ?? null,
            storage_driver: ref.driver,
            sp_drive_id: ref.drive_id,
            sp_item_id: ref.item_id,
            sp_web_url: ref.web_url,
            uploaded_by: uploaded_by ?? null,
            retido_ate: retencao,
          },
        });
      } catch (e) {
        // compensa: o byte já foi gravado mas o metadado falhou → não deixa órfão
        await storage.remove({ drive_id: ref.drive_id, item_id: ref.item_id }).catch(() => {});
        throw e;
      }
      // a versão anterior deixa de ser vigente
      if (supersede) await db.documento.update({ where: { id: supersede.id }, data: { status: "substituido" } });
      res.status(201).json(publicDoc(doc));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/documentos", async (req, res) => {
    try {
      const { entidade_tipo, entidade_id, categoria, tipo_codigo, status, vigente, natureza, setor } =
        req.query as Record<string, string | undefined>;
      const where: Record<string, string> = {};
      if (entidade_tipo) where.entidade_tipo = entidade_tipo;
      if (entidade_id) where.entidade_id = entidade_id;
      if (categoria) where.categoria = categoria;
      if (tipo_codigo) where.tipo_codigo = tipo_codigo;
      if (natureza) where.natureza = natureza;
      if (setor) where.setor = setor;
      if (status) where.status = status;
      if (vigente === "true") where.status = "vigente"; // atalho: só a versão atual
      const rows = await db.documento.findMany({ where, orderBy: { created_at: "desc" } });
      res.json(rows.map(publicDoc));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/documentos/:id", async (req, res) => {
    try {
      const doc = await db.documento.findUnique({ where: { id: req.params.id } });
      if (!doc) return res.status(404).json({ error: "não encontrado" });
      res.json(publicDoc(doc));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  // Todas as versões do mesmo documento lógico (mais recente primeiro).
  app.get("/api/documentos/:id/versoes", async (req, res) => {
    try {
      const doc = await db.documento.findUnique({ where: { id: req.params.id } });
      if (!doc) return res.status(404).json({ error: "não encontrado" });
      const rows = await db.documento.findMany({ where: { grupo_id: doc.grupo_id }, orderBy: { versao: "desc" } });
      res.json(rows.map(publicDoc));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/documentos/:id/download", async (req, res) => {
    try {
      const doc = await db.documento.findUnique({ where: { id: req.params.id } });
      if (!doc) return res.status(404).json({ error: "não encontrado" });
      // TODO(auth/LGPD): se doc.sensivel, validar o perfil do solicitante e registrar o
      // acesso (quem/quando) numa trilha de auditoria. Depende da camada de auth do Core
      // (ainda inexistente). Por ora o acesso é apenas MEDIADO — nunca expõe a URL do
      // storage. Ver skill `lgpd-compliance`.
      const { stream, content_type } = await storageByDriver(doc.storage_driver).get({
        drive_id: doc.sp_drive_id,
        item_id: doc.sp_item_id,
      });
      res.setHeader("Content-Type", content_type ?? doc.content_type ?? "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(doc.nome_original)}`);
      stream.on("error", () => res.destroy());
      stream.pipe(res);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.delete("/api/documentos/:id", async (req, res) => {
    try {
      const doc = await db.documento.findUnique({ where: { id: req.params.id } });
      if (!doc) return res.status(404).json({ error: "não encontrado" });
      try {
        await storageByDriver(doc.storage_driver).remove({ drive_id: doc.sp_drive_id, item_id: doc.sp_item_id });
      } catch {
        // arquivo já ausente no storage — segue e remove o registro
      }
      await db.documento.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}

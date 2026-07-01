import type { Application } from "express";
import multer from "multer";
import { parsePrevisionCsv } from "./previsionClient.ts";
import { syncPrevision } from "./sync/syncPrevision.ts";
import { prisma } from "../lib/prisma.ts";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Rotas ACL de integração Prevision/Sienge.
 *
 * POST /api/integrations/prevision/sync
 *   body: multipart/form-data — campo "csv" (arquivo) + campo "obra_id" (string)
 *   Alternativa: body JSON { obra_id, csv_content (string) }
 *
 * GET  /api/integrations/prevision/status/:obra_id
 *   Retorna contagem de locais/servicos/tarefas sincronizadas para a obra.
 *
 * GET  /api/integrations/status
 *   Expõe stub REST para o Sienge consumir (RI-04 — placeholder).
 */
export function registerIntegrations(
  app: Application,
  perm: (chave: string) => (req: any, res: any, next: any) => void
) {
  // Upload de CSV do Prevision (multipart ou JSON)
  app.post(
    "/api/integrations/prevision/sync",
    perm("core.integracao.write"),
    upload.single("csv"),
    async (req, res) => {
      try {
        const obra_id: string = req.body?.obra_id;
        if (!obra_id) return res.status(400).json({ error: "obra_id obrigatório" });

        let csvContent: string;
        if (req.file) {
          csvContent = req.file.buffer.toString("utf8");
        } else if (req.body?.csv_content) {
          csvContent = req.body.csv_content as string;
        } else {
          return res.status(400).json({ error: "Envie o CSV via campo 'csv' (multipart) ou 'csv_content' (JSON)" });
        }

        const rows = parsePrevisionCsv(csvContent);
        if (rows.length === 0) return res.status(400).json({ error: "CSV vazio ou inválido" });

        const result = await syncPrevision(rows, obra_id);
        res.json({ ok: true, linhas_lidas: rows.length, resultado: result });
      } catch (e) {
        res.status(500).json({ error: String((e as Error).message) });
      }
    }
  );

  // Status de sincronização por obra
  app.get(
    "/api/integrations/prevision/status/:obra_id",
    perm("core.integracao.read"),
    async (req, res) => {
      try {
        const obra_id = req.params.obra_id;
        const db = prisma as any;
        const [locais, tarefas] = await Promise.all([
          db.local.count({ where: { obra_id } }),
          db.tarefa.count({ where: { obra_id } }),
        ]);
        const servicos = await db.servico.count();
        res.json({ obra_id, locais, servicos, tarefas });
      } catch (e) {
        res.status(500).json({ error: String((e as Error).message) });
      }
    }
  );

  // RI-04: placeholder REST para o Sienge consultar status de documentos/FVS
  app.get("/api/integrations/status", perm("core.integracao.read"), async (_req, res) => {
    res.json({
      modulo: "just-core",
      versao: "0.1",
      endpoints_disponiveis: [
        { path: "/api/integrations/prevision/sync", metodo: "POST", descricao: "Importa CSV do Prevision" },
        { path: "/api/integrations/prevision/status/:obra_id", metodo: "GET", descricao: "Status backbone por obra" },
      ],
      pendente: ["ged.documentos.status", "fvs.status", "nc.status"],
    });
  });
}

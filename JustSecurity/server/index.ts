import express from "express";
import cors from "cors";
import { createHash } from "node:crypto";
import { db } from "./db.ts";

// Campos canônicos (ordem fixa) que entram no hash do registro. Incluem o
// snapshot do colaborador/EPI — assim o hash protege exatamente o que está no termo.
const CAMPOS_HASH =
  "id, colaborador_id, colaborador_nome, colaborador_cargo, empresa_nome, epi_id, epi_nome, epi_ca, quantidade, entregue_em, assinatura_img, assinatura_tipo, observacao";

function calcHash(c: Record<string, unknown>, hashAnterior: string): string {
  const payload = {
    id: c.id,
    colaborador_id: c.colaborador_id ?? null,
    colaborador_nome: c.colaborador_nome ?? null,
    colaborador_cargo: c.colaborador_cargo ?? null,
    empresa_nome: c.empresa_nome ?? null,
    epi_id: c.epi_id ?? null,
    epi_nome: c.epi_nome ?? null,
    epi_ca: c.epi_ca ?? null,
    quantidade: c.quantidade,
    entregue_em: c.entregue_em,
    assinatura_img: c.assinatura_img,
    assinatura_tipo: c.assinatura_tipo,
    observacao: c.observacao ?? null,
    hash_anterior: hashAnterior,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "just-security" }));

// Colaboradores e EPIs agora vêm do JustCore (a UI consome /core/api/... via proxy).

// ---- Entregas (locais, com snapshot do Core) ----
app.get("/api/entregas/verificacao", (_req, res) => {
  const rows = db
    .prepare(`SELECT ${CAMPOS_HASH}, hash, hash_anterior FROM entregas ORDER BY id`)
    .all() as any[];
  let anterior = "GENESIS";
  const quebras: number[] = [];
  for (const r of rows) {
    const esperado = calcHash(r, anterior);
    if (r.hash_anterior !== anterior || r.hash !== esperado) quebras.push(r.id);
    anterior = r.hash;
  }
  res.json({ ok: quebras.length === 0, total: rows.length, quebras });
});

app.get("/api/entregas", (_req, res) => {
  res.json(db.prepare("SELECT * FROM entregas ORDER BY entregue_em DESC").all());
});

app.post("/api/entregas", (req, res) => {
  const b = req.body ?? {};
  if (!b.colaborador_nome || !b.epi_nome) {
    return res.status(400).json({ error: "colaborador e EPI são obrigatórios" });
  }
  if (!b.assinatura_img) {
    return res.status(400).json({ error: "assinatura (digital) é obrigatória" });
  }

  const info = db
    .prepare(
      `INSERT INTO entregas
         (colaborador_id, colaborador_nome, colaborador_matricula, colaborador_cargo, empresa_nome,
          epi_id, epi_nome, epi_ca, quantidade, entregue_em, assinatura_img, assinatura_tipo, observacao)
       VALUES (@colaborador_id, @colaborador_nome, @colaborador_matricula, @colaborador_cargo, @empresa_nome,
          @epi_id, @epi_nome, @epi_ca, @quantidade, @entregue_em, @assinatura_img, @assinatura_tipo, @observacao)`
    )
    .run({
      colaborador_id: b.colaborador_id ?? null,
      colaborador_nome: b.colaborador_nome,
      colaborador_matricula: b.colaborador_matricula ?? null,
      colaborador_cargo: b.colaborador_cargo ?? null,
      empresa_nome: b.empresa_nome ?? null,
      epi_id: b.epi_id ?? null,
      epi_nome: b.epi_nome,
      epi_ca: b.epi_ca ?? null,
      quantidade: Number(b.quantidade) || 1,
      entregue_em: new Date().toISOString(),
      assinatura_img: b.assinatura_img,
      assinatura_tipo: b.assinatura_tipo ?? "digital",
      observacao: b.observacao ?? null,
    });

  const id = info.lastInsertRowid as number;
  const prev = db
    .prepare("SELECT hash FROM entregas WHERE id < ? ORDER BY id DESC LIMIT 1")
    .get(id) as { hash: string | null } | undefined;
  const hashAnterior = prev?.hash ?? "GENESIS";
  const campos = db.prepare(`SELECT ${CAMPOS_HASH} FROM entregas WHERE id = ?`).get(id) as any;
  const hash = calcHash(campos, hashAnterior);
  db.prepare("UPDATE entregas SET hash = ?, hash_anterior = ? WHERE id = ?").run(hash, hashAnterior, id);

  res.status(201).json(db.prepare("SELECT * FROM entregas WHERE id = ?").get(id));
});

// Backfill: registros sem hash (migrados ou antigos) recebem hash, encadeados por id.
function backfillHashes() {
  const rows = db.prepare(`SELECT ${CAMPOS_HASH}, hash, hash_anterior FROM entregas ORDER BY id`).all() as any[];
  let anterior = "GENESIS";
  let n = 0;
  const update = db.prepare("UPDATE entregas SET hash = ?, hash_anterior = ? WHERE id = ?");
  for (const r of rows) {
    if (!r.hash) {
      const h = calcHash(r, anterior);
      update.run(h, anterior, r.id);
      anterior = h;
      n++;
    } else {
      anterior = r.hash;
    }
  }
  if (n > 0) console.log(`Backfill de hash: ${n} registro(s).`);
}
backfillHashes();

const PORT = 4001;
app.listen(PORT, () => console.log(`API JustSecurity rodando em http://localhost:${PORT}`));

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "data", "justsecurity.db");
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Schema novo: as entregas guardam um SNAPSHOT dos dados do colaborador/EPI no
// momento da entrega (nome, cargo, C.A.) + os IDs do Core. Assim o termo jurídico
// reflete o que era verdade na hora, mesmo que o cadastro mude depois.
const NOVO_SCHEMA = `
  CREATE TABLE IF NOT EXISTS entregas (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id        TEXT,            -- UUID do colaborador no Core
    colaborador_nome      TEXT NOT NULL,
    colaborador_matricula TEXT,
    colaborador_cargo     TEXT,
    empresa_nome          TEXT,
    epi_id                TEXT,            -- UUID do insumo (EPI) no Core
    epi_nome              TEXT NOT NULL,
    epi_ca                TEXT,
    quantidade            INTEGER NOT NULL DEFAULT 1,
    entregue_em           TEXT NOT NULL,
    assinatura_img        TEXT,
    assinatura_tipo       TEXT,            -- 'digital' | 'simulado'
    observacao            TEXT,
    hash                  TEXT,            -- SHA-256 do registro
    hash_anterior         TEXT             -- hash do registro anterior (cadeia)
  );
`;

// Detecta o schema legado (colaborador_id INTEGER + tabelas locais colaboradores/epis)
const entregasExiste = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='entregas'")
  .get();
const cols = entregasExiste ? (db.prepare("PRAGMA table_info(entregas)").all() as { name: string }[]) : [];
const legado = cols.length > 0 && !cols.some((c) => c.name === "colaborador_nome");

if (legado) {
  // Migra as entregas existentes para o novo formato, preservando os dados do
  // termo (nome, cargo, EPI, C.A., assinatura). Os IDs locais antigos viram NULL
  // (não correspondem a IDs do Core). O hash é recalculado no startup do servidor.
  const antigas = db
    .prepare(
      `SELECT e.*, c.nome AS c_nome, c.matricula AS c_mat, c.cargo AS c_cargo,
              ep.nome AS e_nome, ep.ca AS e_ca
         FROM entregas e
         LEFT JOIN colaboradores c ON c.id = e.colaborador_id
         LEFT JOIN epis ep ON ep.id = e.epi_id
        ORDER BY e.id`
    )
    .all() as any[];

  db.exec("ALTER TABLE entregas RENAME TO entregas_legacy");
  db.exec(NOVO_SCHEMA);
  const ins = db.prepare(
    `INSERT INTO entregas
       (colaborador_id, colaborador_nome, colaborador_matricula, colaborador_cargo, empresa_nome,
        epi_id, epi_nome, epi_ca, quantidade, entregue_em, assinatura_img, assinatura_tipo, observacao)
     VALUES (@colaborador_id, @colaborador_nome, @colaborador_matricula, @colaborador_cargo, @empresa_nome,
        @epi_id, @epi_nome, @epi_ca, @quantidade, @entregue_em, @assinatura_img, @assinatura_tipo, @observacao)`
  );
  for (const r of antigas) {
    ins.run({
      colaborador_id: null,
      colaborador_nome: r.c_nome ?? "(desconhecido)",
      colaborador_matricula: r.c_mat ?? null,
      colaborador_cargo: r.c_cargo ?? null,
      empresa_nome: null,
      epi_id: null,
      epi_nome: r.e_nome ?? "(desconhecido)",
      epi_ca: r.e_ca ?? null,
      quantidade: r.quantidade ?? 1,
      entregue_em: r.entregue_em,
      assinatura_img: r.assinatura_img ?? null,
      assinatura_tipo: r.assinatura_tipo ?? null,
      observacao: r.observacao ?? null,
    });
  }
  db.exec("DROP TABLE entregas_legacy");
  db.exec("DROP TABLE IF EXISTS colaboradores");
  db.exec("DROP TABLE IF EXISTS epis");
  console.log(`Migração: ${antigas.length} entrega(s) convertidas para o schema com snapshot do Core.`);
} else {
  db.exec(NOVO_SCHEMA);
}

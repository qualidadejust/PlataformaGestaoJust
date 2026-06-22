/**
 * Sincroniza os dados-mestre do JustCore para o JustEleva (espelho).
 * O Core é a fonte única; este script faz UPSERT por id (os IDs já batem) em
 * employees / obras / alocacoes, mapeando os campos do Core para o schema do
 * JustEleva. Campos exclusivos do JustEleva (cost_center, template_id) são
 * preservados. Não apaga nada. Reexecutável.
 *
 *   npm run sync:core
 */
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORE_DB = path.resolve(__dirname, "../../../JustCore/prisma/dev.db");
const JL_DB = path.resolve(__dirname, "../prisma/dev.db");

const now = new Date().toISOString().replace("Z", "+00:00");
const b = (v: any) => (v ? 1 : 0);

const core = new Database(CORE_DB, { readonly: true });
const jl = new Database(JL_DB);

const colaboradores = core
  .prepare(
    `SELECT col.id, col.nome, col.setor, col.email, col.telefone, col.data_admissao,
            col.is_lideranca, col.avatar_url, c.nome AS cargo_nome
       FROM colaboradores col
       LEFT JOIN cargos c ON c.id = col.cargo_id`
  )
  .all() as any[];
const obras = core.prepare("SELECT id, nome, cost_center, tipo, status FROM obras").all() as any[];
const alocacoes = core
  .prepare(
    "SELECT id, colaborador_id, obra_id, papel_na_obra, principal, responsavel, data_inicio, data_fim FROM alocacoes"
  )
  .all() as any[];
core.close();

const upEmployee = jl.prepare(
  `INSERT INTO employees (id,name,role,department,email,phone,admission_date,is_manager,avatar_url,created_at,updated_at)
   VALUES (@id,@name,@role,@department,@email,@phone,@admission_date,@is_manager,@avatar_url,@now,@now)
   ON CONFLICT(id) DO UPDATE SET
     name=excluded.name, role=excluded.role, department=excluded.department,
     email=excluded.email, phone=excluded.phone, admission_date=excluded.admission_date,
     is_manager=excluded.is_manager, avatar_url=excluded.avatar_url, updated_at=excluded.updated_at`
);

const upObra = jl.prepare(
  `INSERT INTO obras (id,nome,cost_center,tipo,status,created_at,updated_at)
   VALUES (@id,@nome,@cost_center,@tipo,@status,@now,@now)
   ON CONFLICT(id) DO UPDATE SET
     nome=excluded.nome, tipo=excluded.tipo, status=excluded.status, updated_at=excluded.updated_at`
);

// Alocações: os IDs do Core não correspondem aos do JustEleva, e nada referencia
// alocacao.id, então fazemos substituição total (delete + insert) — idempotente.
const insAloc = jl.prepare(
  `INSERT INTO alocacoes (id,employee_id,obra_id,papel_na_obra,principal,responsavel,data_inicio,data_fim,created_at,updated_at)
   VALUES (@id,@employee_id,@obra_id,@papel,@principal,@responsavel,@data_inicio,@data_fim,@now,@now)`
);

const sync = jl.transaction(() => {
  for (const c of colaboradores) {
    upEmployee.run({
      id: c.id,
      name: c.nome,
      role: c.cargo_nome ?? "Não informado",
      department: c.setor ?? "Não informado",
      email: c.email ?? null,
      phone: c.telefone ?? null,
      admission_date: c.data_admissao ?? null,
      is_manager: b(c.is_lideranca),
      avatar_url: c.avatar_url ?? null,
      now,
    });
  }
  for (const o of obras) {
    upObra.run({ id: o.id, nome: o.nome, cost_center: o.cost_center ?? null, tipo: o.tipo ?? "obra", status: o.status ?? "ativa", now });
  }
  jl.prepare("DELETE FROM alocacoes").run();
  for (const a of alocacoes) {
    insAloc.run({
      id: a.id,
      employee_id: a.colaborador_id,
      obra_id: a.obra_id,
      papel: a.papel_na_obra ?? "mao_de_obra",
      principal: b(a.principal),
      responsavel: b(a.responsavel),
      data_inicio: a.data_inicio ?? null,
      data_fim: a.data_fim ?? null,
      now,
    });
  }
});
sync();

console.log("=== Sync Core → JustEleva ===");
console.log(`employees: ${(jl.prepare("SELECT COUNT(*) c FROM employees").get() as any).c}`);
console.log(`obras:     ${(jl.prepare("SELECT COUNT(*) c FROM obras").get() as any).c}`);
console.log(`alocacoes: ${(jl.prepare("SELECT COUNT(*) c FROM alocacoes").get() as any).c}`);
jl.close();

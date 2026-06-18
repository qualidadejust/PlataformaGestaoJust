import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'justavaliacoes.db');
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema version — increment when DDL changes (migration via user_version)
const SCHEMA_VERSION = 4;

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    admission_date TEXT,
    avatar_url TEXT,
    is_manager INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cycles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK(status IN ('active','completed','draft')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    evaluator_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    cycle_id TEXT REFERENCES cycles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','draft','submitted','feedback_pending','completed')),
    due_date TEXT,
    submitted_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS evaluation_scores (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    score TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(evaluation_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS potential_scores (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    score INTEGER,
    UNIQUE(evaluation_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS pdi_plans (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    cycle_id TEXT REFERENCES cycles(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pdi_actions (
    id TEXT PRIMARY KEY,
    pdi_plan_id TEXT NOT NULL REFERENCES pdi_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','in_progress','completed')),
    deadline TEXT NOT NULL,
    resources_needed TEXT,
    expected_outcomes TEXT,
    related_competency TEXT,
    action_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    from_employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    to_employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    evaluation_id TEXT REFERENCES evaluations(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'recognition'
      CHECK(type IN ('positive','improvement','recognition')),
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add cycle_id to pdi_plans if upgrading from v1 (cycle TEXT)
const currentVersion = (db.pragma('user_version', { simple: true }) as number);
if (currentVersion < SCHEMA_VERSION) {
  const cols = (db.pragma('table_info(pdi_plans)') as { name: string }[]).map(c => c.name);
  // v1 had `cycle TEXT` — migrate to cycle_id FK
  if (cols.includes('cycle') && !cols.includes('cycle_id')) {
    db.exec(`
      ALTER TABLE pdi_plans ADD COLUMN cycle_id TEXT REFERENCES cycles(id) ON DELETE SET NULL;
    `);
  }
  const evalCols = (db.pragma('table_info(evaluations)') as { name: string }[]).map(c => c.name);
  // v3: strengths and opportunities
  if (!evalCols.includes('strengths')) {
    db.exec('ALTER TABLE evaluations ADD COLUMN strengths TEXT;');
  }
  if (!evalCols.includes('opportunities')) {
    db.exec('ALTER TABLE evaluations ADD COLUMN opportunities TEXT;');
  }
  // v4: feedback_date (data da reunião de devolutiva)
  if (!evalCols.includes('feedback_date')) {
    db.exec('ALTER TABLE evaluations ADD COLUMN feedback_date TEXT;');
  }

  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

// Seed inicial
const count = (db.prepare('SELECT COUNT(*) as c FROM employees').get() as { c: number }).c;
if (count === 0) {
  const seedAll = db.transaction(() => {
    db.prepare(`
      INSERT INTO employees (id, name, role, department, email, admission_date, is_manager)
      VALUES (@id, @name, @role, @department, @email, @admission_date, @is_manager)
    `).run
      ? void 0 : void 0; // satisfy linter — real inserts below

    const emp = db.prepare(`
      INSERT INTO employees (id, name, role, department, email, admission_date, is_manager)
      VALUES (@id, @name, @role, @department, @email, @admission_date, @is_manager)
    `);
    const cyc = db.prepare(`
      INSERT INTO cycles (id, name, start_date, end_date, status)
      VALUES (@id, @name, @start_date, @end_date, @status)
    `);

    // Gestores
    emp.run({ id: 'mgr1', name: 'Roberto Lima',    role: 'Diretor de Obras',          department: 'Diretoria',   email: 'roberto.lima@just.com.br',    admission_date: '2018-01-10', is_manager: 1 });
    emp.run({ id: 'mgr2', name: 'Fernanda Costa',  role: 'Gerente de Projetos',        department: 'Engenharia',  email: 'fernanda.costa@just.com.br',  admission_date: '2020-03-15', is_manager: 1 });

    // Colaboradores
    emp.run({ id: 'emp1', name: 'Carlos Silva',    role: 'Mestre de Obras',            department: 'Obras',       email: 'carlos.silva@just.com.br',    admission_date: '2021-02-15', is_manager: 0 });
    emp.run({ id: 'emp2', name: 'Mariana Souza',   role: 'Engenheira Civil JR',        department: 'Engenharia',  email: 'mariana.souza@just.com.br',   admission_date: '2024-05-10', is_manager: 0 });
    emp.run({ id: 'emp3', name: 'Ana Oliveira',    role: 'Arquiteta Pleno',            department: 'Arquitetura', email: 'ana.oliveira@just.com.br',    admission_date: '2022-08-22', is_manager: 0 });
    emp.run({ id: 'emp4', name: 'Pedro Santos',    role: 'Técnico de Segurança',       department: 'Segurança',   email: 'pedro.santos@just.com.br',    admission_date: '2023-11-03', is_manager: 0 });
    emp.run({ id: 'emp5', name: 'Lucas Ferreira',  role: 'Pedreiro SR',                department: 'Obras',       email: 'lucas.ferreira@just.com.br',  admission_date: '2019-07-20', is_manager: 0 });
    emp.run({ id: 'emp6', name: 'Juliana Alves',   role: 'Técnica em Edificações',     department: 'Engenharia',  email: 'juliana.alves@just.com.br',   admission_date: '2023-03-08', is_manager: 0 });

    // Ciclos: histórico fechado + ciclo ativo atual
    cyc.run({ id: 'cycle-2025',   name: 'Avaliação Anual 2025',      start_date: '2025-01-01', end_date: '2025-12-31', status: 'completed' });
    cyc.run({ id: 'cycle-2026-1', name: '1º Semestre 2026',          start_date: '2026-01-01', end_date: '2026-06-30', status: 'completed' });
    cyc.run({ id: 'cycle-2026-2', name: '2º Semestre 2026',          start_date: '2026-07-01', end_date: '2026-12-31', status: 'active'    });
  });

  seedAll();
}

export default db;

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data', 'justavaliacoes.db'));

console.log('\n=== EMPLOYEES ===');
console.table(db.prepare('SELECT id, name, role, department, email FROM employees').all());

console.log('\n=== CYCLES ===');
console.table(db.prepare('SELECT id, name, start_date, end_date, status FROM cycles').all());

console.log('\n=== TABELAS ===');
console.table(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all());

db.close();

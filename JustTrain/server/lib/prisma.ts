// Cliente Prisma do JustTrain. Import interop-safe: o client do Prisma 7 é CommonJS,
// usamos o default export. Banco local em prisma/dev.db (DATABASE_URL no .env tem prioridade).
import prismaPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const { PrismaClient } = prismaPkg as any;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../prisma/dev.db");

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? `file:${DB_PATH}` });

export const prisma = new PrismaClient({ adapter } as any);

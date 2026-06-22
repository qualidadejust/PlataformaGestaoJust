// Cliente Prisma do JustSecurity. Aponta para o MESMO arquivo que o app já usa
// (data/justsecurity.db), então convive com o acesso legado durante o porte.
// Import interop-safe: o client do Prisma 7 é CommonJS, usamos o default export.
import prismaPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const { PrismaClient } = prismaPkg as any;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/justsecurity.db");

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? `file:${DB_PATH}` });

export const prisma = new PrismaClient({ adapter } as any);

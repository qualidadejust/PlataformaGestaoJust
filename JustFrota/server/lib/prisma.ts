// Mesmo padrão do Core: client Prisma 7 com adapter better-sqlite3 e caminho fixo do banco.
import prismaPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const { PrismaClient } = prismaPkg as any;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../prisma/dev.db");

const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });

export const prisma = new PrismaClient({ adapter } as any);

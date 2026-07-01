// Import interop-safe: o client gerado pelo Prisma 7 é CommonJS com spread,
// então o named import ESM `{ PrismaClient }` não é detectado. Usamos default.
import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg as any;

// Postgres (Neon em prod, qualquer Postgres em dev). A connection string vem do
// DATABASE_URL no .env — trocar de banco é configuração, nunca código.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter } as any);

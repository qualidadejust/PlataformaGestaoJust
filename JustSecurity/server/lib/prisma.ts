// Cliente Prisma do JustSecurity. Postgres (Neon) — connection string via DATABASE_URL
// no .env. O id Int autoincrement e as datas String do legado são válidos no Postgres.
// Import interop-safe: o client do Prisma 7 é CommonJS, usamos o default export.
import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg as any;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter } as any);

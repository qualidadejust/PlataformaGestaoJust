// Cliente Prisma do JustTrain. Import interop-safe: o client do Prisma 7 é CommonJS,
// usamos o default export. Postgres (Neon) — connection string via DATABASE_URL no .env.
import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg as any;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter } as any);

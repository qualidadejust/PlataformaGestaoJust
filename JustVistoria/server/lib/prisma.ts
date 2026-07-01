// Mesmo padrão do Core: client Prisma 7 com adapter Postgres (Neon).
// Connection string via DATABASE_URL no .env.
import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg as any;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter } as any);

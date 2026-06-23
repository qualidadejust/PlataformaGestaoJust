import { defineConfig } from "prisma/config";

// DATABASE_URL no .env tem prioridade (caminho p/ trocar SQLite→Postgres sem mexer no código).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});

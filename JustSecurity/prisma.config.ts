import { defineConfig } from "prisma/config";

// DATABASE_URL no .env tem prioridade (caminho p/ trocar SQLite→Postgres sem mexer no código);
// fallback aponta para o mesmo arquivo que o app já usa (data/justsecurity.db).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./data/justsecurity.db",
  },
});

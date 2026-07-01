import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// JustHub é só a porta de entrada (portal de módulos). Não tem back/DB próprio.
// O health-check de cada módulo é feito direto na URL do app (CORS habilitado nos servers).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4500,
    host: "0.0.0.0",
    // login centralizado no Core (/core/api/auth/...)
    proxy: {
      "/core": { target: "http://localhost:4100", rewrite: (p) => p.replace(/^\/core/, "") },
    },
  },
});

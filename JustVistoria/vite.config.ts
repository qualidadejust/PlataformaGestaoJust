import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4801,
    host: "0.0.0.0",
    proxy: {
      // API do próprio JustVistoria
      "/api": "http://localhost:4800",
      // cadastros do Core (unidades, clientes, obras, colaboradores) + GED — /core/api/... → 4100/api/...
      "/core": { target: "http://localhost:4100", rewrite: (p) => p.replace(/^\/core/, "") },
    },
  },
});

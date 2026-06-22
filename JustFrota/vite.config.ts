import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4301,
    host: "0.0.0.0",
    proxy: {
      // API do próprio JustFrota
      "/api": "http://localhost:4300",
      // cadastros do Core (veículos, obras, colaboradores) — /core/api/... → 4100/api/...
      "/core": { target: "http://localhost:4100", rewrite: (p) => p.replace(/^\/core/, "") },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4400,
    host: "0.0.0.0",
    // O GED é do Core: todos os dados (documentos, tipos, cadastros) vêm da API do JustCore.
    proxy: {
      "/api": "http://localhost:4100",
      "/core": { target: "http://localhost:4100", rewrite: (p) => p.replace(/^\/core/, "") },
    },
  },
});

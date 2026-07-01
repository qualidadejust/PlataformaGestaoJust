import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// Em dev, o front fala com o back do JustAtestados (4700) e com o JustCore (4100) via proxy.
// Em produção (Render) o api-base.ts prefixa /api e /core para o gateway.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 4701,
    host: "0.0.0.0",
    proxy: {
      "/api": { target: "http://localhost:4700", changeOrigin: true },
      "/core": { target: "http://localhost:4100", changeOrigin: true, rewrite: (p) => p.replace(/^\/core/, "") },
    },
  },
});

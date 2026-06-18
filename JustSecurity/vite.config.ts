import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // O @digitalpersona/devices faz `import 'WebSdk'` só por efeito colateral,
  // esperando o global window.WebSdk. Esse global vem do <script clássico>
  // /websdk.client.ui.js no index.html (a versão UMD quebra se for bundlada).
  // Por isso resolvemos 'WebSdk' para um stub vazio.
  resolve: {
    alias: {
      WebSdk: fileURLToPath(new URL("./src/lib/websdk-stub.ts", import.meta.url)),
    },
  },
  server: {
    port: 4000,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:4001",
      // dados-mestre (colaboradores, EPIs) vêm do JustCore
      "/core": { target: "http://localhost:4100", rewrite: (p) => p.replace(/^\/core/, "") },
    },
  },
});

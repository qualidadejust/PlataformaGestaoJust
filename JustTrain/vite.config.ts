import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // O @digitalpersona/devices faz `import 'WebSdk'` só por efeito colateral; o global
  // window.WebSdk vem do <script> /websdk.client.ui.js no index.html. Alias p/ stub vazio.
  resolve: {
    alias: {
      WebSdk: fileURLToPath(new URL("./src/lib/websdk-stub.ts", import.meta.url)),
    },
  },
  server: {
    port: 4601,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:4600",
      // cadastros-mestre (colaboradores) e GED vêm do JustCore
      "/core": { target: "http://localhost:4100", rewrite: (p) => p.replace(/^\/core/, "") },
    },
  },
});

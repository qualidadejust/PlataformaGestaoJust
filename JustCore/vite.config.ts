import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @digitalpersona/devices faz `import 'WebSdk'` só por efeito colateral (espera
  // o global window.WebSdk, vindo do <script> clássico). Resolvemos para um stub.
  resolve: {
    alias: {
      WebSdk: fileURLToPath(new URL("./src/lib/websdk-stub.ts", import.meta.url)),
    },
  },
  server: {
    port: 4101,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:4100",
    },
  },
});

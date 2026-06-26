import "./api-base.ts"; // instala o prefixo de API em produção (deve vir primeiro)
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { AuthProvider } from "./auth.tsx";
import { LoginGate } from "./LoginGate.tsx";
import "./index.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LoginGate>
          <App />
        </LoginGate>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

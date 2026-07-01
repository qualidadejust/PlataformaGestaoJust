import './api-base.ts'; // instala o prefixo de API em produção (deve vir primeiro)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { AuthProvider } from './auth.tsx';
import { LoginGate } from './LoginGate.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LoginGate>
          <App />
        </LoginGate>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

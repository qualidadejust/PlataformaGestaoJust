/**
 * AuthContext
 * Sessão de autenticação do JustAtestados.
 *
 * - A sessão é a fonte de verdade do backend (Firebase Auth / Supabase / mock):
 *   `dataService.observeSession` (no Firebase, onAuthStateChanged) mantém `user`
 *   em sincronia e restaura a sessão persistida ao recarregar a página.
 * - `initializing` cobre o intervalo em que a sessão ainda está sendo verificada
 *   (App mostra um carregando em vez de piscar a tela de login).
 * - login() delega ao dataService; logout() encerra a sessão no backend (signOut).
 * - O role do usuário (`apontador` | `rh`) governa quais telas o App libera.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { dataService } from '../services';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  error: string | null;
  loading: boolean;        // login em andamento
  initializing: boolean;   // verificando sessão persistida na carga inicial
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Observa a sessão do backend (restaura ao recarregar, sincroniza login/logout).
  useEffect(() => {
    const unsubscribe = dataService.observeSession((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, senha: string): Promise<boolean> => {
    setError(null);

    // Validação de campos vazios (regra de negócio da tela de login).
    if (!email.trim() || !senha.trim()) {
      setError('Informe e-mail e senha para entrar.');
      return false;
    }

    setLoading(true);
    try {
      const logged = await dataService.login(email.trim(), senha);
      setUser(logged); // observeSession também sincroniza, mas isto evita atraso
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao entrar. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await dataService.logout();
    } finally {
      setUser(null); // garante saída na UI mesmo se o signOut remoto falhar
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, error, loading, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}

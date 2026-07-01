import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { TOKEN_KEY } from "./api-base.ts";

const AUTH = "/core/api/auth";

export interface Usuario {
  id: string;
  email: string;
  perfis: string[];
  perm: string[];
  senha_temporaria: boolean;
  colaborador?: { id: string; nome: string } | null;
}

interface AuthCtx {
  user: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  trocarSenha: (senha_atual: string, nova_senha: string) => Promise<void>;
  pode: (chave: string) => boolean;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      if (!localStorage.getItem(TOKEN_KEY)) return setCarregando(false);
      try {
        const r = await fetch(`${AUTH}/me`);
        if (r.ok) setUser(await r.json());
        else localStorage.removeItem(TOKEN_KEY);
      } catch { /* offline */ }
      finally { setCarregando(false); }
    })();
  }, []);

  const login = async (email: string, senha: string) => {
    const r = await fetch(`${AUTH}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Falha no login");
    const j = await r.json();
    localStorage.setItem(TOKEN_KEY, j.token);
    setUser(j.usuario);
  };

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); };

  const trocarSenha = async (senha_atual: string, nova_senha: string) => {
    const r = await fetch(`${AUTH}/trocar-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha_atual, nova_senha }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Falha ao trocar senha");
    setUser((u) => (u ? { ...u, senha_temporaria: false } : u));
  };

  const pode = (chave: string) => !!user && (user.perfis.includes("admin") || user.perm.includes(chave));

  return <Ctx.Provider value={{ user, carregando, login, logout, trocarSenha, pode }}>{children}</Ctx.Provider>;
}

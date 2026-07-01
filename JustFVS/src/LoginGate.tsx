import { useState, type ReactNode, type FormEvent } from "react";
import { useAuth } from "./auth.tsx";

function Campo(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        {...rest}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-sky-900"
      />
    </label>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-slate-100">Plataforma JUST</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{titulo}</p>
        {children}
      </div>
    </div>
  );
}

function Botao({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="w-full rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function Erro({ msg }: { msg: string }) {
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{msg}</p>;
}

export function LoginGate({ children }: { children: ReactNode }) {
  const { user, carregando, login, trocarSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nova, setNova] = useState("");
  const [nova2, setNova2] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando…</div>;
  }

  if (!user) {
    const onSubmit = async (e: FormEvent) => {
      e.preventDefault();
      setErro("");
      setEnviando(true);
      try { await login(email.trim(), senha); }
      catch (err) { setErro((err as Error).message); }
      finally { setEnviando(false); }
    };
    return (
      <Cartao titulo="Entre com suas credenciais">
        <form onSubmit={onSubmit} className="space-y-4">
          <Campo label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Campo label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          {erro && <Erro msg={erro} />}
          <Botao type="submit" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</Botao>
        </form>
      </Cartao>
    );
  }

  if (user.senha_temporaria) {
    const onSubmit = async (e: FormEvent) => {
      e.preventDefault();
      setErro("");
      if (nova.length < 8) return setErro("A nova senha deve ter pelo menos 8 caracteres.");
      if (nova !== nova2) return setErro("As senhas não conferem.");
      setEnviando(true);
      try { await trocarSenha(senha, nova); }
      catch (err) { setErro((err as Error).message); }
      finally { setEnviando(false); }
    };
    return (
      <Cartao titulo="Defina uma nova senha para continuar">
        <form onSubmit={onSubmit} className="space-y-4">
          <Campo label="Senha atual" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <Campo label="Nova senha" type="password" value={nova} onChange={(e) => setNova(e.target.value)} required />
          <Campo label="Confirmar nova senha" type="password" value={nova2} onChange={(e) => setNova2(e.target.value)} required />
          {erro && <Erro msg={erro} />}
          <Botao type="submit" disabled={enviando}>{enviando ? "Salvando…" : "Salvar e continuar"}</Botao>
        </form>
      </Cartao>
    );
  }

  return <>{children}</>;
}

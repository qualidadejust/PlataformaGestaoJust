import { useState } from 'react';
import { AlertCircle, X, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { JustLogo } from '../components/JustLogo';

const REMEMBER_KEY = 'justatestados:rememberEmail';

export function Login() {
  const { login, error, loading } = useAuth();
  const remembered = typeof localStorage !== 'undefined' ? localStorage.getItem(REMEMBER_KEY) : null;
  const [email, setEmail] = useState(remembered ?? '');
  const [senha, setSenha] = useState('');
  const [remember, setRemember] = useState(!!remembered);
  const [dismissed, setDismissed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDismissed(false);
    // Persiste (ou limpa) o e-mail lembrado conforme o checkbox.
    if (remember && email.trim()) {
      localStorage.setItem(REMEMBER_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    await login(email, senha);
    // Em caso de sucesso o App re-renderiza para a tela inicial do perfil.
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Alerta de erro — canto superior direito */}
      {error && !dismissed && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-start max-w-sm px-4 py-3 rounded-lg shadow-lg border bg-rose-50 border-rose-200 text-rose-800">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Não foi possível entrar</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setDismissed(true)} className="ml-3 text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Aviso informativo (ex.: esqueceu a senha) — canto superior direito */}
      {notice && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-start max-w-sm px-4 py-3 rounded-lg shadow-lg border bg-sky-50 border-sky-200 text-sky-800">
            <Info className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm">{notice}</p>
            <button onClick={() => setNotice(null)} className="ml-3 text-sky-400 hover:text-sky-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="px-10 py-6 rounded-xl bg-navy-900 flex items-center justify-center shadow-lg dark:shadow-none">
            <JustLogo variant="white" heightPx={40} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Just<span className="text-petroleum-600">Atestados</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Gestão de Saúde Ocupacional e Absenteísmo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-slate-200 dark:border-slate-800">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                E-mail corporativo
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 focus:outline-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Senha
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:border-petroleum-500 dark:focus:border-petroleum-400 focus:outline-none focus:ring-petroleum-500 dark:focus:ring-petroleum-400 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-petroleum-600 focus:ring-petroleum-500 dark:focus:ring-petroleum-400"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900 dark:text-slate-50">
                  Lembrar-me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setNotice('Para redefinir a senha, contate o RH ou o TI da Construtora JUST.')}
                  className="font-medium text-petroleum-600 hover:text-petroleum-500"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-petroleum-700 py-2.5 px-4 text-sm font-medium text-white shadow-sm dark:shadow-none hover:bg-petroleum-800 focus:outline-none focus:ring-2 focus:ring-petroleum-500 dark:focus:ring-petroleum-400 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar no Sistema'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
        &copy; {new Date().getFullYear()} Construtora JUST. Sistema de Uso Restrito Interno.
      </div>
    </div>
  );
}

// Gestão de acesso (admin): usuários, perfis (RBAC) e auditoria. Consome /core/api/acessos.
// Protegido por `acesso.admin` (a tela só aparece p/ quem pode — ver App.tsx).
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, KeyRound, ScrollText, Plus, Trash2, RotateCcw, X, Copy, Check } from "lucide-react";
import { cn } from "../lib/utils";

const API = "/core/api/acessos";

interface Perfil {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  usuarios: number;
  chaves: string[];
}
interface Permissao { id: string; chave: string; descricao: string | null }
interface UsuarioRow {
  id: string;
  email: string;
  ativo: boolean;
  senha_temporaria: boolean;
  ultimo_login: string | null;
  colaborador: { id: string; nome: string } | null;
  perfis: { id: string; nome: string }[];
}
interface LogRow {
  id: string;
  acao: string;
  recurso: string | null;
  ip: string | null;
  sucesso: boolean;
  created_at: string;
  email: string | null;
}
interface Colab { id: string; nome: string }

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Erro ${r.status}`);
  return r.json();
}
async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Erro ${r.status}`);
  return r.status === 204 ? (undefined as T) : r.json();
}

type Aba = "usuarios" | "perfis" | "auditoria";

export function AcessosView() {
  const [aba, setAba] = useState<Aba>("usuarios");
  const [erro, setErro] = useState("");

  const abas: { id: Aba; label: string; icon: typeof Users }[] = [
    { id: "usuarios", label: "Usuários", icon: Users },
    { id: "perfis", label: "Perfis", icon: KeyRound },
    { id: "auditoria", label: "Auditoria", icon: ScrollText },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-brand-600 dark:text-brand-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Controle de acesso</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Usuários, perfis e trilha de auditoria (LGPD).</p>
        </div>
      </div>

      <div className="mb-5 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {abas.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => { setErro(""); setAba(a.id); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2",
                aba === a.id
                  ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <Icon className="h-4 w-4" /> {a.label}
            </button>
          );
        })}
      </div>

      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</div>
      )}

      {aba === "usuarios" && <Usuarios onErro={setErro} />}
      {aba === "perfis" && <Perfis onErro={setErro} />}
      {aba === "auditoria" && <Auditoria onErro={setErro} />}
    </div>
  );
}

// Banner que mostra a senha temporária UMA vez (criação / reset).
function CredencialBanner({ email, senha, onClose }: { email: string; senha: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(senha).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  };
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Senha temporária gerada</p>
          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
            Repasse a <strong>{email}</strong>. Ela <strong>não será exibida novamente</strong> e deverá ser trocada no 1º acesso.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100">{senha}</code>
            <button onClick={copiar} className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900">
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
        <button onClick={onClose} className="text-amber-700 hover:text-amber-900 dark:text-amber-400"><X className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

function Botao({ children, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const cls = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
  }[variant];
  return (
    <button {...rest} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50", cls, rest.className)}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Usuários
function Usuarios({ onErro }: { onErro: (s: string) => void }) {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [cred, setCred] = useState<{ email: string; senha: string } | null>(null);
  const [novo, setNovo] = useState(false);

  const carregar = async () => {
    try {
      const [u, p, c] = await Promise.all([
        getJSON<UsuarioRow[]>(`${API}/usuarios`),
        getJSON<Perfil[]>(`${API}/perfis`),
        getJSON<Colab[]>(`/core/api/colaboradores`),
      ]);
      setUsuarios(u);
      setPerfis(p);
      setColabs(c);
    } catch (e) {
      onErro((e as Error).message);
    }
  };
  useEffect(() => { carregar(); }, []);

  const resetar = async (u: UsuarioRow) => {
    if (!confirm(`Gerar nova senha temporária para ${u.email}?`)) return;
    try {
      const r = await send<{ senha_temporaria: string }>(`${API}/usuarios/${u.id}/resetar-senha`, "POST");
      setCred({ email: u.email, senha: r.senha_temporaria });
      carregar();
    } catch (e) { onErro((e as Error).message); }
  };
  const remover = async (u: UsuarioRow) => {
    if (!confirm(`Remover o usuário ${u.email}? Esta ação não pode ser desfeita.`)) return;
    try { await send(`${API}/usuarios/${u.id}`, "DELETE"); carregar(); } catch (e) { onErro((e as Error).message); }
  };
  const alternarAtivo = async (u: UsuarioRow) => {
    try { await send(`${API}/usuarios/${u.id}`, "PUT", { ativo: !u.ativo }); carregar(); } catch (e) { onErro((e as Error).message); }
  };
  const salvarPerfis = async (u: UsuarioRow, perfilIds: string[]) => {
    try { await send(`${API}/usuarios/${u.id}`, "PUT", { perfis: perfilIds }); carregar(); } catch (e) { onErro((e as Error).message); }
  };

  return (
    <div>
      {cred && <CredencialBanner email={cred.email} senha={cred.senha} onClose={() => setCred(null)} />}
      <div className="mb-3 flex justify-end">
        <Botao onClick={() => setNovo(true)}><Plus className="h-4 w-4" /> Novo usuário</Botao>
      </div>

      {novo && (
        <NovoUsuario
          perfis={perfis}
          colabs={colabs}
          onCancel={() => setNovo(false)}
          onCriado={(c) => { setNovo(false); setCred(c); carregar(); }}
          onErro={onErro}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2.5">E-mail</th>
              <th className="px-4 py-2.5">Colaborador</th>
              <th className="px-4 py-2.5">Perfis</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Último acesso</th>
              <th className="px-4 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {usuarios.map((u) => (
              <tr key={u.id} className="text-slate-700 dark:text-slate-300">
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{u.email}</td>
                <td className="px-4 py-2.5">{u.colaborador?.nome ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <PerfisMulti
                    perfis={perfis}
                    selecionados={u.perfis.map((p) => p.id)}
                    onChange={(ids) => salvarPerfis(u, ids)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => alternarAtivo(u)} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", u.ativo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </button>
                  {u.senha_temporaria && <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">senha temp.</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString("pt-BR") : "nunca"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Botao variant="ghost" onClick={() => resetar(u)} title="Resetar senha"><RotateCcw className="h-4 w-4" /></Botao>
                    <Botao variant="danger" onClick={() => remover(u)} title="Remover"><Trash2 className="h-4 w-4" /></Botao>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum usuário cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NovoUsuario({ perfis, colabs, onCancel, onCriado, onErro }: {
  perfis: Perfil[];
  colabs: Colab[];
  onCancel: () => void;
  onCriado: (c: { email: string; senha: string }) => void;
  onErro: (s: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [perfilIds, setPerfilIds] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const criar = async () => {
    if (!email.trim()) return onErro("Informe o e-mail.");
    setSalvando(true);
    try {
      const r = await send<{ email: string; senha_temporaria: string }>(`${API}/usuarios`, "POST", {
        email: email.trim(),
        colaborador_id: colaboradorId || null,
        perfis: perfilIds,
      });
      onCriado({ email: r.email, senha: r.senha_temporaria });
    } catch (e) {
      onErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">E-mail</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="pessoa@just.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Colaborador (opcional)</span>
          <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
            <option value="">— sem vínculo —</option>
            {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3">
        <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Perfis</span>
        <div className="flex flex-wrap gap-1.5">
          {perfis.map((p) => {
            const on = perfilIds.includes(p.id);
            return (
              <button key={p.id} onClick={() => setPerfilIds((v) => on ? v.filter((x) => x !== p.id) : [...v, p.id])}
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition", on ? "bg-brand-600 text-white dark:bg-brand-500" : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300")}>
                {p.nome}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Botao variant="ghost" onClick={onCancel}>Cancelar</Botao>
        <Botao onClick={criar} disabled={salvando}>{salvando ? "Criando…" : "Criar e gerar senha"}</Botao>
      </div>
    </div>
  );
}

// Multi-seleção de perfis inline (chips toggláveis que salvam na hora).
function PerfisMulti({ perfis, selecionados, onChange }: { perfis: Perfil[]; selecionados: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {perfis.map((p) => {
        const on = selecionados.includes(p.id);
        return (
          <button key={p.id} onClick={() => onChange(on ? selecionados.filter((x) => x !== p.id) : [...selecionados, p.id])}
            className={cn("rounded px-2 py-0.5 text-xs font-medium transition", on ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500")}>
            {p.nome}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- Perfis
function Perfis({ onErro }: { onErro: (s: string) => void }) {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [novo, setNovo] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const carregar = async () => {
    try {
      const [p, perm] = await Promise.all([
        getJSON<Perfil[]>(`${API}/perfis`),
        getJSON<Permissao[]>(`${API}/permissoes`),
      ]);
      setPerfis(p);
      setPermissoes(perm);
    } catch (e) { onErro((e as Error).message); }
  };
  useEffect(() => { carregar(); }, []);

  const remover = async (p: Perfil) => {
    if (!confirm(`Remover o perfil "${p.nome}"?`)) return;
    try { await send(`${API}/perfis/${p.id}`, "DELETE"); carregar(); } catch (e) { onErro((e as Error).message); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Botao onClick={() => { setNovo(true); setEditId(null); }}><Plus className="h-4 w-4" /> Novo perfil</Botao>
      </div>
      {novo && (
        <EditorPerfil permissoes={permissoes} onCancel={() => setNovo(false)}
          onSalvo={() => { setNovo(false); carregar(); }} onErro={onErro} />
      )}
      <div className="space-y-2">
        {perfis.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">{p.nome}</span>
                {p.descricao && <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">{p.descricao}</span>}
                <span className="ml-2 text-xs text-slate-400">· {p.usuarios} usuário(s) · {p.chaves.length} permissão(ões)</span>
              </div>
              <div className="flex gap-1">
                <Botao variant="ghost" onClick={() => { setEditId(editId === p.id ? null : p.id); setNovo(false); }}>
                  {editId === p.id ? "Fechar" : "Editar"}
                </Botao>
                {p.nome !== "admin" && <Botao variant="danger" onClick={() => remover(p)}><Trash2 className="h-4 w-4" /></Botao>}
              </div>
            </div>
            {editId === p.id && (
              <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                <EditorPerfil perfil={p} permissoes={permissoes} onCancel={() => setEditId(null)}
                  onSalvo={() => { setEditId(null); carregar(); }} onErro={onErro} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorPerfil({ perfil, permissoes, onCancel, onSalvo, onErro }: {
  perfil?: Perfil;
  permissoes: Permissao[];
  onCancel: () => void;
  onSalvo: () => void;
  onErro: (s: string) => void;
}) {
  const ehAdmin = perfil?.nome === "admin";
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [descricao, setDescricao] = useState(perfil?.descricao ?? "");
  const [chaves, setChaves] = useState<string[]>(perfil?.chaves ?? []);
  const [salvando, setSalvando] = useState(false);

  // agrupa permissões por módulo (prefixo antes do 1º ponto) p/ leitura.
  const grupos = useMemo(() => {
    const m = new Map<string, Permissao[]>();
    for (const p of permissoes) {
      const mod = p.chave.split(".")[0];
      if (!m.has(mod)) m.set(mod, []);
      m.get(mod)!.push(p);
    }
    return [...m.entries()];
  }, [permissoes]);

  const salvar = async () => {
    if (!nome.trim()) return onErro("Informe o nome do perfil.");
    setSalvando(true);
    try {
      if (perfil) await send(`${API}/perfis/${perfil.id}`, "PUT", { nome, descricao, chaves });
      else await send(`${API}/perfis`, "POST", { nome, descricao, chaves });
      onSalvo();
    } catch (e) { onErro((e as Error).message); } finally { setSalvando(false); }
  };

  return (
    <div className={cn(!perfil && "mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} disabled={ehAdmin}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Descrição</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
        </label>
      </div>
      <div className="mt-3">
        <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Permissões {ehAdmin && <span className="text-amber-600 dark:text-amber-400">(admin sempre tem acesso total)</span>}
        </span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map(([mod, perms]) => (
            <div key={mod} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{mod}</p>
              <div className="space-y-1">
                {perms.map((p) => {
                  const on = chaves.includes(p.chave);
                  return (
                    <label key={p.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={on} disabled={ehAdmin}
                        onChange={() => setChaves((v) => on ? v.filter((x) => x !== p.chave) : [...v, p.chave])}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      <span><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.chave}</span><br />{p.descricao}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Botao variant="ghost" onClick={onCancel}>Cancelar</Botao>
        <Botao onClick={salvar} disabled={salvando || ehAdmin}>{salvando ? "Salvando…" : "Salvar"}</Botao>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Auditoria
function Auditoria({ onErro }: { onErro: (s: string) => void }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  useEffect(() => {
    getJSON<LogRow[]>(`${API}/logs`).then(setLogs).catch((e) => onErro((e as Error).message));
  }, []);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-4 py-2.5">Quando</th>
            <th className="px-4 py-2.5">Usuário</th>
            <th className="px-4 py-2.5">Ação</th>
            <th className="px-4 py-2.5">Recurso</th>
            <th className="px-4 py-2.5">IP</th>
            <th className="px-4 py-2.5">OK</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((l) => (
            <tr key={l.id} className="text-slate-700 dark:text-slate-300">
              <td className="px-4 py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
              <td className="px-4 py-2">{l.email ?? "—"}</td>
              <td className="px-4 py-2 font-medium">{l.acao}</td>
              <td className="px-4 py-2 font-mono text-xs">{l.recurso ?? "—"}</td>
              <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{l.ip ?? "—"}</td>
              <td className="px-4 py-2">{l.sucesso ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-600" />}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sem registros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

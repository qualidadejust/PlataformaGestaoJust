import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, Trash2, FilePlus2, Lock, X, Layers } from "lucide-react";
import { api, uploadDoc } from "../lib/api.ts";
import { ENTIDADES, entidadeDef } from "../lib/entidades.ts";
import { cn } from "../lib/cn.ts";

const inp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

interface Tipo {
  codigo: string;
  nome: string;
  entidade_tipo: string;
  sensivel_padrao: boolean;
  versionavel: boolean;
  vence: boolean;
}
interface Doc {
  id: string;
  categoria: string;
  tipo_codigo?: string;
  nome_original: string;
  tamanho: number;
  sensivel: boolean;
  versao: number;
  status: string;
  valido_ate?: string;
  grupo_id: string;
  created_at: string;
  web_url?: string | null;
  download_url: string;
}

const fmtKb = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default function DocumentosView() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [entidadeTipo, setEntidadeTipo] = useState("colaborador");
  const [entidadeId, setEntidadeId] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [vigente, setVigente] = useState(true);

  // form de upload
  const [tipoCod, setTipoCod] = useState("");
  const [sensivel, setSensivel] = useState(false);
  const [validoAte, setValidoAte] = useState("");
  const [obs, setObs] = useState("");
  const [substituiId, setSubstituiId] = useState<string | null>(null);

  const def = entidadeDef(entidadeTipo)!;
  const entidades = useQuery({ queryKey: ["ent", entidadeTipo], queryFn: () => api<any[]>(def.path) });
  const tipos = useQuery({ queryKey: ["tipos"], queryFn: () => api<Tipo[]>("/tipos-documento") });
  const tiposDaEntidade = useMemo(
    () => (tipos.data ?? []).filter((t) => t.entidade_tipo === entidadeTipo),
    [tipos.data, entidadeTipo],
  );

  const qs = new URLSearchParams({
    entidade_tipo: entidadeTipo,
    ...(entidadeId ? { entidade_id: entidadeId } : {}),
    ...(tipoFiltro ? { tipo_codigo: tipoFiltro } : {}),
    ...(vigente ? { vigente: "true" } : {}),
  }).toString();
  const docs = useQuery({ queryKey: ["docs", qs], queryFn: () => api<Doc[]>(`/documentos?${qs}`) });

  const onTipo = (cod: string) => {
    setTipoCod(cod);
    const t = tiposDaEntidade.find((x) => x.codigo === cod);
    if (t) setSensivel(t.sensivel_padrao);
  };

  const enviar = useMutation({
    mutationFn: () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Selecione um arquivo.");
      if (!entidadeId) throw new Error("Selecione a entidade (a quem o documento pertence).");
      const ent = entidades.data?.find((e) => e.id === entidadeId);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("entidade_tipo", entidadeTipo);
      fd.append("entidade_id", entidadeId);
      fd.append("categoria", tipoCod || "documento");
      if (tipoCod) fd.append("tipo_codigo", tipoCod);
      fd.append("sensivel", String(sensivel));
      if (validoAte) fd.append("valido_ate", validoAte);
      if (obs) fd.append("observacao", obs);
      if (substituiId) fd.append("substitui_id", substituiId);
      // snapshot de nome da entidade — só informativo; o Core guarda os ids
      void ent;
      return uploadDoc(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["docs"] });
      if (fileRef.current) fileRef.current.value = "";
      setObs("");
      setValidoAte("");
      setSubstituiId(null);
    },
  });

  const excluir = useMutation({
    mutationFn: (id: string) => api(`/documentos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docs"] }),
  });

  const novaVersao = (d: Doc) => {
    setSubstituiId(d.id);
    setTipoCod(d.tipo_codigo ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">Consultar documentos</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-500">
            Tipo de entidade
            <select
              className={inp}
              value={entidadeTipo}
              onChange={(e) => {
                setEntidadeTipo(e.target.value);
                setEntidadeId("");
                setTipoFiltro("");
                setTipoCod("");
              }}
            >
              {ENTIDADES.map((e) => (
                <option key={e.tipo} value={e.tipo}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            {def.label}
            <select className={inp} value={entidadeId} onChange={(e) => setEntidadeId(e.target.value)}>
              <option value="">Todos</option>
              {entidades.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {def.nome(e)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Tipo de documento
            <select className={inp} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="">Todos</option>
              {tiposDaEntidade.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-1 text-xs text-slate-500">
            <input type="checkbox" checked={vigente} onChange={(e) => setVigente(e.target.checked)} />
            Só versões vigentes
          </label>
        </div>
      </section>

      {/* Upload */}
      <section className={cn("rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900", substituiId && "ring-2 ring-amber-400")}>
        <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          {substituiId ? "Enviar nova versão" : "Enviar documento"}
          {substituiId && (
            <button onClick={() => setSubstituiId(null)} className="flex items-center gap-1 text-xs text-slate-500">
              <X className="size-3.5" /> cancelar versão
            </button>
          )}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="col-span-2 text-xs text-slate-500">
            Arquivo
            <input ref={fileRef} type="file" className={cn(inp, "py-1")} />
          </label>
          <label className="text-xs text-slate-500">
            Tipo de documento
            <select className={inp} value={tipoCod} onChange={(e) => onTipo(e.target.value)}>
              <option value="">— (categoria livre)</option>
              {tiposDaEntidade.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-1 text-xs text-slate-500">
            <input type="checkbox" checked={sensivel} onChange={(e) => setSensivel(e.target.checked)} />
            Sensível (LGPD)
          </label>
          <label className="text-xs text-slate-500">
            Validade (se vence)
            <input type="date" className={inp} value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
          </label>
          <label className="col-span-2 text-xs text-slate-500 md:col-span-3">
            Observação
            <input className={inp} value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>
        </div>
        {!entidadeId && (
          <p className="mt-2 text-xs text-amber-600">Selecione a {def.label.toLowerCase()} acima para anexar o documento a ela.</p>
        )}
        <button
          onClick={() => enviar.mutate()}
          disabled={enviar.isPending || !entidadeId}
          className="mt-3 flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Upload className="size-4" /> {enviar.isPending ? "Enviando…" : substituiId ? "Enviar nova versão" : "Enviar documento"}
        </button>
        {enviar.isError && <p className="mt-2 text-xs text-red-600">{(enviar.error as Error).message}</p>}
      </section>

      {/* Lista */}
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          Documentos {docs.data ? `(${docs.data.length})` : ""}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Arquivo</th>
                <th className="px-2 py-2 text-center">Versão</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Validade</th>
                <th className="px-2 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {docs.data?.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1.5">{d.created_at.slice(0, 10)}</td>
                  <td className="px-2 py-1.5">{d.tipo_codigo ?? d.categoria}</td>
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-1">
                      {d.sensivel && (
                        <span title="sensível (LGPD)">
                          <Lock className="size-3 text-amber-600" />
                        </span>
                      )}
                      <span className="max-w-xs truncate">{d.nome_original}</span>
                      <span className="text-xs text-slate-400">({fmtKb(d.tamanho)})</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">v{d.versao}</td>
                  <td className="px-2 py-1.5">{d.status}</td>
                  <td className="px-2 py-1.5">{d.valido_ate ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex justify-end gap-2">
                      <a href={d.download_url} target="_blank" rel="noreferrer" title="Abrir/baixar" className="text-slate-400 hover:text-teal-600">
                        <Download className="size-4" />
                      </a>
                      <button onClick={() => novaVersao(d)} title="Nova versão" className="text-slate-400 hover:text-teal-600">
                        <FilePlus2 className="size-4" />
                      </button>
                      <button
                        onClick={() => confirm(`Excluir "${d.nome_original}"?`) && excluir.mutate(d.id)}
                        title="Excluir"
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-xs text-slate-400">
                    <Layers className="mx-auto mb-1 size-5 opacity-50" /> nenhum documento para o filtro atual
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

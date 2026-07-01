import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Upload, Check, Loader2, AlertTriangle } from "lucide-react";
import { api, uploadDoc } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

// MVP: triagem por IA limitada a documentos de COLABORADOR e a poucos arquivos por vez,
// para validar a mecânica (custo/qualidade do Gemini) antes de expandir.
const ENTIDADE = "colaborador";
const MAX_ARQUIVOS = 2;

const inp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

interface Tipo {
  codigo: string;
  nome: string;
  entidade_tipo: string;
  sensivel_padrao: boolean;
}
interface Colab {
  id: string;
  nome: string;
}
interface Proposta {
  arquivo: string;
  tipo_codigo: string;
  sensivel: boolean;
  valido_ate: string;
  confianca: string;
  resumo: string;
  colaborador_id: string | null;
  colaborador_nome: string;
  match: string;
}
type Linha = Proposta & { file: File; estado: "analisando" | "pronto" | "erro" | "enviado"; erro?: string };

const badge: Record<string, string> = {
  alta: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  baixa: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export default function TriagemView() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [analisando, setAnalisando] = useState(false);

  const tipos = useQuery({ queryKey: ["tipos"], queryFn: () => api<Tipo[]>("/tipos-documento") });
  const colabs = useQuery({ queryKey: ["colaboradores"], queryFn: () => api<Colab[]>("/colaboradores") });
  const tiposColab = useMemo(
    () => (tipos.data ?? []).filter((t) => t.entidade_tipo === ENTIDADE),
    [tipos.data],
  );

  const set = (i: number, patch: Partial<Linha>) =>
    setLinhas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const analisar = async () => {
    const files = Array.from(fileRef.current?.files ?? []).slice(0, MAX_ARQUIVOS);
    if (!files.length) return;
    setAnalisando(true);
    setLinhas(
      files.map((file) => ({
        file,
        arquivo: file.name,
        estado: "analisando",
        tipo_codigo: "",
        sensivel: false,
        valido_ate: "",
        confianca: "baixa",
        resumo: "",
        colaborador_id: null,
        colaborador_nome: "",
        match: "sem",
      })),
    );
    // Sequencial (no máximo 2 arquivos) — simples e gentil com o limite de req/min do Gemini.
    for (let i = 0; i < files.length; i++) {
      try {
        const fd = new FormData();
        fd.append("file", files[i]);
        fd.append("entidade_tipo", ENTIDADE);
        const p = await api<Proposta>("/triagem/documento", { method: "POST", body: fd });
        set(i, { ...p, file: files[i], estado: "pronto" });
      } catch (e) {
        set(i, { estado: "erro", erro: (e as Error).message });
      }
    }
    setAnalisando(false);
  };

  const enviar = async (i: number) => {
    const l = linhas[i];
    if (!l.colaborador_id || !l.tipo_codigo) return;
    set(i, { estado: "analisando" });
    try {
      const fd = new FormData();
      fd.append("file", l.file);
      fd.append("entidade_tipo", ENTIDADE);
      fd.append("entidade_id", l.colaborador_id);
      fd.append("entidade_label", l.colaborador_nome);
      fd.append("categoria", l.tipo_codigo);
      fd.append("tipo_codigo", l.tipo_codigo);
      fd.append("sensivel", String(l.sensivel));
      if (l.valido_ate) fd.append("valido_ate", l.valido_ate);
      await uploadDoc(fd);
      set(i, { estado: "enviado" });
      qc.invalidateQueries({ queryKey: ["docs"] });
    } catch (e) {
      set(i, { estado: "erro", erro: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          <Sparkles className="size-4" /> Triagem por IA — documentos de colaborador
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          A IA (Gemini) lê o conteúdo de cada arquivo, sugere o tipo, a quem pertence, se é sensível e a validade.
          Confira e corrija antes de enviar ao GED. Máximo de {MAX_ARQUIVOS} arquivos por vez (fase de teste).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-white dark:text-slate-300"
          />
          <button
            onClick={analisar}
            disabled={analisando}
            className="inline-flex items-center gap-2 rounded-md bg-[#0f2742] px-4 py-2 text-sm font-medium text-white hover:bg-[#163554] disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {analisando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Analisar com IA
          </button>
        </div>
      </section>

      {linhas.length > 0 && (
        <section className="space-y-3">
          {linhas.map((l, i) => (
            <div key={i} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{l.arquivo}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs", badge[l.confianca] ?? badge.baixa)}>
                  confiança {l.confianca}
                </span>
              </div>

              {l.estado === "analisando" && (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" /> processando…
                </p>
              )}
              {l.estado === "erro" && (
                <p className="flex items-center gap-2 text-sm text-rose-600">
                  <AlertTriangle className="size-4" /> {l.erro}
                </p>
              )}
              {l.estado === "enviado" && (
                <p className="flex items-center gap-2 text-sm text-emerald-600">
                  <Check className="size-4" /> enviado ao GED
                </p>
              )}

              {(l.estado === "pronto") && (
                <>
                  {l.resumo && <p className="mb-2 text-xs italic text-slate-500">{l.resumo}</p>}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <label className="text-xs text-slate-500">
                      Colaborador
                      <select
                        className={cn(inp, !l.colaborador_id && "border-rose-400")}
                        value={l.colaborador_id ?? ""}
                        onChange={(e) => {
                          const c = colabs.data?.find((x) => x.id === e.target.value);
                          set(i, { colaborador_id: e.target.value || null, colaborador_nome: c?.nome ?? "" });
                        }}
                      >
                        <option value="">— selecione —</option>
                        {colabs.data?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                      {l.match !== "exato" && l.colaborador_id && (
                        <span className="text-[10px] text-amber-600">match {l.match} — confira</span>
                      )}
                    </label>
                    <label className="text-xs text-slate-500">
                      Tipo
                      <select
                        className={cn(inp, !l.tipo_codigo && "border-rose-400")}
                        value={l.tipo_codigo}
                        onChange={(e) => set(i, { tipo_codigo: e.target.value })}
                      >
                        <option value="">— selecione —</option>
                        {tiposColab.map((t) => (
                          <option key={t.codigo} value={t.codigo}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Validade
                      <input
                        type="date"
                        className={inp}
                        value={l.valido_ate}
                        onChange={(e) => set(i, { valido_ate: e.target.value })}
                      />
                    </label>
                    <label className="flex items-end gap-2 pb-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={l.sensivel}
                        onChange={(e) => set(i, { sensivel: e.target.checked })}
                      />
                      Sensível
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => enviar(i)}
                      disabled={!l.colaborador_id || !l.tipo_codigo}
                      className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
                    >
                      <Upload className="size-4" /> Enviar ao GED
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

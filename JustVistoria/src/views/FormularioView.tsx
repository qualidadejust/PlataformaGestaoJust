import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Minus, Camera, Loader2, ImageIcon } from "lucide-react";
import { api, DISCIPLINAS, type ModeloForm, type Etapa, type Unidade, type FotoDoc } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

type Status = "conforme" | "nao_conforme" | "na";
interface Resp {
  grupo: string;
  item: string;
  status: Status;
  obs?: string;
  severidade?: "media" | "critica";
  categoria?: string;
  tipo?: string;
  causa_raiz?: string;
  acoes?: string;
  fotos: string[]; // doc ids no GED
}

export function FormularioView({ unidade, etapa, onVoltar }: { unidade: Unidade; etapa?: Etapa; onVoltar: () => void }) {
  const modelosQ = useQuery({ queryKey: ["modelos"], queryFn: () => api.get<ModeloForm[]>("/api/formulario-modelos") });
  const modelo = modelosQ.data?.find((m) => m.codigo === "FVC") ?? modelosQ.data?.[0];

  const grupos = useMemo(() => {
    if (!modelo) return [] as { grupo: string; itens: string[] }[];
    try {
      return JSON.parse(modelo.estrutura);
    } catch {
      return [];
    }
  }, [modelo]);

  const [resp, setResp] = useState<Record<string, Resp>>({});
  const [enviando, setEnviando] = useState<string | null>(null); // chave do item enviando foto
  const chave = (g: string, i: string) => `${g}::${i}`;
  const set = (g: string, i: string, patch: Partial<Resp>) =>
    setResp((r) => {
      const k = chave(g, i);
      const prev: Resp = r[k] ?? { grupo: g, item: i, status: "conforme", fotos: [] };
      return { ...r, [k]: { ...prev, ...patch } };
    });

  async function anexarFotos(g: string, i: string, files: FileList | null) {
    if (!files?.length) return;
    const k = chave(g, i);
    setEnviando(k);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      fd.append("unidade_id", unidade.id);
      fd.append("unidade_label", unidade.identificador);
      const docs = await api.postForm<FotoDoc[]>("/api/fotos", fd);
      const atuais = resp[k]?.fotos ?? [];
      set(g, i, { fotos: [...atuais, ...docs.map((d) => d.id)] });
    } finally {
      setEnviando(null);
    }
  }

  const enviar = useMutation({
    mutationFn: () => {
      const respostas = Object.values(resp);
      return api.post("/api/instancias", {
        modelo_id: modelo!.id,
        modelo_codigo: modelo!.codigo,
        modelo_versao: modelo!.versao,
        unidade_id: unidade.id,
        unidade_label: unidade.identificador,
        item_id: etapa?.itens?.[0]?.id,
        respostas,
      });
    },
    onSuccess: onVoltar,
  });

  const total = grupos.reduce((s: number, g: any) => s + g.itens.length, 0);
  const respondidos = Object.keys(resp).length;
  const ncCount = Object.values(resp).filter((r) => r.status === "nao_conforme").length;
  const criticas = Object.values(resp).filter((r) => r.status === "nao_conforme" && r.severidade === "critica").length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <button onClick={onVoltar} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> Voltar ao pipeline
      </button>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-brand-900 dark:text-slate-100">Inspeção Final — {unidade.identificador}</h1>
          <p className="text-sm text-slate-500">{modelo ? `${modelo.codigo} v${modelo.versao} — ${modelo.nome}` : "Carregando modelo…"}</p>
        </div>
        <span className="text-sm text-slate-500">
          {respondidos}/{total} · <span className={ncCount ? "text-red-600" : ""}>{ncCount} NC</span>
        </span>
      </div>

      <div className="space-y-4">
        {grupos.map((g: any) => (
          <div key={g.grupo} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <h2 className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-brand-800 dark:border-slate-800 dark:text-brand-200">{g.grupo}</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {g.itens.map((item: string) => {
                const k = chave(g.grupo, item);
                const r = resp[k];
                const ehCritica = r?.severidade === "critica";
                return (
                  <div key={item} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">{item}</span>
                      <div className="flex shrink-0 gap-1">
                        {([
                          ["conforme", Check, "emerald"],
                          ["nao_conforme", X, "red"],
                          ["na", Minus, "slate"],
                        ] as const).map(([st, Ico, cor]) => (
                          <button
                            key={st}
                            onClick={() => set(g.grupo, item, { status: st })}
                            title={st === "na" ? "Não se aplica" : st === "conforme" ? "Conforme" : "Não conforme"}
                            className={cn(
                              "grid size-8 place-items-center rounded-md border",
                              r?.status === st
                                ? cor === "emerald"
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : cor === "red"
                                    ? "border-red-500 bg-red-500 text-white"
                                    : "border-slate-400 bg-slate-400 text-white"
                                : "border-slate-300 text-slate-400 hover:bg-slate-50 dark:border-slate-700",
                            )}
                          >
                            <Ico className="size-4" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {r?.status === "nao_conforme" && (
                      <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            placeholder="Descrição do problema"
                            value={r.obs ?? ""}
                            onChange={(e) => set(g.grupo, item, { obs: e.target.value })}
                            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800"
                          />
                          <select
                            value={r.severidade ?? "media"}
                            onChange={(e) => set(g.grupo, item, { severidade: e.target.value as "media" | "critica" })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                          >
                            <option value="media">Pendência (não bloqueia)</option>
                            <option value="critica">Crítica (bloqueia entrega)</option>
                          </select>
                        </div>

                        {/* Categoria/disciplina — distribui à equipe de resolução */}
                        <select
                          value={r.categoria ?? ""}
                          onChange={(e) => set(g.grupo, item, { categoria: e.target.value || undefined })}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="">Disciplina/equipe… (para distribuir)</option>
                          {DISCIPLINAS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        {/* Tratativa da NC crítica (plano de qualidade) */}
                        {ehCritica && (
                          <div className="space-y-2 rounded-md border border-red-200 bg-red-50/60 p-2 dark:border-red-900 dark:bg-red-950/30">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Tratativa (NC crítica)</p>
                            <input
                              placeholder="Tipo de NC (ex.: instalação, estrutura, acabamento)"
                              value={r.tipo ?? ""}
                              onChange={(e) => set(g.grupo, item, { tipo: e.target.value })}
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                            />
                            <textarea
                              placeholder="Causa raiz"
                              rows={2}
                              value={r.causa_raiz ?? ""}
                              onChange={(e) => set(g.grupo, item, { causa_raiz: e.target.value })}
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                            />
                            <textarea
                              placeholder="Ações / plano de correção"
                              rows={2}
                              value={r.acoes ?? ""}
                              onChange={(e) => set(g.grupo, item, { acoes: e.target.value })}
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                            />
                          </div>
                        )}

                        {/* Fotos (1+) — evidência no GED */}
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                            {enviando === k ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                            {enviando === k ? "Enviando…" : "Adicionar fotos"}
                            <input type="file" accept="image/*" multiple capture="environment" className="hidden" disabled={enviando === k} onChange={(e) => anexarFotos(g.grupo, item, e.target.files)} />
                          </label>
                          {(r.fotos?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <ImageIcon className="size-3.5" /> {r.fotos.length} foto(s)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/80 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <span className="text-sm text-slate-500">
          {ncCount} não-conformidade(s){criticas > 0 ? ` · ${criticas} crítica(s)` : ""} serão abertas
        </span>
        <button
          onClick={() => enviar.mutate()}
          disabled={!modelo || respondidos === 0 || enviar.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {enviar.isPending ? "Salvando…" : "Concluir checklist"}
        </button>
      </div>
    </div>
  );
}

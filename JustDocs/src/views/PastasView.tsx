import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Folder,
  FileText,
  Download,
  Lock,
  ChevronRight,
  Home,
  BookMarked,
  Building2,
  Users,
  Landmark,
} from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

// Navegação tipo SharePoint sobre o GED: a "pasta" é uma VISÃO derivada da taxonomia
// (natureza/setor/entidade/processo), não um caminho real. 4 raízes:
//  SGQ (docs padrão por processo→classificação) · Obras (por obra→setor)
//  · Pessoas (por colaborador) · Empresa (setores globais).

interface Opt {
  value: string;
  label: string;
}
interface Taxonomia {
  NATUREZAS: Opt[];
  SETORES: Opt[];
  PROCESSOS: Opt[];
  CLASSIFICACOES: Opt[];
}
interface Doc {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  tipo_codigo?: string;
  categoria: string;
  natureza: string;
  setor?: string | null;
  nome_original: string;
  tamanho: number;
  sensivel: boolean;
  versao: number;
  valido_ate?: string;
  metadados?: Record<string, any> | null;
  created_at: string;
  web_url?: string | null;
  download_url: string;
}
interface Crumb {
  key: string;
  label: string;
}

const fmtKb = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;

const ROOTS = [
  { key: "sgq", label: "SGQ — Documentos Padrão", icon: BookMarked, hint: "manuais, IT, formulários, planos" },
  { key: "obras", label: "Obras", icon: Building2, hint: "registros por obra e setor" },
  { key: "pessoas", label: "Pessoas (RH)", icon: Users, hint: "ASO, treinamentos, ficha" },
  { key: "empresa", label: "Empresa", icon: Landmark, hint: "setores globais" },
];

export default function PastasView() {
  const [path, setPath] = useState<Crumb[]>([]);
  const root = path[0]?.key;

  const taxonomia = useQuery({ queryKey: ["taxonomia"], queryFn: () => api<Taxonomia>("/ged/taxonomia") });
  const obras = useQuery({ queryKey: ["obras"], queryFn: () => api<any[]>("/obras"), enabled: root === "obras" });
  const colaboradores = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => api<any[]>("/colaboradores"),
    enabled: root === "pessoas",
  });
  const padrao = useQuery({
    queryKey: ["docs", "padrao"],
    queryFn: () => api<Doc[]>("/documentos?natureza=padrao&vigente=true"),
    enabled: root === "sgq",
  });
  const empresaReg = useQuery({
    queryKey: ["docs", "empresa-reg"],
    queryFn: () => api<Doc[]>("/documentos?entidade_tipo=empresa&natureza=registro&vigente=true"),
    enabled: root === "empresa",
  });
  const obraId = root === "obras" && path[1] ? path[1].key.replace("obra:", "") : "";
  const obraDocs = useQuery({
    queryKey: ["docs", "obra", obraId],
    queryFn: () => api<Doc[]>(`/documentos?entidade_tipo=obra&entidade_id=${obraId}&vigente=true`),
    enabled: !!obraId,
  });
  const colabId = root === "pessoas" && path[1] ? path[1].key.replace("colab:", "") : "";
  const colabDocs = useQuery({
    queryKey: ["docs", "colaborador", colabId],
    queryFn: () => api<Doc[]>(`/documentos?entidade_tipo=colaborador&entidade_id=${colabId}&vigente=true`),
    enabled: !!colabId,
  });
  // Catálogo de tipos: dá o nome legível de cada tipo_codigo para rotular as pastas-por-tipo.
  const tipos = useQuery({ queryKey: ["tipos-documento"], queryFn: () => api<any[]>("/tipos-documento") });

  const tx = taxonomia.data;
  const labelDe = (lista: Opt[] | undefined, v?: string | null) =>
    lista?.find((o) => o.value === v)?.label ?? v ?? "Sem classificação";
  const tipoLabel = (codigo?: string | null) =>
    tipos.data?.find((t) => t.codigo === codigo)?.nome ?? codigo ?? "Sem tipo";

  const open = (c: Crumb) => setPath((p) => [...p, c]);
  const goTo = (i: number) => setPath((p) => p.slice(0, i + 1));

  // Agrupa docs por uma chave e devolve pastas {key,label,count} ordenadas pelo label.
  const folders = (docs: Doc[], keyOf: (d: Doc) => string | null | undefined, label: (k: string) => string, prefix: string) => {
    const counts = new Map<string, number>();
    for (const d of docs) {
      const k = keyOf(d) ?? "_sem";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([k, n]) => ({ key: `${prefix}:${k}`, label: k === "_sem" ? "Sem classificação" : label(k), count: n }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  // Como `folders`, mas inclui pastas FIXAS do catálogo mesmo vazias (count 0) — toda obra
  // mostra a estrutura-padrão desde o dia 1. Acrescenta chaves presentes nos docs fora da lista.
  const foldersFixas = (
    docs: Doc[],
    keyOf: (d: Doc) => string | null | undefined,
    fixas: { key: string; label: string }[],
    label: (k: string) => string,
    prefix: string,
  ) => {
    const counts = new Map<string, number>();
    for (const d of docs) {
      const k = keyOf(d) ?? "_sem";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const out = new Map<string, { key: string; label: string; count: number }>();
    for (const f of fixas) out.set(f.key, { key: `${prefix}:${f.key}`, label: f.label, count: counts.get(f.key) ?? 0 });
    for (const [k, n] of counts) {
      if (!out.has(k)) out.set(k, { key: `${prefix}:${k}`, label: k === "_sem" ? "Sem classificação" : label(k), count: n });
    }
    return [...out.values()].sort((a, b) => a.label.localeCompare(b.label));
  };

  // Estrutura-padrão da OBRA derivada do catálogo (tipos cujo entidade_tipo é "obra").
  const tiposObra = (tipos.data ?? []).filter((t: any) => t.entidade_tipo === "obra");
  const setoresObra = [...new Set(tiposObra.map((t: any) => t.setor).filter(Boolean))].map((s) => ({
    key: s as string,
    label: labelDe(tx?.SETORES, s as string),
  }));

  // Resolve o nível atual em { pastas, arquivos } a partir do path.
  let pastas: { key: string; label: string; count?: number }[] = [];
  let arquivos: Doc[] = [];
  let carregando = false;
  let vazioMsg = "pasta vazia";

  if (path.length === 0) {
    pastas = ROOTS.map((r) => ({ key: r.key, label: r.label }));
  } else if (root === "sgq") {
    carregando = padrao.isLoading;
    const docs = padrao.data ?? [];
    if (path.length === 1) {
      pastas = folders(docs, (d) => d.metadados?.processo, (k) => labelDe(tx?.PROCESSOS, k), "proc");
    } else if (path.length === 2) {
      const proc = path[1].key.replace("proc:", "");
      const sub = docs.filter((d) => (d.metadados?.processo ?? "_sem") === proc);
      pastas = folders(sub, (d) => d.metadados?.classificacao, (k) => labelDe(tx?.CLASSIFICACOES, k), "classif");
    } else {
      const proc = path[1].key.replace("proc:", "");
      const classif = path[2].key.replace("classif:", "");
      arquivos = docs.filter(
        (d) => (d.metadados?.processo ?? "_sem") === proc && (d.metadados?.classificacao ?? "_sem") === classif,
      );
    }
  } else if (root === "obras") {
    if (path.length === 1) {
      carregando = obras.isLoading;
      pastas = (obras.data ?? []).map((o) => ({ key: `obra:${o.id}`, label: o.nome }));
      vazioMsg = "nenhuma obra cadastrada no Core";
    } else if (path.length === 2) {
      // Setores-padrão da obra (do catálogo), sempre visíveis mesmo sem documento ainda.
      carregando = obraDocs.isLoading || tipos.isLoading;
      pastas = foldersFixas(obraDocs.data ?? [], (d) => d.setor, setoresObra, (k) => labelDe(tx?.SETORES, k), "setor");
      vazioMsg = "nenhum setor configurado";
    } else if (path.length === 3) {
      // Dentro do setor: pastas por TIPO (tipos-padrão daquele setor sempre visíveis).
      const setor = path[2].key.replace("setor:", "");
      const sub = (obraDocs.data ?? []).filter((d) => (d.setor ?? "_sem") === setor);
      const tiposDoSetor = tiposObra
        .filter((t: any) => t.setor === setor)
        .map((t: any) => ({ key: t.codigo as string, label: t.nome as string }));
      pastas = foldersFixas(sub, (d) => d.tipo_codigo ?? d.categoria, tiposDoSetor, (k) => tipoLabel(k), "tipo");
      vazioMsg = "nenhum tipo neste setor";
    } else {
      const setor = path[2].key.replace("setor:", "");
      const tipo = path[3].key.replace("tipo:", "");
      arquivos = (obraDocs.data ?? []).filter(
        (d) => (d.setor ?? "_sem") === setor && (d.tipo_codigo ?? d.categoria ?? "_sem") === tipo,
      );
    }
  } else if (root === "pessoas") {
    if (path.length === 1) {
      carregando = colaboradores.isLoading;
      pastas = (colaboradores.data ?? []).map((c) => ({ key: `colab:${c.id}`, label: c.nome }));
      vazioMsg = "nenhum colaborador cadastrado no Core";
    } else if (path.length === 2) {
      // Nível intermediário: pastas por TIPO de documento (auto-arquivado pelo tipo_codigo
      // que cada app envia no upload). Cai na categoria quando não há tipo classificado.
      carregando = colabDocs.isLoading || tipos.isLoading;
      const docs = colabDocs.data ?? [];
      pastas = folders(docs, (d) => d.tipo_codigo ?? d.categoria, (k) => tipoLabel(k), "tipo");
      vazioMsg = "nenhum documento desta pessoa ainda";
    } else {
      const tipo = path[2].key.replace("tipo:", "");
      arquivos = (colabDocs.data ?? []).filter((d) => (d.tipo_codigo ?? d.categoria ?? "_sem") === tipo);
    }
  } else if (root === "empresa") {
    carregando = empresaReg.isLoading;
    const docs = empresaReg.data ?? [];
    if (path.length === 1) {
      pastas = folders(docs, (d) => d.setor, (k) => labelDe(tx?.SETORES, k), "setor");
      vazioMsg = "nenhum documento global de setor ainda";
    } else {
      const setor = path[1].key.replace("setor:", "");
      arquivos = docs.filter((d) => (d.setor ?? "_sem") === setor);
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        <button
          onClick={() => setPath([])}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Home className="size-4" /> Início
        </button>
        {path.map((c, i) => (
          <span key={c.key} className="flex items-center gap-1">
            <ChevronRight className="size-4 text-slate-300" />
            <button
              onClick={() => goTo(i)}
              className={cn(
                "rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800",
                i === path.length - 1 ? "font-semibold text-[#0f2742] dark:text-teal-300" : "text-slate-500",
              )}
            >
              {c.label}
            </button>
          </span>
        ))}
      </nav>

      {/* Raiz: cards grandes com dica */}
      {path.length === 0 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {ROOTS.map((r) => (
            <button
              key={r.key}
              onClick={() => open({ key: r.key, label: r.label })}
              className="flex items-center gap-3 rounded-xl bg-white p-5 text-left shadow-sm transition hover:ring-2 hover:ring-teal-400 dark:bg-slate-900"
            >
              <r.icon className="size-7 shrink-0 text-teal-600" />
              <div>
                <div className="font-semibold text-[#0f2742] dark:text-teal-300">{r.label}</div>
                <div className="text-xs text-slate-400">{r.hint}</div>
              </div>
            </button>
          ))}
        </section>
      ) : (
        <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          {carregando ? (
            <p className="py-8 text-center text-sm text-slate-400">carregando…</p>
          ) : (
            <>
              {/* Subpastas */}
              {pastas.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {pastas.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => open({ key: f.key, label: f.label })}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <Folder className={cn("size-5 shrink-0", f.count === 0 ? "text-slate-300" : "text-amber-500")} />
                      <span className={cn("flex-1 truncate", f.count === 0 ? "text-slate-400" : "text-slate-700 dark:text-slate-200")}>{f.label}</span>
                      {f.count != null && <span className="text-xs text-slate-400">{f.count}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Arquivos */}
              {arquivos.length > 0 && (
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {arquivos.map((d) => (
                      <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-2">
                          <span className="flex items-center gap-2">
                            <FileText className="size-4 shrink-0 text-slate-400" />
                            {d.sensivel && (
                              <span title="sensível (LGPD)">
                                <Lock className="size-3 text-amber-600" />
                              </span>
                            )}
                            <span className="max-w-md truncate text-slate-700 dark:text-slate-200">{d.nome_original}</span>
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-xs text-slate-400">{d.tipo_codigo ?? d.categoria}</td>
                        <td className="py-2 pr-2 text-center text-xs text-slate-400">v{d.versao}</td>
                        <td className="py-2 pr-2 text-xs text-slate-400">{d.valido_ate ? `vence ${d.valido_ate}` : ""}</td>
                        <td className="py-2 pr-2 text-right text-xs text-slate-400">{fmtKb(d.tamanho)}</td>
                        <td className="py-2 text-right">
                          <a
                            href={d.download_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir/baixar"
                            className="text-slate-400 hover:text-teal-600"
                          >
                            <Download className="size-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {pastas.length === 0 && arquivos.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-400">{vazioMsg}</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

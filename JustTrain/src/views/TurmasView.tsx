import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Users, ChevronRight } from "lucide-react";
import { api, cn, SETORES } from "../lib/cn";

interface Treinamento { id: string; nome: string; codigo?: string }
interface Turma {
  id: string;
  treinamento_nome: string;
  treinamento_codigo?: string;
  setor: string;
  data: string;
  instrutor?: string;
  local?: string;
  origem: string;
  entidade_externa?: string;
  status: string;
  _count?: { participacoes: number };
}

const inp = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

export default function TurmasView({ onOpen }: { onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const turmas = useQuery({ queryKey: ["turmas"], queryFn: () => api<Turma[]>("/turmas") });
  const treinos = useQuery({ queryKey: ["treinamentos"], queryFn: () => api<Treinamento[]>("/treinamentos") });
  const vazio = { treinamento_id: "", data: "", instrutor: "", local: "", objetivo: "", acao: "", origem: "interna", entidade_externa: "" };
  const [form, setForm] = useState(vazio);

  const criar = useMutation({
    mutationFn: () => {
      const payload = { ...form, entidade_externa: form.entidade_externa || null };
      return api<Turma>("/turmas", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["turmas"] });
      setForm(vazio);
      onOpen(t.id);
    },
  });

  const badge = (s: string) =>
    cn(
      "rounded-full px-2 py-0.5 text-xs font-medium",
      s === "concluida" ? "bg-emerald-100 text-emerald-700" : s === "cancelada" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
    );

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          <CalendarPlus className="size-4" /> Nova turma
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-500">
            Treinamento
            <select className={inp} value={form.treinamento_id} onChange={(e) => setForm({ ...form, treinamento_id: e.target.value })}>
              <option value="">— selecione —</option>
              {treinos.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.codigo ? `${t.codigo} · ` : ""}{t.nome}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Data
            <input type="date" className={inp} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </label>
          <label className="text-xs text-slate-500">
            Origem
            <select className={inp} value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value, entidade_externa: "" })}>
              <option value="interna">Interna (JUST)</option>
              <option value="externa">Externa (SECONCI, SENAI…)</option>
            </select>
          </label>
          {form.origem === "externa" ? (
            <label className="text-xs text-slate-500">
              Entidade
              <input className={inp} value={form.entidade_externa} onChange={(e) => setForm({ ...form, entidade_externa: e.target.value })} placeholder="ex.: SECONCI" />
            </label>
          ) : (
            <label className="text-xs text-slate-500">
              Instrutor
              <input className={inp} value={form.instrutor} onChange={(e) => setForm({ ...form, instrutor: e.target.value })} />
            </label>
          )}
          <label className="text-xs text-slate-500">
            Local
            <input className={inp} value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
          </label>
          <label className="col-span-2 text-xs text-slate-500">
            Objetivo
            <input className={inp} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="o que se espera do treinamento" />
          </label>
          <label className="col-span-2 text-xs text-slate-500">
            Ação
            <input className={inp} value={form.acao} onChange={(e) => setForm({ ...form, acao: e.target.value })} placeholder="ação/conteúdo abordado" />
          </label>
        </div>
        {criar.isError && <p className="mt-2 text-xs text-red-600">{(criar.error as Error).message}</p>}
        <button
          onClick={() => criar.mutate()}
          disabled={!form.treinamento_id || !form.data || criar.isPending}
          className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {criar.isPending ? "Criando…" : "Criar turma"}
        </button>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          Turmas {turmas.data ? `(${turmas.data.length})` : ""}
        </h2>
        <div className="space-y-2">
          {turmas.data?.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {t.treinamento_codigo ? `${t.treinamento_codigo} · ` : ""}{t.treinamento_nome}
                  </span>
                  <span className={badge(t.status)}>{t.status}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {SETORES[t.setor] ?? t.setor} · {t.data}
                  {t.origem === "externa"
                    ? ` · Externo${t.entidade_externa ? `: ${t.entidade_externa}` : ""}`
                    : t.instrutor ? ` · ${t.instrutor}` : ""}
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="size-3.5" /> {t._count?.participacoes ?? 0}
              </span>
              <ChevronRight className="size-4 text-slate-300" />
            </button>
          ))}
          {turmas.data?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">nenhuma turma criada ainda</p>}
        </div>
      </section>
    </div>
  );
}

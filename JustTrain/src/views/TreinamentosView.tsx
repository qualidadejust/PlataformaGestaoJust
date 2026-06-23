import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, GraduationCap, Trash2 } from "lucide-react";
import { api, cn, SETORES, TIPOS } from "../lib/cn";

interface Treinamento {
  id: string;
  nome: string;
  codigo?: string;
  tipo: string;
  setor: string;
  carga_horaria: number;
  validade_meses?: number | null;
  descricao?: string;
}

const inp = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

export default function TreinamentosView() {
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["treinamentos"], queryFn: () => api<Treinamento[]>("/treinamentos") });
  const vazio = { nome: "", codigo: "", tipo: "procedimento", setor: "sst", carga_horaria: "", validade_meses: "", descricao: "" };
  const [form, setForm] = useState(vazio);

  const criar = useMutation({
    mutationFn: () => api("/treinamentos", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treinamentos"] });
      setForm(vazio);
    },
  });
  const excluir = useMutation({
    mutationFn: (id: string) => api(`/treinamentos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["treinamentos"] }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          <Plus className="size-4" /> Novo treinamento
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="col-span-2 text-xs text-slate-500">
            Nome
            <input className={inp} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Trabalho em Altura" />
          </label>
          <label className="text-xs text-slate-500">
            Código
            <input className={inp} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="nr35_altura" />
          </label>
          <label className="text-xs text-slate-500">
            Tipo
            <select className={inp} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {Object.entries(TIPOS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Setor
            <select className={inp} value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })}>
              {Object.entries(SETORES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Carga horária (h)
            <input type="number" className={inp} value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} />
          </label>
          <label className="text-xs text-slate-500">
            Validade (meses)
            <input type="number" className={inp} value={form.validade_meses} onChange={(e) => setForm({ ...form, validade_meses: e.target.value })} placeholder="reciclagem" />
          </label>
          <label className="col-span-2 text-xs text-slate-500 md:col-span-2">
            Descrição
            <input className={inp} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </label>
        </div>
        {criar.isError && <p className="mt-2 text-xs text-red-600">{(criar.error as Error).message}</p>}
        <button
          onClick={() => criar.mutate()}
          disabled={!form.nome || criar.isPending}
          className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {criar.isPending ? "Salvando…" : "Adicionar treinamento"}
        </button>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          Catálogo {lista.data ? `(${lista.data.length})` : ""}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {lista.data?.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
              <GraduationCap className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t.nome}</span>
                  {t.codigo && <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-500 dark:bg-slate-800">{t.codigo}</span>}
                </div>
                <div className="text-xs text-slate-400">
                  {TIPOS[t.tipo] ?? t.tipo} · {SETORES[t.setor] ?? t.setor} · {t.carga_horaria}h
                  {t.validade_meses ? ` · recicla a cada ${t.validade_meses} meses` : " · sem reciclagem"}
                </div>
              </div>
              <button onClick={() => confirm(`Excluir "${t.nome}"?`) && excluir.mutate(t.id)} className="text-slate-300 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {lista.data?.length === 0 && (
            <p className={cn("py-6 text-center text-xs text-slate-400 sm:col-span-2")}>nenhum treinamento cadastrado ainda</p>
          )}
        </div>
      </section>
    </div>
  );
}

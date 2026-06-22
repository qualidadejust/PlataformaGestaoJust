import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import { api, core } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

const inp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

interface Viagem {
  id: string;
  data: string;
  veiculo_id?: string;
  veiculo_nome?: string;
  motorista_id?: string;
  motorista_nome?: string;
  obra_id?: string;
  obra_nome?: string;
  destino?: string;
  observacao?: string;
  hora_inicio?: string;
  hora_fim?: string;
  km_inicial?: number;
  km_final?: number;
  km_rodado?: number;
}
interface Ref {
  id: string;
  nome?: string;
  identificacao?: string;
  placa?: string;
}

const hoje = () => new Date().toISOString().slice(0, 10);
const vazio = () => ({
  data: hoje(),
  veiculo_id: "",
  motorista_id: "",
  obra_id: "",
  destino: "",
  hora_inicio: "",
  hora_fim: "",
  km_inicial: "",
  km_final: "",
  observacao: "",
});
const rowToForm = (v: Viagem) => ({
  data: v.data ?? hoje(),
  veiculo_id: v.veiculo_id ?? "",
  motorista_id: v.motorista_id ?? "",
  obra_id: v.obra_id ?? "",
  destino: v.destino ?? "",
  hora_inicio: v.hora_inicio ?? "",
  hora_fim: v.hora_fim ?? "",
  km_inicial: v.km_inicial != null ? String(v.km_inicial) : "",
  km_final: v.km_final != null ? String(v.km_final) : "",
  observacao: v.observacao ?? "",
});

export default function DiarioView() {
  const qc = useQueryClient();
  const [form, setForm] = useState(vazio());
  const [editId, setEditId] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const viagens = useQuery({ queryKey: ["viagens"], queryFn: () => api<Viagem[]>("/api/viagens") });
  const veiculos = useQuery({ queryKey: ["core-veiculos"], queryFn: () => core<Ref[]>("/api/veiculos") });
  const obras = useQuery({ queryKey: ["core-obras"], queryFn: () => core<Ref[]>("/api/obras") });
  const colaboradores = useQuery({ queryKey: ["core-colab"], queryFn: () => core<Ref[]>("/api/colaboradores") });

  const kmIni = form.km_inicial ? Number(form.km_inicial) : null;
  const kmFim = form.km_final ? Number(form.km_final) : null;
  const kmErro = kmIni != null && kmFim != null && kmFim < kmIni;

  const reset = () => {
    setForm(vazio());
    setEditId(null);
  };
  const startEdit = (v: Viagem) => {
    setForm(rowToForm(v));
    setEditId(v.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const salvar = useMutation({
    mutationFn: () => {
      const veic = veiculos.data?.find((v) => v.id === form.veiculo_id);
      const obra = obras.data?.find((o) => o.id === form.obra_id);
      const mot = colaboradores.data?.find((c) => c.id === form.motorista_id);
      const body = {
        data: form.data,
        veiculo_id: form.veiculo_id || null,
        veiculo_nome: veic?.identificacao ?? veic?.placa ?? null,
        motorista_id: form.motorista_id || null,
        motorista_nome: mot?.nome ?? null,
        obra_id: form.obra_id || null,
        obra_nome: obra?.nome ?? null,
        destino: form.destino || null,
        hora_inicio: form.hora_inicio || null,
        hora_fim: form.hora_fim || null,
        km_inicial: kmIni,
        km_final: kmFim,
        observacao: form.observacao || null,
        origem: editId ? undefined : "manual",
      };
      return editId
        ? api(`/api/viagens/${editId}`, { method: "PUT", body: JSON.stringify(body) })
        : api("/api/viagens", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["viagens"] });
      qc.invalidateQueries({ queryKey: ["rateio"] });
      reset();
    },
  });

  const excluir = useMutation({
    mutationFn: (id: string) => api(`/api/viagens/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["viagens"] });
      qc.invalidateQueries({ queryKey: ["rateio"] });
    },
  });

  return (
    <div className="space-y-6">
      <section className={cn("rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900", editId && "ring-2 ring-amber-400")}>
        <h2 className="mb-4 flex items-center justify-between text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          {editId ? "Editar viagem" : "Nova viagem"}
          {editId && (
            <button onClick={reset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <X className="size-3.5" /> cancelar edição
            </button>
          )}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-500">
            Data
            <input type="date" className={inp} value={form.data} onChange={(e) => set("data", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Veículo
            <select className={inp} value={form.veiculo_id} onChange={(e) => set("veiculo_id", e.target.value)}>
              <option value="">—</option>
              {veiculos.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.identificacao ?? v.placa ?? v.id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Motorista
            <select className={inp} value={form.motorista_id} onChange={(e) => set("motorista_id", e.target.value)}>
              <option value="">—</option>
              {colaboradores.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Obra / centro de custo
            <select className={inp} value={form.obra_id} onChange={(e) => set("obra_id", e.target.value)}>
              <option value="">—</option>
              {obras.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 text-xs text-slate-500">
            Destino
            <input className={inp} value={form.destino} onChange={(e) => set("destino", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Hora início
            <input type="time" className={inp} value={form.hora_inicio} onChange={(e) => set("hora_inicio", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Hora fim
            <input type="time" className={inp} value={form.hora_fim} onChange={(e) => set("hora_fim", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Km inicial
            <input type="number" className={inp} value={form.km_inicial} onChange={(e) => set("km_inicial", e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">
            Km final
            <input
              type="number"
              className={cn(inp, kmErro && "border-red-500")}
              value={form.km_final}
              onChange={(e) => set("km_final", e.target.value)}
            />
          </label>
          <label className="col-span-2 text-xs text-slate-500 md:col-span-4">
            Observação
            <input className={inp} value={form.observacao} onChange={(e) => set("observacao", e.target.value)} />
          </label>
        </div>
        {kmErro && (
          <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="size-3.5" /> Km final não pode ser menor que o inicial.
          </p>
        )}
        <button
          onClick={() => salvar.mutate()}
          disabled={kmErro || salvar.isPending}
          className="mt-4 flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Plus className="size-4" /> {salvar.isPending ? "Salvando…" : editId ? "Salvar alterações" : "Adicionar viagem"}
        </button>
        {salvar.isError && <p className="mt-2 text-xs text-red-600">{(salvar.error as Error).message}</p>}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">
          Viagens {viagens.data ? `(${viagens.data.length})` : ""}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Veículo</th>
                <th className="px-2 py-2">Motorista</th>
                <th className="px-2 py-2">Obra</th>
                <th className="px-2 py-2">Destino</th>
                <th className="px-2 py-2 text-right">Km</th>
                <th className="px-2 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {viagens.data?.map((v) => (
                <tr key={v.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1.5">{v.data}</td>
                  <td className="px-2 py-1.5">{v.veiculo_nome ?? "—"}</td>
                  <td className="px-2 py-1.5">{v.motorista_nome ?? "—"}</td>
                  <td className="px-2 py-1.5">{v.obra_nome ?? "—"}</td>
                  <td className="max-w-xs truncate px-2 py-1.5 text-slate-500">{v.destino ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right">
                    {v.km_rodado != null ? (
                      `${v.km_rodado} km`
                    ) : (
                      <span className="text-amber-600" title="km inconsistente — fora do rateio">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(v)} title="Editar" className="text-slate-400 hover:text-teal-600">
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => confirm(`Excluir a viagem de ${v.data} (${v.obra_nome ?? "—"})?`) && excluir.mutate(v.id)}
                        title="Excluir"
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api, core } from "../lib/api.ts";

const inp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

interface Veic {
  id: string;
  identificacao?: string;
  placa?: string;
}
type Campo = { key: string; label: string; type: "text" | "number" | "date" | "month" | "select"; options?: string[] };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Bloco({
  titulo,
  path,
  campos,
  veiculos,
}: {
  titulo: string;
  path: string;
  campos: Campo[];
  veiculos: Veic[];
}) {
  const qc = useQueryClient();
  const init = () => Object.fromEntries(campos.map((c) => [c.key, ""])) as Record<string, string>;
  const [form, setForm] = useState<Record<string, string>>(init);
  const [veiculoId, setVeiculoId] = useState("");
  const lista = useQuery({ queryKey: [path], queryFn: () => api<any[]>(`/api/${path}`) });

  const criar = useMutation({
    mutationFn: () => {
      const veic = veiculos.find((v) => v.id === veiculoId);
      const body: Record<string, unknown> = {
        veiculo_id: veiculoId || null,
        veiculo_nome: veic?.identificacao ?? veic?.placa ?? null,
      };
      for (const c of campos) {
        const v = form[c.key];
        body[c.key] = c.type === "number" ? (v ? Number(v) : null) : v || null;
      }
      return api(`/api/${path}`, { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [path] });
      qc.invalidateQueries({ queryKey: ["rateio"] });
      setForm(init());
      setVeiculoId("");
    },
  });
  const excluir = useMutation({
    mutationFn: (id: string) => api(`/api/${path}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [path] }),
  });

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-[#0f2742] dark:text-teal-300">{titulo}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="text-xs text-slate-500">
          Veículo
          <select className={inp} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
            <option value="">—</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.identificacao ?? v.placa ?? v.id}
              </option>
            ))}
          </select>
        </label>
        {campos.map((c) => (
          <label key={c.key} className="text-xs text-slate-500">
            {c.label}
            {c.type === "select" ? (
              <select className={inp} value={form[c.key]} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}>
                <option value="">—</option>
                {c.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={c.type}
                className={inp}
                value={form[c.key]}
                onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
              />
            )}
          </label>
        ))}
      </div>
      <button
        onClick={() => criar.mutate()}
        disabled={criar.isPending}
        className="mt-3 flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Plus className="size-4" /> Lançar
      </button>
      {criar.isError && <p className="mt-1 text-xs text-red-600">{(criar.error as Error).message}</p>}

      <ul className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
        {lista.data?.map((it) => (
          <li key={it.id} className="flex items-center justify-between py-1.5">
            <span className="text-slate-600 dark:text-slate-300">
              {it.data ?? it.competencia} · {it.veiculo_nome ?? "—"} · {it.tipo ?? it.descricao ?? it.posto ?? ""}
            </span>
            <span className="flex items-center gap-3">
              <strong>{brl(it.valor ?? 0)}</strong>
              <button onClick={() => excluir.mutate(it.id)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </span>
          </li>
        ))}
        {lista.data?.length === 0 && <li className="py-2 text-xs text-slate-400">nenhum lançamento ainda</li>}
      </ul>
    </section>
  );
}

export default function CustosView() {
  const veiculos = useQuery({ queryKey: ["core-veiculos"], queryFn: () => core<Veic[]>("/api/veiculos") });
  const vs = veiculos.data ?? [];
  return (
    <div className="space-y-6">
      <Bloco
        titulo="Abastecimento"
        path="abastecimentos"
        veiculos={vs}
        campos={[
          { key: "data", label: "Data", type: "date" },
          { key: "litros", label: "Litros", type: "number" },
          { key: "valor", label: "Valor (R$)", type: "number" },
          { key: "km", label: "Km", type: "number" },
          { key: "posto", label: "Posto", type: "text" },
        ]}
      />
      <Bloco
        titulo="Manutenção"
        path="manutencoes"
        veiculos={vs}
        campos={[
          { key: "data", label: "Data", type: "date" },
          { key: "tipo", label: "Tipo", type: "select", options: ["preventiva", "corretiva"] },
          { key: "descricao", label: "Descrição", type: "text" },
          { key: "valor", label: "Valor (R$)", type: "number" },
          { key: "fornecedor", label: "Fornecedor", type: "text" },
        ]}
      />
      <Bloco
        titulo="Custo fixo (mensal)"
        path="custos-fixos"
        veiculos={vs}
        campos={[
          { key: "competencia", label: "Competência", type: "month" },
          { key: "tipo", label: "Tipo", type: "select", options: ["ipva", "seguro", "licenciamento", "depreciacao", "financiamento", "outro"] },
          { key: "descricao", label: "Descrição", type: "text" },
          { key: "valor", label: "Valor (R$)", type: "number" },
        ]}
      />
    </div>
  );
}

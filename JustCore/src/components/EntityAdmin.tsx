import { useState } from "react";
import { Plus, Pencil, Trash2, Check, Minus } from "lucide-react";
import type { EntityConfig } from "../entities";
import { useList, useRemove, type Row } from "../hooks/useEntity";
import { EntityForm } from "./EntityForm";

export function EntityAdmin({ config }: { config: EntityConfig }) {
  const { data: rows = [], isLoading } = useList(config.path);
  const remove = useRemove(config.path);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const Icon = config.icon;
  const cols = config.fields.filter((f) => f.inList);

  function cell(row: Row, f: (typeof cols)[number]) {
    if (f.render) return f.render(row);
    const v = row[f.key];
    if (f.type === "boolean")
      return v ? <Check className="w-4 h-4 text-emerald-600" /> : <Minus className="w-4 h-4 text-slate-300" />;
    if (f.type === "select") return f.options?.find((o) => o.value === v)?.label ?? v ?? "—";
    return v ?? "—";
  }

  async function excluir(row: Row) {
    if (!confirm(`Excluir "${config.title(row)}"?`)) return;
    try {
      await remove.mutateAsync(row.id);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-brand-900 flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{config.label}</h1>
            <p className="text-sm text-slate-500">{rows.length} registro(s)</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 text-sm">
          Nenhum registro. Clique em “Novo” para cadastrar.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                {cols.map((f) => (
                  <th key={f.key} className="px-4 py-3 font-medium whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {cols.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {cell(row, f)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(row)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => excluir(row)} className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <EntityForm
          config={config}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

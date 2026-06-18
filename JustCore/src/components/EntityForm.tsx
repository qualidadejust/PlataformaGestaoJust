import { useState } from "react";
import { X } from "lucide-react";
import type { EntityConfig, Field } from "../entities";
import type { Row } from "../hooks/useEntity";
import { useSave } from "../hooks/useEntity";
import { RefSelect } from "./RefSelect";

interface Props {
  config: EntityConfig;
  initial: Row | null; // null = criar
  onClose: () => void;
}

// Limpa o payload: "" -> null; números convertidos; remove relações aninhadas.
function montarPayload(config: EntityConfig, form: Row): Row {
  const out: Row = {};
  if (form.id) out.id = form.id;
  for (const f of config.fields) {
    let v = form[f.key];
    if (f.type === "number") v = v === "" || v == null ? null : Number(v);
    else if (f.type === "boolean") v = !!v;
    else if (typeof v === "string" && v.trim() === "") v = null;
    out[f.key] = v ?? null;
  }
  return out;
}

export function EntityForm({ config, initial, onClose }: Props) {
  const save = useSave(config.path);
  const [form, setForm] = useState<Row>(() => {
    const base: Row = initial ? { ...initial } : {};
    for (const f of config.fields) {
      if (base[f.key] === undefined) base[f.key] = f.type === "boolean" ? false : "";
    }
    return base;
  });

  function set(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    await save.mutateAsync(montarPayload(config, form));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl my-6 w-full max-w-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">
            {initial ? `Editar ${config.singular}` : `Novo ${config.singular}`}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {config.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>

        {save.isError && (
          <p className="px-5 text-sm text-rose-600">{(save.error as Error).message}</p>
        )}

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {save.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const wrapper = field.type === "textarea" ? "sm:col-span-2" : "";
  return (
    <label className={`block ${wrapper}`}>
      <span className="text-sm font-medium text-slate-700">
        {field.label}
        {field.required && <span className="text-rose-500"> *</span>}
      </span>

      {field.type === "boolean" ? (
        <div className="mt-2">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-brand-900" />
        </div>
      ) : field.type === "textarea" ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      ) : field.type === "select" ? (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">— selecione —</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "ref" ? (
        <RefSelect field={field} value={value} onChange={onChange} />
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      )}
    </label>
  );
}

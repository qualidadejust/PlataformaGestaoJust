import { useList } from "../hooks/useEntity";
import type { Field } from "../entities";

interface Props {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}

/** Select populado a partir de outra entidade (FK). */
export function RefSelect({ field, value, onChange }: Props) {
  const { data = [], isLoading } = useList(field.refPath!);
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
    >
      <option value="">{isLoading ? "Carregando…" : "— nenhum —"}</option>
      {data.map((row) => (
        <option key={row.id} value={row.id}>
          {field.refLabel ? field.refLabel(row) : row.nome ?? row.id}
        </option>
      ))}
    </select>
  );
}

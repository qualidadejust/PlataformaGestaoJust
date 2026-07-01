import { useEffect, useState } from "react";
import { GraduationCap, Check, Loader2, ExternalLink } from "lucide-react";
import { api, core } from "../lib/cn.ts";

// PONTE do JustDocs: chega aqui com ?ged=<docId> (certificado de treinamento já no GED). O RH
// escolhe o treinamento do catálogo, confere os dados que a IA leu e registra como treinamento
// EXTERNO da pessoa (1 certificado = 1 registro). O certificado fica amarrado e sai da fila.
interface Treino {
  id: string;
  nome: string;
  codigo?: string | null;
}
const inp =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

export default function FinalizarExternoView({ gedId, onDone }: { gedId: string; onDone: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [colab, setColab] = useState<{ id: string; nome: string }>({ id: "", nome: "" });
  const [arquivo, setArquivo] = useState("");
  const [form, setForm] = useState({
    treinamento_id: "",
    data: "",
    instrutor: "",
    entidade_externa: "",
    vencimento: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const [doc, ts] = await Promise.all([
          core<any>(`/documentos/${gedId}`),
          api<Treino[]>("/treinamentos"),
        ]);
        setTreinos(ts);
        const dados = doc?.metadados?.dados_extraidos ?? {};
        setColab({ id: doc?.entidade_id ?? "", nome: doc?.metadados?.colaborador_nome ?? "" });
        setArquivo(doc?.nome_original ?? "");
        setForm((f) => ({
          ...f,
          data: dados.data_realizacao || "",
          instrutor: dados.instrutor || "",
          vencimento: dados.vencimento || "",
        }));
      } catch (e) {
        setErro((e as Error).message);
      } finally {
        setCarregando(false);
      }
    })();
  }, [gedId]);

  const salvar = async () => {
    if (!form.treinamento_id || !form.data) {
      setErro("Escolha o treinamento e a data de realização.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await api("/treinamento-externo/from-ged", {
        method: "POST",
        body: JSON.stringify({
          ged_documento_id: gedId,
          colaborador_id: colab.id,
          colaborador_nome: colab.nome,
          treinamento_id: form.treinamento_id,
          data: form.data,
          instrutor: form.instrutor || undefined,
          entidade_externa: form.entidade_externa || undefined,
          vencimento: form.vencimento || undefined,
        }),
      });
      setOk(true);
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  };

  if (carregando)
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" /> carregando certificado…
      </p>
    );

  if (ok)
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-slate-900">
        <Check className="mx-auto mb-2 size-8 text-emerald-600" />
        <p className="text-sm font-medium">Treinamento externo registrado para {colab.nome}.</p>
        <p className="mt-1 text-xs text-slate-500">O certificado foi amarrado e o documento saiu da fila de análise.</p>
        <button onClick={onDone} className="mt-4 rounded-md bg-[#0f2742] px-4 py-2 text-sm font-medium text-white dark:bg-teal-600">
          Ir para Turmas
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-[#0f2742] dark:text-amber-300">
        <ExternalLink className="size-5" /> Finalizar treinamento externo
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Certificado recebido pelo WhatsApp: <strong>{arquivo}</strong>. Confira os dados lidos pela IA e registre.
      </p>

      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <div className="grid gap-1.5 text-sm">
          <span className="text-xs text-slate-400">Colaborador</span>
          <span className="font-medium">{colab.nome || "—"}</span>
        </div>
        <label className="block text-xs text-slate-500">
          Treinamento (catálogo) *
          <select className={inp} value={form.treinamento_id} onChange={(e) => set("treinamento_id", e.target.value)}>
            <option value="">— selecione —</option>
            {treinos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo ? `${t.codigo} — ` : ""}{t.nome}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-500">
            Data de realização *
            <input type="date" className={inp} value={form.data} onChange={(e) => set("data", e.target.value)} />
          </label>
          <label className="block text-xs text-slate-500">
            Vencimento (opcional)
            <input type="date" className={inp} value={form.vencimento} onChange={(e) => set("vencimento", e.target.value)} />
          </label>
          <label className="block text-xs text-slate-500">
            Entidade que ministrou
            <input className={inp} value={form.entidade_externa} onChange={(e) => set("entidade_externa", e.target.value)} placeholder="Ex.: SENAI, SECONCI…" />
          </label>
          <label className="block text-xs text-slate-500">
            Instrutor
            <input className={inp} value={form.instrutor} onChange={(e) => set("instrutor", e.target.value)} />
          </label>
        </div>
        {erro && <p className="text-xs text-rose-600">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onDone} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <GraduationCap className="size-4" />}
            Registrar treinamento
          </button>
        </div>
      </div>
    </div>
  );
}

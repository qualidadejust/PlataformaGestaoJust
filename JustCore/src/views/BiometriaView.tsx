import { useMemo, useState } from "react";
import {
  Fingerprint, Search, ShieldCheck, ShieldAlert, Check, Plus, Trash2, ChevronRight, ChevronLeft, X,
} from "lucide-react";
import {
  useColaboradores, useBioHealth, useBioResumo, useDigitais, useEnroll, useDeleteDigital,
  DEDOS, DEDOS_ALVO,
} from "../hooks/useBiometria";
import { FingerprintCapture } from "../components/FingerprintCapture";
import type { CaptureResult } from "../lib/fingerprint";
import { cn } from "../lib/utils";

const CAPTURAS_POR_DEDO = 3;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const labelDedo = (v: string | null) => DEDOS.find((d) => d.value === v)?.label ?? v ?? "Digital";

export function BiometriaView() {
  const { data: colaboradores = [] } = useColaboradores();
  const { data: resumo = [] } = useBioResumo();
  const { data: health } = useBioHealth();
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const totalPorColab = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resumo) m.set(r.colaborador_id, r.total);
    return m;
  }, [resumo]);

  const filtrados = colaboradores.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));
  const selColab = colaboradores.find((c) => c.id === sel);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-brand-900 flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Biometria</h1>
            <p className="text-sm text-slate-500">
              Cadastro de digitais do colaborador — meta de {DEDOS_ALVO} dedos por pessoa.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
            health?.online ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          {health?.online ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {health?.online ? "Leitor de biometria ativo" : "Serviço de biometria offline"}
        </span>
      </div>

      {!health?.online && (
        <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          O serviço de comparação de digitais (porta 4002) não está rodando — cadastro indisponível.
        </div>
      )}

      {selColab ? (
        <EnrollPanel id={selColab.id} nome={selColab.nome} cargo={selColab.cargo?.nome ?? null} onBack={() => setSel(null)} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar colaborador…"
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </div>
          </div>
          <ul className="divide-y divide-slate-100 max-h-[62vh] overflow-y-auto">
            {filtrados.map((c) => {
              const n = totalPorColab.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <button onClick={() => setSel(c.id)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 text-left">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                      {c.nome.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.nome}</p>
                      <p className="text-xs text-slate-400 truncate">{c.cargo?.nome ?? "—"}</p>
                    </div>
                    {n > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-semibold">
                        <Check className="w-3 h-3" /> {n} captura{n > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-xs">não cadastrado</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-300 ml-1" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function EnrollPanel({ id, nome, cargo, onBack }: { id: string; nome: string; cargo: string | null; onBack: () => void }) {
  const { data: cadastro } = useDigitais(id);
  const enroll = useEnroll(id);
  const del = useDeleteDigital();
  const [captura, setCaptura] = useState<CaptureResult | null>(null);
  const [capturas, setCapturas] = useState<string[]>([]);

  // dedos já cadastrados (distintos) e progresso da meta
  const dedosFeitos = useMemo(
    () => new Set((cadastro?.digitais ?? []).map((d) => d.dedo).filter(Boolean) as string[]),
    [cadastro]
  );
  const dedosDisponiveis = DEDOS.filter((d) => !dedosFeitos.has(d.value));
  const [dedo, setDedo] = useState<string>("");
  const dedoAtual = dedo || dedosDisponiveis[0]?.value || DEDOS[0].value;

  function adicionar() {
    if (!captura) return;
    setCapturas((cs) => [...cs, captura.dataUrl]);
    setCaptura(null);
  }

  async function salvar() {
    if (capturas.length === 0) return;
    await enroll.mutateAsync({ dedo: dedoAtual, imagens: capturas });
    setCapturas([]);
    setCaptura(null);
    setDedo("");
  }

  const progresso = Math.min(dedosFeitos.size, DEDOS_ALVO);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ChevronLeft className="w-4 h-4" /> Todos os colaboradores
      </button>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{nome}</h2>
          <p className="text-sm text-slate-500">{cargo ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: DEDOS_ALVO }).map((_, i) => (
            <Fingerprint key={i} className={cn("w-6 h-6", i < progresso ? "text-emerald-500" : "text-slate-300")} />
          ))}
          <span className="text-sm font-medium text-slate-600 ml-1">{progresso}/{DEDOS_ALVO} dedos</span>
        </div>
      </div>

      {/* Dedos cadastrados */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Digitais cadastradas</h3>
        </div>
        {cadastro && cadastro.digitais.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {cadastro.digitais.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                <Fingerprint className="w-4 h-4 text-brand-700" />
                <span className="text-sm text-slate-700 flex-1">{labelDedo(d.dedo)}</span>
                <span className="text-xs text-slate-400">{fmt(d.created_at)}</span>
                <button onClick={() => del.mutate(d.id)} className="p-1 text-slate-400 hover:text-rose-600" title="Remover">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-400">Nenhuma digital cadastrada ainda.</p>
        )}
      </div>

      {/* Novo dedo */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">Cadastrar dedo</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Dedo</span>
            <select
              value={dedoAtual}
              onChange={(e) => setDedo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {DEDOS.map((d) => (
                <option key={d.value} value={d.value} disabled={dedosFeitos.has(d.value)}>
                  {d.label}{dedosFeitos.has(d.value) ? " (já cadastrado)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <p className="text-xs text-slate-500">Recomendado: <strong>{CAPTURAS_POR_DEDO} capturas</strong> do mesmo dedo.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {capturas.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt={`Captura ${i + 1}`} className="w-16 h-20 object-contain rounded border border-emerald-300 bg-emerald-50" />
              <button onClick={() => setCapturas((cs) => cs.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-white rounded-full border border-slate-300 p-0.5 text-slate-500 hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {capturas.length === 0 && <span className="text-xs text-slate-400">Nenhuma captura adicionada.</span>}
        </div>

        <FingerprintCapture value={captura} onChange={setCaptura} disabledHint="" />

        <div className="flex items-center gap-2">
          <button onClick={adicionar} disabled={!captura}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            <Plus className="w-4 h-4" /> Adicionar captura
          </button>
          <button onClick={salvar} disabled={capturas.length === 0 || enroll.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40">
            <Check className="w-4 h-4" />
            {enroll.isPending ? "Salvando…" : `Salvar dedo (${capturas.length})`}
          </button>
        </div>

        {enroll.isError && <p className="text-sm text-rose-600">{(enroll.error as Error).message}</p>}
      </div>
    </div>
  );
}

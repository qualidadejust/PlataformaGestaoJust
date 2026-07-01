import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Loader2, ClipboardCheck, CheckCircle, XCircle, Minus, AlertTriangle,
} from "lucide-react";
import { api } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { useAuth } from "../auth.tsx";
import type { FormularioModelo, SecaoEstrutural, ItemResposta, RespostaItem, Tarefa } from "../lib/types.ts";

interface Props {
  tarefaId: string;
  tarefaLabel: string;
  onConcluir: () => void;
  onCancelar: () => void;
}

type ValorResposta = "sim" | "nao" | "na" | null;

interface RespostaLocal {
  valor: ValorResposta;
  obs: string;
}

function BotaoResposta({
  valor,
  selecionado,
  onClick,
}: {
  valor: ValorResposta;
  selecionado: boolean;
  onClick: () => void;
}) {
  const estilos: Record<string, string> = {
    sim: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    nao: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    na: "border-slate-400 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  const padrao = "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900";
  const icone = { sim: CheckCircle, nao: XCircle, na: Minus }[valor as string];
  const Icone = icone;
  const rotulo = { sim: "Conforme", nao: "Não conforme", na: "N/A" }[valor as string];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
        selecionado ? estilos[valor as string] : padrao,
      )}
    >
      {Icone && <Icone className="size-3.5" />}
      {rotulo}
    </button>
  );
}

function ItemForm({
  item,
  resposta,
  onChange,
}: {
  item: ItemResposta;
  resposta: RespostaLocal;
  onChange: (r: RespostaLocal) => void;
}) {
  const temNc = resposta.valor === "nao";
  return (
    <div className={cn("rounded-lg border p-3", temNc && "border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.descricao}</p>
          {item.instrucoes && (
            <p className="mt-0.5 text-xs text-slate-400">{item.instrucoes}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {(["sim", "nao"] as ValorResposta[]).map((v) => (
            <BotaoResposta
              key={v}
              valor={v}
              selecionado={resposta.valor === v}
              onClick={() => onChange({ ...resposta, valor: resposta.valor === v ? null : v })}
            />
          ))}
          {item.resposta.permite_na && (
            <BotaoResposta
              valor="na"
              selecionado={resposta.valor === "na"}
              onClick={() => onChange({ ...resposta, valor: resposta.valor === "na" ? null : "na" })}
            />
          )}
        </div>
      </div>
      {temNc && (
        <div className="mt-2">
          <label className="text-xs font-medium text-red-700 dark:text-red-400">
            Descrição da não-conformidade
            {item.gera_nc?.ativo && <span className="ml-1 font-normal">(obrigatória)</span>}
          </label>
          <textarea
            value={resposta.obs}
            onChange={(e) => onChange({ ...resposta, obs: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-red-400 focus:outline-none dark:border-red-900 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Descreva o problema encontrado…"
          />
        </div>
      )}
    </div>
  );
}

export default function NovoFvsView({ tarefaId, tarefaLabel, onConcluir, onCancelar }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Carrega dados da tarefa (necessário para saber o servico_sigla)
  const { data: tarefa } = useQuery<Tarefa>({
    queryKey: ["tarefa", tarefaId],
    queryFn: () => api(`/tarefas/${tarefaId}`),
  });

  // Carrega o modelo FVS publicado vinculado ao serviço desta tarefa
  const sigla = tarefa?.servico?.sigla_prancha;
  const { data: modelos, isLoading: loadingModelo } = useQuery<FormularioModelo[]>({
    queryKey: ["formularios-fvs", sigla],
    queryFn: () => api(`/formularios?escopo=fvs&publicado=true${sigla ? `&servico_sigla=${encodeURIComponent(sigla)}` : ""}`),
    enabled: !!tarefa, // aguarda a tarefa carregar para saber a sigla
  });

  // Modelo mais recente (maior versão) para o serviço — fallback sem sigla se não encontrar
  const modelo = modelos?.[0];
  const secoes: SecaoEstrutural[] = modelo ? JSON.parse(modelo.estrutura) : [];

  // Estado das respostas: secao → item_ordem → RespostaLocal
  const [respostas, setRespostas] = useState<Map<string, RespostaLocal>>(new Map());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (secoes.length > 0) {
      const m = new Map<string, RespostaLocal>();
      for (const s of secoes) {
        for (const it of s.itens) {
          m.set(`${s.ordem}:${it.ordem}`, { valor: null, obs: "" });
        }
      }
      setRespostas(m);
    }
  }, [modelo?.id]);

  const totalItens = secoes.reduce((s, sec) => s + sec.itens.length, 0);
  const respondidos = [...respostas.values()].filter((r) => r.valor !== null).length;
  const totalNc = [...respostas.values()].filter((r) => r.valor === "nao").length;
  const completo = respondidos === totalItens && totalItens > 0;

  function buildRespostasJson(): RespostaItem[] {
    const arr: RespostaItem[] = [];
    for (const s of secoes) {
      for (const it of s.itens) {
        const key = `${s.ordem}:${it.ordem}`;
        const r = respostas.get(key) ?? { valor: null, obs: "" };
        arr.push({
          secao: s.secao,
          item: it.ordem,
          tipo: it.resposta.tipo,
          valor: r.valor,
          obs: r.obs || undefined,
        });
      }
    }
    return arr;
  }

  async function salvar(preenchido: boolean) {
    if (!modelo || !user) return;
    setErro("");
    setSalvando(true);
    try {
      const obraId = tarefa?.obra_id ?? "";
      const body = {
        modelo_id: modelo.id,
        modelo_codigo: modelo.codigo,
        modelo_versao: modelo.versao,
        escopo: "fvs",
        entidade_tipo: "tarefa",
        entidade_id: tarefaId,
        // entidade_label guarda obra_id e o rótulo da tarefa para filtros na lista
        entidade_label: `obra:${obraId}|${tarefaLabel}`,
        respostas: JSON.stringify(buildRespostasJson()),
        total_nc: totalNc,
        autor_nome: user.colaborador?.nome ?? user.email,
        preenchido_em: preenchido ? new Date().toISOString() : null,
      };
      await api("/formularios/instancias", { method: "POST", body: JSON.stringify(body) });
      await qc.invalidateQueries({ queryKey: ["fvs-instancias"] });
      onConcluir();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (loadingModelo) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="size-4 animate-spin" /> Carregando modelo FVS…
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
        <AlertTriangle className="mx-auto mb-2 size-6 text-amber-500" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Nenhum modelo FVS publicado encontrado{sigla ? ` para o serviço "${sigla}"` : ""}.
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Cadastre e publique um modelo com escopo <strong>fvs</strong> e serviço{" "}
          <strong>{sigla ?? "correspondente"}</strong> no JustCore → Formulários.
        </p>
        <button onClick={onCancelar} className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <button onClick={onCancelar} className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            <ClipboardCheck className="mr-1.5 inline size-4 text-teal-600" />
            {modelo.codigo} — {modelo.nome}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{tarefaLabel}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-400">
            {respondidos}/{totalItens} respondidos
          </p>
          {totalNc > 0 && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{totalNc} não-conformidade{totalNc !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-1.5 rounded-full bg-teal-500 transition-all"
          style={{ width: `${totalItens ? (respondidos / totalItens) * 100 : 0}%` }}
        />
      </div>

      {/* Seções */}
      {secoes.map((sec) => (
        <div key={sec.ordem} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sec.secao}</h3>
          </div>
          <div className="space-y-2 p-4">
            {sec.itens.map((it) => {
              const key = `${sec.ordem}:${it.ordem}`;
              return (
                <ItemForm
                  key={it.ordem}
                  item={it}
                  resposta={respostas.get(key) ?? { valor: null, obs: "" }}
                  onChange={(r) => setRespostas((prev) => new Map(prev).set(key, r))}
                />
              );
            })}
          </div>
        </div>
      ))}

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</p>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          onClick={onCancelar}
          className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => salvar(false)}
            disabled={salvando}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {salvando ? <Loader2 className="inline size-4 animate-spin" /> : "Salvar rascunho"}
          </button>
          <button
            onClick={() => salvar(true)}
            disabled={salvando || !completo}
            title={!completo ? "Responda todos os itens antes de concluir" : undefined}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600"
          >
            {salvando ? <Loader2 className="inline size-4 animate-spin" /> : "Concluir FVS"}
          </button>
        </div>
      </div>
    </div>
  );
}

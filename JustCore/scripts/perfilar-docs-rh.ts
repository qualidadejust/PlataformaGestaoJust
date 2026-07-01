// Perfilador do arquivo de RH (SOMENTE LEITURA — não grava nada no banco nem no SharePoint).
// 2ª passada: além de casar pela PASTA, casa também pelo NOME DENTRO DO ARQUIVO (atestados
// organizados por mês) e tolera erro de grafia (match fuzzy). Classifica cada arquivo num
// tipo oficial do GED. Saída: CSV de conferência + resumo no console.
//
// Uso:  npx tsx scripts/perfilar-docs-rh.ts "C:\\caminho\\da\\pasta"
// CSV → ../data/perfil-docs-rh.csv (gitignored — contém nomes/dados pessoais).
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

const ROOT =
  process.argv[2] ??
  "C:\\Users\\samu_\\JUST CONSTRUCOES E EMPREENDIMENTOS LTDA\\Adriana Ramos - 1 Doc. Funcionários";
const OUT = path.resolve(import.meta.dirname, "..", "..", "data", "perfil-docs-rh.csv");

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function limparNomePasta(raw: string): string {
  let s = raw;
  s = s.replace(/^\s*\d+[.\-)]?\s+/, "");
  s = s.replace(/^(BLANK|MATERA|NEO|SMEL|JUST\s*FIX|FAZENDA|CASA\s*EDUARDO)\s*[-–]\s*/i, "");
  s = s.replace(/\s*[-–]\s*(MENOR\s+)?APRENDIZ\s*$/i, "");
  s = s.replace(/\s*[-–]\s*ESTAGI[ÁA]RI[OA]\s*$/i, "");
  return s.trim();
}

const NAO_FUNCIONARIO = new Set(
  ["ATIVOS", "RESCINDIDOS", "DEMITIDOS", "ESTAGIARIOS", "ANTIGOS", "RESC", "JUST", "JUSTCON",
   "DOCUMENTOS", "DOCS", "ATESTADOS", "OBRAS FINALIZADAS", "INSTRUCAO DE TREINAMENTOS",
   "CERTIFICADOS DE TREINAMENTOS NR 18 E 35"].map(norm),
);

// Palavras que NÃO fazem parte de nome de pessoa (tipo de doc, mês, conectivo, ruído).
const STOP = new Set(
  ("ASO ATESTADO ATESTADOS ADMISSIONAL ADMISSAO ADMISSIONA FICHA REGISTRO CERTIFICADO CERTIFICADOS " +
   "EPI EPIS OS ORDEM SERVICO DOC DOCS DOCUMENTO DOCUMENTOS RG CPF CTPS CNH PIS TITULO ELEITOR RESERVISTA " +
   "CERTIDAO COMPROVANTE RESIDENCIA FOTO CONTRATO TRABALHO EXPERIENCIA INTEGRACAO NR PERIODICO RETORNO AO " +
   "DEMISSIONAL FUNCAO ALTERACAO DESCONTO AUTORIZACAO PGR NA CONTROLE ENTREGA ASSINADO ASSINATURA FINAL " +
   "COPIA DE DA DO DOS DAS E VM VA ALELO MATERA JUST JUSTCON NASCIMENTO CASAMENTO FILHO FILHA DEPENDENTE " +
   "JANEIRO FEVEREIRO MARCO ABRIL MAIO JUNHO JULHO AGOSTO SETEMBRO OUTUBRO NOVEMBRO DEZEMBRO " +
   "JAN FEV MAR ABR MAI JUN JUL AGO SET OUT NOV DEZ ADM").split(" ").map((w) => norm(w)),
);

function tokensNome(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

// Distância de Levenshtein (p/ tolerar typo em nome de pasta).
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function classificar(nome: string): { tipo: string; sensivel: boolean } | null {
  const n = norm(nome);
  const has = (...ks: string[]) => ks.some((k) => n.includes(norm(k)));

  if (has("HOLERITE", "ADIANTAMENTO", "ADTO", "DEBITO", "DESCONTO", "FERIAS", "SALDO DEVEDOR",
          "VALE TRANSPORTE", "VALE ALIMENTACAO", "RECIBO", "CARTAO PONTO", "PONTO", "ESPELHO",
          "FOLHA DE PAGAMENTO", "VM E VA", "ALELO", "MODELO", "CRONOGRAMA", "RELACAO DE",
          "CONTROLE DE HORAS", "TABELA", "NOTA FISCAL"))
    return null;

  if (has("ASO", "SAUDE OCUPACIONAL")) return { tipo: "aso", sensivel: true };
  // "Ficha de admissão" = a ficha em si. "Doc/Docs admissão", "Admissional" = pacote de docs pessoais.
  if (has("FICHA DE ADMISS", "FICHA ADMISS", "FICHA DE REGISTRO")) return { tipo: "ficha_admissao", sensivel: true };
  if (has("DOC ADMISS", "DOCS ADMISS", "DOC PARA ADMISS", "DOCS PARA ADMISS", "DOCUMENTOS PARA ADMISS",
          "DOCUMENTO ADMISS", "ADMISSIONAL", "DOC DE ADMISS", "DOCS DE ADMISS"))
    return { tipo: "doc_pessoal", sensivel: true };
  if (has("CONTRATO DE TRABALHO", "CONTRATO DE EXPERIENCIA", "CONTRATO TRABALHO"))
    return { tipo: "contrato_trabalho", sensivel: true };
  if (has("CERTIFICADO", "NR 18", "NR-18", "NR 35", "NR-35", "NR 10", "NR-10", "NR 12", "TREINAMENTO", "INTEGRACAO"))
    return { tipo: "certificado_treinamento", sensivel: false };
  if (has("EPI", "FICHA DE EPI", "CONTROLE DE EPI")) return { tipo: "ficha_epi", sensivel: false };
  if (has("ORDEM DE SERVICO", "O S ", "O.S")) return { tipo: "ordem_servico", sensivel: false };
  if (has("ALTERACAO DE FUNCAO", "ALTERACAO DE SALARIO", "MUDANCA DE FUNCAO", "ALTERACAO DE FUNCA"))
    return { tipo: "alteracao_funcao", sensivel: true };
  if (has("ATESTADO")) return { tipo: "atestado", sensivel: true };
  if (has("RG", "CPF", "CTPS", "CARTEIRA", "CNH", "TITULO DE ELEITOR", "RESERVISTA", "CERTIDAO",
          "COMPROVANTE DE RESIDENCIA", "PIS", "IDENTIDADE", "QUALIFICACAO CADASTRAL",
          "ANTECEDENTES", "DIPLOMA", "HISTORICO ESCOLAR", "DECLARACAO DE ESCOLARIDADE"))
    return { tipo: "doc_pessoal", sensivel: true };
  if (has("FOTO") || /\.(jpe?g|png|tif)$/i.test(nome)) return { tipo: "foto_colaborador", sensivel: false };

  return null;
}

type Colab = { id: string; nome: string; status: string; tk: string[] };
type Linha = {
  incluir: boolean; motivo: string; match: string; colaborador_id: string; colaborador_nome: string;
  status_core: string; obra: string; status_pasta: string; tipo: string; sensivel: string; arquivo: string; caminho: string;
};

async function main() {
  if (!fs.existsSync(ROOT)) { console.error(`Pasta não encontrada: ${ROOT}`); process.exit(1); }

  const raw: { id: string; nome: string; status: string }[] = await db.colaborador.findMany({
    select: { id: true, nome: true, status: true },
  });
  const colabs: Colab[] = raw.map((c) => ({ ...c, tk: norm(c.nome).split(" ").filter(Boolean) }));
  const porNome = new Map<string, Colab>();
  for (const c of colabs) porNome.set(norm(c.nome), c);

  // Casa um NOME (de pasta): exato → tokens-subset → fuzzy (typo).
  function casarNome(nomePasta: string): { c: Colab; match: string } | null {
    const n = norm(limparNomePasta(nomePasta));
    if (!n) return null;
    const exato = porNome.get(n);
    if (exato) return { c: exato, match: "exato" };
    const tokensPasta = new Set(n.split(" "));
    for (const c of colabs) {
      if (c.tk.length >= 2 && c.tk.every((t) => tokensPasta.has(t))) return { c, match: "tokens" };
    }
    // fuzzy: nome inteiro com distância pequena (typo). Só p/ nomes longos, p/ evitar falso positivo.
    if (n.length >= 10) {
      let best: { c: Colab; d: number } | null = null;
      for (const c of colabs) {
        const cn = norm(c.nome);
        if (Math.abs(cn.length - n.length) > 3) continue;
        const d = lev(cn, n);
        if (d <= 2 && (!best || d < best.d)) best = { c, d };
      }
      if (best) return { c: best.c, match: "fuzzy" };
    }
    return null;
  }

  // Casa pelo NOME DENTRO DO ARQUIVO: extrai tokens de nome e exige >=2 tokens batendo com
  // um único colaborador (sem empate). Marca "arquivo" (sempre p/ revisar).
  function casarArquivo(arquivo: string): { c: Colab; match: string } | null {
    const cand = new Set(tokensNome(arquivo.replace(/\.[a-z0-9]+$/i, "")));
    if (cand.size < 2) return null;
    let top: { c: Colab; n: number } | null = null;
    let empate = false;
    for (const c of colabs) {
      const shared = c.tk.filter((t) => cand.has(t)).length;
      if (shared < 2) continue;
      if (!top || shared > top.n) { top = { c, n: shared }; empate = false; }
      else if (shared === top.n) empate = true;
    }
    if (!top || empate) return null;
    return { c: top.c, match: "arquivo" };
  }

  const linhas: Linha[] = [];
  const mk = (colab: Colab | null, match: string, motivo: string, ctx: any, cls: any, arquivo: string, caminho: string, incluir: boolean): Linha => ({
    incluir, motivo, match: match || "sem",
    colaborador_id: colab?.id ?? "", colaborador_nome: colab?.nome ?? "", status_core: colab?.status ?? "",
    obra: ctx.obra ?? "", status_pasta: ctx.statusPasta ?? "",
    tipo: cls?.tipo ?? "", sensivel: cls ? (cls.sensivel ? "sim" : "nao") : "", arquivo, caminho,
  });

  function walk(dir: string, ctx: { colab: Colab | null; match: string; obra: string; statusPasta: string }) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const nn = norm(e.name);
        const next = { ...ctx };
        if (dir === ROOT) next.obra = e.name;
        if (["ATIVOS", "RESCINDIDOS", "DEMITIDOS", "ESTAGIARIOS"].includes(nn)) next.statusPasta = e.name;
        if (!NAO_FUNCIONARIO.has(nn) && !ctx.colab) {
          const m = casarNome(e.name);
          if (m) { next.colab = m.c; next.match = m.match; }
        }
        walk(full, next);
      } else if (e.isFile()) {
        const cls = classificar(e.name);
        const rel = full.replace(ROOT, ".");
        // colaborador: o da pasta; senão tenta extrair do nome do arquivo.
        let colab = ctx.colab, match = ctx.match;
        if (!colab) { const m = casarArquivo(e.name); if (m) { colab = m.c; match = m.match; } }
        if (!colab) { linhas.push(mk(null, "", "sem-colaborador", ctx, cls, e.name, rel, false)); continue; }
        const noEscopo = colab.status === "ativo";
        const incluir = !!cls && noEscopo;
        const motivo = !cls ? "tipo nao oficial / nao reconhecido" : !noEscopo ? "colaborador nao ativo no Core" : "ok";
        linhas.push(mk(colab, match, motivo, ctx, cls, e.name, rel, incluir));
      }
    }
  }

  walk(ROOT, { colab: null, match: "", obra: "", statusPasta: "" });

  const cols = ["incluir", "motivo", "match", "colaborador_id", "colaborador_nome", "status_core", "obra", "status_pasta", "tipo", "sensivel", "arquivo", "caminho"] as const;
  const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [cols.join(";"), ...linhas.map((l) => cols.map((c) => esc((l as any)[c])).join(";"))].join("\r\n");
  fs.writeFileSync(OUT, "﻿" + csv, "utf8");

  const incl = linhas.filter((l) => l.incluir);
  const porTipo = Object.entries(incl.reduce<Record<string, number>>((a, l) => ((a[l.tipo] = (a[l.tipo] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const porMatch = Object.entries(incl.reduce<Record<string, number>>((a, l) => ((a[l.match] = (a[l.match] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);

  console.log(`\n===== PERFIL (2ª passada) — ${linhas.length} arquivos =====`);
  console.log(`A INCLUIR: ${incl.length}   |   Colaboradores contemplados: ${new Set(incl.map((l) => l.colaborador_id)).size} de ${colabs.length}`);
  console.log(`Sem colaborador: ${linhas.filter((l) => l.motivo === "sem-colaborador").length}   |   Tipo não reconhecido (sob colab): ${linhas.filter((l) => l.colaborador_id && !l.tipo).length}   |   Não-ativo: ${linhas.filter((l) => l.motivo === "colaborador nao ativo no Core").length}`);
  console.log(`\nA INCLUIR por TIPO:`); for (const [t, n] of porTipo) console.log(`  ${t.padEnd(26)} ${n}`);
  console.log(`\nA INCLUIR por MATCH (qualidade do casamento):`); for (const [t, n] of porMatch) console.log(`  ${t.padEnd(10)} ${n}   ${t === "exato" ? "(seguro)" : t === "tokens" || t === "fuzzy" ? "(revisar)" : t === "arquivo" ? "(nome veio do arquivo — revisar)" : ""}`);
  console.log(`\nCSV: ${OUT}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

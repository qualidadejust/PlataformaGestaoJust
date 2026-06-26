// Nome PADRONIZADO do arquivo no GED. Tudo que entra (upload manual e WhatsApp) passa por aqui,
// para os arquivos não virem com nomes aleatórios ("foto.jpg", "documento.pdf"). O nome original
// é preservado em metadados._arquivo_original. Best-effort: nunca derruba o upload.
//
//   Padrão: COLABORADOR_OBRA_CODIGO_AAAAMMDD-HHMM.ext   (partes ausentes são omitidas)
//   Ex.:    SAMUEL-SOARES-BEIENKE_JUST-SEDE_ATESTADO_20260626-0911.pdf
import { prisma } from "./prisma.ts";

const db = prisma as any;

// Sem acento, só A-Z/0-9, espaços/símbolos viram "-", MAIÚSCULO, limitado.
function slug(s: string, max = 40): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, max);
}

function extDe(nome: string): string {
  const m = /\.([a-zA-Z0-9]{1,5})$/.exec(nome ?? "");
  return m ? m[1].toLowerCase() : "bin";
}

function carimbo(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function montarNomeArquivo(input: {
  original: string;
  tipo_codigo?: string | null;
  entidade_tipo: string;
  entidade_id: string;
  entidade_label?: string | null;
}): Promise<string> {
  const partes: string[] = [];
  let label = input.entidade_label ?? "";

  if (input.entidade_tipo === "colaborador") {
    // completa o nome do colaborador (se não veio) e a obra (alocação principal/mais recente)
    if (!label) {
      try {
        const c = await db.colaborador.findUnique({ where: { id: input.entidade_id }, select: { nome: true } });
        label = c?.nome ?? "";
      } catch { /* sem cadastro — segue */ }
    }
    if (label) partes.push(slug(label));
    try {
      const a = await db.alocacao.findFirst({
        where: { colaborador_id: input.entidade_id },
        orderBy: [{ principal: "desc" }, { created_at: "desc" }],
        include: { obra: true },
      });
      if (a?.obra?.nome) partes.push(slug(a.obra.nome, 24));
    } catch { /* sem obra — segue */ }
  } else if (label) {
    partes.push(slug(label));
  }

  if (input.tipo_codigo) partes.push(slug(input.tipo_codigo, 24));
  partes.push(carimbo());

  const base = partes.filter(Boolean).join("_") || "DOCUMENTO";
  return `${base}.${extDe(input.original)}`;
}

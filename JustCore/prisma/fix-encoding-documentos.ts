// Reparo de encoding dos nomes de arquivo do GED já gravados. O multer/busboy decodificava o
// filename do multipart como Latin-1, então nomes com acento ficaram como mojibake
// (ex.: "Certidão" → "CertidÃ£o"). Reinterpreta como UTF-8 quando isso produz texto válido.
// Re-executável e seguro: nomes já corretos não são tocados (guarda pelo char de substituição).
// Uso: npx tsx prisma/fix-encoding-documentos.ts [--dry]
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;
const DRY = process.argv.includes("--dry");

function fixFilename(s: string): string {
  if (!s) return s;
  try {
    const reinterpreted = Buffer.from(s, "latin1").toString("utf8");
    if (reinterpreted.includes("�")) return s; // re-decode quebrou → original já era UTF-8
    return reinterpreted;
  } catch {
    return s;
  }
}

async function main() {
  const docs = await db.documento.findMany({ select: { id: true, nome_original: true } });
  let mudados = 0;
  for (const d of docs) {
    const novo = fixFilename(d.nome_original);
    if (novo !== d.nome_original) {
      mudados++;
      console.log(`  ${d.nome_original}  →  ${novo}`);
      if (!DRY) await db.documento.update({ where: { id: d.id }, data: { nome_original: novo } });
    }
  }
  console.log(`\n${mudados} de ${docs.length} documento(s) ${DRY ? "seriam corrigidos (dry-run)" : "corrigidos"}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));

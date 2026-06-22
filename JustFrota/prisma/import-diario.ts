// Importa o "Diário de Bordo" (CSV exportado da planilha atual) para a tabela viagens.
// Limpa km/datas, casa veículo/obra/motorista com o Core (quando existir) e marca anomalias.
// Uso:  npm run import [caminho-do-csv]   (default: ./DiarioBordo.csv)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/lib/prisma.ts";
import { coreVeiculos, coreObras, coreColaboradores, type CoreRef } from "../server/core.ts";

const db = prisma as any;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? path.resolve(__dirname, "../DiarioBordo.csv");

// --- parser de CSV (lida com aspas e vírgulas dentro de campos) ---
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "",
    row: string[] = [],
    inQ = false;
  text = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const norm = (s?: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const parseKm = (s?: string): number | null => {
  const n = parseInt((s ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

const parseData = (s?: string): string | null => {
  const m = (s ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

const kmRodado = (ini: number | null, fim: number | null): number | null => {
  if (ini == null || fim == null) return null;
  const d = fim - ini;
  return d >= 0 && d <= 2000 ? d : null;
};

function matchByName(list: CoreRef[], nome: string, campos: (keyof CoreRef)[]): CoreRef | null {
  const n = norm(nome);
  if (!n) return null;
  for (const item of list) {
    for (const campo of campos) {
      const v = norm(item[campo] as string);
      if (v && (v === n || v.startsWith(n) || n.startsWith(v))) return item;
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(file)) {
    console.error(`CSV não encontrado: ${file}\nColoque o DiarioBordo.csv na pasta JustFrota/ ou passe o caminho.`);
    process.exit(1);
  }
  const [veiculos, obras, colaboradores] = await Promise.all([coreVeiculos(), coreObras(), coreColaboradores()]);
  const linhas = parseCsv(fs.readFileSync(file, "utf8"));
  const [, ...dados] = linhas; // descarta cabeçalho

  let ok = 0,
    pulados = 0,
    kmInvalido = 0,
    mV = 0,
    mO = 0,
    mM = 0;
  const naoCasados = { veiculos: new Set<string>(), obras: new Set<string>() };

  for (const cols of dados) {
    if (cols.length < 12 || !cols[1]?.trim()) {
      pulados++;
      continue;
    }
    const [, dataRaw, motoristaRaw, veiculoRaw, obraRaw, obs, destino, hIni, kmIni, hFim, kmFim, status, criadoPor] =
      cols;
    const data = parseData(dataRaw);
    if (!data) {
      pulados++;
      continue;
    }
    const km_inicial = parseKm(kmIni);
    const km_final = parseKm(kmFim);
    const km = kmRodado(km_inicial, km_final);
    if (km_inicial != null && km_final != null && km == null) kmInvalido++;

    const v = matchByName(veiculos, veiculoRaw, ["identificacao", "placa", "modelo"]);
    const o = matchByName(obras, obraRaw, ["nome"]);
    const m = matchByName(colaboradores, motoristaRaw, ["nome"]);
    if (v) mV++;
    else if (veiculoRaw?.trim()) naoCasados.veiculos.add(veiculoRaw.trim());
    if (o) mO++;
    else if (obraRaw?.trim()) naoCasados.obras.add(obraRaw.trim());
    if (m) mM++;

    await db.viagem.create({
      data: {
        data,
        veiculo_id: v?.id ?? null,
        veiculo_nome: veiculoRaw?.trim() || null,
        motorista_id: m?.id ?? null,
        motorista_nome: motoristaRaw?.trim().replace(/\s+/g, " ") || null,
        obra_id: o?.id ?? null,
        obra_nome: obraRaw?.trim() || null,
        destino: destino?.trim() || null,
        observacao: obs?.trim() || null,
        hora_inicio: hIni?.trim() || null,
        hora_fim: hFim?.trim() || null,
        km_inicial,
        km_final,
        km_rodado: km,
        status: norm(status) || "finalizada",
        origem: "importacao",
        criado_por: criadoPor?.trim() || null,
      },
    });
    ok++;
  }

  console.log(`\n✅ Importação concluída: ${ok} viagens (${pulados} linhas puladas).`);
  console.log(`   Casados com o Core → veículos: ${mV}, obras: ${mO}, motoristas: ${mM}`);
  console.log(`   Km inconsistente (rodado não calculado): ${kmInvalido}`);
  if (naoCasados.veiculos.size)
    console.log(`   ⚠️ Veículos não cadastrados no Core: ${[...naoCasados.veiculos].join(", ")}`);
  if (naoCasados.obras.size)
    console.log(`   ⚠️ Obras/centros não casados no Core: ${[...naoCasados.obras].join(", ")}`);
  console.log("   (snapshots de nome foram guardados; o rateio agrupa por obra mesmo sem ID)\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

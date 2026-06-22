/**
 * Importa a base de insumos de Segurança do Trabalho (data/insumos-segtrab.csv, UTF-8).
 * Colunas: ID, CodSienge, NomeInsumo, Unidade, DurabilidadeDias, AlertaDias, TipoControleTroca.
 *  - tipo_controle: Prazo→prazo | Inspecao→inspecao | UsoUnico→uso_unico
 *  - validade_dias = DurabilidadeDias · alerta_dias = AlertaDias
 *  - Remove os EPIs de exemplo (categoria epi sem cod_sienge) antes de importar.
 *  - Upsert por (cod_sienge, nome) — CodSienge se repete entre variantes do mesmo material.
 * Reexecutável e idempotente.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/lib/prisma.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.resolve(__dirname, "../data/insumos-segtrab.csv");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const TIPO: Record<string, string> = { prazo: "prazo", inspecao: "inspecao", usounico: "uso_unico" };
const normTipo = (s: string) =>
  TIPO[s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "")] ?? "prazo";
const toInt = (s: string) => {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

async function main() {
  const raw = readFileSync(CSV, "utf-8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const cI = idx("CodSienge"), nI = idx("NomeInsumo"), uI = idx("Unidade"),
    dI = idx("DurabilidadeDias"), aI = idx("AlertaDias"), tI = idx("TipoControleTroca");

  // Remove os EPIs de exemplo (seed) — categoria epi sem cod_sienge.
  const removidos = await prisma.insumo.deleteMany({ where: { categoria: "epi", cod_sienge: null } });

  let criados = 0, atualizados = 0;
  const porTipo: Record<string, number> = {};
  for (const line of lines.slice(1)) {
    const f = parseCsvLine(line);
    const nome = (f[nI] ?? "").trim();
    if (!nome) continue;
    const cod_sienge = (f[cI] ?? "").replace(/\./g, "").trim() || null;
    const unidade = ((f[uI] ?? "un").trim() || "un").toLowerCase();
    const validade_dias = toInt(f[dI] ?? "");
    const alerta_dias = toInt(f[aI] ?? "");
    const tipo_controle = normTipo(f[tI] ?? "");
    porTipo[tipo_controle] = (porTipo[tipo_controle] ?? 0) + 1;

    // Por padrão, só os de controle por inspeção já vêm marcados como inspecionáveis.
    const inspecionavel = tipo_controle === "inspecao";
    const dados = { nome, unidade, cod_sienge, validade_dias, alerta_dias, tipo_controle, inspecionavel, categoria: "epi" };
    const existente = await prisma.insumo.findFirst({ where: { nome, cod_sienge } });
    if (existente) {
      await prisma.insumo.update({ where: { id: existente.id }, data: dados });
      atualizados++;
    } else {
      await prisma.insumo.create({ data: dados });
      criados++;
    }
  }

  console.log(`Exemplos removidos: ${removidos.count}`);
  console.log(`Insumos: ${criados} criados, ${atualizados} atualizados.`);
  console.log("Por tipo de controle:", porTipo);
  const total = await prisma.insumo.count({ where: { categoria: "epi" } });
  console.log(`Total de EPIs no Core: ${total}`);
}

main().finally(() => prisma.$disconnect());

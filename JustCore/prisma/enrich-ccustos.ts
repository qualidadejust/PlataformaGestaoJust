/**
 * Enriquece o Core com o cadastro de centros de custo (data/ccustos.csv, UTF-8):
 *  - Corrige as EMPRESAS com a razão social legal + CNPJ (várias obras → mesma empresa).
 *  - Cadastra/atualiza as OBRAS (centro de custo = CodCCusto), ligando à empresa.
 *  - Mescla cargos duplicados (mantém 1 "Servente" e 1 "Mestre de Obras").
 * Reexecutável e idempotente.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/lib/prisma.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.resolve(__dirname, "../data/ccustos.csv");

const norm = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const FANTASIA_POR_CNPJ: Record<string, string> = {
  "39.483.735/0002-30": "Neo House",
  "47.057.671/0001-52": "Blank Residence",
  "75.578.872/0001-30": "JUST Construções",
  "55.276.048/0001-19": "Matera Empreendimentos",
};

async function main() {
  // -------- ler ccustos (UTF-8, remove BOM) --------
  const raw = readFileSync(CSV, "utf8").replace(/^﻿/, "");
  const rows = raw
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .slice(1)
    .map((l) => {
      const c = parseCsvLine(l);
      return {
        cod: (c[1] || "").trim(),
        nome: (c[2] || "").trim(),
        razao: (c[3] || "").trim(),
        cnpj: (c[4] || "").trim(),
        endereco: (c[5] || "").trim(),
      };
    })
    .filter((r) => r.cod && r.nome);

  // -------- empresas por CNPJ --------
  const empresasCsv = new Map<string, { razao: string; cnpj: string }>();
  for (const r of rows) if (r.cnpj) empresasCsv.set(r.cnpj, { razao: r.razao, cnpj: r.cnpj });

  const empresaIdPorCnpj = new Map<string, string>();
  const empresasCore = await prisma.empresa.findMany();
  // mapa: razão social atual (que hoje é o NomeCCusto) -> empresa Core
  const coreByNome = new Map(empresasCore.map((e) => [norm(e.razao_social), e]));

  for (const [cnpj, info] of empresasCsv) {
    // tenta achar uma empresa Core cujo nome atual corresponda a algum NomeCCusto desse CNPJ
    const nomesDoCnpj = rows.filter((r) => r.cnpj === cnpj).map((r) => norm(r.nome));
    const existente = empresasCore.find((e) => nomesDoCnpj.includes(norm(e.razao_social)));
    if (existente) {
      const upd = await prisma.empresa.update({
        where: { id: existente.id },
        data: { razao_social: info.razao, cnpj, nome_fantasia: FANTASIA_POR_CNPJ[cnpj] ?? existente.nome_fantasia },
      });
      empresaIdPorCnpj.set(cnpj, upd.id);
    } else {
      const created = await prisma.empresa.create({
        data: { razao_social: info.razao, cnpj, nome_fantasia: FANTASIA_POR_CNPJ[cnpj] ?? null },
      });
      empresaIdPorCnpj.set(cnpj, created.id);
    }
  }

  // -------- obras / centros de custo --------
  const obrasCore = await prisma.obra.findMany();
  // match por cost_center atual (que hoje guarda o NomeCCusto) ou pelo nome da obra
  function acharObra(nomeCC: string) {
    const n = norm(nomeCC);
    return obrasCore.find((o) => norm(o.cost_center || "") === n || norm(o.nome) === n);
  }

  let obrasAtualizadas = 0;
  let obrasNovas = 0;
  for (const r of rows) {
    const empresaId = r.cnpj ? empresaIdPorCnpj.get(r.cnpj) : null;
    const existente = acharObra(r.nome);
    if (existente) {
      await prisma.obra.update({
        where: { id: existente.id },
        data: {
          cost_center: r.cod,
          empresa: empresaId ? { connect: { id: empresaId } } : undefined,
          endereco: r.endereco || existente.endereco,
        },
      });
      obrasAtualizadas++;
    } else {
      await prisma.obra.create({
        data: {
          nome: r.nome,
          cost_center: r.cod,
          tipo: "obra",
          empresa: empresaId ? { connect: { id: empresaId } } : undefined,
          endereco: r.endereco || null,
        },
      });
      obrasNovas++;
    }
  }

  // -------- merge de cargos duplicados --------
  const merges = [
    { from: "Servente", to: "Servente de Obras" },
    { from: "Mestre de Obra", to: "Mestre de Obras" },
  ];
  let cargosMesclados = 0;
  const cargos = await prisma.cargo.findMany();
  for (const m of merges) {
    const from = cargos.find((c) => norm(c.nome) === norm(m.from));
    const to = cargos.find((c) => norm(c.nome) === norm(m.to));
    if (from && to && from.id !== to.id) {
      await prisma.colaborador.updateMany({ where: { cargo_id: from.id }, data: { cargo_id: to.id } });
      await prisma.cargo.delete({ where: { id: from.id } });
      cargosMesclados++;
    }
  }

  // -------- relatório --------
  console.log("=== Enriquecimento concluído ===");
  console.log(`Empresas (total):   ${await prisma.empresa.count()}`);
  for (const e of await prisma.empresa.findMany({ orderBy: { razao_social: "asc" } }))
    console.log(`   • ${e.razao_social}  [${e.cnpj ?? "sem CNPJ"}]`);
  console.log(`Obras: ${obrasAtualizadas} atualizadas + ${obrasNovas} novas = ${await prisma.obra.count()} no total`);
  console.log(`Cargos mesclados: ${cargosMesclados}  → cargos agora: ${await prisma.cargo.count()}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

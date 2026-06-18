/**
 * Consolida os dados-mestre no JustCore a partir de DUAS fontes:
 *  1) JustEleva (prisma/dev.db) — base estrutural: obras, alocações, papéis e
 *     os IDs dos colaboradores (preservados, para não quebrar as avaliações).
 *  2) Planilha de ativos (data/ativos.csv, Latin-1) — enriquece com CPF, PIS,
 *     nascimento, admissão, empresa/filial, endereço e situação.
 *
 * Casamento JustEleva ↔ planilha por nome normalizado. Pessoas da planilha sem
 * correspondência viram novos colaboradores. Reexecutável (reseta e recarrega).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { prisma } from "../server/lib/prisma.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JL_DB = path.resolve(__dirname, "../../JustEleva/app/prisma/dev.db");
const CSV = path.resolve(__dirname, "../data/ativos.csv");

// ---------- helpers ----------
const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normName = (s: string) => stripAccents(String(s || "").toUpperCase()).replace(/\s+/g, " ").trim();

function normCpf(raw: string): string | null {
  if (!raw || /e\+/i.test(raw)) return null; // descarta notação científica corrompida
  const d = raw.replace(/\D/g, "");
  if (d.length < 9 || d.length > 11) return null;
  return d.padStart(11, "0");
}

function convDate(raw: string): string | null {
  const m = String(raw || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const rel = (id?: string | null) => (id ? { connect: { id } } : undefined);

const clean = (s: string) => {
  const t = String(s ?? "").trim();
  return t === "" ? null : t;
};
const cleanPis = (s: string) => {
  const t = clean(s);
  return t && t !== "000.00000.00.0" ? t : null;
};

function mapStatus(situacao: string): string {
  return /trabalhando/i.test(situacao) ? "ativo" : "afastado";
}

function nivelDeCargo(nome: string): string {
  const n = normName(nome);
  if (/DIRETOR|SOCIO/.test(n)) return "diretoria";
  if (/ENGENHEIRO|SUPERVISOR|MESTRE/.test(n)) return "lideranca";
  if (/ANALISTA|ASSIST|AUXILIAR|ESTAGIARIO|APRENDIZ|COMPRADOR|MOTORISTA|ZELADOR|FINANCEIRO|ADMINISTRATIVO|RH/.test(n))
    return "administrativo";
  if (/ELETRICISTA|SERRALHEIR|AZULEJISTA|CARPINTEIR|OPERADOR|ARMADOR|OPE\.|OFICIAL/.test(n)) return "tecnico";
  return "operacional";
}

function papelDeCargo(nome: string): string {
  const n = normName(nome);
  if (/MESTRE/.test(n)) return "mestre";
  if (/ENGENHEIRO|SUPERVISOR|RESIDENTE/.test(n)) return "residente";
  if (/ANALISTA|ASSIST|AUXILIAR|ESTAGIARIO|APRENDIZ|COMPRADOR|MOTORISTA|ZELADOR|FINANCEIRO|ADMINISTRATIVO|RH|SOCIO/.test(n))
    return "administrativo";
  return "mao_de_obra";
}

const FANTASIA: Record<string, string> = {
  "BLANK RESIDENCE BY JUST": "Blank Residence",
  "JUST CONST E EMP - GFIP 150": "JUST Construções",
  "MATERA EMPREEND. IMOBILIARIOS SPE LTDA.": "Matera Empreendimentos",
};

async function main() {
  // -------- ler JustEleva --------
  const jl = new Database(JL_DB, { readonly: true });
  const jlEmployees = jl.prepare("SELECT * FROM employees").all() as any[];
  const jlObras = jl.prepare("SELECT * FROM obras").all() as any[];
  const jlAloc = jl.prepare("SELECT * FROM alocacoes").all() as any[];
  jl.close();

  // -------- ler planilha (Latin-1) --------
  const linhas = readFileSync(CSV, "latin1").split(/\r?\n/).filter((l) => l.trim() !== "");
  const csv = linhas.slice(1).map((l) => {
    const c = l.split(";");
    return {
      filial: clean(c[0]) ?? "",
      nome: clean(c[1]) ?? "",
      cpf: c[2] ?? "",
      departamento: clean(c[3]),
      cargo: clean(c[4]) ?? "Não informado",
      situacao: clean(c[5]) ?? "",
      admissao: c[6] ?? "",
      pis: c[7] ?? "",
      sexo: clean(c[8]),
      nascimento: c[9] ?? "",
      estado_civil: clean(c[10]),
      endereco: clean(c[11]),
      numero: clean(c[12]),
      cep: clean(c[13]),
      rg: clean(c[14]),
      emissor: clean(c[15]),
      rg_uf: clean(c[16]),
    };
  });
  const csvByName = new Map<string, (typeof csv)[number]>();
  for (const r of csv) if (!csvByName.has(normName(r.nome))) csvByName.set(normName(r.nome), r);

  // -------- reset Core (mantém insumos/fornecedores) --------
  await prisma.alocacao.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.obra.deleteMany();
  await prisma.cargo.deleteMany();
  await prisma.empresa.deleteMany();

  // -------- empresas (filiais da planilha) --------
  const empresaIdByFilial = new Map<string, string>();
  for (const filial of new Set(csv.map((r) => r.filial))) {
    const e = await prisma.empresa.create({
      data: { razao_social: filial, nome_fantasia: FANTASIA[filial] ?? null },
    });
    empresaIdByFilial.set(normName(filial), e.id);
  }
  const empresaJust = [...empresaIdByFilial.entries()].find(([k]) => k.includes("JUST CONST"))?.[1] ?? null;

  // -------- cargos (get-or-create por nome) --------
  const cargoCache = new Map<string, string>();
  async function getCargo(nome: string): Promise<string> {
    const key = normName(nome);
    if (cargoCache.has(key)) return cargoCache.get(key)!;
    const c = await prisma.cargo.create({ data: { nome, nivel: nivelDeCargo(nome) } });
    cargoCache.set(key, c.id);
    return c.id;
  }

  // -------- obras (preserva IDs do JustEleva, liga à empresa pela filial) --------
  const obraIdByNome = new Map<string, string>();
  for (const o of jlObras) {
    const empresaId = o.cost_center
      ? empresaIdByFilial.get(normName(o.cost_center)) ?? empresaJust
      : empresaJust;
    await prisma.obra.create({
      data: {
        id: o.id,
        nome: o.nome,
        cost_center: o.cost_center,
        tipo: o.tipo ?? "obra",
        status: o.status ?? "ativa",
        empresa: rel(empresaId),
      },
    });
    obraIdByNome.set(normName(o.nome), o.id);
  }
  // resolve a obra de um colaborador da planilha pela filial/departamento
  function resolveObraId(filial: string, dept: string | null): string | null {
    const f = normName(filial);
    if (f.includes("BLANK")) return obraIdByNome.get(normName("Blank Residence")) ?? null;
    if (f.includes("MATERA")) return obraIdByNome.get(normName("Matera")) ?? null;
    // JUST CONST
    if (dept && /justfix/i.test(dept)) {
      if (/marmoraria/i.test(dept)) return obraIdByNome.get(normName("Marmoraria")) ?? null;
      return obraIdByNome.get(normName("Manutenção")) ?? null;
    }
    return obraIdByNome.get(normName("JUST · Sede / Administrativo")) ?? null;
  }

  // -------- colaboradores: todos do JustEleva (id preservado) + enriquecimento --------
  let enriquecidos = 0;
  const consumidos = new Set<string>();
  for (const emp of jlEmployees) {
    const match = csvByName.get(normName(emp.name));
    if (match) {
      enriquecidos++;
      consumidos.add(normName(match.nome));
    }
    await prisma.colaborador.create({
      data: {
        id: emp.id,
        nome: emp.name,
        cargo: rel(await getCargo(emp.role || match?.cargo || "Não informado")),
        setor: emp.department ?? match?.departamento ?? null,
        is_lideranca: !!emp.is_manager,
        empresa: rel(match ? empresaIdByFilial.get(normName(match.filial)) ?? null : null),
        status: match ? mapStatus(match.situacao) : "ativo",
        data_admissao: match ? convDate(match.admissao) ?? emp.admission_date : emp.admission_date,
        email: emp.email ?? null,
        cpf: match ? normCpf(match.cpf) : null,
        pis: match ? cleanPis(match.pis) : null,
        sexo: match?.sexo ?? null,
        data_nascimento: match ? convDate(match.nascimento) : null,
        estado_civil: match?.estado_civil ?? null,
        endereco: match?.endereco ?? null,
        numero: match?.numero ?? null,
        cep: match?.cep ?? null,
        rg: match?.rg ?? null,
        rg_emissor: match?.emissor ?? null,
        rg_uf: match?.rg_uf ?? null,
        situacao: match?.situacao ?? null,
      },
    });
  }

  // -------- alocações do JustEleva (1:1, ids preservados) --------
  for (const a of jlAloc) {
    await prisma.alocacao.create({
      data: {
        colaborador: rel(a.employee_id),
        obra: rel(a.obra_id),
        papel_na_obra: a.papel_na_obra ?? "mao_de_obra",
        principal: !!a.principal,
        responsavel: !!a.responsavel,
        data_inicio: a.data_inicio ?? null,
        data_fim: a.data_fim ?? null,
      },
    });
  }

  // -------- colaboradores SÓ da planilha (novos) --------
  let novos = 0;
  for (const r of csv) {
    if (consumidos.has(normName(r.nome))) continue;
    novos++;
    const colab = await prisma.colaborador.create({
      data: {
        nome: r.nome,
        cargo: rel(await getCargo(r.cargo)),
        setor: r.departamento,
        empresa: rel(empresaIdByFilial.get(normName(r.filial)) ?? null),
        is_lideranca: ["mestre", "residente"].includes(papelDeCargo(r.cargo)),
        status: mapStatus(r.situacao),
        data_admissao: convDate(r.admissao),
        cpf: normCpf(r.cpf),
        pis: cleanPis(r.pis),
        sexo: r.sexo,
        data_nascimento: convDate(r.nascimento),
        estado_civil: r.estado_civil,
        endereco: r.endereco,
        numero: r.numero,
        cep: r.cep,
        rg: r.rg,
        rg_emissor: r.emissor,
        rg_uf: r.rg_uf,
        situacao: r.situacao,
      },
    });
    const obraId = resolveObraId(r.filial, r.departamento);
    if (obraId) {
      await prisma.alocacao.create({
        data: {
          colaborador: rel(colab.id),
          obra: rel(obraId),
          papel_na_obra: papelDeCargo(r.cargo),
          principal: true,
        },
      });
    }
  }

  // -------- relatório --------
  const semMatch = jlEmployees.filter((e) => !csvByName.get(normName(e.name))).length;
  console.log("=== Consolidação concluída ===");
  console.log(`Empresas:        ${await prisma.empresa.count()}`);
  console.log(`Cargos:          ${await prisma.cargo.count()}`);
  console.log(`Obras:           ${await prisma.obra.count()}`);
  console.log(`Colaboradores:   ${await prisma.colaborador.count()}`);
  console.log(`  • do JustEleva:           ${jlEmployees.length}`);
  console.log(`  • enriquecidos c/ planilha: ${enriquecidos}`);
  console.log(`  • só no JustEleva (s/ planilha): ${semMatch}  ← provável inativo, revisar`);
  console.log(`  • novos só da planilha:     ${novos}`);
  console.log(`Alocações:       ${await prisma.alocacao.count()}`);
  console.log(`Linhas na planilha: ${csv.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

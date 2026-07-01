import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.ts";

const app = express();
app.use(cors());
app.use(express.json());

const db = prisma as any;

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "just-frota" }));

// ---- Viagens (diário de bordo) ----
app.get("/api/viagens", async (req, res) => {
  try {
    const { veiculo_id, obra_id, motorista_id, inicio, fim } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (veiculo_id) where.veiculo_id = veiculo_id;
    if (obra_id) where.obra_id = obra_id;
    if (motorista_id) where.motorista_id = motorista_id;
    if (inicio || fim) where.data = { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) };
    res.json(await db.viagem.findMany({ where, orderBy: [{ data: "desc" }, { hora_inicio: "desc" }] }));
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

app.get("/api/viagens/:id", async (req, res) => {
  const row = await db.viagem.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: "não encontrada" });
  res.json(row);
});

// Calcula km_rodado quando km_final >= km_inicial e o salto é plausível (< 2000 km).
function kmRodado(ini?: number | null, fim?: number | null): number | null {
  if (ini == null || fim == null) return null;
  const d = fim - ini;
  return d >= 0 && d <= 2000 ? d : null;
}

app.post("/api/viagens", async (req, res) => {
  try {
    const b = req.body ?? {};
    const data = await db.viagem.create({
      data: { ...b, km_rodado: b.km_rodado ?? kmRodado(b.km_inicial, b.km_final) },
    });
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.put("/api/viagens/:id", async (req, res) => {
  try {
    const { id, created_at, updated_at, ...b } = req.body ?? {};
    const data = await db.viagem.update({
      where: { id: req.params.id },
      data: { ...b, km_rodado: b.km_rodado ?? kmRodado(b.km_inicial, b.km_final) },
    });
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.delete("/api/viagens/:id", async (req, res) => {
  try {
    await db.viagem.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---- CRUD genérico (custos) ----
function crud(path: string, model: string) {
  app.get(`/api/${path}`, async (req, res) => {
    try {
      const { veiculo_id } = req.query as Record<string, string | undefined>;
      const where = veiculo_id ? { veiculo_id } : {};
      res.json(await db[model].findMany({ where, orderBy: { created_at: "desc" } }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });
  app.post(`/api/${path}`, async (req, res) => {
    try {
      res.status(201).json(await db[model].create({ data: req.body ?? {} }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
  app.put(`/api/${path}/:id`, async (req, res) => {
    try {
      const { id, created_at, updated_at, ...data } = req.body ?? {};
      res.json(await db[model].update({ where: { id: req.params.id }, data }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try {
      await db[model].delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}
crud("abastecimentos", "abastecimento");
crud("manutencoes", "manutencao");
crud("custos-fixos", "custoFixo");

// ---- Integração com o Core (cadastros-mestre) ----
const CORE_URL = process.env.CORE_URL ?? "http://localhost:4100";
async function core<T = any>(path: string): Promise<T> {
  const r = await fetch(CORE_URL + path, { headers: { "x-internal-token": process.env.INTERNAL_TOKEN ?? "" } });
  if (!r.ok) throw new Error(`Core ${path}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

// nº de meses (inclusive) entre dois ISO YYYY-MM-DD; 1 se faltar algum.
function mesesEntre(inicio?: string, fim?: string): number {
  if (!inicio || !fim) return 1;
  const [ay, am] = inicio.slice(0, 7).split("-").map(Number);
  const [by, bm] = fim.slice(0, 7).split("-").map(Number);
  return Math.max(1, (by - ay) * 12 + (bm - am) + 1);
}

const DESCR_DEPREC_AUTO = "Depreciação automática (patrimônio do Core)";

// ---- (1) Depreciação automática ----
// POST /api/depreciacao/gerar?competencia=YYYY-MM[&veiculo_id=]
// Lê o patrimônio do Core e (re)gera o CustoFixo tipo 'depreciacao' do mês:
//   parcela_mensal = (valor_aquisicao - valor_residual) / (vida_util_anos × 12)
// Só para veículos com valor_aquisicao e vida_util_anos > 0 (não fabrica custo).
app.post("/api/depreciacao/gerar", async (req, res) => {
  try {
    const competencia = (req.query.competencia as string) || (req.body?.competencia as string);
    const filtroVeiculo = (req.query.veiculo_id as string) || undefined;
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia))
      return res.status(400).json({ error: "informe competencia=YYYY-MM" });

    const veiculos = await core<any[]>("/api/veiculos");
    const alvo = filtroVeiculo ? veiculos.filter((v) => v.id === filtroVeiculo) : veiculos;

    const gerados: any[] = [];
    const pulados: { veiculo: string; motivo: string }[] = [];
    for (const v of alvo) {
      const nome = v.identificacao ?? v.placa ?? v.id;
      const aquis = Number(v.valor_aquisicao) || 0;
      const anos = Number(v.vida_util_anos) || 0;
      if (aquis <= 0 || anos <= 0) {
        pulados.push({ veiculo: nome, motivo: "sem valor_aquisicao/vida_util_anos no Core" });
        continue;
      }
      const residual = Number(v.valor_residual) || 0;
      const valor = +(((aquis - residual) / (anos * 12))).toFixed(2);
      // idempotente: remove a depreciação automática anterior do mês e recria
      await db.custoFixo.deleteMany({
        where: { competencia, veiculo_id: v.id, tipo: "depreciacao", descricao: DESCR_DEPREC_AUTO },
      });
      const row = await db.custoFixo.create({
        data: { competencia, veiculo_id: v.id, veiculo_nome: nome, tipo: "depreciacao", descricao: DESCR_DEPREC_AUTO, valor },
      });
      gerados.push({ veiculo: nome, valor: row.valor });
    }
    res.json({ competencia, gerados, pulados });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ---- (2) Custo por veículo (dashboard) ----
// GET /api/custos/por-veiculo?inicio=&fim=
// Custo total de cada veículo no período = combustível + manutenção + fixos (inclui depreciação)
// + motorista. O custo do motorista vem do CustoCargo do Core (custo_mensal × meses), rateado
// pela fração de km que cada motorista rodou NAQUELE veículo sobre o total que ele rodou no período.
app.get("/api/custos/por-veiculo", async (req, res) => {
  try {
    const { inicio, fim } = req.query as Record<string, string | undefined>;
    const dw = inicio || fim ? { data: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) } } : {};
    const cw =
      inicio || fim
        ? { competencia: { ...(inicio ? { gte: inicio.slice(0, 7) } : {}), ...(fim ? { lte: fim.slice(0, 7) } : {}) } }
        : {};
    const meses = mesesEntre(inicio, fim);

    const [viagens, abastecimentos, manutencoes, custosFixos, veiculos, colaboradores, custosCargo] = await Promise.all([
      db.viagem.findMany({ where: { km_rodado: { not: null }, ...dw } }),
      db.abastecimento.findMany({ where: dw }),
      db.manutencao.findMany({ where: dw }),
      db.custoFixo.findMany({ where: cw }),
      core<any[]>("/api/veiculos"),
      core<any[]>("/api/colaboradores"),
      core<any[]>("/api/custos-cargo"),
    ]);

    // mapa colaborador -> cargo (nome)
    const cargoDoColab = new Map<string, string | undefined>(colaboradores.map((c) => [c.id, c.cargo?.nome]));
    // mapa cargo -> custo_mensal: vigência mais recente com competência <= fim;
    // se nenhuma for <= fim, usa a competência mais antiga disponível.
    const fimMes = (fim ?? "9999-99").slice(0, 7);
    const escolhidoPorCargo = new Map<string, { competencia: string; custo_mensal: number }>();
    for (const cc of custosCargo) {
      const atual = escolhidoPorCargo.get(cc.cargo);
      if (!atual) {
        escolhidoPorCargo.set(cc.cargo, cc);
        continue;
      }
      const ccElegivel = cc.competencia <= fimMes;
      const atualElegivel = atual.competencia <= fimMes;
      // preferir elegível; entre dois elegíveis a maior competência; entre dois não-elegíveis a menor
      const melhor =
        ccElegivel && atualElegivel
          ? cc.competencia > atual.competencia
          : ccElegivel && !atualElegivel
            ? true
            : !ccElegivel && atualElegivel
              ? false
              : cc.competencia < atual.competencia;
      if (melhor) escolhidoPorCargo.set(cc.cargo, cc);
    }
    const custoMensalPorCargo = new Map<string, number>(
      [...escolhidoPorCargo].map(([cargo, x]) => [cargo, x.custo_mensal]),
    );
    const custoMensalMotorista = (motoristaId?: string | null): number => {
      if (!motoristaId) return 0;
      const cargo = cargoDoColab.get(motoristaId);
      return cargo ? custoMensalPorCargo.get(cargo) ?? 0 : 0;
    };

    // km por motorista (total no período) e por (motorista, veículo)
    const kmMotorista = new Map<string, number>();
    const kmMotoristaVeiculo = new Map<string, number>(); // chave `${mot}|${veic}`
    for (const v of viagens) {
      if (!v.motorista_id) continue;
      const km = v.km_rodado ?? 0;
      kmMotorista.set(v.motorista_id, (kmMotorista.get(v.motorista_id) ?? 0) + km);
      if (v.veiculo_id) {
        const k = `${v.motorista_id}|${v.veiculo_id}`;
        kmMotoristaVeiculo.set(k, (kmMotoristaVeiculo.get(k) ?? 0) + km);
      }
    }

    const sumBy = (arr: any[], veicId: string, extra?: (x: any) => boolean) =>
      arr.filter((x) => x.veiculo_id === veicId && (!extra || extra(x))).reduce((s, x) => s + (x.valor || 0), 0);

    const linhas = veiculos.map((veic) => {
      const id = veic.id;
      const vgs = viagens.filter((v: any) => v.veiculo_id === id);
      const km = vgs.reduce((s: number, v: any) => s + (v.km_rodado ?? 0), 0);
      const combustivel = sumBy(abastecimentos, id);
      const manutencao = sumBy(manutencoes, id);
      const depreciacao = sumBy(custosFixos, id, (x: any) => x.tipo === "depreciacao");
      const outros_fixos = sumBy(custosFixos, id, (x: any) => x.tipo !== "depreciacao");

      // motorista: rateia o custo mensal de cada motorista pela fração de km nesse veículo
      let motorista = 0;
      for (const [motId, kmTotalMot] of kmMotorista) {
        if (kmTotalMot <= 0) continue;
        const kmAqui = kmMotoristaVeiculo.get(`${motId}|${id}`) ?? 0;
        if (kmAqui <= 0) continue;
        motorista += custoMensalMotorista(motId) * meses * (kmAqui / kmTotalMot);
      }
      motorista = +motorista.toFixed(2);

      const custo_total = +(combustivel + manutencao + depreciacao + outros_fixos + motorista).toFixed(2);
      return {
        veiculo_id: id,
        veiculo_nome: veic.identificacao ?? veic.placa ?? id,
        placa: veic.placa ?? null,
        modelo: veic.modelo ?? null,
        status: veic.status ?? null,
        km,
        viagens: vgs.length,
        combustivel: +combustivel.toFixed(2),
        manutencao: +manutencao.toFixed(2),
        depreciacao: +depreciacao.toFixed(2),
        outros_fixos: +outros_fixos.toFixed(2),
        motorista,
        custo_total,
        custo_km: km > 0 ? +(custo_total / km).toFixed(2) : null,
      };
    });
    // só veículos com algum movimento/custo no período
    const comMovimento = linhas.filter((l) => l.km > 0 || l.custo_total > 0).sort((a, b) => b.custo_total - a.custo_total);

    const acc = (k: keyof (typeof linhas)[number]) => comMovimento.reduce((s, l) => s + (Number(l[k]) || 0), 0);
    const totalKm = acc("km");
    const totalCusto = acc("custo_total");
    res.json({
      periodo: { inicio: inicio ?? null, fim: fim ?? null, meses },
      veiculos: comMovimento,
      totais: {
        km: totalKm,
        combustivel: +acc("combustivel").toFixed(2),
        manutencao: +acc("manutencao").toFixed(2),
        depreciacao: +acc("depreciacao").toFixed(2),
        outros_fixos: +acc("outros_fixos").toFixed(2),
        motorista: +acc("motorista").toFixed(2),
        custo_total: +totalCusto.toFixed(2),
        custo_km: totalKm > 0 ? +(totalCusto / totalKm).toFixed(2) : null,
      },
      memoria:
        "custo_total = combustível + manutenção + depreciação + outros fixos + motorista. " +
        "motorista = Σ(custo_mensal_cargo × meses × km_no_veículo / km_total_do_motorista).",
    });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// Soma os custos do período (combustível + manutenção por data; custo fixo por competência).
async function custosDoPeriodo(inicio?: string, fim?: string, veiculo_id?: string) {
  const vw = veiculo_id ? { veiculo_id } : {};
  const dw = inicio || fim ? { data: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) } } : {};
  const cw =
    inicio || fim
      ? { competencia: { ...(inicio ? { gte: inicio.slice(0, 7) } : {}), ...(fim ? { lte: fim.slice(0, 7) } : {}) } }
      : {};
  const [ab, mn, cf] = await Promise.all([
    db.abastecimento.findMany({ where: { ...vw, ...dw } }),
    db.manutencao.findMany({ where: { ...vw, ...dw } }),
    db.custoFixo.findMany({ where: { ...vw, ...cw } }),
  ]);
  const sum = (arr: any[]) => arr.reduce((s, x) => s + (x.valor || 0), 0);
  const combustivel = sum(ab),
    manutencao = sum(mn),
    fixo = sum(cf);
  return { combustivel, manutencao, fixo, total: combustivel + manutencao + fixo };
}

app.get("/api/custos/resumo", async (req, res) => {
  try {
    const { inicio, fim, veiculo_id } = req.query as Record<string, string | undefined>;
    res.json(await custosDoPeriodo(inicio, fim, veiculo_id));
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ---- Rateio (por KM rodado) ----
// GET /api/rateio?inicio=&fim=&veiculo_id=&custo=
// Distribui o custo do(s) veículo(s) entre as obras na proporção do km rodado no período.
// Sem `custo`, devolve só a base (km e %); com `custo`, devolve o valor alocado por obra.
app.get("/api/rateio", async (req, res) => {
  try {
    const { inicio, fim, veiculo_id, motorista_id, custo } = req.query as Record<string, string | undefined>;
    const where: any = { km_rodado: { not: null } };
    if (veiculo_id) where.veiculo_id = veiculo_id;
    if (motorista_id) where.motorista_id = motorista_id;
    if (inicio || fim) where.data = { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) };

    const viagens = await db.viagem.findMany({ where });
    const porObra = new Map<string, { obra: string; obra_id: string | null; km: number; viagens: number }>();
    let totalKm = 0;
    for (const v of viagens) {
      const chave = v.obra_id ?? v.obra_nome ?? "(sem obra)";
      const cur = porObra.get(chave) ?? { obra: v.obra_nome ?? "(sem obra)", obra_id: v.obra_id ?? null, km: 0, viagens: 0 };
      cur.km += v.km_rodado ?? 0;
      cur.viagens += 1;
      porObra.set(chave, cur);
      totalKm += v.km_rodado ?? 0;
    }

    // Custo a ratear: usa o valor manual (?custo=) se vier; senão soma os custos reais do período.
    const custos = await custosDoPeriodo(inicio, fim, veiculo_id);
    const custoManual = custo != null && custo !== "" ? Number(custo) : null;
    const custoTotal = custoManual ?? custos.total;
    const obras = [...porObra.values()]
      .map((o) => ({
        ...o,
        pct: totalKm ? +((o.km / totalKm) * 100).toFixed(2) : 0,
        custo_alocado: totalKm ? +((custoTotal * o.km) / totalKm).toFixed(2) : null,
      }))
      .sort((a, b) => b.km - a.km);

    res.json({
      base: "km_rodado",
      periodo: { inicio: inicio ?? null, fim: fim ?? null },
      veiculo_id: veiculo_id ?? null,
      motorista_id: motorista_id ?? null,
      total_km: totalKm,
      total_viagens: viagens.length,
      custo_total: custoTotal,
      custo_origem: custoManual != null ? "manual" : "custos_lancados",
      custos: custoManual != null ? { manual: custoTotal } : custos,
      obras,
      memoria: "custo_alocado(obra) = custo_total × km(obra) / km_total",
    });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

const PORT = Number(process.env.PORT ?? 4300);
app.listen(PORT, () => console.log(`JustFrota (frota) rodando em http://localhost:${PORT}`));

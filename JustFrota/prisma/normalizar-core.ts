// Normaliza as viagens contra os cadastros do Core: grava veiculo_id/obra_id/motorista_id e
// o NOME canônico do Core (snapshot). Regra especial: variantes "Michel*" = Michelangelo.
// Não mexe em km/datas. Re-executável. Uso: npx tsx prisma/normalizar-core.ts
import { prisma } from "../server/lib/prisma.ts";
import { coreVeiculos, coreObras, coreColaboradores } from "../server/core.ts";

const db = prisma as any;
const norm = (s?: string | null) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// match: exato primeiro, depois por prefixo (qualquer um dos campos)
function match(list: any[], nome: string | null | undefined, campos: string[]) {
  const n = norm(nome);
  if (!n) return null;
  for (const it of list) for (const c of campos) if (norm(it[c]) === n) return it;
  for (const it of list)
    for (const c of campos) {
      const v = norm(it[c]);
      if (v && (v.startsWith(n) || n.startsWith(v))) return it;
    }
  return null;
}

async function main() {
  const [veiculos, obras, colaboradores] = await Promise.all([coreVeiculos(), coreObras(), coreColaboradores()]);
  const michelangelo = colaboradores.find((c: any) => norm(c.nome).startsWith("michelangelo"));
  const viagens = await db.viagem.findMany();

  let nV = 0,
    nM = 0,
    nO = 0;
  const semObra = new Set<string>();
  for (const vg of viagens) {
    const data: any = {};

    const v = match(veiculos, vg.veiculo_nome, ["identificacao", "placa", "modelo"]);
    if (v) {
      const nome = v.identificacao ?? v.placa ?? null;
      if (vg.veiculo_id !== v.id || vg.veiculo_nome !== nome) {
        data.veiculo_id = v.id;
        data.veiculo_nome = nome;
        nV++;
      }
    }

    const o = match(obras, vg.obra_nome, ["nome"]);
    if (o) {
      if (vg.obra_id !== o.id || vg.obra_nome !== o.nome) {
        data.obra_id = o.id;
        data.obra_nome = o.nome;
        nO++;
      }
    } else if (vg.obra_nome) semObra.add(vg.obra_nome);

    // motorista: "michel*" => Michelangelo; senão match normal
    const m = norm(vg.motorista_nome).startsWith("michel")
      ? michelangelo
      : match(colaboradores, vg.motorista_nome, ["nome"]);
    if (m) {
      if (vg.motorista_id !== m.id || vg.motorista_nome !== m.nome) {
        data.motorista_id = m.id;
        data.motorista_nome = m.nome;
        nM++;
      }
    }

    if (Object.keys(data).length) await db.viagem.update({ where: { id: vg.id }, data });
  }

  console.log(`✅ Viagens normalizadas → veículo: ${nV}, motorista: ${nM}, obra: ${nO}`);
  if (semObra.size) console.log(`   Sem obra no Core (mantido snapshot): ${[...semObra].join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

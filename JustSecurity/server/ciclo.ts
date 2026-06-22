import { prisma } from "./lib/prisma.ts";

const db = prisma as any;

// Soma dias a uma data ISO e devolve ISO.
export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export interface DadosFicha {
  colaborador_id: string | null;
  colaborador_nome: string;
  colaborador_matricula: string | null;
  colaborador_cargo: string | null;
  empresa_nome: string | null;
  epi_id: string | null;
  epi_nome: string;
  epi_ca: string | null;
  tipo_controle: string; // prazo | inspecao | uso_unico (snapshot do Core)
  validade_dias: number | null;
  alerta_dias: number | null;
  motivo: string; // inicial | complementar | troca
  entrega_id: number;
  entregue_em: string;
}

// Abre a ficha de uma entrega. Em troca, baixa a ficha ativa anterior do mesmo
// colaborador + mesmo EPI (motivo 'troca') e a vincula em substitui_ficha_id.
export async function abrirFicha(d: DadosFicha): Promise<number> {
  const tipo = d.tipo_controle || "prazo";
  const validade = d.validade_dias ?? null;
  let vence_em: string | null = null;
  let proxima_inspecao_em: string | null = null;
  let status = "ativa";

  if (tipo === "uso_unico") {
    status = "consumida"; // consumível: não há validade nem inspeção a acompanhar
  } else if (tipo === "inspecao") {
    proxima_inspecao_em = validade ? addDays(d.entregue_em, validade) : null;
  } else {
    vence_em = validade ? addDays(d.entregue_em, validade) : null; // prazo
  }

  let substitui_ficha_id: number | null = null;
  if (d.motivo === "troca" && d.colaborador_id && d.epi_id) {
    const anterior = await db.fichas.findFirst({
      where: { status: "ativa", colaborador_id: d.colaborador_id, epi_id: d.epi_id },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (anterior) {
      substitui_ficha_id = anterior.id;
      await db.fichas.update({
        where: { id: anterior.id },
        data: {
          status: "baixada",
          baixa_motivo: "troca",
          baixa_em: d.entregue_em,
          baixa_obs: `Substituída pela ficha da entrega #${d.entrega_id}`,
        },
      });
    }
  }

  const ficha = await db.fichas.create({
    data: {
      colaborador_id: d.colaborador_id,
      colaborador_nome: d.colaborador_nome,
      colaborador_matricula: d.colaborador_matricula,
      colaborador_cargo: d.colaborador_cargo,
      empresa_nome: d.empresa_nome,
      epi_id: d.epi_id,
      epi_nome: d.epi_nome,
      epi_ca: d.epi_ca,
      tipo_controle: tipo,
      validade_dias: validade,
      alerta_dias: d.alerta_dias ?? null,
      origem: d.motivo,
      entrega_id: d.entrega_id,
      entregue_em: d.entregue_em,
      vence_em,
      proxima_inspecao_em,
      status,
      substitui_ficha_id,
      created_at: new Date().toISOString(),
    },
  });
  return ficha.id;
}

// Status operacional de uma ficha (derivado, não armazenado).
//  em_dia · vencimento_proximo · troca_imediata · inspecao_proxima · inspecionar
//  baixada · consumida
export function statusFicha(f: any, hojeIso = new Date().toISOString()): {
  codigo: string;
  label: string;
  dias_restantes: number | null;
} {
  if (f.status === "baixada") return { codigo: "baixada", label: "Baixada", dias_restantes: null };
  if (f.status === "consumida") return { codigo: "consumida", label: "Uso único", dias_restantes: null };

  const alerta = f.alerta_dias ?? 0;
  const limiteAlerta = addDays(hojeIso, alerta);
  const diasAte = (alvo: string) =>
    Math.ceil((new Date(alvo).getTime() - new Date(hojeIso).getTime()) / 86_400_000);

  if (f.vence_em) {
    if (f.vence_em <= hojeIso) return { codigo: "troca_imediata", label: "Troca imediata", dias_restantes: diasAte(f.vence_em) };
    if (f.vence_em <= limiteAlerta) return { codigo: "vencimento_proximo", label: "Vence em breve", dias_restantes: diasAte(f.vence_em) };
    return { codigo: "em_dia", label: "Em dia", dias_restantes: diasAte(f.vence_em) };
  }
  if (f.proxima_inspecao_em) {
    if (f.proxima_inspecao_em <= hojeIso) return { codigo: "inspecionar", label: "Inspecionar", dias_restantes: diasAte(f.proxima_inspecao_em) };
    if (f.proxima_inspecao_em <= limiteAlerta) return { codigo: "inspecao_proxima", label: "Inspeção próxima", dias_restantes: diasAte(f.proxima_inspecao_em) };
    return { codigo: "em_dia", label: "Em dia", dias_restantes: diasAte(f.proxima_inspecao_em) };
  }
  return { codigo: "em_dia", label: "Em dia", dias_restantes: null };
}

// Registra uma inspeção e aplica o desfecho à ficha.
//  aprovado / aprovado_ressalva → atualiza próxima inspeção (data vinda do corpo)
//  trocar  → força troca imediata (vence_em = agora), aguardando a entrega de troca
//  baixar  → baixa a ficha (motivo 'inspecao')
export async function registrarInspecao(
  fichaId: number,
  body: {
    resultado: string;
    proxima_inspecao_em?: string | null;
    inspetor?: string;
    inspetor_id?: string | null;
    assinatura_img?: string | null;
    assinatura_tipo?: string | null;
    observacao?: string;
  }
): Promise<{ ok: boolean; erro?: string }> {
  const ficha = await db.fichas.findUnique({ where: { id: fichaId } });
  if (!ficha) return { ok: false, erro: "ficha não encontrada" };
  if (ficha.status !== "ativa") return { ok: false, erro: "ficha não está ativa" };

  const data = new Date().toISOString();
  const { resultado } = body;
  const validos = ["aprovado", "aprovado_ressalva", "trocar", "baixar"];
  if (!validos.includes(resultado)) return { ok: false, erro: "resultado inválido" };
  if (!body.assinatura_img) return { ok: false, erro: "assinatura (digital) do inspetor é obrigatória" };

  // próxima inspeção: usa a data informada; senão, intervalo padrão da validade
  let proxima: string | null = body.proxima_inspecao_em ?? null;
  if ((resultado === "aprovado" || resultado === "aprovado_ressalva") && !proxima) {
    proxima = ficha.validade_dias ? addDays(data, ficha.validade_dias) : null;
  }

  await db.inspecoes.create({
    data: {
      ficha_id: fichaId,
      data,
      resultado,
      proxima_inspecao_em: resultado === "aprovado" || resultado === "aprovado_ressalva" ? proxima : null,
      inspetor: body.inspetor ?? null,
      inspetor_id: body.inspetor_id ?? null,
      assinatura_img: body.assinatura_img,
      assinatura_tipo: body.assinatura_tipo ?? "digital",
      observacao: body.observacao ?? null,
      created_at: data,
    },
  });

  if (resultado === "aprovado" || resultado === "aprovado_ressalva") {
    await db.fichas.update({ where: { id: fichaId }, data: { proxima_inspecao_em: proxima } });
  } else if (resultado === "trocar") {
    await db.fichas.update({ where: { id: fichaId }, data: { vence_em: data, proxima_inspecao_em: null } });
  } else if (resultado === "baixar") {
    await db.fichas.update({
      where: { id: fichaId },
      data: { status: "baixada", baixa_motivo: "inspecao", baixa_em: data, baixa_obs: body.observacao ?? null },
    });
  }
  return { ok: true };
}

// Baixa manual de uma ficha (sem assinatura por digital, por decisão de projeto).
export async function baixarFicha(
  fichaId: number,
  body: { motivo: string; observacao?: string }
): Promise<{ ok: boolean; erro?: string }> {
  const ficha = await db.fichas.findUnique({ where: { id: fichaId } });
  if (!ficha) return { ok: false, erro: "ficha não encontrada" };
  if (ficha.status !== "ativa") return { ok: false, erro: "ficha não está ativa" };

  const motivos = ["desgaste", "vencimento", "desligamento", "perda", "troca", "inspecao"];
  if (!motivos.includes(body.motivo)) return { ok: false, erro: "motivo inválido" };

  await db.fichas.update({
    where: { id: fichaId },
    data: {
      status: "baixada",
      baixa_motivo: body.motivo,
      baixa_em: new Date().toISOString(),
      baixa_obs: body.observacao ?? null,
    },
  });
  return { ok: true };
}

import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { createHash } from "node:crypto";
import { prisma } from "./lib/prisma.ts";
import { requireAuth, requirePerm } from "./lib/auth.ts";
import { coreUnidades, gedUpload, type CoreRef } from "./core.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const db = prisma as any;

// ---------------------------------------------------------------------------
// Públicas (sem auth): health.
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "just-vistoria" }));

// A partir daqui exige auth (no-op em dev, sem AUTH_ENFORCE).
app.use(requireAuth);

const ler = requirePerm("vistoria.read");
const escrever = requirePerm("vistoria.write");

const TIPOS_ETAPA = ["construcao", "inspecao_final", "vistoria_cliente", "entrega_chaves"] as const;

// ---------------------------------------------------------------------------
// Catálogo de formulários (modelos de checklist).
// ---------------------------------------------------------------------------
app.get("/api/formulario-modelos", ler, async (_req, res) => {
  try {
    res.json(await db.formularioModelo.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } }));
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ---------------------------------------------------------------------------
// Pipeline por unidade: inicia as 4 etapas (idempotente) e lista etapas+itens.
// A etapa `construcao` herda previsto/realizado do cronograma Prevision (CronogramaTarefa).
// ---------------------------------------------------------------------------
app.post("/api/unidades/:id/iniciar", escrever, async (req, res) => {
  try {
    const unidade_id = req.params.id;
    const unidades = await coreUnidades();
    const u = unidades.find((x: CoreRef) => x.id === unidade_id);
    const label = (u?.identificador as string) ?? (req.body?.unidade_label as string) ?? unidade_id;
    const obra_id = (u?.obra_id as string) ?? null;
    const pavimento = (u?.pavimento as string) ?? "";

    // previsto da Construção: tarefas do cronograma da unidade (por pavimento OU vinculadas à unidade)
    const tarefas = await db.cronogramaTarefa.findMany({ where: { OR: [{ unidade_id }, { local: pavimento }] } });
    const datas = tarefas.map((t: any) => t.fim).filter(Boolean).sort();
    const inicios = tarefas.map((t: any) => t.inicio).filter(Boolean).sort();
    const che = tarefas.find((t: any) => t.pacote === "CHE");
    const previstoConstrucao = { de: inicios[0] ?? null, ate: datas[datas.length - 1] ?? null };
    const previstoInspecao = che?.fim ?? previstoConstrucao.ate;

    const existentes = await db.etapaUnidade.findMany({ where: { unidade_id } });
    const tem = new Set(existentes.map((e: any) => e.tipo));
    const criar = TIPOS_ETAPA.filter((t) => !tem.has(t)).map((tipo) => ({
      unidade_id,
      unidade_label: label,
      obra_id,
      tipo,
      previsto_de: tipo === "construcao" ? previstoConstrucao.de : tipo === "inspecao_final" ? previstoInspecao : null,
      previsto_ate: tipo === "construcao" ? previstoConstrucao.ate : tipo === "inspecao_final" ? previstoInspecao : null,
    }));
    if (criar.length) await db.etapaUnidade.createMany({ data: criar });
    res.json(await db.etapaUnidade.findMany({ where: { unidade_id }, include: { itens: true }, orderBy: { created_at: "asc" } }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.get("/api/unidades/:id/etapas", ler, async (req, res) => {
  try {
    const etapas = await db.etapaUnidade.findMany({
      where: { unidade_id: req.params.id },
      include: { itens: { orderBy: { created_at: "asc" } } },
      orderBy: { created_at: "asc" },
    });
    res.json(etapas);
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ESPELHO / visão geral: todas as unidades (do Core) × situação das 4 etapas + NCs abertas.
// É a tela de gestão do todo (quadro tipo Mobuss). Filtra por obra opcional.
app.get("/api/espelho", ler, async (req, res) => {
  try {
    const obra_id = req.query.obra_id ? String(req.query.obra_id) : null;
    const unidades = (await coreUnidades()).filter((u: CoreRef) => (obra_id ? u.obra_id === obra_id : true));
    const ids = unidades.map((u: CoreRef) => u.id);
    const [etapas, ncs] = await Promise.all([
      db.etapaUnidade.findMany({ where: { unidade_id: { in: ids } } }),
      db.naoConformidade.findMany({ where: { unidade_id: { in: ids }, status: { in: ["aberta", "em_correcao", "reverificar"] } }, select: { unidade_id: true, severidade: true } }),
    ]);
    const porUnidade = new Map<string, Record<string, string>>();
    for (const e of etapas) {
      const m = porUnidade.get(e.unidade_id) ?? {};
      m[e.tipo] = e.situacao;
      porUnidade.set(e.unidade_id, m);
    }
    const ncMap = new Map<string, { abertas: number; criticas: number }>();
    for (const n of ncs) {
      const c = ncMap.get(n.unidade_id) ?? { abertas: 0, criticas: 0 };
      c.abertas++;
      if (n.severidade === "critica") c.criticas++;
      ncMap.set(n.unidade_id, c);
    }
    const linhas = unidades.map((u: CoreRef) => ({
      id: u.id,
      identificador: u.identificador,
      pavimento: u.pavimento ?? null,
      bloco: u.bloco ?? null,
      categoria: u.categoria ?? "apartamento",
      cliente_nome: (u.cliente as any)?.nome ?? null,
      iniciado: porUnidade.has(u.id),
      etapas: porUnidade.get(u.id) ?? {},
      nc_abertas: ncMap.get(u.id)?.abertas ?? 0,
      nc_criticas: ncMap.get(u.id)?.criticas ?? 0,
    }));
    res.json(linhas);
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// Status da Construção + pendências (tarefas do cronograma ainda não concluídas).
// Regra: Inspeção Final só libera quando a Construção está concluída.
app.get("/api/unidades/:id/construcao", ler, async (req, res) => {
  try {
    const unidade_id = req.params.id;
    const u = (await coreUnidades()).find((x: CoreRef) => x.id === unidade_id);
    const pavimento = (u?.pavimento as string) ?? "";
    const tarefas = await db.cronogramaTarefa.findMany({ where: { OR: [{ unidade_id }, { local: pavimento }] }, orderBy: { fim: "asc" } });
    const etapa = await db.etapaUnidade.findFirst({ where: { unidade_id, tipo: "construcao" } });
    const hoje = new Date().toISOString().slice(0, 10);
    const pendentes = tarefas.filter((t: any) => !t.fim || t.fim >= hoje);
    const concluida = etapa?.situacao === "concluida";
    res.json({
      situacao: etapa?.situacao ?? "nao_iniciada",
      previsto: { de: etapa?.previsto_de ?? null, ate: etapa?.previsto_ate ?? null },
      total_tarefas: tarefas.length,
      pendencias: pendentes.map((t: any) => ({ pacote: t.pacote, servico: t.servico, local: t.local, fim: t.fim })),
      inspecao_liberada: concluida,
    });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

app.put("/api/etapas/:id", escrever, async (req, res) => {
  try {
    const { id, created_at, updated_at, itens, ...data } = req.body ?? {};
    res.json(await db.etapaUnidade.update({ where: { id: req.params.id }, data }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---------------------------------------------------------------------------
// Itens / agendamentos de uma etapa.
// ---------------------------------------------------------------------------
app.post("/api/itens", escrever, async (req, res) => {
  try {
    res.status(201).json(await db.itemEtapa.create({ data: req.body }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.put("/api/itens/:id", escrever, async (req, res) => {
  try {
    const { id, created_at, updated_at, etapa, ...data } = req.body ?? {};
    res.json(await db.itemEtapa.update({ where: { id: req.params.id }, data }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.delete("/api/itens/:id", escrever, async (req, res) => {
  try {
    await db.itemEtapa.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---------------------------------------------------------------------------
// Upload de fotos (evidência) -> GED do Core. Aceita 1+ arquivos no campo "files".
// Usado pelo item de verificação (checklist) e pela NC. Retorna [{id, nome}].
// ---------------------------------------------------------------------------
app.post("/api/fotos", escrever, upload.array("files", 12), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) return res.status(400).json({ error: "Nenhuma foto enviada." });
    const unidade_id = String(req.body?.unidade_id ?? "");
    const unidade_label = req.body?.unidade_label ? String(req.body.unidade_label) : undefined;
    const docs = await Promise.all(
      files.map((f, i) =>
        gedUpload({
          buffer: f.buffer,
          filename: f.originalname || `foto_${Date.now()}_${i}.jpg`,
          contentType: f.mimetype || "image/jpeg",
          entidade_id: unidade_id,
          entidade_label: unidade_label,
          tipo_codigo: "foto_nc_vistoria",
        }),
      ),
    );
    res.status(201).json(docs.filter(Boolean));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---------------------------------------------------------------------------
// Formulário aplicado (instância): preenche o checklist, calcula NCs e as abre.
// body: { modelo_id, modelo_codigo, modelo_versao, unidade_id, unidade_label, item_id?,
//         respostas: [{item, grupo, status, obs, severidade, categoria, fotos:[docId]}] }
// ---------------------------------------------------------------------------
app.post("/api/instancias", escrever, async (req, res) => {
  try {
    const b = req.body ?? {};
    const respostas: any[] = Array.isArray(b.respostas) ? b.respostas : [];
    const reprovadas = respostas.filter((r) => r.status === "nao_conforme");
    const inst = await db.formularioInstancia.create({
      data: {
        modelo_id: b.modelo_id,
        modelo_codigo: b.modelo_codigo,
        modelo_versao: b.modelo_versao ?? 1,
        unidade_id: b.unidade_id,
        unidade_label: b.unidade_label,
        respostas: JSON.stringify(respostas),
        total_nc: reprovadas.length,
      },
    });
    // abre uma NC/pendência por item reprovado (origem = inspeção final)
    if (reprovadas.length) {
      await db.naoConformidade.createMany({
        data: reprovadas.map((r) => {
          const fotos: string[] = Array.isArray(r.fotos) ? r.fotos : r.foto_doc_id ? [r.foto_doc_id] : [];
          return {
            instancia_id: inst.id,
            unidade_id: b.unidade_id,
            unidade_label: b.unidade_label,
            titulo: [r.grupo, r.item].filter(Boolean).join(" — ") || "Não conformidade",
            descricao: r.obs ?? null,
            severidade: r.severidade ?? "media",
            origem: "inspecao_final",
            categoria: r.categoria ?? r.grupo ?? null,
            tipo: r.tipo ?? null,
            causa_raiz: r.causa_raiz ?? null,
            acoes: r.acoes ?? null,
            foto_doc_id: fotos[0] ?? null,
            fotos: fotos.length ? JSON.stringify(fotos) : null,
          };
        }),
      });
    }
    // vincula a instância ao item da etapa, se informado
    if (b.item_id) await db.itemEtapa.update({ where: { id: b.item_id }, data: { instancia_id: inst.id, situacao: reprovadas.length ? "reprovada" : "aprovada" } });
    res.status(201).json(await db.formularioInstancia.findUnique({ where: { id: inst.id }, include: { ncs: true } }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.get("/api/instancias/:id", ler, async (req, res) => {
  try {
    const inst = await db.formularioInstancia.findUnique({ where: { id: req.params.id }, include: { ncs: true } });
    if (!inst) return res.status(404).json({ error: "não encontrada" });
    res.json(inst);
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ---------------------------------------------------------------------------
// Não-conformidades (fluxo de fechamento).
// ---------------------------------------------------------------------------
app.get("/api/ncs", ler, async (req, res) => {
  try {
    const where: any = {};
    if (req.query.unidade_id) where.unidade_id = String(req.query.unidade_id);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.categoria) where.categoria = String(req.query.categoria);
    if (req.query.origem) where.origem = String(req.query.origem);
    // severidade: "critica" só críticas; "pendencia" tudo que não é crítica (lista de pendências)
    const sev = req.query.severidade ? String(req.query.severidade) : null;
    if (sev === "pendencia") where.severidade = { not: "critica" };
    else if (sev) where.severidade = sev;
    // abertas=1 → só os fluxos ainda em aberto (para a lista de pendências/gestão)
    if (req.query.abertas === "1") where.status = { in: ["aberta", "em_correcao", "reverificar"] };
    res.json(await db.naoConformidade.findMany({ where, orderBy: { created_at: "desc" } }));
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// Cria uma NC/pendência manualmente (ex.: pendência apontada na fase de Construção).
// body: { unidade_id, unidade_label, titulo, descricao?, severidade?, origem?, categoria?,
//         equipe?, tipo?, dias_resolucao?, prazo?, responsavel?, fotos?:[docId] }
app.post("/api/ncs", escrever, async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.unidade_id || !b.titulo) return res.status(400).json({ error: "unidade_id e titulo são obrigatórios." });
    const fotos: string[] = Array.isArray(b.fotos) ? b.fotos : [];
    const nc = await db.naoConformidade.create({
      data: {
        unidade_id: b.unidade_id,
        unidade_label: b.unidade_label ?? b.unidade_id,
        titulo: b.titulo,
        descricao: b.descricao ?? null,
        severidade: b.severidade ?? "media",
        origem: b.origem ?? "manual",
        categoria: b.categoria ?? null,
        equipe: b.equipe ?? null,
        tipo: b.tipo ?? null,
        causa_raiz: b.causa_raiz ?? null,
        acoes: b.acoes ?? null,
        dias_resolucao: b.dias_resolucao != null ? Number(b.dias_resolucao) : null,
        responsavel: b.responsavel ?? null,
        prazo: b.prazo ?? null,
        foto_doc_id: fotos[0] ?? null,
        fotos: fotos.length ? JSON.stringify(fotos) : null,
      },
    });
    res.status(201).json(nc);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.put("/api/ncs/:id", escrever, async (req, res) => {
  try {
    const { id, created_at, updated_at, instancia, ...data } = req.body ?? {};
    res.json(await db.naoConformidade.update({ where: { id: req.params.id }, data }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.post("/api/ncs/:id/reverificar", escrever, async (req, res) => {
  try {
    const aprovada = req.body?.aprovada !== false; // default: corrigida
    res.json(
      await db.naoConformidade.update({
        where: { id: req.params.id },
        data: { status: aprovada ? "corrigida" : "reverificar", reverificada_em: new Date().toISOString().slice(0, 10) },
      }),
    );
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---------------------------------------------------------------------------
// Termo assinado (vistoria_cliente | entrega_chaves) — prova legal -> GED.
// multipart: file (PDF jsPDF) + campos. Bloqueia entrega_chaves com NC crítica aberta.
// ---------------------------------------------------------------------------
app.post("/api/termos", escrever, upload.single("file"), async (req, res) => {
  try {
    const b = req.body ?? {};
    const tipo = b.tipo as string;
    if (tipo === "entrega_chaves") {
      const criticas = await db.naoConformidade.count({
        where: { unidade_id: b.unidade_id, severidade: "critica", status: { in: ["aberta", "em_correcao", "reverificar"] } },
      });
      if (criticas > 0)
        return res.status(409).json({ error: "Entrega bloqueada: há não-conformidade(s) crítica(s) em aberto.", criticas });
    }

    const n = await db.termo.count();
    const protocolo = `JV-${String(n + 1).padStart(6, "0")}`;
    const assinado_em = b.assinado_em || new Date().toISOString();
    const conteudo = typeof b.conteudo === "string" ? b.conteudo : JSON.stringify(b.conteudo ?? {});
    const hash = createHash("sha256").update(`${protocolo}|${conteudo}|${b.assinatura_img ?? ""}|${assinado_em}`).digest("hex");

    let ged_doc_id: string | null = null;
    if (req.file) {
      const doc = await gedUpload({
        buffer: req.file.buffer,
        filename: `${tipo}_${b.unidade_label ?? b.unidade_id}_${protocolo}.pdf`,
        contentType: "application/pdf",
        entidade_id: b.unidade_id,
        entidade_label: b.unidade_label,
        tipo_codigo: tipo === "entrega_chaves" ? "termo_entrega_chaves" : "termo_vistoria_cliente",
        metadados: { protocolo, assinado_em, cliente: b.cliente_nome, hash },
      });
      ged_doc_id = doc?.id ?? null;
    }

    const termo = await db.termo.create({
      data: {
        unidade_id: b.unidade_id,
        unidade_label: b.unidade_label,
        cliente_id: b.cliente_id || null,
        cliente_nome: b.cliente_nome,
        cliente_cpf: b.cliente_cpf || null,
        tipo,
        modalidade: b.modalidade || null,
        protocolo,
        conteudo,
        assinatura_img: b.assinatura_img ?? "",
        assinado_em,
        hash,
        ged_doc_id,
      },
    });
    res.status(201).json(termo);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.get("/api/termos", ler, async (req, res) => {
  try {
    const where: any = {};
    if (req.query.unidade_id) where.unidade_id = String(req.query.unidade_id);
    res.json(await db.termo.findMany({ where, orderBy: { created_at: "desc" } }));
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ---------------------------------------------------------------------------
// Relatório de entrega da unidade (resumo das etapas + itens + NCs + termos).
// O front gera o PDF (jsPDF) a partir deste payload e arquiva no GED.
// ---------------------------------------------------------------------------
app.get("/api/unidades/:id/relatorio", ler, async (req, res) => {
  try {
    const unidade_id = req.params.id;
    const [etapas, ncs, termos] = await Promise.all([
      db.etapaUnidade.findMany({ where: { unidade_id }, include: { itens: true }, orderBy: { created_at: "asc" } }),
      db.naoConformidade.findMany({ where: { unidade_id }, orderBy: { created_at: "desc" } }),
      db.termo.findMany({ where: { unidade_id }, orderBy: { created_at: "asc" } }),
    ]);
    const label = etapas[0]?.unidade_label ?? unidade_id;
    res.json({ unidade_id, unidade_label: label, etapas, ncs, termos });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// Arquiva o PDF do relatório (gerado no front) no GED do Core.
app.post("/api/unidades/:id/relatorio/arquivar", escrever, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "PDF não enviado" });
    const etapa = await db.etapaUnidade.findFirst({ where: { unidade_id: req.params.id } });
    const doc = await gedUpload({
      buffer: req.file.buffer,
      filename: `relatorio_${etapa?.unidade_label ?? req.params.id}.pdf`,
      contentType: "application/pdf",
      entidade_id: req.params.id,
      entidade_label: etapa?.unidade_label,
      tipo_codigo: "relatorio_entrega_unidade",
    });
    res.status(201).json({ ged_doc_id: doc?.id ?? null });
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

const PORT = Number(process.env.PORT ?? 4800);
app.listen(PORT, () => console.log(`JustVistoria rodando em http://localhost:${PORT}`));

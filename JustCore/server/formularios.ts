// MOTOR DE FORMULÁRIOS — rotas do Core (base de cadastro transversal, como o GED).
//
//   Catálogo (cadastros simples, via registerCrud no index.ts):
//     /api/formulario-tipos      tipos de formulário (FVS, FVE, AVF…)
//     /api/formulario-grupos     grupos de inspeção / disciplinas
//
//   Templates (versionados) — aqui:
//     GET    /api/formularios                 lista modelos (filtros: escopo, codigo, ativo, publicado, servico_sigla)
//     GET    /api/formularios/:id              detalha (com tipo/grupo)
//     POST   /api/formularios                  cria modelo (rascunho, versão 1)
//     PUT    /api/formularios/:id              edita (bloqueia estrutura de modelo já aplicado)
//     POST   /api/formularios/:id/publicar     publica (passa a ser aplicável)
//     POST   /api/formularios/:id/nova-versao  clona como versão+1 (rascunho)
//     POST   /api/formularios/:id/duplicar     clona como novo código (rascunho)
//     DELETE /api/formularios/:id              remove (só sem instâncias)
//
//   Instâncias (preenchimentos) — polimórficas (entidade_tipo+entidade_id):
//     GET    /api/formularios/instancias       lista (filtros: escopo, modelo_codigo, entidade_*)
//     GET    /api/formularios/instancias/:id
//     POST   /api/formularios/instancias        cria (congela versão/escopo; gate FVS sequencial)
//     PUT    /api/formularios/instancias/:id
//
//   Não-Conformidades (geradas ao concluir FVS/instância):
//     GET    /api/nao-conformidades             lista (filtros: instancia_id, status, escopo_tarefa_id)
//     GET    /api/nao-conformidades/:id
//     POST   /api/nao-conformidades             cria manualmente
//     PUT    /api/nao-conformidades/:id         atualiza (causa, ação, responsável, prazo)
//     POST   /api/nao-conformidades/:id/acao    define ação corretiva → status em_acao
//     POST   /api/nao-conformidades/:id/fechar  fecha NC (exige instancia_reverificacao_id aprovada)
//
//   Sequência de Qualidade (override do gate sequencial):
//     GET    /api/sequencia-qualidade           lista (filtros: obra_id, servico_sigla)
//     POST   /api/sequencia-qualidade           cria override
//     PUT    /api/sequencia-qualidade/:id       edita
//     DELETE /api/sequencia-qualidade/:id       remove
//
// Ver skill `motor-formularios`, `qualidade-fvs` e seções 14/16 do resumo.
import type { Express, RequestHandler } from "express";
import { prisma } from "./lib/prisma.ts";

const db = prisma as any;
type Perm = (chave: string) => RequestHandler;

export function registerFormularios(app: Express, perm: Perm) {
  const ler = perm("formularios.read");
  const escrever = perm("formularios.write");

  // ---- Instâncias: registradas ANTES de /:id para não colidir com "instancias" ----
  app.get("/api/formularios/instancias", ler, async (req, res) => {
    try {
      const where: any = {};
      if (req.query.escopo) where.escopo = String(req.query.escopo);
      if (req.query.modelo_codigo) where.modelo_codigo = String(req.query.modelo_codigo);
      if (req.query.entidade_tipo) where.entidade_tipo = String(req.query.entidade_tipo);
      if (req.query.entidade_id) where.entidade_id = String(req.query.entidade_id);
      res.json(await db.formularioInstancia.findMany({ where, orderBy: { created_at: "desc" } }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/formularios/instancias/:id", ler, async (req, res) => {
    try {
      const row = await db.formularioInstancia.findUnique({ where: { id: req.params.id }, include: { modelo: true } });
      if (!row) return res.status(404).json({ error: "não encontrada" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/instancias", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      const modelo = await db.formularioModelo.findUnique({ where: { id: b.modelo_id } });
      if (!modelo) return res.status(400).json({ error: "modelo_id inválido." });

      // GATE SEQUENCIAL (FVS): valida predecessores antes de criar instância
      if (modelo.escopo === "fvs" && b.entidade_tipo === "tarefa" && b.entidade_id) {
        const bloqueio = await verificarGateFvs(b.entidade_id, b.obra_id);
        if (bloqueio) return res.status(409).json({ error: bloqueio, bloqueada: true });
      }

      const inst = await db.formularioInstancia.create({
        data: {
          modelo_id: modelo.id,
          modelo_codigo: modelo.codigo,
          modelo_versao: modelo.versao,
          escopo: modelo.escopo,
          entidade_tipo: b.entidade_tipo ?? modelo.entidade_alvo ?? null,
          entidade_id: b.entidade_id ?? null,
          entidade_label: b.entidade_label ?? null,
          respostas: typeof b.respostas === "string" ? b.respostas : JSON.stringify(b.respostas ?? []),
          nota: b.nota ?? null,
          total_nc: b.total_nc ?? 0,
          resumo: b.resumo ? (typeof b.resumo === "string" ? b.resumo : JSON.stringify(b.resumo)) : null,
          autor_id: b.autor_id ?? null,
          autor_nome: b.autor_nome ?? null,
          assinaturas: b.assinaturas ? (typeof b.assinaturas === "string" ? b.assinaturas : JSON.stringify(b.assinaturas)) : null,
          preenchido_em: b.preenchido_em ? new Date(b.preenchido_em) : null,
        },
      });

      // Ao concluir (preenchido_em definido), gera NCs para itens não conformes com gera_nc.ativo
      if (b.preenchido_em && b.total_nc > 0) {
        await gerarNcsInstancia(inst.id, modelo.estrutura, inst.respostas);
      }

      res.status(201).json(inst);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/formularios/instancias/:id", escrever, async (req, res) => {
    try {
      const anterior = await db.formularioInstancia.findUnique({ where: { id: req.params.id }, include: { modelo: true } });
      if (!anterior) return res.status(404).json({ error: "não encontrada" });
      const { id, created_at, updated_at, modelo, modelo_id, modelo_codigo, modelo_versao, ...rest } = req.body ?? {};
      const data: any = { ...rest };
      for (const k of ["respostas", "resumo", "assinaturas"]) if (data[k] && typeof data[k] !== "string") data[k] = JSON.stringify(data[k]);
      if (data.preenchido_em) data.preenchido_em = new Date(data.preenchido_em);
      const inst = await db.formularioInstancia.update({ where: { id: req.params.id }, data });
      // Gera NCs se está concluindo agora (anterior sem preenchido_em, agora com)
      if (!anterior.preenchido_em && inst.preenchido_em && (inst.total_nc ?? 0) > 0) {
        await gerarNcsInstancia(inst.id, anterior.modelo.estrutura, inst.respostas);
      }
      res.json(inst);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // ---- Gate: verifica se uma tarefa está bloqueada para nova FVS ----
  app.get("/api/formularios/gate", ler, async (req, res) => {
    try {
      const tarefaId = req.query.tarefa_id ? String(req.query.tarefa_id) : null;
      if (!tarefaId) return res.status(400).json({ error: "tarefa_id é obrigatório." });
      const bloqueio = await verificarGateFvs(tarefaId);
      res.json({ bloqueada: !!bloqueio, motivo: bloqueio ?? null });
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  // ---- Modelos (templates) ----
  app.get("/api/formularios", ler, async (req, res) => {
    try {
      const where: any = {};
      if (req.query.escopo) where.escopo = String(req.query.escopo);
      if (req.query.codigo) where.codigo = String(req.query.codigo);
      if (req.query.ativo) where.ativo = req.query.ativo === "true";
      if (req.query.publicado) where.publicado = req.query.publicado === "true";
      if (req.query.servico_sigla) where.servico_sigla = String(req.query.servico_sigla);
      res.json(await db.formularioModelo.findMany({ where, include: { tipo: true, grupo: true }, orderBy: [{ codigo: "asc" }, { versao: "desc" }] }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/formularios/:id", ler, async (req, res) => {
    try {
      const row = await db.formularioModelo.findUnique({ where: { id: req.params.id }, include: { tipo: true, grupo: true } });
      if (!row) return res.status(404).json({ error: "não encontrado" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!b.codigo || !b.nome) return res.status(400).json({ error: "codigo e nome são obrigatórios." });
      const row = await db.formularioModelo.create({ data: normalizeModelo(b, { versao: 1, publicado: false }), include: { tipo: true, grupo: true } });
      res.status(201).json(row);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/formularios/:id", escrever, async (req, res) => {
    try {
      const atual = await db.formularioModelo.findUnique({ where: { id: req.params.id }, include: { _count: { select: { instancias: true } } } });
      if (!atual) return res.status(404).json({ error: "não encontrado" });
      const { id, created_at, updated_at, tipo, grupo, instancias, _count, ...rest } = req.body ?? {};
      // modelo já aplicado (com instâncias): não pode mudar a estrutura/regras — versione.
      if (atual._count.instancias > 0 && rest.estrutura !== undefined) {
        return res.status(409).json({ error: "Modelo já aplicado. Crie uma nova versão para alterar a estrutura.", instancias: atual._count.instancias });
      }
      res.json(await db.formularioModelo.update({ where: { id: req.params.id }, data: normalizeModelo(rest, {}), include: { tipo: true, grupo: true } }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/:id/publicar", escrever, async (req, res) => {
    try {
      res.json(await db.formularioModelo.update({ where: { id: req.params.id }, data: { publicado: true, ativo: true } }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/:id/nova-versao", escrever, async (req, res) => {
    try {
      const base = await db.formularioModelo.findUnique({ where: { id: req.params.id } });
      if (!base) return res.status(404).json({ error: "não encontrado" });
      const { id, created_at, updated_at, versao, publicado, ...campos } = base;
      const nova = await db.formularioModelo.create({ data: { ...campos, versao: versao + 1, publicado: false }, include: { tipo: true, grupo: true } });
      res.status(201).json(nova);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/:id/duplicar", escrever, async (req, res) => {
    try {
      const base = await db.formularioModelo.findUnique({ where: { id: req.params.id } });
      if (!base) return res.status(404).json({ error: "não encontrado" });
      const { id, created_at, updated_at, codigo, nome, publicado, versao, ...campos } = base;
      const novoCodigo = req.body?.codigo || `${codigo}_COPIA`;
      const nova = await db.formularioModelo.create({
        data: { ...campos, codigo: novoCodigo, nome: req.body?.nome || `${nome} (cópia)`, versao: 1, publicado: false },
        include: { tipo: true, grupo: true },
      });
      res.status(201).json(nova);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.delete("/api/formularios/:id", escrever, async (req, res) => {
    try {
      const n = await db.formularioInstancia.count({ where: { modelo_id: req.params.id } });
      if (n > 0) return res.status(409).json({ error: "Modelo com instâncias preenchidas — inative em vez de excluir.", instancias: n });
      await db.formularioModelo.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}

/** Normaliza payload do modelo: FK escalares e JSON (config/estrutura) como String. */
function normalizeModelo(b: Record<string, any>, defaults: Record<string, any>) {
  const data: any = { ...b, ...defaults };
  for (const k of ["config", "estrutura"]) if (data[k] !== undefined && data[k] !== null && typeof data[k] !== "string") data[k] = JSON.stringify(data[k]);
  // FKs: aceitam tipo_id/grupo_id direto (colunas escalares no schema) — mantém como está.
  return data;
}

// ---------------------------------------------------------------------------
// GATE SEQUENCIAL FVS
// Verifica se a tarefa tem predecessora com FVS aprovada (via SequenciaQualidade
// ou via Tarefa.predecessores do Prevision). Retorna string de erro ou null (ok).
// ---------------------------------------------------------------------------
async function verificarGateFvs(tarefaId: string, obraId?: string): Promise<string | null> {
  const tarefa = await db.tarefa.findUnique({ where: { id: tarefaId }, include: { servico: true, local: true } });
  if (!tarefa) return null; // tarefa não existe → deixa o create falhar normalmente

  const siglaTarefa = tarefa.servico?.sigla_prancha as string | undefined;
  if (!siglaTarefa) return null;

  // Busca overrides de qualidade (mais específico: com obra_id; depois global)
  const overrides = await db.sequenciaQualidade.findMany({
    where: {
      servico_sigla: siglaTarefa,
      ativo: true,
      OR: [{ obra_id: tarefa.obra_id }, { obra_id: null }],
    },
    orderBy: [{ obra_id: "desc" }, { ordem: "asc" }], // obra específica tem prioridade
  });

  // Predecessoras de qualidade: overrides primeiro, depois predecessores Prevision
  const siglasDep: string[] = overrides.length > 0
    ? overrides.map((o: any) => o.depende_de_sigla as string)
    : []; // Prevision: parse de IDs externos (implementado abaixo se overrides vazio)

  // Se não há overrides, tenta derivar da cadeia Prevision
  if (siglasDep.length === 0 && tarefa.predecessores) {
    const extIds: string[] = String(tarefa.predecessores).split(",").map((s: string) => s.trim()).filter(Boolean);
    if (extIds.length > 0) {
      const predecessoras = await db.tarefa.findMany({
        where: { external_id: { in: extIds }, obra_id: tarefa.obra_id },
        include: { servico: true },
      });
      for (const pred of predecessoras) {
        if (!pred.servico?.sigla_prancha) continue;
        siglasDep.push(pred.servico.sigla_prancha as string);
      }
    }
  }

  if (siglasDep.length === 0) return null; // sem dependências → livre

  // Para cada sigla dependente, verifica se há FVS aprovada no mesmo Local
  for (const sigla of siglasDep) {
    // Busca tarefas do serviço predecessor no mesmo local
    const tarefasPred = await db.tarefa.findMany({
      where: { servico: { sigla_prancha: sigla }, local_id: tarefa.local_id, obra_id: tarefa.obra_id },
    });

    for (const tp of tarefasPred) {
      // FVS aprovada = instância concluída (preenchido_em != null), total_nc = 0
      // e sem NC aberta para essa tarefa
      const fvsAprovada = await db.formularioInstancia.findFirst({
        where: {
          escopo: "fvs",
          entidade_tipo: "tarefa",
          entidade_id: tp.id,
          preenchido_em: { not: null },
          total_nc: 0,
        },
      });
      if (!fvsAprovada) {
        const nomeLocal = `${tarefa.local.zona} / ${tarefa.local.pavimento}`;
        return `Serviço anterior "${sigla}" em ${nomeLocal} ainda não possui FVS aprovada. Conclua a verificação desse serviço antes de prosseguir.`;
      }
      // Verifica também se não há NC aberta para essa instância
      const ncAberta = await db.naoConformidade.findFirst({
        where: { instancia_id: fvsAprovada.id, status: { not: "fechada" } },
      });
      if (ncAberta) {
        const nomeLocal = `${tarefa.local.zona} / ${tarefa.local.pavimento}`;
        return `Serviço "${sigla}" em ${nomeLocal} tem não-conformidades em aberto. Feche todas as NCs antes de prosseguir.`;
      }
    }
  }

  return null; // tudo ok
}

// ---------------------------------------------------------------------------
// GERAR NCs ao concluir instância
// Para cada resposta "nao" com gera_nc.ativo, cria uma NaoConformidade.
// ---------------------------------------------------------------------------
async function gerarNcsInstancia(instanciaId: string, estruturaJson: string, respostasJson: string) {
  type ItemEstrutura = { ordem: number; descricao: string; gera_nc?: { ativo?: boolean; severidade_padrao?: string } };
  type SecaoEstrutura = { secao: string; ordem: number; itens: ItemEstrutura[] };
  type RespostaItem = { secao: string; item: number; valor: string | null; obs?: string };

  let secoes: SecaoEstrutura[] = [];
  let respostas: RespostaItem[] = [];
  try {
    secoes = JSON.parse(estruturaJson);
    respostas = JSON.parse(respostasJson);
  } catch { return; }

  const criadas: string[] = [];
  for (const resp of respostas) {
    if (resp.valor !== "nao") continue;
    const secao = secoes.find((s) => s.ordem === Number(resp.secao) || s.secao === resp.secao);
    const item = secao?.itens.find((it) => it.ordem === resp.item);
    if (!item?.gera_nc?.ativo) continue;
    // Não duplicar NCs existentes para o mesmo item
    const ref = `${resp.secao}:${resp.item}`;
    const ja = await db.naoConformidade.findFirst({ where: { instancia_id: instanciaId, item_ref: ref } });
    if (ja) continue;
    await db.naoConformidade.create({
      data: {
        id: crypto.randomUUID(),
        instancia_id: instanciaId,
        item_ref: ref,
        descricao: resp.obs || item.descricao,
        severidade: item.gera_nc.severidade_padrao ?? "media",
        status: "aberta",
        aberta_em: new Date(),
      },
    });
    criadas.push(ref);
  }
  return criadas;
}

// ---------------------------------------------------------------------------
// ROTAS: Não-Conformidades e Sequência de Qualidade
// Exportadas como função separada para serem chamadas no index.ts junto com registerFormularios.
// ---------------------------------------------------------------------------
export function registerQualidade(app: Express, perm: Perm) {
  const ler = perm("formularios.read");
  const escrever = perm("formularios.write");

  // ---- Não-Conformidades ----
  app.get("/api/nao-conformidades", ler, async (req, res) => {
    try {
      const where: any = {};
      if (req.query.instancia_id) where.instancia_id = String(req.query.instancia_id);
      if (req.query.status) where.status = String(req.query.status);
      if (req.query.status_nao) where.status = { not: String(req.query.status_nao) };
      res.json(await db.naoConformidade.findMany({ where, orderBy: { aberta_em: "desc" } }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/nao-conformidades/:id", ler, async (req, res) => {
    try {
      const row = await db.naoConformidade.findUnique({ where: { id: req.params.id } });
      if (!row) return res.status(404).json({ error: "não encontrada" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/nao-conformidades", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!b.instancia_id || !b.descricao) return res.status(400).json({ error: "instancia_id e descricao são obrigatórios." });
      const nc = await db.naoConformidade.create({
        data: {
          id: crypto.randomUUID(),
          instancia_id: b.instancia_id,
          item_ref: b.item_ref ?? "manual",
          descricao: b.descricao,
          causa: b.causa ?? null,
          acao_corretiva: b.acao_corretiva ?? null,
          responsavel_id: b.responsavel_id ?? null,
          responsavel_nome: b.responsavel_nome ?? null,
          prazo: b.prazo ? new Date(b.prazo) : null,
          severidade: b.severidade ?? "media",
          status: "aberta",
          aberta_em: new Date(),
        },
      });
      res.status(201).json(nc);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/nao-conformidades/:id", escrever, async (req, res) => {
    try {
      const { id, created_at, updated_at, aberta_em, fechada_em, ...rest } = req.body ?? {};
      const data: any = { ...rest };
      if (data.prazo) data.prazo = new Date(data.prazo);
      res.json(await db.naoConformidade.update({ where: { id: req.params.id }, data }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // Definir ação corretiva → status em_acao
  app.post("/api/nao-conformidades/:id/acao", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!b.acao_corretiva) return res.status(400).json({ error: "acao_corretiva é obrigatória." });
      const nc = await db.naoConformidade.update({
        where: { id: req.params.id },
        data: {
          acao_corretiva: b.acao_corretiva,
          responsavel_id: b.responsavel_id ?? null,
          responsavel_nome: b.responsavel_nome ?? null,
          prazo: b.prazo ? new Date(b.prazo) : null,
          causa: b.causa ?? undefined,
          status: "em_acao",
        },
      });
      res.json(nc);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // Fechar NC. Se instancia_reverificacao_id for fornecida, valida que a FVS foi concluída
  // (reverificação formal); sem ela, fecha direto (aceito no MVP, pode ser restringido via config).
  app.post("/api/nao-conformidades/:id/fechar", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (b.instancia_reverificacao_id) {
        const rev = await db.formularioInstancia.findUnique({ where: { id: b.instancia_reverificacao_id } });
        if (!rev) return res.status(400).json({ error: "Instância de reverificação não encontrada." });
        if (!rev.preenchido_em) return res.status(400).json({ error: "A reverificação ainda não foi concluída." });
      }
      const nc = await db.naoConformidade.update({
        where: { id: req.params.id },
        data: {
          status: "fechada",
          instancia_reverificacao_id: b.instancia_reverificacao_id ?? null,
          fechada_em: new Date(),
        },
      });
      res.json(nc);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // ---- Sequência de Qualidade ----
  app.get("/api/sequencia-qualidade", ler, async (req, res) => {
    try {
      const where: any = {};
      if (req.query.obra_id) where.obra_id = String(req.query.obra_id);
      if (req.query.servico_sigla) where.servico_sigla = String(req.query.servico_sigla);
      if (req.query.ativo) where.ativo = req.query.ativo === "true";
      res.json(await db.sequenciaQualidade.findMany({ where, orderBy: [{ servico_sigla: "asc" }, { ordem: "asc" }] }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/sequencia-qualidade", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!b.servico_sigla || !b.depende_de_sigla) return res.status(400).json({ error: "servico_sigla e depende_de_sigla são obrigatórios." });
      const row = await db.sequenciaQualidade.create({
        data: {
          id: crypto.randomUUID(),
          obra_id: b.obra_id ?? null,
          servico_sigla: b.servico_sigla,
          depende_de_sigla: b.depende_de_sigla,
          ordem: b.ordem ?? 0,
          ativo: b.ativo ?? true,
        },
      });
      res.status(201).json(row);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/sequencia-qualidade/:id", escrever, async (req, res) => {
    try {
      const { id, created_at, updated_at, ...rest } = req.body ?? {};
      res.json(await db.sequenciaQualidade.update({ where: { id: req.params.id }, data: rest }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.delete("/api/sequencia-qualidade/:id", escrever, async (req, res) => {
    try {
      await db.sequenciaQualidade.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}

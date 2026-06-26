// Triagem de documentos por IA (MVP). Lê UM arquivo (PDF/imagem) por visão via Gemini e
// PROPÕE como classificá-lo no GED — não grava nada. A gravação fica por conta do fluxo
// existente (POST /api/documentos), chamado pelo front depois que o usuário confere.
//
//   POST /api/triagem/documento   multipart: file [+ entidade_tipo, default "colaborador"]
//
// Resposta: { arquivo, entidade_tipo, tipo_codigo, sensivel, valido_ate, confianca, resumo,
//             colaborador_id, colaborador_nome, match }  (campos de colaborador só p/ pessoa)
import type { Express, RequestHandler } from "express";
import multer from "multer";
import { prisma } from "./lib/prisma.ts";
import { logAcesso, type TokenPayload } from "./lib/auth.ts";
import { gerarJson, mimeSuportado, LIMITE_INLINE } from "./lib/ia/gemini.ts";
import { fixFilename } from "./documentos.ts";
import { carregarColaboradores, casar } from "./lib/match-colaborador.ts";

const db = prisma as any;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITE_INLINE } });

function montarPrompt(entidade_tipo: string, tipos: { codigo: string; nome: string }[]): string {
  const lista = tipos.map((t) => `- ${t.codigo}: ${t.nome}`).join("\n");
  const pessoa =
    entidade_tipo === "colaborador"
      ? `\n- colaborador_nome: o NOME COMPLETO da pessoa (colaborador) a quem o documento pertence, exatamente como aparece no documento. Se não houver, "".`
      : `\n- colaborador_nome: "" (não se aplica).`;
  return [
    `Você é um assistente de triagem documental de RH de uma construtora.`,
    `Analise o documento em anexo (pode ser um PDF escaneado) e classifique-o.`,
    ``,
    `Escolha o tipo MAIS adequado entre estes códigos (use "outro" se nenhum servir):`,
    lista,
    ``,
    `Responda em JSON com:`,
    `- tipo_codigo: um dos códigos acima, ou "outro".`,
    `- sensivel: true se contém dado pessoal sensível (saúde/CID, biometria, dados bancários, CPF/RG).`,
    `- valido_ate: data de validade/vencimento do documento no formato YYYY-MM-DD, se existir (ex.: validade do ASO); senão "".`,
    pessoa,
    `- confianca: "alta", "media" ou "baixa".`,
    `- resumo: uma frase curta (pt-BR) descrevendo o documento.`,
    `- dados_extraidos: objeto com os campos ESPECÍFICOS do tipo, para pré-preencher o lançamento.`,
    `  Preencha SÓ o que se aplicar e existir no documento; deixe "" o que não se aplica:`,
    `  • Atestado/declaração médica → cid, dias_afastamento, horas, data_inicio (YYYY-MM-DD),`,
    `    data_emissao (YYYY-MM-DD), medico_nome, medico_crm (o CRM/CRO do profissional).`,
    `  • Treinamento/certificado → data_realizacao (YYYY-MM-DD), vencimento (YYYY-MM-DD), instrutor, carga_horaria.`,
    `  • Ficha de admissão / contrato de trabalho (pessoa sendo admitida) → nome_completo, cpf,`,
    `    rg, data_nascimento (YYYY-MM-DD), data_admissao (YYYY-MM-DD), cargo, pis.`,
  ].join("\n");
}

export function registerTriagem(app: Express, perm: (chave: string) => RequestHandler) {
  const escrever = perm("ged.documento.write");

  app.post("/api/triagem/documento", escrever, upload.single("file"), async (req, res) => {
    try {
      const f = (req as any).file as Express.Multer.File | undefined;
      if (!f) return res.status(400).json({ error: "arquivo (campo 'file') é obrigatório" });
      const entidade_tipo = (req.body?.entidade_tipo as string) || "colaborador";
      const arquivo = fixFilename(f.originalname);

      // Arquivo que a IA não enxerga (Office, zip…) → devolve sem classificação, para revisão manual.
      if (!mimeSuportado(f.mimetype)) {
        return res.json({
          arquivo,
          entidade_tipo,
          tipo_codigo: "",
          sensivel: false,
          valido_ate: "",
          confianca: "baixa",
          resumo: "Tipo de arquivo não suportado pela IA — classificar manualmente.",
          colaborador_id: null,
          colaborador_nome: "",
          match: "sem",
        });
      }

      const tipos = await db.tipoDocumento.findMany({
        where: { entidade_tipo },
        select: { codigo: true, nome: true },
        orderBy: { codigo: "asc" },
      });
      const codigos = tipos.map((t: any) => t.codigo);

      const schema = {
        type: "OBJECT",
        properties: {
          tipo_codigo: { type: "STRING", enum: [...codigos, "outro"] },
          sensivel: { type: "BOOLEAN" },
          valido_ate: { type: "STRING" },
          colaborador_nome: { type: "STRING" },
          confianca: { type: "STRING", enum: ["alta", "media", "baixa"] },
          resumo: { type: "STRING" },
          // campos específicos por tipo, para pré-preencher o lançamento no app dono (ponte)
          dados_extraidos: {
            type: "OBJECT",
            properties: {
              cid: { type: "STRING" },
              dias_afastamento: { type: "STRING" },
              horas: { type: "STRING" },
              data_inicio: { type: "STRING" },
              data_emissao: { type: "STRING" },
              medico_nome: { type: "STRING" },
              medico_crm: { type: "STRING" },
              data_realizacao: { type: "STRING" },
              vencimento: { type: "STRING" },
              instrutor: { type: "STRING" },
              carga_horaria: { type: "STRING" },
              // admissão (pessoa ainda não cadastrada)
              nome_completo: { type: "STRING" },
              cpf: { type: "STRING" },
              rg: { type: "STRING" },
              data_nascimento: { type: "STRING" },
              data_admissao: { type: "STRING" },
              cargo: { type: "STRING" },
              pis: { type: "STRING" },
            },
          },
        },
        required: ["tipo_codigo", "sensivel", "confianca", "resumo"],
      };

      const ia = await gerarJson({
        buffer: f.buffer,
        mimeType: f.mimetype,
        prompt: montarPrompt(entidade_tipo, tipos),
        schema,
      });

      // Casa o nome detectado com o cadastro (só p/ colaborador).
      let colaborador_id: string | null = null;
      let colaborador_nome = (ia.colaborador_nome as string) || "";
      let match = "sem";
      if (entidade_tipo === "colaborador" && colaborador_nome.trim()) {
        const m = casar(colaborador_nome, await carregarColaboradores());
        if (m) {
          colaborador_id = m.colaborador.id;
          colaborador_nome = m.colaborador.nome; // usa o nome canônico do cadastro
          match = m.tipo;
        }
      }

      // LGPD: registra que o conteúdo foi enviado à IA.
      const u = (req as any).user as (TokenPayload & { internal?: boolean }) | undefined;
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || undefined;
      await logAcesso(u?.sub ?? null, "triagem_ia", { recurso: "ged.documento", ip });

      // limpa os campos vazios que a IA devolve "" (deixa só o que detectou de verdade)
      const dados_extraidos: Record<string, string> = {};
      for (const [k, v] of Object.entries((ia.dados_extraidos as Record<string, unknown>) ?? {})) {
        if (typeof v === "string" && v.trim()) dados_extraidos[k] = v.trim();
      }

      res.json({
        arquivo,
        entidade_tipo,
        tipo_codigo: ia.tipo_codigo === "outro" ? "" : ia.tipo_codigo ?? "",
        sensivel: !!ia.sensivel,
        valido_ate: (ia.valido_ate as string) || "",
        confianca: ia.confianca ?? "baixa",
        resumo: ia.resumo ?? "",
        dados_extraidos,
        colaborador_id,
        colaborador_nome,
        match,
      });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}

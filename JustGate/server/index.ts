import "dotenv/config";
import express from "express";
import cors from "cors";
import { identifyByPhone } from "./core.ts";
import { route, type Inbound } from "./router.ts";
import { sendText, waConfigured } from "./whatsapp.ts";

const app = express();
app.use(cors());
app.use(express.json());

// Buffer em memória das últimas mensagens (para o painel). Some ao reiniciar — é só vitrine.
interface RecentItem {
  at: string;
  from: string;
  name?: string;
  identificado: boolean;
  texto: string;
  reply: string;
  origem: string;
}
const recent: RecentItem[] = [];
function record(item: RecentItem) {
  recent.unshift(item);
  if (recent.length > 20) recent.pop();
}

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "just-gate", whatsapp: waConfigured() ? "configurado" : "simulado" }),
);

// Simula uma mensagem recebida (sem enviar nada no WhatsApp) — usado pelo painel.
app.post("/simular", async (req, res) => {
  const { from, text } = req.body ?? {};
  if (!from || !text) return res.status(400).json({ error: "from e text são obrigatórios" });
  const msg: Inbound = { from, type: "text", text };
  const colaborador = await identifyByPhone(from);
  const reply = route(msg, colaborador);
  record({
    at: new Date().toISOString(),
    from,
    name: colaborador?.nome,
    identificado: !!colaborador,
    texto: text,
    reply,
    origem: "simulado",
  });
  res.json({ identificado: !!colaborador, nome: colaborador?.nome ?? null, reply });
});

// Painel de status (a "cara" do JustGate) — status, conexão com o Core e últimas mensagens.
app.get("/", async (_req, res) => {
  let core = "offline";
  try {
    const r = await fetch((process.env.CORE_URL ?? "http://127.0.0.1:4100") + "/api/health", {
      signal: AbortSignal.timeout(2000),
    });
    core = r.ok ? "online" : "erro";
  } catch {
    core = "offline";
  }
  const wa = waConfigured() ? "configurado" : "simulado";
  const badge = (txt: string, ok: boolean) =>
    `<span class="badge ${ok ? "ok" : "off"}">${txt}</span>`;
  const linhas =
    recent
      .map(
        (m) => `<tr>
        <td>${m.at.slice(11, 19)}</td>
        <td>${m.from}</td>
        <td>${m.identificado ? `✅ ${m.name ?? ""}` : "❓ desconhecido"}</td>
        <td>${m.texto}</td>
        <td>${m.reply}</td>
        <td><small>${m.origem}</small></td>
      </tr>`,
      )
      .join("") ||
    `<tr><td colspan="6" style="text-align:center;color:#9ca3af">nenhuma mensagem ainda — use o simulador acima</td></tr>`;

  res.type("html").send(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>JustGate</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f1f5f9;color:#1f2937}
  header{background:#0f2742;color:#fff;padding:20px 28px} header h1{margin:0;font-size:22px}
  header p{margin:4px 0 0;color:#9fb3c8;font-size:14px}
  main{max-width:1000px;margin:24px auto;padding:0 16px}
  .card{background:#fff;border-radius:12px;padding:18px 20px;margin-bottom:18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;margin-right:8px}
  .badge.ok{background:#dcfce7;color:#166534} .badge.off{background:#fee2e2;color:#991b1b}
  h2{font-size:15px;color:#0f2742;margin:0 0 12px}
  input,button{font:inherit;padding:9px 12px;border-radius:8px;border:1px solid #cbd5e1}
  button{background:#0f8a7e;color:#fff;border:0;cursor:pointer;font-weight:600}
  .row{display:flex;gap:8px;flex-wrap:wrap} .row input[name=from]{width:200px} .row input[name=text]{flex:1;min-width:220px}
  table{width:100%;border-collapse:collapse;font-size:13px} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eef2f7;vertical-align:top}
  th{color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
  #res{margin-top:10px;font-size:14px}
</style></head><body>
<header><h1>🛡️ JustGate</h1><p>Gateway WhatsApp da Plataforma JUST · porta 4200</p></header>
<main>
  <div class="card">
    <h2>Status</h2>
    ${badge("JustGate: online", true)}
    ${badge("WhatsApp: " + wa, wa === "configurado")}
    ${badge("Core: " + core, core === "online")}
  </div>
  <div class="card">
    <h2>Simular mensagem recebida</h2>
    <div class="row">
      <input name="from" placeholder="número (ex.: 554498532408)" value="554498532408">
      <input name="text" placeholder="mensagem (ex.: preciso liberar acesso)" value="oi">
      <button onclick="sim()">Enviar ao JustGate</button>
    </div>
    <div id="res"></div>
  </div>
  <div class="card">
    <h2>Últimas mensagens</h2>
    <table><thead><tr><th>hora</th><th>de</th><th>quem</th><th>texto</th><th>resposta</th><th>origem</th></tr></thead>
    <tbody>${linhas}</tbody></table>
  </div>
</main>
<script>
async function sim(){
  const from=document.querySelector('[name=from]').value, text=document.querySelector('[name=text]').value;
  const r=await fetch('/simular',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from,text})});
  const j=await r.json();
  document.getElementById('res').innerHTML = r.ok
    ? '<b>'+(j.identificado?('✅ '+j.nome):'❓ não identificado')+':</b> '+j.reply
    : '⚠️ '+(j.error||'erro');
  setTimeout(()=>location.reload(), 800);
}
</script>
</body></html>`);
});

// Páginas públicas exigidas pela Meta para publicar o app. Provisórias (servidas pelo túnel
// em dev); em produção apontar para uma página no domínio da empresa.
const PAGE = (titulo: string, corpo: string) =>
  `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo} — Plataforma JUST</title><style>body{font-family:system-ui,Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#1f2937;line-height:1.6}h1{color:#0f2742}</style></head><body><h1>${titulo}</h1>${corpo}<hr><p><small>Construtora JUST — Plataforma de Gestão (JustGate). Contato: samuel@construtorajust.com.br</small></p></body></html>`;

app.get("/privacy", (_req, res) =>
  res.type("html").send(
    PAGE(
      "Política de Privacidade",
      `<p>A Plataforma JUST (Construtora JUST) trata dados pessoais de colaboradores e parceiros
      exclusivamente para fins internos de gestão (RH, segurança do trabalho, obras e
      atendimento via WhatsApp), em conformidade com a <strong>LGPD (Lei 13.709/2018)</strong>.</p>
      <p>Mensagens recebidas pelo WhatsApp são usadas apenas para identificar o remetente e
      encaminhar a solicitação ao setor responsável. Não compartilhamos dados com terceiros
      para fins de marketing. O titular pode solicitar acesso, correção ou exclusão dos seus
      dados pelo contato abaixo.</p>`,
    ),
  ),
);

app.get("/terms", (_req, res) =>
  res.type("html").send(
    PAGE(
      "Termos de Uso",
      `<p>Este serviço é de uso interno da Construtora JUST e de seus parceiros autorizados,
      destinado à gestão operacional da empresa. O uso é restrito a pessoas cadastradas e
      identificadas. É vedado o uso para fins não relacionados à operação da empresa.</p>`,
    ),
  ),
);

// Verificação do webhook (a Meta chama 1x ao configurar). Devolve o challenge se o token bater.
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log(`[verify] mode=${mode} token=${token} (esperado ${process.env.WA_VERIFY_TOKEN})`);
  if (mode === "subscribe" && token === (process.env.WA_VERIFY_TOKEN ?? "")) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Recebimento de mensagens. Responde 200 IMEDIATO (a Meta reenvia se demorar) e processa depois.
app.post("/webhook", (req, res) => {
  res.sendStatus(200);
  console.log(`[post] recebido (${(req.body?.entry ?? []).length} entry)`);
  for (const msg of extractMessages(req.body)) {
    handleInbound(msg).catch((e) => console.error("erro ao tratar mensagem:", e));
  }
});

// Extrai as mensagens do payload da Cloud API (estrutura entry[].changes[].value.messages[]).
function extractMessages(body: any): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      const nome = value?.contacts?.[0]?.profile?.name as string | undefined;
      for (const m of value?.messages ?? []) {
        out.push({
          from: m.from,
          name: nome,
          type: m.type,
          text: m.text?.body,
          mediaId: m.image?.id ?? m.document?.id ?? m.audio?.id,
        });
      }
    }
  }
  return out;
}

async function handleInbound(msg: Inbound): Promise<void> {
  const colaborador = await identifyByPhone(msg.from);
  const quem = colaborador ? `${colaborador.nome} (${colaborador.id})` : "desconhecido";
  console.log(`[in] ${msg.from} (${quem}) tipo=${msg.type} texto=${msg.text ?? "-"}`);
  const reply = route(msg, colaborador);
  record({
    at: new Date().toISOString(),
    from: msg.from,
    name: colaborador?.nome ?? msg.name,
    identificado: !!colaborador,
    texto: msg.text ?? `[${msg.type}]`,
    reply,
    origem: "whatsapp",
  });
  await sendText(msg.from, reply);
}

const PORT = Number(process.env.PORT ?? 4200);
app.listen(PORT, () => console.log(`JustGate (WhatsApp) rodando em http://localhost:${PORT}`));

# JustGate — gateway WhatsApp (Meta Cloud API)

Serviço Node/Express (porta **4200**) que recebe mensagens do WhatsApp via **Meta Cloud API**,
identifica o remetente no **JustCore (4100)** pelo telefone e roteia a mensagem para o módulo
certo. **Sem cadastro próprio** — colaborador/EPI/obra vêm sempre do Core.

Arquivos-chave em `server/`: `index.ts` (webhook `GET/POST /webhook`, `GET /health`, painel em
`GET /` com simulador, `POST /simular`, `/privacy` e `/terms`), `core.ts` (`identifyByPhone`),
`router.ts` (roteamento por intenção/texto-chave), `whatsapp.ts` (envio de texto/botões, download
de mídia, modo simulado sem `WA_TOKEN`), `fluxo.ts` (fluxo de triagem de documento: mídia → IA do
Core classifica → proposta pendente → botões Confirmar/Cancelar → grava no GED via Core).

Padrão a seguir: nunca duplicar cadastro — toda consulta de colaborador é via `CORE_URL` (HTTP,
`x-internal-token`). Segredos (`WA_TOKEN`, `WA_VERIFY_TOKEN`, `INTERNAL_TOKEN`) só no `.env`.

Ver `docs/resumo-projeto.md` seção 7 para detalhes completos (decisões de arquitetura, janela de
24h/templates, GED de mídia) e a skill `justgate-whatsapp` para regras de domínio.

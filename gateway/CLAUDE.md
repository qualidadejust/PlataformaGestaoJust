# gateway — orquestrador de deploy (infraestrutura, não é um app de negócio)

**Não confundir com `JustGate/`** (esse sim é o app de negócio, o gateway WhatsApp na porta
4200). Este `gateway/` é o serviço único que permite hospedar os 6 backends Node da plataforma
num único **Render Web Service** free tier (~750h/mês, 512 MB, sem rodar 6 serviços separados).

`index.ts` sobe cada backend (Core, Eleva, Security, Train, Frota, Gate, Atestados) como
**processo-filho** (`npm run start`) em uma **porta interna fixa** (`BACKENDS`) e expõe um
**proxy reverso** (`http-proxy-middleware`) no `$PORT` público, roteando por path
(`/core`, `/eleva`, `/security`, `/train`, `/frota`, `/gate`, `/atestados` — prefixo removido
antes de repassar). Não dá para juntar os 6 Express num só processo porque cada app tem seu
próprio Prisma Client gerado sob o mesmo nome `@prisma/client` (colidem) — por isso processos
separados, cada um com seu `node_modules`.

**Lazy start**: cada backend só é iniciado (`ensureStarted` + `waitForPort`) na 1ª requisição ao
seu path, para caber em 512 MB (subir os 6 no boot estourava a RAM/OOM). Exceção: o Core sobe
"eager" no boot do gateway, pois é dependência direta de todos (inclusive chamado por
`127.0.0.1:4100` de dentro do JustGate ao processar webhook, sem passar pelo proxy). `GET /` e
`GET /health` não disparam start, só mostram `iniciados`. Também valida JWT (mesmo `JWT_SECRET`
do Core) como defesa em profundidade quando setado, liberando OPTIONS/login/webhook do WhatsApp.

Ver `docs/resumo-projeto.md` seção 11 (trecho "Backends Node → consolidados num único Render
Web Service" / "Implementado em `gateway/`") para o racional completo de deploy.

# gateway

Router de deploy no Render.

- **Porta**: `$PORT` (variável de ambiente do Render)
- **Stack**: Express 4, http-proxy-middleware, JWT
- **Papel**: sobe os backends internos e faz reverse-proxy numa única porta de serviço para deploy consolidado no Render

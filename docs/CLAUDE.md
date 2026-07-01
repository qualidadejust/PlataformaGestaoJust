# docs/ — documentação de arquitetura e integrações

Documentação de referência do monorepo, separada do código para não poluir o contexto de
cada app. **Leia `resumo-projeto.md` antes de qualquer mudança** — é a fonte de verdade de
arquitetura, portas, schema e integração entre apps; qualquer mudança que altere isso
**deve atualizar esse arquivo na mesma rodada** (ver regra no `CLAUDE.md` raiz).

Arquivos:
- `resumo-projeto.md` — arquitetura geral, mapa de portas, stack, schema do Core, deploy
  (Render/Neon/SharePoint), GED, motor de formulários, backbone ACL Prevision/Sienge.
- `agentes-especialistas.md` — quando criar uma nova skill de domínio para um módulo.
- `deploy-render.md` — guia passo a passo do deploy (Blueprint, variáveis por serviço,
  biometria via túnel, migrations).
- `integracao-sharepoint.md`, `integracao-email.md`, `setup-email-m365-admin.md`,
  `integracao-prevision.md` — detalhes de cada integração externa (credenciais, fluxo,
  troubleshooting) citadas no resumo.

Estes documentos de integração só são necessários ao mexer na integração específica —
não precisam ser lidos para trabalho geral em um app.

# JustDocs

Interface do GED (Gestão Eletrônica de Documentos).

- **Porta**: Front 4400 (sem backend/DB próprio)
- **Stack**: React 19 + Vite 6 (front-only)
- **Papel**: UI com 4 abas — Pastas (navegação tipo SharePoint: SGQ/Obras/Pessoas/Empresa), Documentos (enviar/consultar/versionar), Triagem IA (propõe tipo/colaborador/sensível/validade), Vencimentos
- **Sem back/DB** — consome a API do Core (proxy `/api`→4100); arquivos no SharePoint

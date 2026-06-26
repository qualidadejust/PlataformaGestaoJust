# JustCore

Núcleo de dados-mestre da plataforma. **Todos os outros apps dependem dele.**

- **Portas**: Front 4101 / Back 4100
- **Stack**: React 19 + Vite 6, Express 4, Prisma 7 (PostgreSQL)
- **Papel**: dono único de cadastros — empresas, obras, colaboradores, cargos, setores, fornecedores, insumos/EPIs, veículos, clientes, unidades, indicadores, biometria (templates), GED (documentos/storage), motor de formulários, e controle de acesso (usuários/perfis/permissões)
- **Biometria**: integra o serviço .NET SourceAFIS (porta 4002) para match 1:N de digitais
- **GED**: modelo `Documento` é o repositório central de arquivos; outros apps enviam documentos para cá
- **Schema**: `prisma/schema.prisma` — todos os modelos de cadastro + controle de acesso
- **Suba primeiro**: os demais apps consomem cadastros via rotas `/api/*` ou `/core/*`

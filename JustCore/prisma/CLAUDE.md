# JustCore/prisma — schema, migrations e importadores

`schema.prisma` é o **schema-fonte de toda a plataforma** (provider `postgresql`, adapter
`@prisma/adapter-pg`). Contém os cadastros-mestre (`Empresa`, `Cargo`, `Obra`, `Colaborador`,
`BiometriaDigital`, `Alocacao`, `Fornecedor`, `Setor`, `Indicador`, `Insumo`, `TipoDocumento`,
`Documento`, `Veiculo`, `CustoCargo`, `Cliente`, `Unidade`), o backbone ACL (`Local`,
`Servico`, `Tarefa`), o motor de formulários (`FormularioTipo`, `FormularioGrupo`,
`FormularioModelo`, `FormularioInstancia`) e o controle de acesso (`Usuario`/`Perfil`/
`Permissao`/`LogAcesso`).

`migrations/` é **gerada pelo Prisma** — não editar/detalhar manualmente, só aplicar via
`db:migrate`/`db:deploy`. Lembrar de rodar `npx prisma generate` após migrar (Prisma 7 com
driver adapter não regenera o client sozinho).

Os `import-*.ts` (ex.: `import-tipos-documento.ts`, `import-custos-cargo.ts`,
`import-consolidado.ts`, `import-cadastros-justeleva.ts`) e `seed*.ts` (`seed.ts`,
`seed-acesso.ts`, `seed-formularios.ts`, `seed-fvs-for.ts`) semeiam/recriam os dados-mestre —
os bancos SQLite/dumps com dado pessoal não são versionados, então esses scripts são a forma
de reconstituir o cadastro.

Qualquer mudança de schema/migração → skill `banco-dados`. Ver `docs/resumo-projeto.md`
seção 4.

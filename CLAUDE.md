# Plataforma de Gestão JUST — instruções

Orientações para o Claude Code trabalhar neste monorepo da Construtora JUST.

## Fonte de padrões — leia primeiro

**[`docs/resumo-projeto.md`](docs/resumo-projeto.md)** é a referência de arquitetura,
portas, schema e integração de todos os apps. **Leia antes de qualquer mudança** e siga os
padrões de lá. **Não reexplore o código para fatos que já estão documentados.**

Cada app pode ter convenções próprias mais detalhadas — siga-as ao mexer naquele app:
- **JustEleva**: `JustEleva/app/AGENTS.md` + `JustEleva/app/docs/resumo-projeto.md`.

## Regra de manutenção do resumo

Toda alteração deve ser **validada contra `docs/resumo-projeto.md`**:
- Se a mudança **está de acordo** com o documentado, siga o padrão de lá.
- Se a mudança **introduz ou altera** stack, arquitetura, **portas, schema, rotas ou
  integração entre apps**, **atualize `docs/resumo-projeto.md`** na mesma rodada. O resumo
  nunca pode ficar desatualizado. (Mudança dentro de um app → atualize também o resumo
  daquele app.)

## Arquitetura em uma linha

Monorepo multi-módulo. O **JustCore (4100)** é o **dono único dos cadastros** (fonte de
verdade); os demais apps guardam **só as suas transações** e referenciam IDs do Core (com
snapshot na hora). **Suba o JustCore primeiro.** Detalhes, portas e fluxo de biometria no
resumo.

## Workflow Git — obrigatório

Repositório: `https://github.com/qualidadejust/PlataformaGestaoJust`
Branch principal: `main`

**Antes de qualquer mudança:**
```bash
git pull origin main          # sincroniza com o remoto
```

**Para cada tarefa/mudança:**
1. Crie uma branch descritiva a partir da `main`:
   ```bash
   git checkout -b feat/nome-curto    # nova funcionalidade
   git checkout -b fix/nome-curto     # correção de bug
   git checkout -b chore/nome-curto   # ajuste técnico/docs
   ```
2. Faça os commits na branch (mensagens em inglês, breves e diretos):
   ```bash
   git add <arquivos>
   git commit -m "tipo(escopo): descrição curta"
   ```
3. Ao terminar, abra um Pull Request para `main` (nunca commite direto na `main`):
   ```bash
   git push -u origin <branch>
   gh pr create --title "título" --body "resumo da mudança"
   ```

**Regras de commit:**
- Mensagens curtas e simples, condizentes com a mudança.
- Nunca commite direto na `main`.
- Um PR por tarefa/funcionalidade — mantenha o escopo fechado.

## Comandos (por app)

Cada app roda isolado. Entre na pasta do app (`JustCore` | `JustEleva/app` | `JustSecurity`):

```bash
npm install
npm run db:migrate && npm run db:seed   # Core/Eleva (Prisma + seed); Security: db:deploy (Prisma, sem seed)
npm run dev                              # sobe front + back (Core também sobe a biometria .NET)
npm run lint                             # tsc --noEmit — deve passar SEM erros antes de concluir
```

## Regras rápidas

- **Cadastro é do Core.** Não duplique colaboradores/obras/EPIs num app; consuma do Core
  (rota `/core/...` via proxy do Vite, ou `sync-from-core`). Sem planilha/fonte paralela.
- **Dados sempre via Prisma** (nunca `better-sqlite3`/SQL cru); schema via migration;
  `DATABASE_URL` no `.env`. Qualquer demanda de dados (schema, query, migração) → skill
  **`banco-dados`**.
- **Telas acessam dados só pela camada de dados do app** (hooks/serviços + contexto de
  auth). Nunca importe a implementação concreta numa view.
- Ao adicionar tela: registre o gating por perfil e o item de menu — siga o padrão do app
  (no JustEleva: `App.tsx` + `Sidebar.tsx`, conforme `AGENTS.md`).
- UI **100% pt-BR**; classes condicionais via `cn()`; sempre dar o par `dark:` nas cores.
- **Dados sensíveis** (CPF/RG/PIS, CID/atestados, biometria, bancários) e os bancos SQLite
  **não são versionados**. Chaves/segredos nunca no front.
- Rode `npm run lint` no app tocado ao final e deixe sem erros.

## Otimização de tokens — delegue a especialistas

Reserve o modelo principal para integração e decisões de arquitetura; **delegue trabalho
mecânico/em massa e análise de domínio a skills/subagentes.**

Skills de domínio já existentes (invoque com `/nome`) — todas vivem na **raiz do monorepo**
(`.claude/skills/`), disponíveis em qualquer app:
- **RH / Desempenho**: `coachdesempenho`, `clima-organizacional`, `indicadores-dados`.
- **Design / UX**: `ux-ui-design` (projeto/heurísticas), `ui-polish` (densidade/diagramação).
- **Por módulo**: `sst-epi` (JustSecurity), `justgate-whatsapp` (JustGate), `frota-gestao`,
  `vistoria-entrega` (JustVistoria), `ged-documentos`, `qualidade-fvs`, `lgpd-compliance`,
  `controle-acesso`, `banco-dados`.
- **Arquitetura transversal**: `motor-formularios` (base única de formulários/checklists para
  todos os apps — template versionado + instância; mora no Core como o GED).
- **Específicas do JustEleva** (operacionais, só pra aquele app): `eleva-launch` (sobe
  3000/3001), `eleva-caveman` (debug de conexão front↔back).
- **Técnicas**: `frontend-just`, `backend-just`, `qa-tester`, `code-review`, `verify`, `run`.

Ao abrir um módulo novo (Obras, Qualidade, SST, Atestados, Acessos…), considere criar uma
skill de domínio para ele (ver `docs/agentes-especialistas.md`) em vez de carregar a regra
de negócio no contexto principal.

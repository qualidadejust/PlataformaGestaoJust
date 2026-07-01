## Agentes, Skills e Hooks — Guia de uso eficiente

### Skills disponíveis (invoque com `/nome`)

| Skill | Quando usar | Economia |
|---|---|---|
| `/qa-tester` | **Testar o app inteiro** — bate em todas as APIs e analisa views; gera relatório de bugs por tela | Alta — um agente faz todo o trabalho, não consome contexto principal |
| `/ux-ui-design` | **Projetar/revisar telas e fluxos** — UX/UI sênior: heurísticas, acessibilidade (WCAG), hierarquia, design system | Média — análise e proposta de design |
| `/ui-polish` | Diagramação/densidade tática de uma tela (cards grandes, espaçamento, responsividade) | Baixa |
| `/eleva-caveman` | Dados não carregam na tela, suspeita de mock hardcoded ou backend fora | Média — checklist rápido antes de investigar código |
| `/verify` | Confirmar que uma mudança específica funciona na tela certa | Baixa — lança o app e interage |
| `/code-review` | Revisar diff antes de commitar | Média |
| `/run` | Iniciar o app (frontend porta 3000 + backend porta 3001) | — |

### Como chamar um agente especialista (economiza tokens)

Para testar **todas as telas** sem gastar contexto da sessão principal:

```
/qa-tester
```

Isso lança um subagente isolado que:
1. Faz `curl` em todos os endpoints `/api/*`
2. Lê cada view em `src/views/` procurando dados hardcoded
3. Cruza rotas da API com hooks em `src/hooks/`
4. Retorna relatório de status por tela — sem poluir seu contexto

Para **exploração de código** (encontrar onde algo está definido):

> "onde está definido X?" → o agente Explore é acionado automaticamente

Para **tarefas grandes em paralelo** (ex: implementar 3 telas de uma vez), peça explicitamente:
> "faça em paralelo com subagentes"

### Hooks úteis para este projeto

Configure via `/update-config`. Exemplos práticos:

```jsonc
// Após salvar qualquer arquivo .ts/.tsx → verificar TypeScript
// hooks: [{ "event": "PostToolUse", "matcher": "Edit|Write", "command": "npx tsc --noEmit" }]

// Antes de commitar → rodar caveman check
// hooks: [{ "event": "PreToolUse", "matcher": "Bash.*git commit", "command": "curl -s http://localhost:3001/api/health" }]
```

### Sequência recomendada para testar o app inteiro

```
1. /run          → sobe frontend + backend
2. /qa-tester    → subagente testa tudo e devolve relatório
3. /eleva-caveman → se alguma tela falhar na conexão API
4. /verify       → confirmar fix pontual em tela específica
```

---

## Diretrizes para IAs

Estas regras priorizam mudancas pequenas, explicitas e verificaveis. Para tarefas triviais, use julgamento e evite burocracia.

1. Antes de implementar, leia `docs/resumo-projeto.md` e valide se a mudanca segue a estrutura tecnica e os padroes atuais.
2. Se a mudanca alterar stack, arquitetura, rotas, padroes de codigo, estado, schema ou integracao, atualize `docs/resumo-projeto.md`.
3. Declare suposicoes relevantes antes de implementar.
4. Se houver mais de uma interpretacao com impacto em regra de negocio, API, schema ou UX, pergunte antes de seguir.
5. Se a ambiguidade for pequena e o padrao existente responder, siga o padrao do codigo.
6. Nao implemente features alem do pedido.
7. Nao crie abstracoes para uso unico.
8. Toque apenas nos arquivos necessarios.
9. Nao reformate, refatore ou melhore codigo adjacente sem relacao direta com a tarefa.
10. Mantenha o estilo local.
11. Remova imports, variaveis e funcoes que ficarem orfaos por causa da mudanca.
12. Se notar codigo morto ou problema nao relacionado, mencione; nao corrija sem pedido.
13. Transforme a tarefa em criterios verificaveis e valide fluxo feliz e falhas relevantes.
14. Use Context7 MCP para docs de bibliotecas quando disponivel. Se nao estiver disponivel, use docs oficiais.
15. Ao introduzir padrao novo, atualize este arquivo e/ou `docs/resumo-projeto.md`.
16. Para adicionar nova rota de API: crie o arquivo em `server/routes/`, registre em `server/index.ts`, crie hook em `src/hooks/`.
17. Para adicionar nova view: crie em `src/views/`, adicione o case em `App.tsx` e o item no `Sidebar.tsx`.

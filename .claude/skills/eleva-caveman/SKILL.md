---
name: eleva-caveman
description: Diagnóstico de conexão front↔back ESPECÍFICO do JustEleva (portas 3000/3001, hooks/views do app em JustEleva/app). Use ao trabalhar no JustEleva quando o usuário disser "caveman", "verificar conexões" ou os dados não carregarem da API. NÃO use para os outros apps do monorepo — cada um tem suas próprias portas.
version: 1.0.0
---

# Caveman Debug Skill

Diagnóstico primitivo e direto para verificar se o app está usando o banco de dados real.

## Passos do Caveman Debug

### 1. Verificar se o servidor está rodando
```bash
curl http://localhost:3001/api/health
```
Se retornar `{"ok":true}`, o backend está ativo.

### 2. Verificar dados reais na API
```bash
curl http://localhost:3001/api/employees
curl http://localhost:3001/api/cycles
curl http://localhost:3001/api/evaluations
curl http://localhost:3001/api/pdi
curl http://localhost:3001/api/feedback
```

### 3. Verificar banco de dados diretamente
```bash
# No diretório app/
node -e "const db = require('better-sqlite3')('data/justavaliacoes.db'); console.log(db.prepare('SELECT * FROM employees').all());"
```

### 4. Verificar se a view está usando o hook
Procurar nas views por:
- Ausência de imports de hooks (`useEmployees`, `useEvaluations`, etc.)
- Arrays hardcoded como `const team = [...]` ou `const evaluations = [...]`
- Dados mockados com nomes como "Carlos Silva", "Mariana Souza" hardcoded no JSX

### 5. Verificar proxy do Vite
O `vite.config.ts` deve ter proxy `/api` apontando para `http://localhost:3001`.

## Quando os dados não aparecem

1. Backend não está rodando → `npm run dev` no diretório `app/`
2. View usa dados hardcoded → substituir pela hook correspondente
3. Hook não está sendo chamado → adicionar import e useQuery
4. Erro de CORS → verificar configuração do Express

## Mapeamento Views → Hooks

| View | Hook a usar |
|------|------------|
| TeamView | `useEmployees()` |
| EvaluationsListView | `useEvaluations()` |
| EvaluationFormView | `useEvaluation(id)` + `useSaveScores()` |
| FeedbackView | `useEmployees()` + `useFeedbacks()` + `useCreateFeedback()` |
| PDIView | `usePdiPlans()` + `useUpdatePdiAction()` |
| DashboardView | `useEmployees()` + `useEvaluations()` + `useFeedbacks()` + `usePdiPlans()` |
| CycleManagementView | `useCycles()` |

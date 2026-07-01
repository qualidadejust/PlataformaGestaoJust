# views/ — telas do JustFVS

Cinco telas, todas consumindo o Core via `lib/api.ts`:

- **`CronogramaView`**: árvore Obra→Zona→Pavimento→Tarefa (backbone do Core), botão "FVS" por
  tarefa, avanço físico do Prevision (barra + %), cadeado nas tarefas bloqueadas pelo gate
  sequencial.
- **`FvsListaView`**: listagem de `FormularioInstancia` (`escopo=fvs`) por obra — status
  (rascunho/conforme/com NC), autor, data.
- **`GestaoView`**: painel por obra cruzando Tarefa × FormularioInstancia, com status derivado
  (a abrir/rascunho/conforme/pendência NC/bloqueada), filtros obra/zona/pavimento/serviço e
  contadores. Sempre filtrar por `obra_id` no servidor; `staleTime` alto na árvore de tarefas.
- **`PendenciasView`**: NCs por obra/status (abertas/em ação/reverificação/fechadas), tela de
  tratativa (causa, ação corretiva, responsável, prazo) e botão reverificar (gera nova FVS).
- **`NovoFvsView`**: preenchimento da FVS — carrega o `FormularioModelo` publicado pelo
  `servico_sigla` da tarefa, itens conforme/não-conforme/NA com observação e foto (GED), rascunho
  ou concluir; item NC com `gera_nc.ativo` cria `NaoConformidade` no Core ao concluir.

Ver `docs/resumo-projeto.md` seção 16 (e skill `qualidade-fvs`) para o fluxo completo e o
contrato de dados de cada tela.

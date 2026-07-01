# src/hooks — camada de dados do front (React Query)

Só `useEpi.ts`: concentra toda a comunicação HTTP do app — cadastros do Core (`Colaborador`,
`Epi`, via proxy `/core`) e as transações locais (`Entrega`, `Ficha`, via `/api`). Exporta
tipos (`Colaborador`, `Epi`, `MotivoEntrega`) e labels pt-BR (`TIPO_CONTROLE_LABEL`).

Views **nunca** chamam `fetch`/`api()` diretamente — sempre por um hook daqui, para manter
uma única camada de dados (padrão do monorepo: telas não importam a implementação concreta).

Ver docs/resumo-projeto.md seção 6.

# biometria — serviço .NET SourceAFIS de match 1:N de digitais

Serviço local **.NET** (SourceAFIS) na porta **4002**, consumido só pelo backend do
JustSecurity (`server/biometria.ts`) e pelo JustCore — nunca exposto à rede externa.
Arquivo principal: `Program.cs` (+ `Biometria.csproj`).

Duas rotas: `POST /extract` (recebe imagem PNG base64, devolve template SourceAFIS
serializado — usado no **cadastro**, feito no Core) e `POST /match` (recebe `probe` +
lista de `candidates`, devolve `bestScore`/`bestIndex` — usado na **verificação**
1:N/1:1). Digital do leitor U.are.U 4500 é processada a 500 DPI (`FingerprintImageOptions.Dpi`).

O limiar de aceitação (`MATCH_THRESHOLD`, ~40 ≈ FMR 0,01%) é decidido por quem chama
(backend do Security), não aqui — este serviço só devolve o score.

Ver docs/resumo-projeto.md seção 6, subseção "Como a digital funciona".

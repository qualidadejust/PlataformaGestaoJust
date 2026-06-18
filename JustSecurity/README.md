# JustSecurity — Segurança do Trabalho

App separado da plataforma JUST para registrar **entrega de EPI assinada por digital**,
usando o leitor **HID / DigitalPersona U.are.U 4500**.

## Stack

- Frontend: React 19 + Vite 6 + Tailwind v4 + React Query — porta **4000**
- Backend: Express 4 + SQLite (better-sqlite3) — porta **4001**
- Leitor: `@digitalpersona/devices` + `@digitalpersona/websdk` (cliente WebSDK)

## Rodar

```bash
npm install
npm run dev      # sobe frontend (4000) + backend (4001)
```

Acesse: http://localhost:4000

Banco em `data/justsecurity.db` (gitignored, semeado com colaboradores e EPIs de exemplo).

## Como a digital é capturada

O navegador **não** acessa o leitor USB diretamente. O caminho:

```
Página (4000) → @digitalpersona/websdk (window.WebSdk) → agente local DigitalPersona → leitor U.are.U 4500
```

O componente `src/components/FingerprintCapture.tsx`:

1. Tenta conectar ao agente local da DigitalPersona.
2. Se conectar → captura a digital real (PNG) e salva como assinatura da entrega.
3. Se **não** houver agente (timeout de ~4s) → cai no modo **simulado**, permitindo
   testar todo o fluxo. Troca para a digital real automaticamente quando o agente
   for instalado — **sem mexer no código**.

## Falta para o leitor REAL: instalar o agente DigitalPersona

Diagnóstico desta máquina:

- ✅ Leitor U.are.U 4500 reconhecido pelo Windows
- ✅ Driver WBF instalado (Crossmatch U.are.U 5.0.0.5)
- ❌ Agente web (DigitalPersona Lite Client / WebSDK) **não instalado**

### Passo a passo

1. Baixe o **DigitalPersona Lite Client** (também chamado *WebSDK runtime* /
   *DigitalPersona Device Access Lite Client*). Ele acompanha o **DigitalPersona
   U.are.U SDK (Windows)**, distribuído pela HID Global:
   - Portal de desenvolvedor HID DigitalPersona, ou
   - O instalador do **U.are.U SDK** (inclui o Lite Client + amostras JavaScript).
2. Instale com o leitor conectado. Ele registra um serviço local que escuta em
   `wss://127.0.0.1` (porta da família 52181+).
3. Reinicie o navegador e recarregue http://localhost:4000.
4. Na tela **Entrega de EPI**, o status deve mudar de "Leitor não detectado" para
   "Aguardando o dedo no leitor…". Encoste o dedo → a digital real é capturada.

> Observação: o WBF (usado pelo Windows Hello) **não** entrega a imagem da digital
> a páginas web — por isso o Lite Client/WebSDK é necessário.

## Estrutura

```
JustSecurity/
├── server/
│   ├── db.ts            # SQLite + schema + seed
│   └── index.ts         # Express: /api/colaboradores, /api/epis, /api/entregas
├── src/
│   ├── lib/fingerprint.ts            # wrapper do leitor (real + simulado)
│   ├── components/FingerprintCapture.tsx
│   ├── hooks/useEpi.ts               # React Query
│   ├── views/EntregaEpiView.tsx      # registrar entrega + assinatura
│   ├── views/HistoricoView.tsx       # histórico com assinaturas
│   └── App.tsx                       # shell + navegação
└── vite.config.ts        # alias WebSdk → @digitalpersona/websdk, proxy /api
```

# JustGate

Gateway WhatsApp (Meta Cloud API).

- **Porta**: Back 4200 (sem frontend)
- **Stack**: Express 4, sem banco de dados
- **Papel**: recebe mensagem WhatsApp, identifica o remetente no Core pelo telefone, e roteia para o módulo correto
- **Sem cadastro próprio** — depende inteiramente do Core

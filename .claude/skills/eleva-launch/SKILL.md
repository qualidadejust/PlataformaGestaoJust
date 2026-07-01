---
name: eleva-launch
description: Sobe o JustEleva (frontend Vite porta 3000 + backend Express porta 3001 via concurrently) numa nova janela PowerShell e faz smoke-test das duas portas. ESPECÍFICO do JustEleva — use só ao iniciar este app. Para os outros apps do monorepo, cada um sobe isolado com suas próprias portas (`cd <app>; npm run dev`).
version: 1.0.0
---

# Launch — JustEleva

Inicia frontend (Vite, porta 3000) + backend (Express, porta 3001) juntos.

## Passos

### 1. Abrir janela PowerShell com o servidor

```powershell
Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoExit","-Command","npm run dev" `
  -WorkingDirectory "C:\Users\samu_\Documents\PlataformaGestao\JustEleva\app"
```

Isso abre uma nova janela. Feche-a para parar os servidores.

### 2. Aguardar e smoke test

```bash
sleep 7
curl -s http://localhost:3001/api/employees | head -c 100
curl -s http://localhost:3000 | head -c 80
```

- Backend OK: retorna JSON com array de employees
- Frontend OK: retorna `<!doctype html>`

### 3. Verificar health explícito

```bash
curl -s http://localhost:3001/api/health
```

Retorno esperado: `{"ok":true}`

## Portas e proxy

- Frontend: http://localhost:3000
- Backend:  http://localhost:3001
- O Vite proxia `/api/*` → `http://localhost:3001` (configurado em `vite.config.ts`)
- `npm run dev` usa `concurrently` para subir ambos

## Se falhar

- `npm` não é Win32 exe — use sempre `powershell.exe -Command "npm run dev"`, nunca `Start-Process npm`
- Se porta 3001 ocupada: `netstat -ano | findstr :3001` para ver PID, depois `taskkill /PID <pid> /F`

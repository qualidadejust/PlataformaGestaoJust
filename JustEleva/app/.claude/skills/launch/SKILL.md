---
name: launch
description: Use this skill when the user says "inicia o servidor", "start the app", "npm run dev", "sobe o servidor", or when /run needs to launch JustAvaliacoes. Starts frontend (port 3000) + backend (port 3001) via concurrently in a new PowerShell window, then smoke-tests both ports.
version: 1.0.0
---

# Launch — JustAvaliacoes

Inicia frontend (Vite, porta 3000) + backend (Express, porta 3001) juntos.

## Passos

### 1. Abrir janela PowerShell com o servidor

```powershell
Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoExit","-Command","npm run dev" `
  -WorkingDirectory "C:\Users\samu_\Documents\JustAvaliacoes\app"
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

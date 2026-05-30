# Rota Segura de Publicacao - Cesta Digital

Este documento registra o fluxo oficial para publicar o Cesta Digital sem redescobrir a infraestrutura.

## Estado atual

O sistema ja esta online:

- Frontend: `https://cesta-digital.vercel.app`
- Backend/API: `https://cesta-digital-api.onrender.com`
- Healthcheck DB: `https://cesta-digital-api.onrender.com/health/db`
- Swagger/API docs: `https://cesta-digital-api.onrender.com/docs`
- GitHub: `https://github.com/GabrielB-B/Cesta-Digital`
- Branch de publicacao: `main`

## Como publicar

A publicacao oficial e por Git.

Quando a alteracao estiver validada:

```powershell
git status --short
git add <arquivos-alterados>
git commit -m "mensagem clara"
git push origin main
```

Depois do push:

- a Vercel publica o frontend automaticamente;
- o Render usa o mesmo repositorio para o backend;
- os checks do GitHub indicam se a entrega ficou verde.

## O que pedir ao Codex

Gabriel pode pedir de forma simples:

```text
manda pra la
```

ou:

```text
publica online
```

O Codex deve entender que isso significa:

1. validar;
2. commitar;
3. executar `git push origin main`;
4. acompanhar Vercel/checks;
5. confirmar URLs publicas.

## Validacoes obrigatorias

### Frontend

```powershell
cd frontend
npm run lint
npm run build
npm run test:e2e
```

### Backend

Executar quando houver mudanca em `backend/`, `render.yaml`, migrations ou contratos da API:

```powershell
cd backend
.venv\Scripts\python.exe -m compileall app scripts tests
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

### Geral

```powershell
git diff --check
```

## Validacao online depois do push

Confirmar:

```powershell
Invoke-WebRequest -UseBasicParsing https://cesta-digital.vercel.app/login
Invoke-WebRequest -UseBasicParsing https://cesta-digital-api.onrender.com/health/db
```

Resultado esperado da API:

```json
{"database":"ok"}
```

## Regras de seguranca

- Nao commitar `.env`.
- Nao publicar tokens, senhas, cookies ou secrets.
- Nao alterar `VITE_API_URL` para `localhost` em producao.
- Nao trocar a URL publica da API sem confirmar.
- Se mexer em banco/migrations, avaliar backup antes do push.
- Se Render hibernar, aguardar o servico acordar antes de declarar falha.

## Variaveis de producao esperadas

Na Vercel:

```env
VITE_API_URL=https://cesta-digital-api.onrender.com
```

No Render:

```env
FRONTEND_CORS_ORIGINS=https://cesta-digital.vercel.app
APP_ENV=staging
AUTH_COOKIE_SAMESITE=none
```

Secrets como banco, `SECRET_KEY` e senha do admin ficam somente no painel da plataforma.

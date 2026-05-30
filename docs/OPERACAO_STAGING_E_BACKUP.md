# Operacao de Staging e Backup

Este guia resume o fluxo minimo para publicar o MVP em homologacao com seguranca operacional.

## Ambientes

## Estado atual online

O ambiente publico do Cesta Digital ja esta criado e ativo:

- Frontend Vercel: `https://cesta-digital.vercel.app`
- Backend Render: `https://cesta-digital-api.onrender.com`
- Healthcheck DB: `https://cesta-digital-api.onrender.com/health/db`
- Swagger/API docs: `https://cesta-digital-api.onrender.com/docs`
- GitHub: `https://github.com/GabrielB-B/Cesta-Digital`
- Branch de publicacao: `main`

A rotina normal de publicacao e `git push origin main`, apos validacoes. Ver tambem [`ROTA_PUBLICACAO_SEGURA.md`](./ROTA_PUBLICACAO_SEGURA.md).

## Rota gratuita recomendada para homologacao

Para teste real em rede, sem custo inicial, a composicao mais adequada para este stack e:

- Frontend React/Vite em Vercel Hobby: bom para site estatico e URL publica rapida.
- Backend FastAPI em Render Free Web Service: suficiente para homologacao, mas pode dormir apos inatividade.
- Banco MySQL em Aiven Free MySQL: mantem o projeto no dialeto atual `mysql+pymysql`.

Links oficiais:

- Vercel Pricing: https://vercel.com/pricing
- Render Free: https://render.com/docs/free
- Aiven MySQL Free Tier: https://aiven.io/docs/products/mysql/concepts/mysql-free-tier

Limitacoes importantes:

- Vercel Hobby e indicado para uso pessoal/nao comercial.
- Render Free pode hibernar depois de inatividade e demorar cerca de 1 minuto para acordar.
- Aiven Free MySQL tem limite de 1 GB, uma instancia por tipo de servico na organizacao e nao possui SLA de producao.

Configuracao minima para dominios separados:

- `APP_ENV=staging`
- `AUTH_COOKIE_SAMESITE=none`
- `FRONTEND_CORS_ORIGINS=https://url-do-frontend.vercel.app`
- `VITE_API_URL=https://url-da-api.onrender.com`
- `SECRET_KEY` com 32+ caracteres
- `BOOTSTRAP_ADMIN_ENABLED=false` apos criar/validar o primeiro admin

Como o cookie de sessao e `HttpOnly`, o backend precisa rodar em HTTPS quando `AUTH_COOKIE_SAMESITE=none`. Em `staging` e `production`, o sistema ja marca o cookie como `Secure`.

## Deploy GitHub + Render + Vercel

### 1. Preparar GitHub

1. Commitar e enviar a branch `main` para `origin`.
2. No Render e na Vercel, conectar o repositorio `GabrielB-B/Cesta-Digital`.

### 2. Backend no Render

Use o Blueprint `render.yaml` na raiz do repositorio.

O servico esperado e:

- Nome: `cesta-digital-api`
- Runtime: Python
- Plano: Free
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Pre-deploy command: `alembic upgrade head && python scripts/seed_initial_data.py`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/`

Na criacao do Blueprint, preencher os campos marcados como secretos:

- `FRONTEND_CORS_ORIGINS`: URL final da Vercel, por exemplo `https://cesta-digital.vercel.app`.
- `DB_HOST`: host do MySQL.
- `DB_PORT`: porta do MySQL, normalmente `3306`.
- `DB_NAME`: nome do banco.
- `DB_USER`: usuario do banco.
- `DB_PASSWORD`: senha do banco.
- `DB_SSL_REQUIRED`: `true` quando usar Aiven MySQL.
- `DB_SSL_CA`: opcional; deixe vazio para `ssl-mode=REQUIRED`.
- `FIRST_ADMIN_EMAIL`: email de recuperacao do primeiro admin.
- `FIRST_ADMIN_PASSWORD`: senha inicial forte do primeiro admin.

O `SECRET_KEY` e gerado automaticamente pelo Blueprint.

### 3. Frontend na Vercel

O repositorio possui `vercel.json` na raiz para buildar o frontend mesmo em monorepo. Se preferir configurar manualmente no painel:

- Root directory: raiz do repositorio ou `frontend`.
- Install command na raiz: `cd frontend && npm ci`.
- Build command na raiz: `cd frontend && npm run build`.
- Output directory na raiz: `frontend/dist`.
- Se usar root directory `frontend`, usar build padrao `npm run build` e output `dist`.

Variavel obrigatoria na Vercel:

```env
VITE_API_URL=https://cesta-digital-api.onrender.com
```

Se o Render criar uma URL diferente, use exatamente a URL real do servico.

### 4. Ajuste cruzado obrigatorio

Depois que a Vercel gerar a URL final, volte no Render e confirme:

```env
FRONTEND_CORS_ORIGINS=https://url-real-da-vercel
AUTH_COOKIE_SAMESITE=none
APP_ENV=staging
```

Sem esse ajuste, o login pode funcionar no backend, mas o navegador do celular pode bloquear cookie/CORS.

### Backend

1. Copie `backend/.env.staging.example` para `backend/.env`.
2. Ajuste `SECRET_KEY`, credenciais do banco e `FRONTEND_CORS_ORIGINS`.
3. Ajuste `AUTH_COOKIE_NAME` e `AUTH_COOKIE_SAMESITE` conforme dominio final.
4. Mantenha `BOOTSTRAP_ADMIN_ENABLED=false` por padrao em staging.

### Frontend

1. Copie `frontend/.env.staging.example` para `frontend/.env.production`.
2. Ajuste `VITE_API_URL` para o endpoint real da API.

## Subida de staging

### Backend

```powershell
cd backend
.venv\Scripts\Activate.ps1
alembic upgrade head
python scripts\seed_initial_data.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm ci
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## Backup manual do banco

```powershell
.\scripts\backup_mysql.ps1 `
  -Database cesta_digital_staging `
  -User staging_user `
  -Password "troque-aqui"
```

O script gera um `.sql` e um `.sha256` na pasta `backups`.

## Restore manual

```powershell
.\scripts\restore_mysql.ps1 `
  -InputFile .\backups\cesta_digital_staging-AAAAMMDD-HHMMSS.sql `
  -User staging_user `
  -Password "troque-aqui"
```

## Checklist de release

1. Confirmar `git status` limpo ou entendido.
2. Rodar `npm run lint`.
3. Rodar `npm run build`.
4. Rodar `npm audit --audit-level=high`.
5. Rodar `npm run test:e2e`.
6. Rodar `python -m compileall app scripts tests`.
7. Rodar `python -m unittest discover -s tests -v`.
8. Rodar `python -m pip_audit -r requirements.txt`.
9. Executar backup antes de migracao em staging.
10. Aplicar `alembic upgrade head`.
11. Validar login, familias, estoque, entregas e auditoria.

## Checklist de rollback

1. Parar trafego para o ambiente.
2. Reaplicar a versao anterior do codigo.
3. Restaurar o banco a partir do ultimo `.sql` valido.
4. Revalidar login, dashboard e entregas.

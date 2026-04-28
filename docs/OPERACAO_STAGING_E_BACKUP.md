# Operacao de Staging e Backup

Este guia resume o fluxo minimo para publicar o MVP em homologacao com seguranca operacional.

## Ambientes

### Backend

1. Copie `backend/.env.staging.example` para `backend/.env`.
2. Ajuste `SECRET_KEY`, credenciais do banco e `FRONTEND_CORS_ORIGINS`.
3. Mantenha `BOOTSTRAP_ADMIN_ENABLED=false` por padrao em staging.

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
4. Rodar `python -m compileall app scripts tests`.
5. Rodar `python -m unittest discover -s tests -v`.
6. Executar backup antes de migracao em staging.
7. Aplicar `alembic upgrade head`.
8. Validar login, familias, estoque, entregas e auditoria.

## Checklist de rollback

1. Parar trafego para o ambiente.
2. Reaplicar a versao anterior do codigo.
3. Restaurar o banco a partir do ultimo `.sql` valido.
4. Revalidar login, dashboard e entregas.

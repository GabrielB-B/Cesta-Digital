# Setup e Uso

## Objetivo

Este documento explica como subir o backend, o frontend e o banco para operar o Cesta Digital localmente.

## Pre-requisitos

- Python 3.12 ou superior.
- Node.js 22 ou superior.
- npm 10 ou superior.
- MySQL 8 ou outro banco compativel com `mysql+pymysql`.

## Estrutura principal

- `backend/`: API FastAPI, regras de negocio, modelos e migracoes.
- `frontend/`: interface React + Vite.
- `docs/`: documentacao tecnica, operacao, checkpoint e roadmap.
- `scripts/` e `backend/scripts/`: seeds e apoio operacional.

## 1. Configurar backend

### Arquivo de ambiente

Copie `backend/.env.example` para `backend/.env`.

Campos obrigatorios:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `FIRST_ADMIN_NAME`
- `FIRST_ADMIN_EMAIL`
- `FIRST_ADMIN_PASSWORD`
- `SECRET_KEY`

### Instalar dependencias

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Para rodar testes:

```powershell
pip install -r requirements-dev.txt
```

### Rodar migracoes

```powershell
alembic upgrade head
```

### Popular dados iniciais

```powershell
python scripts\seed_initial_data.py
```

Esse seed cria:

- perfis `admin`, `lider_social` e `operador`
- o primeiro usuario administrador com base no `.env`
- categorias iniciais `alimentos`, `higiene` e `limpeza`

### Subir a API

```powershell
uvicorn app.main:app --reload
```

URLs esperadas:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Healthcheck DB: `http://127.0.0.1:8000/health/db`

## 2. Configurar frontend

### Arquivo de ambiente

Copie `frontend/.env.example` para `frontend/.env`.

Valor inicial:

```env
VITE_API_URL=http://127.0.0.1:8000
```

### Instalar dependencias e subir

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\frontend
npm install
npm run dev
```

URL esperada:

- Frontend: `http://127.0.0.1:5173`

## 3. Fluxo de uso atual

### Acesso

1. Suba backend e frontend.
2. Entre com o usuario admin criado no seed.
3. O login usa JWT e protege as rotas internas.

### Operacao social

1. Cadastre uma familia.
2. Cadastre membros da familia.
3. Edite ou exclua membros quando necessario.
4. Cadastre beneficios.
5. Edite ou exclua beneficios quando necessario.
6. Gere o preview de elegibilidade.
7. Registre a avaliacao social.

### Operacao de estoque e entrega

1. Cadastre ou revise categorias de item pela tela `Categorias`.
2. Cadastre itens no frontend.
3. Registre lotes de entrada.
4. Cadastre tipos de cesta pela tela `Cestas`.
5. Adicione a receita diretamente no detalhe da cesta.
6. Registre movimentacoes manuais quando necessario.
7. Crie agendamentos.
8. Confirme entregas para baixar estoque automaticamente.

### Administracao

1. Entre com um usuario `admin`.
2. Abra `Usuarios` no menu lateral.
3. Cadastre usuarios, perfis e status.
4. Use a tela para redefinir senhas quando necessario.
5. Abra `Auditoria` para consultar eventos criticos do sistema.

## 4. Limitacoes atuais de uso

- A auditoria ainda nao possui exportacao pela interface.
- O rate limit de login e em memoria; em producao com multiplas instancias, deve migrar para Redis ou equivalente.
- Ainda falta ligar observabilidade externa de producao.
- O frontend ainda esta entrando em uma rodada de refinamento visual.

## 5. Comandos de validacao

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\frontend
npm run lint
npm run build

cd C:\Users\Gabriel\Documents\cesta-digital\backend
.venv\Scripts\python.exe -m compileall app scripts tests
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## 6. Comandos rapidos para iniciar

Terminal 1:

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\backend
.venv\Scripts\Activate.ps1
alembic upgrade head
python scripts\seed_initial_data.py
uvicorn app.main:app --reload
```

Terminal 2:

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\frontend
npm run dev
```

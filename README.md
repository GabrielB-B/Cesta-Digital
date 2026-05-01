# Cesta Digital

Sistema web para gestao social, estoque, cestas basicas e entregas da UPG.

O projeto organiza o fluxo completo de atendimento: cadastro de familias, avaliacao social, controle de estoque por lote, montagem de tipos de cesta, agendamento, confirmacao de entrega com baixa automatica, usuarios por perfil e auditoria operacional.

## Status do MVP

MVP profissional em validacao local.

Ja possui backend, frontend, banco, migrations, seed inicial, CI, testes automatizados, auditoria, backup manual, controle de acesso por papel e acabamento visual premium inicial. Ainda nao deve ser tratado como producao final antes de staging real, observabilidade externa, smoke/e2e de frontend e checklist de homologacao.

## Principais recursos

- Login com JWT e controle de acesso por perfil.
- Cadastro, consulta, edicao e inativacao de familias.
- Cadastro de pessoas, beneficios e avaliacao social.
- Sugestao de elegibilidade com validacoes de pontuacao e coaprovador.
- Cadastro de categorias, itens, lotes e movimentacoes de estoque.
- Tipos de cesta com receita editavel.
- Agendamento, reagendamento, cancelamento e confirmacao de entregas.
- Baixa automatica de estoque ao confirmar entrega.
- Dashboard operacional.
- Administracao de usuarios.
- Auditoria administrativa com exportacao CSV.
- Feedback visual de sucesso/erro e estados acessiveis em fluxos principais.
- Interface React com identidade visual refinada para o MVP.

## Stack

Backend:

- Python
- FastAPI
- SQLAlchemy
- Alembic
- MySQL
- PyJWT
- unittest

Frontend:

- React
- TypeScript
- Vite
- React Router
- CSS global com tokens visuais do produto

Operacao e qualidade:

- GitHub Actions
- `pip-audit`
- `npm audit`
- scripts de backup e restore MySQL

## Como rodar localmente

Backend:

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\backend
.venv\Scripts\Activate.ps1
alembic upgrade head
python scripts\seed_initial_data.py
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\frontend
npm run dev
```

URLs locais:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Healthcheck DB: `http://127.0.0.1:8000/health/db`

Se o backend ja estiver rodando na porta `8000`, o `uvicorn` pode retornar erro de soquete. Nesse caso, confira o processo ou use temporariamente `--port 8001`. O passo a passo completo fica em [`docs/MANUAL_PROGRAMADOR.md`](docs/MANUAL_PROGRAMADOR.md).

## Validacoes recentes

Executado em 2026-05-01:

- Backend compile: OK.
- Backend testes automatizados: OK.
- `pip-audit`: OK.
- Frontend lint: OK.
- Frontend build: OK.
- `npm audit --audit-level=high`: OK.
- Frontend local: HTTP 200.
- Backend `/health/db`: OK.

## Documentacao

- [`docs/README.md`](docs/README.md): indice da documentacao.
- [`docs/MANUAL_PROGRAMADOR.md`](docs/MANUAL_PROGRAMADOR.md): guia simples para rodar, testar e evoluir o projeto.
- [`docs/SETUP_E_USO.md`](docs/SETUP_E_USO.md): setup e uso local.
- [`docs/STACK_E_VERSOES.md`](docs/STACK_E_VERSOES.md): stack, arquitetura e versoes.
- [`docs/PLANO_PENDENCIAS_MVP_PROFISSIONAL.md`](docs/PLANO_PENDENCIAS_MVP_PROFISSIONAL.md): plano de pendencias e fases do MVP.
- [`docs/OPERACAO_STAGING_E_BACKUP.md`](docs/OPERACAO_STAGING_E_BACKUP.md): staging, backup, restore e release.
- [`docs/CHECKPOINT_2026-05-01.md`](docs/CHECKPOINT_2026-05-01.md): checkpoint mais recente da rodada premium.

## Proximos passos recomendados

- Rodada fina de design premium no frontend, focada em microdetalhes visuais.
- Smoke/e2e de frontend para login, familias, estoque e entregas.
- Staging acessivel por URL real.
- Observabilidade externa para erros, metricas e logs.
- Checklist de homologacao funcional por perfil.

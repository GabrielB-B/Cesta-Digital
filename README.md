# Cesta Digital

Sistema web para gestao social, estoque, cestas basicas e entregas da UPG.

O projeto organiza o fluxo completo de atendimento: cadastro de familias, avaliacao social, controle de estoque por lote, montagem de tipos de cesta, agendamento, confirmacao de entrega com baixa automatica, usuarios por perfil e auditoria operacional.

## Status do MVP

Produto online em **fase de homologação e profissionalização**.

Já possui backend, frontend, banco, migrations, CI, testes automatizados, auditoria, controle de acesso por papel e publicação gerenciada. A auditoria de 14/07/2026 identificou bloqueios de validade, UX, CI/deploy e operação. A decisão vigente é **NO-GO para ampliar uso com dados e entregas reais** até concluir todos os gates obrigatórios, eliminar defeitos P0/P1 e obter a aprovação final de Gabriel no [documento profissional do produto](docs/PROJETO_PROFISSIONAL_CESTA_DIGITAL.md). A Fase 0 é um checkpoint de segurança para continuar a homologação controlada; não equivale ao `GO profissional`.

## Principais recursos

- Login por nome de login com JWT e controle de acesso por perfil.
- Sessao do frontend com cookie `HttpOnly`.
- Cadastro, consulta, edicao e inativacao de familias com codigo interno automatico.
- Cadastro de pessoas, beneficios e avaliacao social.
- Sugestao de elegibilidade com validacoes de pontuacao e coaprovador.
- Cadastro de categorias, itens, lotes e movimentacoes de estoque.
- Tipos de cesta com receita editavel.
- Agendamento, reagendamento, cancelamento e confirmacao de entregas.
- Baixa automatica de estoque ao confirmar entrega.
- Dashboard operacional.
- Administracao de usuarios.
- Auditoria administrativa com exportacao CSV.
- Salvaguardas para nao deixar o sistema sem administrador ativo.
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
- Playwright
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

Executado localmente em 14/07/2026 no commit `c0fd399`:

- Backend compile: OK.
- Backend testes automatizados: 29/29 OK.
- Frontend lint: OK.
- Frontend build: OK.
- Frontend e2e smoke com Playwright: 14/14 OK com servidor controlado.
- Frontend público e healthcheck do banco: OK.
- Último CI do mesmo commit no GitHub: **vermelho no job frontend**. O passe local não torna o release verde; a diferença/flakiness precisa ser corrigida.

## Documentacao

- [`docs/PROJETO_PROFISSIONAL_CESTA_DIGITAL.md`](docs/PROJETO_PROFISSIONAL_CESTA_DIGITAL.md): fonte canônica do estado atual, regras e plano de profissionalização.
- [`docs/README.md`](docs/README.md): indice da documentacao.
- [`docs/MANUAL_PROGRAMADOR.md`](docs/MANUAL_PROGRAMADOR.md): guia simples para rodar, testar e evoluir o projeto.
- [`docs/SETUP_E_USO.md`](docs/SETUP_E_USO.md): setup e uso local.
- [`docs/STACK_E_VERSOES.md`](docs/STACK_E_VERSOES.md): stack, arquitetura e versoes.
- [`docs/PLANO_PENDENCIAS_MVP_PROFISSIONAL.md`](docs/PLANO_PENDENCIAS_MVP_PROFISSIONAL.md): plano histórico anterior; consultar o documento canônico para o status vigente.
- [`docs/OPERACAO_STAGING_E_BACKUP.md`](docs/OPERACAO_STAGING_E_BACKUP.md): staging, backup, restore e release.
- [`docs/LGPD_PRIVACIDADE.md`](docs/LGPD_PRIVACIDADE.md): diretrizes de privacidade e tratamento de dados.
- [`docs/HOMOLOGACAO_MVP.md`](docs/HOMOLOGACAO_MVP.md): matriz executável de homologação por risco e perfil.
- [`docs/CHECKPOINT_2026-05-01.md`](docs/CHECKPOINT_2026-05-01.md): checkpoint mais recente da rodada premium.

## Proximos passos recomendados

- Corrigir a política de validade e saldo utilizável em todos os fluxos.
- Tornar a entrada de lote/validade uma jornada visível e guiada.
- Restabelecer CI verde como gate de publicação.
- Verificar backup/restore e classificar formalmente o ambiente público.
- Executar as fases de UX, domínio, identidade, segurança e homologação do documento canônico.

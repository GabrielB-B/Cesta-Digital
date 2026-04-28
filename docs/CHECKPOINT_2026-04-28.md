# Checkpoint Tecnico - 2026-04-28

Este checkpoint registra o estado do Cesta Digital apos a rodada de estabilizacao do MVP, incluindo backend, banco, API, frontend, testes, CI, operacao e documentacao.

## Resumo executivo

O projeto saiu de uma base funcional para um MVP mais profissional, com regras de dominio reforcadas, entrega e estoque mais seguros, auditoria operacional, protecao basica de login, scripts de backup, CI inicial e telas administrativas novas.

O foco desta etapa foi reduzir risco real de operacao: inconsistencias de estoque, acoes sem rastreabilidade, login sem limite de tentativa, manutencao social incompleta, ausencia de staging/backup e baixa cobertura dos fluxos centrais.

## Backend e API

- Corrigida a integridade transacional de entrega e estoque.
- Entrega a partir de agendamento agora bloqueia o agendamento e os lotes relevantes durante a confirmacao.
- Baixa automatica por entrega cria movimentacao de estoque dentro da mesma transacao.
- Movimentacao manual de estoque agora bloqueia o lote antes de alterar saldo.
- Regra de apenas um responsavel por familia validada na criacao e na edicao de pessoas.
- Criada trilha de auditoria para eventos criticos.
- Criado endpoint administrativo `GET /audit-logs`.
- Criado modelo `AuditLog` e migration `c3a1f5b2c4d8_create_audit_logs_table.py`.
- Login agora registra sucesso, falha e bloqueio por limite de tentativas.
- Criado rate limit em memoria para login com configuracao por ambiente.
- Criados headers de seguranca basicos em todas as respostas HTTP.
- Criado `X-Request-ID` por requisicao.
- Criado contexto de request para correlacionar logs, IP, usuario e auditoria.
- Criado logging estruturado em JSON.
- Politica de senha reforcada para usuarios administrados.
- Seed inicial agora respeita `BOOTSTRAP_ADMIN_ENABLED` e valida senha forte.

## Banco de dados

- Adicionada tabela `audit_logs`.
- Adicionados indices para consulta por evento, entidade, ator e request.
- Migration nova adicionada ao fluxo do Alembic.
- Scripts operacionais de backup e restore para MySQL adicionados em `scripts/`.

## Frontend

- Removido legado principal do frontend que duplicava arquitetura.
- Adicionada tela de auditoria administrativa.
- Adicionadas telas de edicao e exclusao de pessoas da familia.
- Adicionadas telas de edicao e exclusao de beneficios.
- Detalhe da familia agora mostra acoes operacionais para editar pessoas e beneficios.
- Tratamento de erro da API centralizado em `frontend/src/utils/api-error.ts`.
- Cliente HTTP agora possui timeout.
- Tela de usuarios passou a validar a mesma politica forte de senha do backend.
- Menu lateral passou a incluir auditoria para administradores.

## Operacao

- Criado `backend/.env.staging.example`.
- Criado `frontend/.env.staging.example`.
- Criado script `scripts/backup_mysql.ps1`.
- Criado script `scripts/restore_mysql.ps1`.
- Criado documento `docs/OPERACAO_STAGING_E_BACKUP.md`.
- CI inicial configurado em `.github/workflows/ci.yml` com lint, build, compile e testes.

## Testes

- Criada base de testes de integracao com SQLite em memoria.
- Cobertura adicionada para autenticacao.
- Cobertura adicionada para familias e regra de responsavel unico.
- Cobertura adicionada para permissoes por papel.
- Cobertura adicionada para estoque e saldo.
- Cobertura adicionada para entregas e baixa automatica.
- Cobertura adicionada para auditoria.
- Cobertura adicionada para administracao de usuarios.

## Validacao executada

Executado em 2026-04-28:

```powershell
cd backend
.venv\Scripts\python.exe -m compileall app scripts tests
.venv\Scripts\python.exe -m unittest discover -s tests -v

cd ..\frontend
npm run lint
npm run build
```

Resultado:

- Backend compile: OK.
- Backend testes: OK, 15 testes passando.
- Frontend lint: OK.
- Frontend build: OK.

## Estado funcional do MVP

Fluxos principais prontos para validacao:

- Login com JWT.
- Controle de acesso por papel.
- Cadastro e consulta de familias.
- Cadastro, edicao e exclusao de pessoas.
- Cadastro, edicao e exclusao de beneficios.
- Avaliacao social e sugestao de elegibilidade.
- Cadastro de categorias e itens.
- Entrada de estoque por lote.
- Movimentacao manual de estoque.
- Tipo de cesta e receita.
- Agendamento de entrega.
- Confirmacao de entrega com baixa automatica.
- Dashboard.
- Usuarios e perfis.
- Auditoria administrativa.

## Riscos restantes

- O frontend ainda precisa de uma rodada visual mais refinada para parecer produto final.
- A auditoria esta funcional, mas ainda nao possui exportacao.
- O rate limit de login e em memoria; para producao com multiplas instancias deve migrar para Redis ou equivalente.
- Observabilidade externa ainda nao esta ligada a uma ferramenta como Grafana, Sentry, Datadog ou OpenTelemetry Collector.
- Deploy real ainda precisa ser validado no ambiente final.

## Proximo checkpoint recomendado

O proximo checkpoint deve focar em:

- Refinamento visual e responsivo do frontend.
- Menu lateral recolhivel.
- Identidade visual mais profissional.
- Melhor tratamento visual de logo e marca.
- Smoke test de frontend.
- Deploy de staging acessivel por URL.

# Homologação Profissional do Cesta Digital

Este é o roteiro executável de homologação do produto. A visão, regras, arquitetura-alvo e backlog vigentes ficam em [`PROJETO_PROFISSIONAL_CESTA_DIGITAL.md`](./PROJETO_PROFISSIONAL_CESTA_DIGITAL.md).

## Status vigente

**NO-GO para ampliar o uso com dados e entregas reais.**

Motivos vigentes em 15/07/2026:

- a Fase 0 foi publicada na `main` no commit
  `374660b8337667137ed2557e4e41d9e4bd4ce5b7`, com CI `main` verde e smoke
  público básico aprovado;
- a Fase 2 publicou o primeiro bloqueio de domínio social no commit
  `77e7cbed73e959dc9b5326412d09dcaa0e160cfd`, impedindo marcação manual de
  família como apta/inapta sem avaliação social compatível;
- o checkpoint de distribuição da Fase 2 foi publicado no commit
  `88aa60bc355c3491ccc88cc1a431b29ba0af4891`, bloqueando duplicidade ativa de
  agendamento e promessa acima do estoque utilizável;
- backup/restore MySQL local real foi comprovado, mas o banco público ainda não
  possui a evidência exigida para receber a migration de rastreabilidade;
- os gates finais de domínio social, distribuição, UX/mobile, segurança, LGPD,
  observabilidade e usabilidade permanecem abertos.

Os defeitos de saldo vencido, FEFO e acesso à entrada de lote foram corrigidos,
aprovados em testes locais e publicados pela Fase 0. Isso remove os bloqueios
imediatos de segurança alimentar, mas não autoriza operação real antes dos gates
finais de domínio, LGPD, backup/restore real, UX e observabilidade.

O ambiente público pode continuar somente como homologação controlada com dados sintéticos ou anonimizados até o fechamento dos gates obrigatórios. Enquanto `BLQ-005` estiver aberto, dados pessoais reais são proibidos; autorização informal não substitui classificação do ambiente e aprovação de privacidade/LGPD.

Classificação operacional vigente do banco: **Banco destinado a homologação;
conteúdo não verificado.** Isso não afirma que a base esteja vazia ou livre de
dados reais; essa inspeção permanece pendente e bloqueia ampliação de uso.

## 1. Regra de aprovação

Uma rodada só pode receber `Aprovado` quando:

1. todos os casos `G0` estiverem aprovados;
2. não houver defeito P0/P1 aberto;
3. CI, deploy e smoke pertencerem ao mesmo commit;
4. backup e restore tiverem evidência válida quando houver migration;
5. cada perfil tiver sido testado;
6. desktop, mobile e teclado tiverem sido validados;
7. Gabriel registrar a decisão final.

Esta matriz governa a **homologação profissional final**, não apenas a Fase 0. Concluir a Fase 0 registra um checkpoint técnico e permite continuar testes controlados, mas o resultado permanece `NO-GO` para dados e entregas reais até todos os requisitos acima serem atendidos. Quando um caso depender de regra marcada como `Proposta para aprovação` no documento canônico, a decisão de Gabriel sobre essa regra é pré-condição; proposta pendente deixa o caso `Bloqueado`.

Decisões possíveis:

- `Aprovado`;
- `Aprovado com ressalvas`, somente para P2/P3 documentado e sem risco operacional;
- `Reprovado`.

## 2. Registro da rodada

Preencher uma cópia desta tabela a cada execução.

| Campo | Preenchimento |
|---|---|
| ID da rodada | `HOM-AAAA-MM-DD-NN` |
| Data/hora |  |
| Responsável pela execução |  |
| Responsável pela aprovação | Gabriel Bomfim Bispo |
| Commit completo |  |
| Tag/release |  |
| Ambiente |  |
| Classificação dos dados | sintéticos / anonimizados; dados reais somente após `GO profissional` e política formal aprovada |
| URL frontend |  |
| URL API |  |
| Banco/migration |  |
| Desktop/navegador |  |
| Mobile/dispositivo |  |
| Resultado | aprovado / aprovado com ressalvas / reprovado |
| Defeitos vinculados |  |
| Evidências |  |
| Observações |  |

### Evidência mínima por caso

- ID do caso e resultado esperado/obtido;
- captura ou vídeo quando visual;
- request/response sanitizado quando API;
- log com `request_id`, sem secrets ou dados pessoais;
- dispositivo, viewport e navegador;
- defeito vinculado quando falhar.

Não usar CPF, telefone, endereço, renda, condição de saúde, senha, cookie ou token real em evidências.

### Checkpoint local da Fase 0 — 14/07/2026

| Evidência | Resultado |
|---|---|
| Backend `compileall` + suíte completa | 53/53 testes aprovados |
| Dependências backend | `pip check` e `pip-audit` aprovados |
| Frontend lint e build | aprovados |
| Frontend E2E em modo CI | 25/25, 1 worker, `retries=0` |
| Dependências frontend | auditoria local sem vulnerabilidades conhecidas |
| Contrato de backup/restore | aprovado com cenários de falha, inventário e checksums |
| `git diff --check` | aprovado; somente avisos de normalização de fim de linha |
| Revisão independente do frontend | aprovada para o escopo da Fase 0, sem P0/P1 bloqueante |
| Revisão independente de release/operações | aprovada para o gate remoto, sem P0/P1 remanescente |
| QA visual Chromium | login inspecionado em 1440 × 900 e 390 × 844; aviso de homologação visível e sem overflow documental |

Pendências após o checkpoint local: drill real de backup/restore, configuração
efetiva da CA e inspeção da base. CI remoto, publicação pelo mesmo SHA e smoke
público foram comprovados no checkpoint remoto abaixo.

### Checkpoint remoto da Fase 0 — 15/07/2026

| Evidência | Resultado |
|---|---|
| Commit publicado | `374660b8337667137ed2557e4e41d9e4bd4ce5b7` |
| Promoção | `feat/fase-0-seguranca-release` → `main` por fast-forward |
| CI da branch | backend, frontend e operations aprovados |
| CI da `main` | workflow `CI` concluído com sucesso |
| Smoke público frontend | `https://cesta-digital.vercel.app/login` HTTP 200 |
| Smoke público backend | `https://cesta-digital-api.onrender.com/health/db` HTTP 200, `{"database":"ok"}` |

Pendências mantidas: drill real de backup/restore, configuração efetiva da CA,
inspeção/classificação da base, UX/mobile final, LGPD, observabilidade e decisão
formal de `GO profissional`.

### Checkpoint remoto da Fase 2 — 15/07/2026

| Evidência | Resultado |
|---|---|
| Commit publicado | `77e7cbed73e959dc9b5326412d09dcaa0e160cfd` |
| Promoção | `feat/fase-2-regras-funcionais` → `main` por fast-forward |
| Escopo | Status social da família governado por avaliação social compatível; cadastro inicial não oferece `apta/inapta` fora do fluxo correto |
| Backend local | `compileall` aprovado; suíte completa 54/54 testes aprovados |
| Frontend local | lint aprovado; build aprovado; E2E 25/25 aprovado |
| `git diff --check` | aprovado; somente avisos de normalização de fim de linha |
| CI da branch | backend, frontend e operations aprovados |
| CI da `main` | workflow `CI` concluído com sucesso |
| Smoke público frontend | `https://cesta-digital.vercel.app/login` HTTP 200 |
| Smoke público backend | `https://cesta-digital-api.onrender.com/health/db` HTTP 200, `{"database":"ok"}` |

Pendências mantidas: demais bloqueios de domínio, UX/mobile final, drill real de
backup/restore, LGPD, observabilidade e decisão formal de `GO profissional`.

### Checkpoint remoto de distribuição da Fase 2 — 15/07/2026

| Evidência | Resultado |
|---|---|
| Commit publicado | `88aa60bc355c3491ccc88cc1a431b29ba0af4891` |
| Promoção | `feat/fase-2-distribuicao-regras` → `main` por fast-forward |
| Escopo | Agendamento ativo respeita capacidade prometível do estoque utilizável e bloqueia duplicidade ativa por família+cesta |
| Backend local | `compileall` aprovado; suíte completa 55/55 testes aprovados |
| Frontend local | lint aprovado; build aprovado; E2E 25/25 aprovado |
| `git diff --check` | aprovado; somente avisos de normalização de fim de linha |
| CI da branch | backend, frontend e operations aprovados |
| CI da `main` | workflow `CI` público com status `Success`, duração 1m27s |
| Smoke público frontend | `https://cesta-digital.vercel.app/login` HTTP 200 |
| Smoke público backend | `https://cesta-digital-api.onrender.com/health/db` HTTP 200, `{"database":"ok"}` |

Pendências mantidas: publicação e validação pública da rastreabilidade, quantidade
decimal, agregados derivados, UX/mobile final, backup/restore do banco público,
LGPD, observabilidade e decisão formal de `GO profissional`.

### Checkpoint local de rastreabilidade da Fase 2 — 15/07/2026

| Evidência | Resultado |
|---|---|
| Branch | `feat/fase-2-rastreabilidade-entrega-lote` |
| Escopo | DOM-001 e DOM-006: código/status/localização/quarentena auditada do lote e itens/lotes efetivamente entregues |
| Backend local | `compileall` aprovado; suíte completa 56/56 testes aprovados |
| Frontend local | lint e build aprovados; E2E 27/27, incluindo rastreabilidade mobile sem overflow |
| Alembic | cabeça única `b7c9d1e2f3a4`; migration aditiva/expand, sem backfill em massa; legado permanece corrigível pela interface |
| Contrato operacional | `scripts/tests/backup_restore_contract.ps1` aprovado após corrigir o restore MySQL por entrada padrão |
| Drill MySQL local | backup exit code zero, 37.704 bytes, SHA-256 validado; restore `exact-manifest-v2`; migration aplicada; contagens conciliadas; banco temporário removido |
| Custódia local | Gabriel Bomfim Bispo; conjunto fora do repositório em diretório privado com EFS; retenção máxima de sete dias |
| Publicação da branch | commit `738afe85631095945b84b5fd8be7fcc352ce2078` enviado para `origin/feat/fase-2-rastreabilidade-entrega-lote` em 15/07/2026 |
| CI remoto da branch | workflow `CI` nº `29463482370`; jobs `frontend`, `backend` e `operations` concluídos com `success` para o mesmo SHA |
| Backup público pré-migration | aprovado em 16/07/2026; 52.921 bytes; SHA-256 `82C6C36C7619090B2FA74504D23020C4BF392FF9004DB72F9AE823ACB7E579B4`; manifesto e checksum conciliados; conjunto privado com retenção máxima de sete dias |
| Restore do backup público | aprovado em MySQL local isolado no modo `exact-manifest-v2`; 19 tabelas e contagens exatas conciliadas; revisão `9f2a7b6c8d1e` preservada; banco temporário removido |
| Gate público | **Aprovado para integração:** backup e restore do banco público comprovados antes da migration `b7c9d1e2f3a4` |

Resultado do checkpoint: código aprovado no gate remoto da branch e no gate de
recuperação do banco público. DOM-001 e DOM-006 permanecem `Em homologação` até
integração pelo SHA final e smoke público.

## 3. Pré-condições

- [ ] Ambiente explicitamente classificado como homologação ou produção.
- [ ] HTTPS ativo no frontend e backend.
- [ ] Variáveis revisadas, sem secrets padrão ou expostos.
- [ ] Commit implantado identificado na interface/API.
- [x] CI frontend e backend verdes no mesmo commit.
- [ ] Banco migrado com Alembic e revision registrada.
- [ ] Dados de teste preparados por perfil.
- [x] Backup verificado antes de migration.
- [x] Restore testado em ambiente limpo quando houver mudança de banco.
- [ ] Observabilidade e canal de alerta ativos.
- [ ] Navegadores/dispositivos definidos para a rodada.

## 4. Gate G0 — estoque, validade e segurança alimentar

Todos os casos desta seção são bloqueadores.

### HOM-EST-001 — encontrar a entrada de estoque

**Pré-condição:** operador autenticado.

1. Abrir Estoque.
2. Localizar a ação principal sem usar URL manual.
3. Criar um produto que controla validade.
4. Continuar para o primeiro lote.

**Esperado:** “Registrar entrada no estoque” está visível no módulo, o sistema explica produto × lote e o produto recém-criado oferece “Registrar primeiro lote”.

- [ ] Desktop aprovado.
- [ ] Mobile aprovado.
- [ ] Teclado aprovado.

### HOM-EST-002 — validade condicional por lote

1. Criar produto que controla validade.
2. Tentar registrar lote sem data.
3. Criar produto que não controla validade.
4. Registrar lote sem data.

**Esperado:** o primeiro é rejeitado com erro no campo; o segundo é aceito. A data nunca fica no produto mestre.

- [ ] Interface aprovada.
- [ ] API aprovada.
- [ ] Teste automatizado vinculado.

### HOM-EST-003 — coerência de datas

Testar:

- validade anterior ao recebimento;
- validade igual ao recebimento;
- validade no dia atual;
- recebimento futuro;
- troca de produto com/sem controle de validade.

**Esperado:** regras de data operacional são consistentes; valor antigo de validade não vaza para outro produto; erro explica como corrigir.

- [ ] Aprovado.

### HOM-EST-004 — estados de validade

Preparar lotes:

- válido por mais de 30 dias;
- vence em até 30 dias;
- vence em até 7 dias;
- vence hoje;
- vencido;
- sem validade permitida;
- quarentena/bloqueado;
- esgotado.

**Esperado:** estado correto na listagem, detalhe, filtros e alertas, sem depender apenas de cor.

- [ ] Desktop aprovado.
- [ ] Mobile aprovado.
- [ ] API aprovada.

### HOM-EST-005 — saldo físico × utilizável

1. Consultar resumo do produto.
2. Consultar dashboard.
3. Consultar disponibilidade da cesta.
4. Consultar resumo financeiro.

**Esperado:** todos mostram a mesma política. Vencido/bloqueado permanece no físico, mas não entra no utilizável, cestas possíveis ou valor utilizável.

- [ ] Aprovado.

### HOM-EST-006 — FEFO válido

1. Criar 3 lotes com saldo: um vencido, um válido que vence antes e outro válido que vence depois.
2. Confirmar saída/entrega.

**Esperado:** vencido é ignorado; o lote válido que vence primeiro é consumido; saldos e movimentos correspondem à baixa.

- [ ] Aprovado.
- [ ] Concorrência aprovada.

### HOM-EST-007 — bloqueio absoluto de vencido

Tentar usar lote vencido em:

- saída manual normal;
- disponibilidade de cesta;
- reserva/agendamento;
- confirmação de entrega.

**Esperado:** nenhuma operação de consumo normal aceita o lote. O sistema orienta perda/descarte ou quarentena.

- [ ] Aprovado.

### HOM-EST-008 — perda por validade

1. Registrar perda parcial e total.
2. Omitir motivo.
3. Repetir a mesma requisição idempotente.

**Esperado:** motivo obrigatório, saldo correto, sem dupla baixa, auditoria com ator/data/lote e reflexo financeiro coerente.

- [ ] Aprovado.

### HOM-EST-009 — quantidade e unidade

Testar unidade/pacote e quantidade fracionada em kg/litro conforme o modelo aprovado.

**Esperado:** apresentação e unidade de estoque não são ambíguas; quantidade decimal mantém precisão em lote, receita, movimento, reserva e entrega.

- [ ] Aprovado ou formalmente fora da release.

## 5. Gate G0 — família, pessoas e decisão social

### HOM-SOC-001 — cadastro guiado da família

1. Iniciar nova família.
2. Cadastrar responsável.
3. Informar endereço/contato.
4. Adicionar membros.
5. Informar renda/benefícios/vulnerabilidades.
6. Revisar e concluir.

**Esperado:** etapas e progresso claros; rascunho retomável; exatamente um responsável; conclusão cria família `em_analise`.

- [ ] Desktop aprovado.
- [ ] Mobile aprovado.
- [ ] Retomada do rascunho aprovada.

### HOM-SOC-002 — dados necessários e LGPD

Verificar cada campo de pessoa/família.

**Esperado:** obrigatoriedade e finalidade claras; campos sensíveis condicionais; documento pessoal não é exigido sem decisão formal; observações orientam minimização.

- [ ] Liderança social aprovou os campos.
- [ ] Responsável por privacidade aprovou a finalidade.

### HOM-SOC-003 — agregados derivados

Adicionar, editar, retirar e reativar membros; alterar nascimento, trabalho, renda e benefício com vigência.

**Esperado:** moradores, faixas etárias, renda per capita e vulnerabilidades são recalculados de forma determinística, inclusive após mudança de idade/data.

- [ ] Aprovado.

### HOM-SOC-004 — ciclo de vida do membro

**Esperado:** saída do domicílio preserva histórico; exclusão definitiva é restrita; único responsável não pode ser removido sem substituição.

- [ ] Aprovado.

### HOM-SOC-005 — avaliação e transição de status

Testar:

- nova família sem avaliação;
- aprovação recorrente/emergencial;
- decisão contrária à sugestão;
- coaprovação;
- reavaliação vencida;
- tentativa por papel não autorizado.

**Esperado:** status apto referencia avaliação e versão da regra; exceção exige justificativa; score vem do servidor; auditoria registra decisão.

- [ ] Aprovado.

### HOM-SOC-006 — projeção mínima para operador

**Esperado:** operador encontra família apta para agendar, mas não recebe renda, saúde, religião, notas ou endereço completo sem necessidade.

- [ ] Aprovado.

## 6. Gate G0 — cestas, reservas e entregas

### HOM-DIS-001 — receita versionada

**Esperado:** alterar receita não muda entregas históricas; item inativo não entra em nova versão.

- [ ] Aprovado.

### HOM-DIS-002 — reserva e duplicidade

Criar agendamentos concorrentes, duplicados e fora do ciclo permitido.

**Esperado:** política de ciclo aplicada; estoque não é prometido duas vezes; cancelamento libera reserva.

- [ ] Aprovado.

### HOM-DIS-003 — confirmação transacional

**Esperado:** revalida família, cesta, saldo, reserva e validade; falha não deixa baixa parcial; repetição não duplica entrega.

- [ ] Aprovado.

### HOM-DIS-004 — rastreabilidade da entrega

**Esperado:** detalhe responde quem recebeu, quando, qual cesta, itens, quantidades, lotes e operador, respeitando permissões.

- [ ] Aprovado.

## 7. Gate G0 — UX, responsividade e acessibilidade

### HOM-UX-001 — tarefas críticas no celular

Validar em 360 × 800 e 390 × 844:

- entrada/lote;
- alertas de validade;
- família + responsável;
- membro;
- agendamento;
- confirmação de entrega.

**Esperado:** sem rolagem horizontal da página; listas críticas em cards/padrão adequado; ações alcançáveis; teclado não cobre a ação principal.

- [ ] Aprovado.

### HOM-UX-002 — login e movimento reduzido

**Esperado:** navegação inicia imediatamente após autenticar; confirmação visual ≤ 600 ms; sem vídeo/espera obrigatória com `prefers-reduced-motion`.

- [ ] Aprovado.

### HOM-UX-003 — erros sem perda de dados

Simular 400, 401, 403, 409, 422, 500, timeout e perda de rede durante formulários.

**Esperado:** valores preservados quando seguro; erro junto ao campo/ação; foco no primeiro erro; opção de tentar novamente.

- [ ] Aprovado.

### HOM-UX-004 — alterações não salvas

**Esperado:** cancelar, voltar, fechar/recarregar ou trocar rota com alterações solicita confirmação; após salvar não há alerta falso.

- [ ] Aprovado.

### HOM-UX-005 — teclado e leitor de tela

**Esperado:** ordem de foco lógica, skip link, `h1`, títulos de rota, drawer com foco contido/restaurado, tabelas nomeadas, estados anunciados e contraste AA.

- [ ] Teclado aprovado.
- [ ] Leitor de tela aprovado.

## 8. Gate G0 — segurança, privacidade e operação

### HOM-SEC-001 — matriz de permissões

- [ ] Admin: usuários, auditoria e configurações autorizadas.
- [ ] Liderança social: dados sociais autorizados, sem administração indevida.
- [ ] Operador: estoque/distribuição e projeção social mínima.
- [ ] Sem papel: acesso negado no frontend e backend.
- [ ] Ação crítica registra auditoria.

### HOM-SEC-002 — sessão e CSRF

**Esperado:** cookie seguro/HttpOnly; origem não autorizada não executa ação; logout invalida sessão; expiração retorna login sem loop.

- [ ] Aprovado.

### HOM-SEC-003 — headers e TLS

- [ ] CSP e `frame-ancestors` aprovados.
- [ ] `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` presentes.
- [ ] Banco valida CA em staging/produção e falha fechado.

### HOM-OPS-001 — backup e restore

**Esperado:** comandos validam exit code, arquivo não vazio e checksum; restore em banco limpo termina verde; aplicação abre e contagens conciliam.

- [x] Contrato automatizado rejeita exit code nativo, arquivo vazio, origem instável, adulteração de dump/manifesto, qualquer objeto prévio e restore sobre a origem.
- [x] Backup v2 inventaria tabelas, views, rotinas, eventos, triggers e revisão Alembic; o checksum cobre dump e manifesto.
- [x] Credencial usa option file como primeiro argumento, ACL exclusiva e limpeza em sucesso/falha, sem `MYSQL_PWD`.
- [x] Restore v2 exige igualdade exata de inventário/revisão e registra evidência sem linhas pessoais; legado exige origem e switches explícitos.
- [ ] Backup real de homologação executado com TLS verificado.
- [ ] Restore real executado em banco isolado e limpo.
- [ ] API temporária abre sobre a restauração e as contagens agregadas conciliam.
- [ ] Responsável, criptografia, retenção e descarte do backup real registrados.
- [ ] Aprovado com evidência sem anexar o SQL.

### HOM-OPS-002 — release e rollback

**Esperado:** CI verde antes do deploy; release identificável; migration compatível; smoke pós-deploy; rollback da aplicação exercitado.

- [x] Workflow dispara nas branches de trabalho e em `main`.
- [x] Blueprint do Render gratuito usa runner com `GET_LOCK`, Alembic condicional, verificação de head, seed idempotente e só então Uvicorn.
- [x] Runner possui testes para banco atualizado/pendente, falha de upgrade, timeout/erro de lock e bloqueio do servidor em falha.
- [x] Runbook restringe o startup automático a migrations aditivas/expand e bloqueia alterações destrutivas.
- [x] CI fixa actions por SHA oficial e preserva relatório/traces do Playwright em falha.
- [ ] `autoDeployTrigger: checksPass` e `/health/db` comprovados no serviço efetivo do Render.
- [ ] Mesmo SHA da branch fica verde em `frontend`, `backend` e `operations` antes de `main`.
- [ ] `npm audit --audit-level=high` e `pip-audit` terminam sem vulnerabilidade bloqueante.
- [ ] Proteção/ruleset de `main` comprovado no GitHub.
- [ ] Vercel e Render publicam o SHA aprovado; smoke pós-deploy passa.
- [ ] Rollback da aplicação exercitado.

### HOM-OPS-003 — observabilidade

Provocar falha controlada de frontend, API, banco e entrega.

**Esperado:** alerta chega ao canal responsável; logs correlacionam `request_id`; nenhum dado pessoal/sensível indevido aparece.

- [ ] Aprovado.

### HOM-OPS-004 — classificação do ambiente

**Esperado:** interface e runbook identificam homologação; somente dados sintéticos ou anonimizados são usados enquanto houver `NO-GO`.

- [x] Render mantém `APP_ENV=staging`.
- [x] Runbook proíbe dados pessoais e operação reais até o `GO profissional`.
- [x] Banco está rotulado como “destinado a homologação; conteúdo não verificado”.
- [x] Aviso visual coberto no login e na área autenticada por E2E.
- [ ] Base revisada e confirmada sem dados reais.

## 9. Regressão por perfil

### Admin

- [ ] Login e logout.
- [ ] Criar/editar/inativar usuário.
- [ ] Impedir desativar o próprio/último admin.
- [ ] Redefinir senha.
- [ ] Consultar/exportar auditoria.
- [ ] Validar negações de acesso.

### Liderança social

- [ ] Criar/retomar/concluir família.
- [ ] Adicionar/editar/retirar membro.
- [ ] Adicionar/editar/encerrar benefício.
- [ ] Gerar preview e registrar avaliação.
- [ ] Validar reavaliação e decisão excepcional.
- [ ] Validar bloqueio de estoque/administração.

### Operador

- [ ] Criar categoria e produto.
- [ ] Registrar entrada/lote e validade.
- [ ] Consultar alertas e registrar perda.
- [ ] Criar/versionar cesta.
- [ ] Agendar família por projeção mínima.
- [ ] Confirmar entrega e conferir lotes usados.
- [ ] Cancelar/falta/reagendar e conferir reservas.
- [ ] Validar bloqueio de dados sociais/administração.

## 10. Gate automatizado antes do push

Frontend:

```powershell
cd frontend
npm ci
npm run lint
npm run build
npm run test:e2e
npm audit --audit-level=high
```

Backend:

```powershell
cd backend
.venv\Scripts\python.exe -m compileall app scripts tests
.venv\Scripts\python.exe -m unittest discover -s tests -v
.venv\Scripts\python.exe -m pip_audit -r requirements.txt
```

Repositório:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\tests\backup_restore_contract.ps1
git diff --check
```

Além do baseline atual, a release profissional exige suíte integrada com MySQL/Alembic e casos de validade.

## 11. Validação pós-deploy

- [ ] Commit publicado corresponde ao aprovado.
- [ ] Status Vercel verde.
- [ ] Checks frontend, backend e operations verdes.
- [ ] `/login` responde e renderiza.
- [ ] `/health/db` responde `{"database":"ok"}`.
- [ ] Login por cada perfil funciona.
- [ ] Entrada e consulta de lote sintético funcionam.
- [ ] Lote vencido sintético é bloqueado.
- [ ] Logs/alertas não expõem dados.
- [ ] Migration e versão registradas.
- [ ] Evidência anexada à rodada.

## 12. Resultado final

| Gate | Resultado | Evidência/defeito |
|---|---|---|
| Estoque e validade |  |  |
| Família e decisão social |  |  |
| Cestas e entregas |  |  |
| UX e acessibilidade |  |  |
| Segurança e LGPD |  |  |
| CI/CD, backup e observabilidade |  |  |
| Admin |  |  |
| Liderança social |  |  |
| Operador |  |  |

**Decisão de Gabriel:** ________________________________________________

**Data:** ____________________

**Assinatura/evidência da aprovação:** _________________________________

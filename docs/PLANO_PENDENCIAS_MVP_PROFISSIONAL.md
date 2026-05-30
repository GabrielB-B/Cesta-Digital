# Plano de Pendencias Para MVP Profissional

Este plano organiza as pendencias encontradas na varredura tecnica e divide a execucao em partes pequenas, com prioridade por risco real de operacao.

## Estado Atual

O Cesta Digital ja e um MVP funcional: autentica usuarios, protege rotas por perfil, registra familias, calcula elegibilidade, controla estoque por lote, monta cestas, confirma entregas com baixa automatica, registra auditoria, possui CI inicial, backup manual, documentacao tecnica, checklist de LGPD e checklist de homologacao por perfil.

Ainda nao deve ser tratado como producao final sem staging real, observabilidade externa, HTTPS/proxy final e homologacao funcional por perfil.

## Fase 0 - Bloqueios de Pronto

Prioridade: imediata.

- Corrigir dependencias Python vulneraveis encontradas por `pip-audit`.
- Adicionar auditoria de dependencias Python no CI.
- Remover asset pesado e fora do produto versionado no frontend.
- Corrigir bug de datas puras no frontend em timezone do Brasil.
- Corrigir textos com mojibake real no backend.
- Melhorar o botao de comprimir menu lateral, removendo o efeito visual instavel.

## Fase 1 - Acabamento Profissional do MVP

Prioridade: alta.

- Padronizar uso de `getApiErrorMessage` em todas as telas com chamadas HTTP.
- Criar pagina de rota nao encontrada.
- Criar pagina ou estado explicito de sem permissao.
- Padronizar textos visiveis em portugues, com ou sem acento de forma consistente.
- Melhorar feedback de sucesso apos criar, editar, excluir ou confirmar operacoes.
- Revisar acessibilidade de formularios, foco apos erro e botoes sem `type`.
- Adicionar testes automatizados para cenarios de erro e permissao.

## Fase 2 - Lacunas Funcionais

Prioridade: alta para operacao real, mas maior escopo.

- Criar edicao/inativacao de familias.
- Criar edicao/inativacao de itens e categorias.
- Criar edicao/inativacao de tipos de cesta e itens da receita.
- Criar cancelamento/reagendamento de entregas agendadas pela interface.
- Adicionar paginacao e filtros server-side para listas grandes.
- Adicionar exportacao de auditoria.
- Revisar validacoes de avaliacao social, incluindo pontuacao e coaprovador.

## Fase 3 - Producao e Operacao

Prioridade: antes de publicar para uso amplo.

- Validar staging acessivel por URL real.
- Testar restore de backup em ambiente limpo.
- Validar comportamento do rate limit persistido em staging com banco real.
- Ligar observabilidade externa: erros, metricas e logs centralizados.
- Adicionar politica de release, rollback, tags e versao unica do produto.
- Definir CSP, HSTS e configuracao final de proxy/HTTPS.
- Validar politica final de cookie, dominio e SameSite em staging real.

## Fase 4 - Qualidade Continua

Prioridade: evolucao sustentavel.

- Ampliar e2e de frontend com fluxos completos de escrita em ambiente de teste integrado.
- Aumentar cobertura de testes de services criticos e falhas operacionais.
- Documentar ADRs curtos para decisoes de seguranca e arquitetura.
- Criar checklist de homologacao funcional por papel.
- Criar rotina periodica de `npm audit` e `pip-audit`.

## Execucao Recomendada

1. Fechar Fase 0 inteira antes de novo deploy.
2. Entregar Fase 1 em uma rodada curta de polimento.
3. Tratar Fase 2 por modulo, com testes por fluxo.
4. Fechar Fase 3 em staging antes de qualquer producao.
5. Manter Fase 4 como rotina recorrente.

## Andamento Em 2026-04-29

Concluido nesta rodada:

- Dependencias Python vulneraveis corrigidas.
- `python-jose` substituido por `PyJWT`.
- `pip-audit` adicionado ao CI.
- PDF pesado e fora do produto removido do frontend.
- Datas puras do frontend passaram a usar helper local, sem deslocamento por UTC.
- Botao de comprimir menu lateral redesenhado com icone vetorial e estado estavel.
- Marca do menu recolhido ajustada para renderizacao menos esticada.
- Telas de sem permissao e pagina nao encontrada adicionadas.

Concluido na Fase 2:

- Botao de comprimir menu lateral reposicionado como alca discreta de painel, com chevron simples e sem competir com a marca.
- Listas de familias, itens, tipos de cesta e agendamentos passaram a aceitar filtros e paginacao server-side.
- Familias podem ter status atualizado/inativado pela tela de detalhe, com auditoria.
- Categorias de item ganharam campo ativo/inativo, edicao pela interface e migracao Alembic.
- Itens podem ser editados/inativados pela tela de detalhe.
- Tipos de cesta podem ser editados/inativados pela tela de detalhe.
- Receita de cesta agora permite alterar quantidade e remover itens pela interface.
- Agendamentos podem ser reagendados, marcados como faltou/cancelado e confirmados pela interface.
- Auditoria ganhou exportacao CSV.
- Avaliacao social ganhou validacoes adicionais para pontuacao, datas e coaprovador no backend.
- Testes de integracao cobrem status de familia, edicoes operacionais, receita de cesta, agendamento e exportacao de auditoria.

## Varredura Em 2026-04-30

Validacao executada nesta rodada:

- Backend compile: OK.
- Backend testes automatizados: OK, 18 testes passando.
- Frontend lint: OK.
- Frontend build: OK.
- `pip-audit`: OK, sem vulnerabilidades conhecidas.
- `npm audit --audit-level=high`: OK, sem vulnerabilidades.

Concluido nesta rodada:

- Telas menores de criacao, dashboard, resumo financeiro e login passaram a usar `getApiErrorMessage` para falhas HTTP.
- Versao do frontend alinhada para `0.1.0`, acompanhando a versao atual da API.
- Varredura de textos confirmou que os aparentes mojibakes em `Get-Content` eram efeito de console; nao foi feita reescrita arriscada de codificacao.

Ainda pendente:

- Avaliar paginacao server-side para historicos secundarios: lotes, movimentos e entregas realizadas.
- Padronizar todos os textos visiveis entre portugues com acento e portugues sem acento.
- Criar smoke/e2e de frontend para login, familias, estoque e entregas.
- Ligar observabilidade externa e staging real.

## Rodada Premium Em 2026-05-01

Concluido nesta rodada:

- Checkpoint git criado apos recuperacao do desligamento.
- Feedback global de sucesso adicionado para fluxos que redirecionam apos criar, editar ou excluir registros.
- Mensagens de erro e sucesso visiveis passaram a usar `role` e `aria-live` nos principais fluxos operacionais.
- Tipografia da interface revisada para remover `letter-spacing` negativo e escala por viewport em titulo de pagina.
- Edicao completa do cadastro da familia criada no backend com `PUT /families/{family_id}`, auditoria `family.updated` e teste de integracao.
- Tela de edicao completa da familia adicionada ao frontend, acessivel pelo detalhe da familia.

Ainda pendente apos esta rodada:

- Avaliar paginacao server-side para historicos secundarios: lotes, movimentos e entregas realizadas.
- Padronizar todos os textos visiveis entre portugues com acento e portugues sem acento.
- Revisar acessibilidade de formularios: foco apos erro, `aria-live` restante e botoes com `type` explicito em componentes futuros.
- Criar smoke/e2e de frontend para login, familias, estoque e entregas.
- Ligar observabilidade externa e staging real.

## Rodada Design Premium Em 2026-05-01

Concluido nesta rodada:

- Identidade visual do frontend refinada para reduzir aparencia generica de tema roxo/glass.
- Paleta ajustada com base escura operacional, acentos de ouro, verde, argila e rosa da marca.
- Fundos com textura linear sutil substituem efeitos circulares decorativos.
- Cards, formularios, tabelas, badges e botoes padronizados com raio menor e aparencia mais profissional.
- Estados de foco revisados para melhor acessibilidade visual.
- Preferencia de movimento reduzido adicionada para limitar transicoes quando o usuario solicitar.

Validacao executada nesta rodada:

- Frontend lint: OK.
- Frontend build: OK.
- Frontend local respondeu HTTP 200 em `http://127.0.0.1:5173`.

## Rodada Documentacao E GitHub Em 2026-05-01

Concluido nesta rodada:

- README principal refeito para apresentar o projeto no GitHub com status, recursos, stack, comandos locais, validacoes e links de documentacao.
- Checkpoint tecnico de 2026-05-01 criado em `docs/CHECKPOINT_2026-05-01.md`.
- Indice de documentacao atualizado em `docs/README.md`.
- Manual do programador complementado com orientacao para encerrar backend preso na porta `8000`.

Proximo foco:

- Rodada fina de design premium no frontend, focada em microdetalhes visuais sem refatorar toda a interface.

## Rodada Microdesign Premium Em 2026-05-01

Concluido nesta rodada:

- Menu lateral recebeu indicador ativo mais claro, `aria-current` na rota atual e refinamento do gancho de recolher/expandir.
- Controle de recolher/expandir do menu desktop passou para um botao hamburguer integrado ao header, removendo o controle pequeno preso na borda da sidebar.
- Botao de sair recebeu tratamento visual especifico sem alterar a identidade da topbar.
- Tabelas receberam moldura, cabecalho mais definido, hover com indicador lateral e links com sublinhado refinado.
- Listas, cards de checkbox, empty states e mensagens de feedback ganharam microestados de hover/foco mais consistentes.
- Inputs, selects, textareas e campos de tabela receberam foco com sombra sutil e `caret-color` alinhado a paleta.
- Estados de movimento reduzido atualizados para cobrir os novos microefeitos.

Validacao executada nesta rodada:

- Frontend lint: OK.
- Frontend build: OK.
- `git diff --check`: OK.
- Frontend local respondeu HTTP 200 em `http://127.0.0.1:5173`.

## Rodada Hardening MVP Em 2026-05-04

Concluido nesta rodada:

- Auditoria adicionada para criacao de categorias, itens, tipos de cesta e itens de receita.
- Historicos secundarios de lotes, movimentacoes e entregas passaram a aceitar filtros, limite, offset e header `X-Total-Count`.
- Frontend ajustado para consultar historicos recentes por pagina e evitar carregamento integral em telas operacionais.
- Agendamento passou a bloquear familias inativas/inaptas e tipos de cesta inativos.
- Confirmacao de entrega passou a revalidar familia e tipo de cesta antes da baixa.
- Administracao de usuarios ganhou salvaguardas para impedir desativar o proprio admin, remover o proprio perfil admin ou deixar o sistema sem administrador ativo.
- Engine SQLAlchemy recebeu `pool_pre_ping` e `pool_recycle` para reduzir falhas por conexao MySQL ociosa.
- Header HSTS ativado automaticamente em `staging` e `production`.
- Documentos `LGPD_PRIVACIDADE.md` e `HOMOLOGACAO_MVP.md` adicionados.
- Smoke local `scripts/smoke_local.ps1` adicionado para validar frontend, API, login autenticado e dashboard sem instalar dependencias novas.

Ainda pendente apos esta rodada:

- Observabilidade externa.
- Staging real com HTTPS/proxy final.
- Homologacao funcional por perfil com evidencia.

## Rodada Hardening Producao Em 2026-05-11

Concluido nesta rodada:

- Dependencias Python vulneraveis atualizadas: `Mako` para `1.3.12` e `python-multipart` para `0.0.27`.
- `pip-audit` voltou a passar sem vulnerabilidades conhecidas.
- Frontend deixou de persistir token JWT em `localStorage` e passou a usar cookie `HttpOnly` emitido pelo backend.
- Backend passou a aceitar autenticacao por cookie `HttpOnly` ou Bearer token, preservando compatibilidade com Swagger e scripts.
- Endpoint `POST /auth/logout` adicionado para encerrar sessao e remover o cookie.
- Rate limit de login migrado de memoria para a tabela `login_rate_limits`.
- Migration Alembic criada para persistencia do rate limit.
- E2E smoke com Playwright adicionado para login, dashboard, familias, itens e entregas.
- CI atualizado para rodar `npm audit`, instalar Chromium do Playwright e executar `npm run test:e2e`.

Validacao executada nesta rodada:

- Backend compile: OK.
- Backend testes automatizados: OK, 22 testes.
- Backend `pip-audit`: OK.
- Frontend lint: OK.
- Frontend build: OK.
- Frontend `npm audit --audit-level=high`: OK.
- Frontend `npm run test:e2e`: OK, 2 testes.

Ainda pendente para producao final:

- Subir staging real com HTTPS/proxy final.
- Executar `docs/HOMOLOGACAO_MVP.md` por perfil e registrar evidencias.
- Ligar observabilidade externa de erros, metricas e logs.
- Definir politica de release/tag/rollback.

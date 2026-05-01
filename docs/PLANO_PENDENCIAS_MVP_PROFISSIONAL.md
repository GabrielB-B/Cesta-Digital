# Plano de Pendencias Para MVP Profissional

Este plano organiza as pendencias encontradas na varredura tecnica e divide a execucao em partes pequenas, com prioridade por risco real de operacao.

## Estado Atual

O Cesta Digital ja e um MVP funcional: autentica usuarios, protege rotas por perfil, registra familias, calcula elegibilidade, controla estoque por lote, monta cestas, confirma entregas com baixa automatica, registra auditoria, possui CI inicial, backup manual e documentacao tecnica.

Ainda nao deve ser tratado como pronto para producao final enquanto os itens de Fase 0 e Fase 1 nao estiverem fechados.

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
- Migrar rate limit de login de memoria para Redis ou servico equivalente.
- Ligar observabilidade externa: erros, metricas e logs centralizados.
- Adicionar politica de release, rollback, tags e versao unica do produto.
- Definir CSP, HSTS e configuracao final de proxy/HTTPS.
- Avaliar migracao de token em `localStorage` para cookie `HttpOnly` em producao.

## Fase 4 - Qualidade Continua

Prioridade: evolucao sustentavel.

- Adicionar smoke/e2e de frontend para login, familias, estoque e entregas.
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

- Criar uma edicao completa de todos os campos cadastrais da familia, alem do status/inativacao ja entregue.
- Avaliar paginacao server-side para historicos secundarios: lotes, movimentos e entregas realizadas.
- Padronizar todos os textos visiveis entre portugues com acento e portugues sem acento.
- Melhorar feedback de sucesso nos fluxos de criacao que redirecionam imediatamente.
- Revisar acessibilidade de formularios: foco apos erro, `aria-live` consistente e botoes com `type` explicito.
- Criar smoke/e2e de frontend para login, familias, estoque e entregas.
- Ligar observabilidade externa e staging real.

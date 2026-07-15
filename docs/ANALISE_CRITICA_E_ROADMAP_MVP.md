# Analise Critica e Roadmap MVP

> **Documento histórico.** O diagnóstico e o backlog vigentes ficam em [`PROJETO_PROFISSIONAL_CESTA_DIGITAL.md`](./PROJETO_PROFISSIONAL_CESTA_DIGITAL.md).

## Resumo executivo

O projeto ja tem uma base boa para um MVP social-operacional: autentica, protege rotas, registra familias, calcula elegibilidade, controla estoque por lote e conclui entregas com baixa automatica.

O que ainda separa o projeto de uma operacao realmente madura nao e mais a ausencia dos modulos centrais, e sim o fechamento de engenharia e governanca:

- cobertura de testes mais ampla
- observabilidade e deploy
- governanca de auditoria mais profunda

## Pontos fortes atuais

- backend organizado por rotas, services, models e schemas
- modelagem social rica para familias e avaliacoes
- estoque com lotes e baixa automatica por entrega
- dashboard com indicadores reais do backend
- frontend ja com login, contexto de autenticacao e protecao de rotas

## Leitura critica senior

### 1. Usuarios e perfis agora estao fechados no escopo inicial do MVP

Nesta rodada foram entregues:

- CRUD inicial de usuarios
- ativacao e inativacao pela interface
- redefinicao de senha
- tela `Usuários` no menu lateral
- restricao de acesso por papel no backend e no frontend

Conclusao: a governanca minima de acesso agora existe para operacao real.

### 2. O frontend agora cobre os principais modulos operacionais

Nesta rodada tambem foram entregues:

- categorias de item
- criacao de tipos de cesta
- manutencao da receita da cesta
- movimentacao manual de estoque
- resumo financeiro

Conclusao: backend e frontend agora estao bem mais alinhados para operacao do dia a dia.

### 3. A arquitetura principal do frontend agora esta consolidada

Nesta rodada foram removidos os principais residuos do frontend antigo e as duplicacoes de cliente HTTP e service legado.

Conclusao: o onboarding ficou mais claro e a manutencao da interface agora aponta para uma unica estrutura ativa.

### 4. A trilha de auditoria melhorou, mas ainda pode amadurecer

O sistema ja guarda `created_by_user_id` em varios pontos, o que e bom. Mas ainda faltam:

- padrao unico de log de acao
- historico detalhado de login
- politicas claras de permissao por acao critica

Nesta rodada ja foi entregue:

- registro de `last_login_at`
- snapshot economico na avaliacao social

### 5. Agora ja existe base de testes e pipeline inicial

Nesta rodada foram adicionados testes automatizados de backend para:

- administracao de usuarios
- redefinicao de senha
- snapshot de avaliacao social
- auth
- familias
- estoque
- entregas

Tambem foi adicionado pipeline CI com:

- lint do frontend
- build do frontend
- compileall do backend
- testes automatizados do backend

Conclusao: o projeto agora tem um baseline tecnico melhor para evolucao segura, embora ainda falte ampliar cobertura e observabilidade.

## Sobre "usuarios no menu lateral"

Esse bloco foi concluido nesta entrega.

## Passo a passo para virar um MVP profissional

### Fase 1. Fechar fundacao tecnica

Status: concluida nesta rodada.

1. Consolidar a arquitetura do frontend e remover codigo legado que nao faz mais parte do fluxo principal.
2. Padronizar versionamento do produto inteiro, nao apenas do backend.
3. Formalizar arquivos de ambiente e setup para qualquer novo desenvolvedor subir o projeto em menos de 30 minutos.
4. Criar seeds minimos de operacao alem do admin, incluindo categorias de item e dados basicos opcionais.

### Fase 2. Fechar administracao e seguranca

Status: concluida no escopo inicial do MVP.

1. Criar CRUD de usuarios no backend.
2. Criar redefinicao de senha e ativacao/desativacao.
3. Implementar dependencia de autorizacao por papel nas rotas.
4. No frontend, criar modulo `Administracao > Usuarios`.
5. Exibir esse item no menu lateral apenas para `admin`.

### Fase 3. Fechar cobertura funcional do frontend

Status: concluida para os modulos principais desta versao.

1. Criar tela de categorias de item.
2. Criar tela de criacao de tipo de cesta.
3. Criar tela de composicao da receita da cesta.
4. Criar tela de movimentacao manual de estoque.
5. Criar tela de resumo financeiro e prestacao de contas.
6. Adicionar telas de edicao/exclusao onde o backend ja suporta operacao.

### Fase 4. Fechar governanca operacional

1. Registrar `last_login_at` no login.
2. Criar logs de auditoria por acao critica.
3. Garantir snapshot consistente da situacao economica em cada avaliacao social.
4. Revisar mensagens de erro, estados vazios e feedback de sucesso.

### Fase 5. Fechar qualidade e deploy

Status: avancada nesta rodada.

1. Adicionar testes unitarios de services criticos.
2. Adicionar testes de integracao para auth, familias, estoque e entregas.
3. Adicionar pipeline CI com lint, build e testes.
4. Preparar deploy com variaveis de ambiente, backups e monitoramento.
5. Definir rotina de release e rollback.

## Prioridade pratica imediata

Se eu fosse tocar isso como lider tecnico, a ordem das proximas entregas seria:

1. observabilidade e logs de auditoria
2. deploy com rotina de release e rollback
3. ampliacao de cobertura para cenarios de erro e permissao
4. versionamento unificado do produto
5. hardening operacional de producao

## Resultado esperado apos essas fases

O sistema deixa de ser "um projeto funcional de desenvolvimento" e passa a ser "um MVP operavel com seguranca minima, onboarding claro, menus coerentes e fluxo real de trabalho".

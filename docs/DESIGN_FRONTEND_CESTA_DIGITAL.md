# Design Frontend Cesta Digital

Este documento registra a direcao visual aplicada na rodada de refinamento do frontend.

## Conceito

Central de Cuidado Operacional.

A interface deve parecer uma sala de controle comunitaria: quente, seria, organizada e humana. O produto precisa comunicar que a operacao social esta sob controle sem transformar familias, estoque e entregas em telas frias ou genericas.

## Personalidade

- Profissional e operacional.
- Acolhedora sem parecer infantil.
- Escura, densa e legivel.
- Com acentos de marca usados com criterio.
- Menos SaaS generico e mais produto de gestao social real.

## Paleta

- Fundo principal: `#0d1110`.
- Superficies: preto esverdeado profundo, sem mudar por modulo.
- Texto principal: `#f8f5ed`.
- Texto secundario: `#c8c0b0`.
- Vinho da marca: `#8d2f69`.
- Rosa da marca: `#df579d`, usado como assinatura visual principal.
- Ouro operacional: `#e8b84a`, usado para acao, foco e calor institucional.
- Verde: `#5fcb8a`, reservado para sucesso e cuidado.
- Argila: `#c87956`, reservado para apoio discreto quando necessario.

## Identidade Unica

Todas as abas devem parecer partes do mesmo produto.

Diretriz aplicada:

- Nao criar uma cor/arte diferente para cada modulo.
- Usar vinho, rosa e ouro como sistema central.
- Usar verde apenas para sucesso/estado positivo.
- Usar vermelho apenas para erro/risco real.
- Manter a diferenca entre telas pela informacao, hierarquia e conteudo, nao por troca brusca de paleta.

## Componentes

Componentes existentes devem preservar estes principios:

- `hero-card`: orienta a tarefa principal da tela.
- `stat-card`: mostra indicador com numeros tabulares e acento lateral.
- `panel-card`: agrupa operacao, formulario ou tabela sem virar card decorativo.
- `empty-state`: deve parecer estado real do produto, nao apenas texto solto.
- `pill`: deve indicar status de forma consistente e com contraste.
- `toolbar`: filtros devem ter label acessivel, mesmo quando visualmente oculto.

## Componentizacao Aplicada

Foram criados componentes pequenos para reduzir variacao visual entre telas:

- `PageHeader`: cabecalho principal de tela com eyebrow, titulo, descricao e apoio opcional.
- `MetricCard`: card de indicador com numeracao tabular e acento lateral da marca.
- `MetricGrid`: grid responsivo para indicadores.
- `PanelHeader`: cabecalho padronizado para paineis, filtros, tabelas e acoes.
- `StateMessage`: estados de carregamento, vazio, erro e sucesso com semantica acessivel.
- `DataTable`: tabela operacional com wrapper responsivo e legenda acessivel.
- `FormActions`: barra padronizada para acoes de formulario.
- `FormSection`: bloco de formulario com cabecalho e grid consistentes para fluxos longos.

Diretriz de uso:

- Telas de listagem devem usar `PageHeader`, `MetricGrid`, `PanelHeader` e `StateMessage`.
- Telas de detalhe devem usar `PageHeader` com `meta` para badges, atalhos e contexto operacional.
- Estados de erro devem usar `StateMessage` com `variant="error"`.
- Feedback positivo deve usar `StateMessage` com `variant="success"`.
- Novos paineis nao devem recriar manualmente a mesma estrutura visual quando um componente ja cobrir o caso.
- Novas tabelas devem usar `DataTable` com `caption` descritivo.
- Acoes finais de formularios devem usar `FormActions`, com `spread` quando houver separacao clara entre cancelar e confirmar.
- Formularios longos devem ser divididos com `FormSection` para melhorar leitura, ritmo e responsividade.

## Fase de Detalhes e Edicao

Os padroes tambem foram aplicados em fluxos longos de manutencao:

- Edicao de familia.
- Cadastro e edicao de membro familiar.
- Detalhe e edicao de item.
- Detalhe, receita e disponibilidade de tipo de cesta.

Objetivo desta fase:

- Reduzir estruturas manuais repetidas.
- Manter a mesma hierarquia entre cadastro, edicao e detalhe.
- Melhorar leitura de formularios longos.
- Tornar tabelas de historico/receita acessiveis com `caption`.

## Regras de Continuidade

- Nao usar gradiente roxo/azul como tema principal.
- Nao substituir a marca atual sem aprovacao.
- Nao alterar regras de negocio para fins visuais.
- Nao quebrar rotas, payloads ou chamadas de API.
- Priorizar microdetalhes que melhorem operacao real: legibilidade, foco, estados, hierarquia e responsividade.

## Validacao Esperada

Antes de declarar uma rodada visual como pronta:

- `npm run lint`
- `npm run build`
- `git diff --check`
- Conferencia em desktop e mobile.
- Verificacao de login, dashboard, familias, estoque e entregas.

## Rodada de Lapidacao Premium - 2026-05-29

Objetivo da rodada:

- Preservar a identidade dark premium com rosa, ouro e verde escuro.
- Corrigir o uso da marca no login, loading, sidebar e headers.
- Refinar sidebar desktop expandida/colapsada, menu de conta e estados de carregamento.
- Reforcar responsividade e evitar que botoes/tabelas quebrem visualmente.

Ajustes aplicados:

- A imagem da marca passou a respeitar a caixa visual da composicao, evitando colisao entre simbolo e titulo.
- O loading de autenticacao usa apenas o simbolo da marca com microanimacao sutil.
- Estados internos de loading usam o simbolo da marca em vez de parecerem mensagens soltas.
- Sidebar desktop recebeu trigger de colapso integrado na borda, tooltips visuais no estado colapsado e proporcoes mais consistentes da marca.
- Header/menu de conta recebeu refinamento de alinhamento, hover, dropdown e truncamento seguro.
- Tabelas e botoes de acao receberam protecoes contra quebra de texto, overflow e compressao visual.

Validacao automatizada adicionada:

- Login desktop e mobile com verificacao de separacao entre simbolo e texto `Cesta Digital`.
- Loading de login com simbolo da marca.
- Loading de autenticacao em desktop e mobile.
- Sidebar desktop expandida/colapsada.
- Menu de conta e logout.
- Rotas operacionais principais com chamadas mockadas no Playwright.

## Retomada do Ponto Exato

Estado reconstruido a partir do commit `f5d0fa1`, com a rodada de identidade visual e componentizacao ja aplicada.

Fase concluida nesta rodada:

- Aplicacao dos padroes visuais e estruturais no frontend.
- Criacao dos componentes de apoio: `PageHeader`, `MetricCard`, `MetricGrid`, `PanelHeader`, `StateMessage`, `DataTable`, `FormActions` e `FormSection`.
- Ajuste de base visual em `global.css`, `index.html`, `BrandLockup` e `AppLayout`.
- Login alinhado com a nova marca e com o componente `BrandLockup`.
- Dashboard alinhado com `MetricGrid`, tabela acessivel e acoes rapidas.
- Familias alinhadas em listagem, cadastro, edicao e manutencao de pessoas.
- Estoque alinhado em listagem de itens, cadastro de item e detalhe/edicao de item.
- Tipos de cesta alinhados em listagem, cadastro, detalhe, receita e disponibilidade.
- Entregas alinhadas em agendamentos, historico e estados de feedback.
- Auditoria alinhada com filtros, tabela responsiva e acoes.
- Usuarios recebeu ajustes visuais pontuais para seguir a mesma identidade.

Ordem restaurada das fases restantes:

1. QA visual/responsivo tela por tela: conferir no navegador desktop/mobile o fluxo real de login, dashboard, familias, estoque, tipos de cesta, entregas, usuarios e auditoria; validar listagens, detalhes, formularios, estados de loading, vazio, erro e sucesso.
2. Fechamento tecnico: revisar diff final, rodar validacoes, organizar documentacao, montar checklist de entrega e deixar o projeto pronto para commit/deploy.

Checklist inicial para a proxima fase:

- Desktop: conferir login, menu lateral, dashboard, familias, estoque, tipos de cesta e entregas.
- Mobile: conferir responsividade do login, navegacao, tabelas com rolagem, formularios longos e acoes finais.
- Fluxo real: entrar, navegar, abrir listagens, acessar detalhes, preencher formularios e validar feedbacks.
- Tecnico: executar `npm run lint`, `npm run build` e `git diff --check` antes do fechamento.

## QA Visual e Fechamento

Fases restantes executadas em 2026-05-02.

QA visual/responsivo executado:

- Ambiente local validado com backend em `http://127.0.0.1:8000` e frontend em `http://127.0.0.1:5173`.
- Login real conferido em desktop e mobile.
- Conferidas 36 telas/estados entre desktop e mobile.
- Fluxos conferidos: login, dashboard, familias, detalhe/edicao/cadastro de familia, itens, detalhe/cadastro de item, entrada de lote, tipos de cesta, detalhe/cadastro de tipo de cesta, entregas, novo agendamento, usuarios e auditoria.
- Estados conferidos: listagens, detalhes, formularios, tabelas responsivas, menu lateral, loading inicial, vazio, erro visual e sucesso quando aplicavel.
- Resultado final: sem erro de console, sem overlay do Vite, sem alerta inesperado e sem overflow horizontal de pagina.

Ajuste aplicado durante o QA:

- `frontend/src/styles/global.css`: grids, pilhas e paineis passaram a usar `min-width: 0`, e `table-wrapper` recebeu `max-width: 100%` para manter tabelas longas dentro da rolagem responsiva no mobile.

Fechamento tecnico executado:

- `npm run lint`: OK.
- `npm run build`: OK.
- `npm audit --audit-level=high`: OK.
- `git diff --check`: OK, com apenas aviso esperado de LF/CRLF no Windows.
- Backend `/health/db`: OK.
- Frontend local HTTP 200: OK.

Resultado:

- Rodada visual pronta para commit.
- Pronta para deploy de preview/local.
- Ainda nao classificar como producao final sem staging real, observabilidade externa e homologacao por perfil.

## Refinamento Frontend - Fases 1 e 2

Fases implementadas em 2026-05-02, sem alteracao de backend, regras de negocio, rotas, payloads ou chamadas de API.

Fase 1: reduzir peso visual sem perder identidade:

- Painel hero, cards e paineis receberam sombras mais leves, brilho mais contido e camadas de fundo menos pesadas.
- A identidade escura premium foi mantida com rosa/magenta, dourado, verde e detalhes quentes.
- Hover e bordas ficaram mais discretos para melhorar leitura operacional.

Fase 2: melhorar hierarquia operacional do dashboard:

- Dashboard passou a destacar tres sinais principais: Social, Estoque e Entregas.
- Indicadores receberam categorias visuais por tom: social, estoque, entrega, atencao e neutro.
- `MetricCard` e `MetricGrid` passaram a aceitar `tone`, `emphasis` e `className`, mantendo compatibilidade com usos existentes.
- Prioridades do dia ficaram agrupadas em uma secao propria com leitura mais direta.
- Grid do dashboard foi ajustado para desktop e mobile, reduzindo vazios visuais e mantendo responsividade.

Validacao desta rodada:

- `npm run lint`: OK.
- `npm run build`: OK.
- `git diff --check`: OK, com apenas aviso esperado de LF/CRLF no Windows.
- Login real + dashboard conferidos em Chrome/CDP no desktop 1440x1100 e mobile 390x844.
- Resultado visual: sem erro de console, sem overlay do Vite, sem carregamento preso e sem overflow horizontal.

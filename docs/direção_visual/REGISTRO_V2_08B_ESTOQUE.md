# Registro do marco V2-08B — Estoque

**Branch:** `feat/frontend-v2-estoque`

**Base funcional:** `c1041b6` (`V2-08A`)

**Status:** aprovado por Gabriel em 21/08/2026

**Referência:** `referencias_por_tela/04-estoque-desktop.png`

## 1. Escopo visual

- `/items` passa a se apresentar como a aba “Estoque”, com explicação explícita
  de que reúne alimentos, higiene e os demais produtos doados.
- Desktop mantém sidebar fixa e usa três indicadores, toolbar, tabela paginada e
  painel contextual do item selecionado, conforme a composição da referência.
- 360, 390 e 768 usam cards próprios; tabela e painel lateral não são apenas
  comprimidos no mobile.
- A aba atual permanece visível e ativa nos atalhos mobile, inclusive para
  usuários que acumulam papéis e possuem mais destinos no menu.
- Busca, situação, atenção operacional, página e seleção permanecem na URL.

## 2. Dados e contratos reais

- Os indicadores globais consomem `GET /stock-overview` e não somam somente a
  página exibida.
- Quantidade disponível representa apenas lote utilizável pela política
  canônica de estoque.
- O painel mostra saldo, unidade, próxima validade, mínimo, lotes, alertas,
  ações existentes e os três movimentos mais recentes do item.
- Ações preservam as rotas atuais de entrada, movimento e detalhe; cadastro de
  produto continua disponível sem transformar a aba em cadastro de famílias.
- `/items`, subrotas, RBAC e payloads de escrita não mudaram.

## 3. Diferenças deliberadas da referência

| Elemento ilustrado | Decisão implementada |
|---|---|
| Fotos de embalagens | o V2-08B nasceu com fallback semântico; o contrato governado de mídia foi acrescentado separadamente no V2-08C |
| Exportar | omitido; não existe contrato aprovado de exportação de estoque |
| Transferir estoque | omitido; não existe conceito de depósitos/origens para uma transferência segura |
| Código do produto | omitido; o cadastro atual possui ID técnico, não código operacional público |
| Datas e nomes no histórico | omitidos; movimentos atuais não expõem timestamp nem nome enriquecido do responsável |
| Sino e notificações | shell real preservado; não existe contrato de notificações |
| Nove destinos iguais | menu continua condicionado às rotas reais e ao RBAC de cada usuário |

Nenhuma dessas ausências foi preenchida com dado simulado em produção.

## 4. Responsividade e localização

- `>= 1100 px`: tabela e painel contextual; sidebar desktop fixa.
- `768 px`: grade de dois cards e barra mobile.
- `360/390 px`: indicadores e produtos em uma coluna, toolbar em duas ações e
  barra inferior com “Estoque” ativa.
- Não há overflow horizontal nos quatro tamanhos validados.

## 5. Evidências locais

- backend herdado do V2-08A: 62/62 testes aprovados, sem migration;
- frontend: lint e build aprovados;
- regressão funcional: 35/35 testes E2E aprovados;
- gate visual V2-08B: 9 testes aprovados e 3 skips intencionais do painel
  desktop em viewports menores;
- regressão visual do AppShell executada após a correção da navegação mobile;
- galeria: `frontend/showcase/evidence/v2-08/index.html`;
- publicação externa: não realizada.

## 6. Gate de aprovação

Gabriel aprovou o conjunto visual e funcional do Estoque em 21/08/2026, após
nova comparação da referência com desktop e mobile. O V2-08C complementa este
marco com imagens governadas. A etapa separada da aba Entradas está liberada.

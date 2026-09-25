# Registro do marco V2-09A — Entradas

**Branch:** `feat/frontend-v2-entradas`

**Base aprovada:** `5a9751b` (`V2-08B/V2-08C`)

**Status:** aprovado visualmente por Gabriel em 21/08/2026

**Referência:** `referencias_por_tela/05-entradas-desktop.png`

## 1. Escopo entregue

- Nova visão de histórico em `/stock-batches`, autorizada para `admin` e
  `operador`, com a seção “Entradas” própria e corretamente ativa no desktop e
  no mobile.
- Desktop segue a composição da referência: histórico paginado à esquerda e
  formulário real de recebimento à direita.
- 360, 390 e 768 usam cartões próprios e encaminham o cadastro para a rota
  dedicada; a tabela não é comprimida no celular.
- `/stock-batches/new` foi preservada para deep links, cadastro do primeiro lote
  após criar um produto e uso direto em telas menores.
- O formulário legado foi extraído para um componente único reutilizado nos
  dois contextos, sem duplicar validação ou payload.

## 2. Contratos e integridade preservados

- Leitura: `GET /stock-batches?limit=&offset=` e `GET /items`.
- Escrita: `POST /stock-batches` com o mesmo `StockBatchCreatePayload`.
- Campos reais: produto, quantidade, unidade derivada do produto, lote, origem,
  situação física, entrada, validade, localização, valor estimado, motivo de
  restrição e observações.
- Datas futuras continuam bloqueadas; validade obrigatória continua dependendo
  do produto; quarentena/bloqueio continuam exigindo justificativa.
- RBAC de operações permanece `admin`/`operador`; sessão, cookies, cliente API,
  domínio de estoque e backend não foram alterados.
- A matriz de segurança passa de 26 para 27 URLs somente pela adição explícita
  do histórico; a rota de cadastro existente não mudou.

## 3. Diferenças deliberadas da referência

| Elemento ilustrado | Decisão implementada |
|---|---|
| Busca e filtro de datas | omitidos; o endpoint atual não aceita esses filtros e filtrar apenas a página carregada produziria resultado incorreto |
| Fornecedor nominal | substituído por `source_type`; o lote guarda o tipo de origem, não uma entidade de fornecedor |
| Responsável com nome/avatar | substituído por situação do lote; a resposta possui somente ID técnico do autor e não autoriza inventar identidade |
| Unidade editável | apresentada como dado somente leitura do produto; unidade não pertence ao payload do lote |
| Paginação numérica completa | resumo, anterior e próxima usam o total real do header, sem simular páginas indisponíveis |
| Formulário sempre lateral | lateral em desktop; rota dedicada em tablet/mobile para evitar compressão e perda de contexto |
| Sino/notificações | shell real preservado; não existe contrato de notificações |

## 4. Responsividade e acessibilidade

- `>= 1100 px`: tabela de sete colunas e cadastro rápido em painel fixo.
- `768 px`: grade de dois cartões, CTA para cadastro dedicado e seção ativa na
  navegação mobile.
- `360/390 px`: cartões em uma coluna, metadados essenciais, barra inferior e
  formulário em fluxo vertical.
- Foco visível, labels, mensagens `role="alert"`/`role="status"`, campos
  inválidos, botões desabilitados e navegação semântica foram mantidos.
- Não há overflow horizontal nos quatro viewports automatizados.

## 5. Arquivos e arquitetura

- `StockBatchesPage.tsx` + CSS Module: histórico responsivo.
- `StockBatchFormPanel.tsx` + CSS Module: formulário único reutilizável.
- `StockBatchCreatePage.tsx`: wrapper da rota de cadastro preservada.
- `App.tsx`, `routeMeta.ts`, `AppLayout.tsx` e `AppIcon.tsx`: nova seção e
  estado ativo.
- `global.css` não aumentou e nenhuma dependência foi adicionada.
- Configuração/teste visual próprios de Entradas e contrato E2E atualizado.

## 6. Evidências locais

- frontend lint e build: aprovados;
- regressão funcional: 37/37 E2E aprovados;
- gate visual V2-09A: 6 aprovados e 2 skips intencionais do formulário em
  viewports redundantes;
- viewports: 360×800, 390×844, 768×1024 e 1440×900;
- galeria clicável: `frontend/showcase/evidence/v2-09/index.html`;
- referência integral incluída na galeria para comparação lado a lado;
- backend e banco: nenhuma alteração; migration V2-08C continua local;
- publicação externa: não realizada.

## 7. Gate

Gabriel aprovou o marco V2-09A em 21/08/2026. A decisão encerra o gate de
Entradas e libera exclusivamente a branch própria da aba Entregas (`V2-10`).

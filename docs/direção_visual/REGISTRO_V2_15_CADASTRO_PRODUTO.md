# Registro do marco V2-15 — Cadastro de produto

**Branch:** `feat/frontend-v2-cadastro-produto`

**Base:** `cdb60df` — escala V2 e Categorias

**Status:** implementação e gates locais concluídos; validação visual solicitada

**Referência principal:** `referencias_por_tela/04-estoque-desktop.png`

## 1. Diagnóstico

A rota `/items/new` ainda usava a camada visual anterior: `PageHeader`,
`panel-card`, formulário global escuro e textos extensos. A navegação chamava a
entidade de produto, enquanto o formulário alternava entre “item” e “produto”.
O cadastro também exibia conteúdo de exemplo no nome e não deixava claro que um
produto ativo seguiria para sua primeira entrada de estoque.

## 2. Escopo implementado

- substituição integral da apresentação escura por superfícies claras V2;
- layout desktop em duas áreas: dados operacionais e imagem contextual;
- formulário mobile em sequência única, sem overflow horizontal;
- terminologia visível padronizada como “produto”;
- exemplos removidos dos campos de cadastro;
- somente categorias ativas podem ser selecionadas em um novo produto;
- atalho para Categorias exibido somente quando não existe categoria ativa;
- estados de validade e disponibilidade transformados em switches com toda a
  área clicável;
- CTA dinâmico: produto ativo segue para a primeira entrada; produto inativo é
  salvo sem oferecer entrada;
- proteção contra descarte acidental ao cancelar um formulário alterado;
- seletor de imagem ampliado, mantendo upload, consulta EAN/GTIN, prévia,
  atribuição e fallback;
- feedback duplicado após a criação removido do formulário de entrada;
- texto de continuidade reduzido a uma única confirmação global.

## 3. Contratos preservados

- rota e RBAC de `/items/new` não mudaram;
- `GET /item-categories` continua fornecendo as opções do cadastro;
- `POST /items` mantém o payload existente;
- upload próprio e importação pelo Open Facts continuam sendo persistidos
  somente depois da criação do produto;
- falha ao salvar imagem continua preservando o produto criado e direcionando
  para sua revisão;
- produto ativo continua em `/stock-batches/new?itemId={id}&from=item-create`;
- produto inativo continua no detalhe e não recebe ação de entrada;
- controle de validade permanece definido no produto e informado em cada lote;
- nenhuma migration, endpoint ou regra de estoque foi alterada.

## 4. Payload validado

O teste de contrato confirma os campos enviados ao backend:

- `category_id`;
- `name`;
- `barcode`;
- `unit_measure`;
- `tracks_expiration`;
- `is_active`;
- `reference_unit_value`;
- `minimum_stock_alert`;
- `notes`.

## 5. Evidências visuais

- `frontend/showcase/evidence/v2-15/novo-produto-desktop-1920.png`;
- `frontend/showcase/evidence/v2-15/novo-produto-mobile-390.png`;
- `frontend/showcase/evidence/v2-15/novo-produto-mobile-completo-390.png`.

A captura mobile curta representa o viewport real com navegação fixa. A captura
completa oculta a navegação apenas durante a geração da evidência para não
repetir a barra no meio da imagem longa.

## 6. Gates executados

- lint completo do frontend: aprovado;
- TypeScript e build de produção: aprovados;
- gate tipográfico das páginas: aprovado;
- regressão funcional Playwright: **40/40 aprovada**;
- criação de produto e payload: aprovados;
- persistência de imagem selecionada por EAN/GTIN: aprovada;
- produto inativo sem entrada: aprovado;
- filtro de categoria inativa: aprovado;
- confirmação ao descartar alterações: aprovada;
- desktop 1920×950 e mobile 390×844: aprovados;
- ausência de overflow horizontal: aprovada;
- publicação externa: não realizada.

## 7. Próximo gate

Depois da aprovação visual, o próximo recorte será
`/stock-movements/new`, preservando FEFO, lote, motivo, quantidade e os bloqueios
operacionais existentes.

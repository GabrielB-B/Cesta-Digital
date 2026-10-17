# Registro do marco V2-11 — Tipos de Cesta

**Branch:** `feat/frontend-v2-tipos-cesta`

**Base aprovada:** `1b29ca3` (`V2-10`)

**Status:** aprovado visualmente por Gabriel em 26/08/2026

**Referência:** `referencias_por_tela/07-tipos-de-cesta-desktop.png`

## 1. Escopo entregue

- A rota `/basket-types` foi reformulada seguindo a composição da referência
  07: busca, cartões de tipos, composição selecionada e resumo operacional.
- Desktop mantém sidebar fixa, três cartões por linha, tabela da composição e
  resumo à direita.
- 360, 390 e 768 usam cartões próprios e reorganizam o conteúdo sem comprimir
  a tabela ou produzir overflow horizontal.
- `/basket-types/new` e `/basket-types/:id` receberam o mesmo padrão visual e
  preservam os contratos existentes de cadastro, edição e receita.
- Imagens vêm do catálogo governado de produtos; o fallback visual permanece
  quando o produto não possui imagem persistida.

## 2. Contrato de leitura adicionado

- `GET /basket-types/overview` fornece uma projeção paginada e pesquisável dos
  tipos de cesta, com filtro por estado, contagem de itens, valor estimado e
  data de atualização.
- A contagem representa produtos distintos da composição, não a soma das
  quantidades requeridas.
- O valor estimado é calculado no servidor pela soma de
  `quantidade necessária × valor unitário de referência` de cada produto.
- A resposta detalhada da receita passou a expor, de forma aditiva, categoria,
  controle de validade, valor de referência e metadados da imagem já existente.
- Escritas, permissões, tabelas e migrations não foram alteradas.

## 3. Operação real preservada

- Criar e editar tipos de cesta continuam usando `POST/PUT /basket-types`.
- Adicionar, atualizar e remover itens continuam usando as rotas reais da
  receita, sem estado paralelo apenas no frontend.
- Ativar e desativar utilizam a atualização já existente do tipo de cesta.
- A capacidade de montagem continua vindo de
  `GET /basket-types/{id}/availability`, que considera o estoque utilizável.
- As rotas permanecem disponíveis somente para `admin` e `operador`, conforme
  a matriz RBAC aprovada.

## 4. Diferenças deliberadas da referência

| Elemento ilustrado | Decisão implementada |
|---|---|
| “Duplicar cesta” | omitido porque não existe uma operação transacional que copie tipo e composição; um botão cenográfico criaria risco de duplicação parcial |
| “Última atualização por Ana Silva” | exibido somente o instante real; o overview não inventa um nome de responsável e a auditoria preserva o ator técnico |
| Valor estimado | tratado como valor de referência da composição, não como custo contábil nem preço efetivo de doação |
| Doze itens no cartão e na listagem | a interface usa as quantidades reais do contrato; não completa linhas fictícias para reproduzir números do mockup |
| Estado de seleção | sincronizado com a URL para sobreviver a recarga, busca, paginação e navegação direta |

## 5. Responsividade e acessibilidade

- `>= 1180 px`: três cartões por linha, composição em tabela e resumo lateral.
- `768 px`: cartões em grade e composição em blocos legíveis.
- `360/390 px`: uma coluna, marca preservada, ações contextuais e barra inferior.
- Busca possui nome acessível, seleção é indicada por estado e ícone, mensagens
  de carregamento/erro são semânticas e botões mantêm foco visível.
- Os quatro viewports automatizados não apresentam overflow horizontal.

## 6. Evidências locais

- backend `compileall` aprovado e suíte completa 71/71;
- testes focados do overview 2/2 aprovados;
- frontend lint e build aprovados;
- regressão funcional 37/37 E2E aprovada, incluindo acesso direto por perfil;
- gate visual V2-11: 8 testes aprovados e 4 skips intencionais por viewport;
- viewports 360×800, 390×844, 768×1024 e 1440×900;
- galeria clicável: `frontend/showcase/evidence/v2-11/index.html`;
- referência integral e oito capturas da implementação incluídas;
- banco e migrations: nenhuma alteração;
- publicação externa: não realizada; o `NO-GO` profissional permanece.

## 7. Gate

Gabriel aprovou o marco V2-11 em 26/08/2026 ao autorizar a continuidade. A
decisão encerra o gate de Tipos de Cesta e libera exclusivamente a branch
própria de Relatórios (`V2-12`).

## 8. Refinamento de entrega — 17/10/2026

Após a homologação manual, o topo global e a listagem de Tipos de Cesta foram
lapidados sem redesenhar a identidade aprovada:

- topbar reduzida para os tokens canônicos de 64 px no desktop e 56 px no
  mobile, com breadcrumb discreto e conta mais compacta;
- conteúdo limitado e centralizado em 1440 px, inclusive em monitores de
  1920 px;
- aviso de homologação integrado ao topo no desktop e mantido antes do
  conteúdo no mobile, sem perder a advertência operacional;
- título e descrição migrados para o `PageHeader` compartilhado;
- busca, filtro e CTA reunidos em uma faixa operacional; no mobile, “Nova
  cesta” antecede os filtros e ocupa a largura disponível;
- controles com 44 px de altura, tipografia legível, foco preservado e sem
  overflow horizontal.

Não houve alteração de rota, RBAC, API, regra de negócio, backend, banco ou
migration. A validação local fechou com lint e build aprovados, E2E 47/47,
shell visual 13 aprovados com 3 skips intencionais e gate visual de Tipos de
Cesta 9 aprovados com 7 skips por viewport. As evidências cobrem
360/390/768/1440/1920 px, incluindo
`frontend/showcase/evidence/v2-11/tipos-cesta-desktop-1920.png`.

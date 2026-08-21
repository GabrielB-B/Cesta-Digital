# Registro do marco V2-08C — imagens de produto no Estoque

**Branch:** `feat/estoque-v2-imagens-produto`

**Status:** aprovado por Gabriel em 21/08/2026

**Referência funcional:** `referencias_por_tela/04-estoque-desktop.png`

**Complementa:** `REGISTRO_V2_08B_ESTOQUE.md`

## 1. Decisão de arquitetura

- Cada produto pode possuir um EAN/GTIN normalizado e no máximo uma imagem.
- Upload próprio é o caminho primário. A consulta por código de barras ao Open
  Facts é uma assistência opcional e só ocorre por ação explícita do operador.
- A listagem nunca usa hotlink nem consulta catálogo externo. Após a escolha, a
  imagem é copiada para o Cesta Digital e servida pelo próprio backend.
- Produto sem foto, catálogo sem imagem ou falha de carregamento usa o fallback
  semântico já aprovado; imagem não é requisito para operar estoque.
- O arquivo binário fica em `item_images`, separado do registro mestre `items`,
  para não degradar consultas e paginações de estoque.

## 2. Contratos acrescentados

| Método e rota | Finalidade | Acesso |
|---|---|---|
| `GET /product-images/open-facts?barcode=` | consultar candidato sem gravar | admin/operador |
| `POST /items/{id}/image` | enviar JPEG, PNG ou WebP | admin/operador |
| `POST /items/{id}/image/import-open-facts` | confirmar e persistir candidato externo | admin/operador |
| `DELETE /items/{id}/image` | remover imagem atual | admin/operador |
| `GET /public/items/{id}/image` | servir somente o arquivo versionado | público, sem metadados de estoque |

Os contratos de item e de `stock-overview` passam a expor somente metadados
necessários (`barcode`, caminho versionado, origem e atribuição). Rotas de lote,
movimento, cesta e entrega permanecem inalteradas.

## 3. Segurança, qualidade e proveniência

- EAN/GTIN aceita somente 8 a 14 dígitos e é único quando informado.
- Upload é limitado a 5 MB e aos formatos JPEG, PNG e WebP.
- Pillow verifica o conteúdo real, limita dimensões/pixels, corrige orientação,
  remove metadados e normaliza para WebP de até 1,5 MB e 1200 px.
- Downloads externos aceitam HTTPS apenas dos hosts de imagem oficiais do
  ecossistema Open Facts, com timeout, limite de resposta e validação do destino
  após redirecionamento, reduzindo risco de SSRF.
- Origem, URL, atribuição, hash, tamanho, autor e alterações ficam persistidos.
- Criação, troca, exclusão e preenchimento de código via Open Facts geram
  eventos de auditoria.
- A interface exibe `Open Facts contributors · CC BY-SA 3.0` junto da foto
  importada; o operador revisa nome, marca e quantidade antes de selecionar.

## 4. Banco e publicação

- Migration local: `d4e5f6a7b8c9_add_product_barcode_and_images.py`.
- `items.barcode` recebe índice único anulável.
- `item_images` possui relação um-para-um com exclusão em cascata e conteúdo
  `MEDIUMBLOB` no MySQL.
- A migration não foi aplicada ao ambiente público. Antes de publicação são
  obrigatórios backup validado, restore isolado, upgrade, smoke e plano de
  rollback conforme o gate profissional.

## 5. Interface e responsividade

- Tabela desktop, cards mobile e painel selecionado apresentam foto real quando
  disponível e fallback uniforme nos demais produtos.
- Cadastro e edição permitem upload, consulta, seleção, substituição e remoção.
- Desktop mantém sidebar fixa; 360/390/768 mantêm composição própria sem
  overflow e com a seção Estoque ativa.
- Atribuição e código ficam visíveis no contexto do produto sem competir com
  saldo, validade e ações operacionais.

## 6. Evidências locais

- backend: `compileall` e suíte completa com 67/67 testes aprovados;
- contrato específico de imagens: 5/5 testes aprovados;
- frontend: lint, build e regressão E2E com 36/36 testes aprovados;
- gate visual de Estoque e seletor de imagem: 11 aprovados e 5 skips
  intencionais de componentes exclusivos de determinados viewports;
- galeria clicável: `frontend/showcase/evidence/v2-08/index.html`;
- publicação externa: não realizada.

Gabriel aprovou o conjunto V2-08B/V2-08C em 21/08/2026. A aba Entradas está
liberada para uma branch própria; a migration permanece local e continua
subordinada a backup, restore e autorização de publicação.

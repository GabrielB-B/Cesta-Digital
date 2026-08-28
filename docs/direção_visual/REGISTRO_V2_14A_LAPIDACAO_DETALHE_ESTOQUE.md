# Registro do marco V2-14A — Lapidação do detalhe de Estoque

**Branch:** `feat/frontend-v2-estoque-fluxos-secundarios`

**Base funcional:** `fix/homologacao-cryptography`

**Status:** implementação e gates locais concluídos; validação visual solicitada a Gabriel

**Referência principal:** `referencias_por_tela/04-estoque-desktop.png`

## 1. Escopo desta entrega

- `/items/:itemId` deixou de usar os painéis escuros da interface anterior e
  passou a compartilhar a linguagem clara, tipografia, bordas, estados e ações
  da aba Estoque V2 aprovada.
- O cabeçalho reúne somente identidade do produto, estado e ações principais.
- Saldo, estoque mínimo, lotes e próxima validade formam um único resumo, sem
  repetição em badges ou cartões auxiliares.
- Cadastro, lotes e histórico foram separados por responsabilidade, com edição
  de rastreabilidade mantida no lote correspondente.
- A edição do produto abre somente por solicitação, avisa antes de descartar
  mudanças e devolve o foco ao botão de origem ao fechar.
- O seletor de imagem foi simplificado e o campo EAN/GTIN passou a forçar
  superfície clara, sem herdar o esquema escuro legado.
- CSS sem consumidores (`hero-badge` e `trace-card`) foi removido depois da
  migração dos componentes.

## 2. Contratos preservados

- Rota, deep link, parâmetros e RBAC de `/items/:itemId` não mudaram.
- Consulta e atualização do item, upload/importação/remoção de imagem,
  movimentações e metadados dos lotes continuam usando os endpoints e payloads
  existentes.
- Cálculo de saldo utilizável, validade, FEFO, quarentena e bloqueio de item
  inativo não foram recriados no frontend nem alterados.
- Nenhum dado fictício, indicador novo, endpoint ou migration foi acrescentado.
- A origem e a atribuição de imagens externas continuam visíveis quando
  fornecidas pelo contrato.

## 3. Decisões de conteúdo

| Antes | Decisão V2-14A |
|---|---|
| saldo e status repetidos em vários blocos | um resumo operacional com estado contextual |
| formulário de edição sempre aberto | edição sob demanda |
| instruções extensas para imagem | formato, limite e origem em texto curto |
| CTA duplicada para voltar | retorno contextual único no cabeçalho |
| cartões escuros e aninhados | superfícies claras com divisores e hierarquia tipográfica |
| classes visuais usadas pelos testes | seletores semânticos por região, artigo, estado e ação |

## 4. Evidências e gates

- frontend lint: aprovado;
- frontend build de produção: aprovado;
- regressão funcional Playwright: **38/38 aprovada**;
- fluxos cobertos: cadastro e entrada, imagem por EAN, ativação/inativação,
  quarentena, FEFO, descarte por validade, histórico e ausência de overflow;
- viewports revisados: 1440×900 e 390×844;
- `git diff --check`: sem whitespace inválido;
- publicação externa: não realizada.

Capturas locais desta etapa estão em `frontend/.ux-sandbox/v2-polish/` e não
substituem as evidências aprovadas das etapas anteriores.

## 5. Gate seguinte

O avanço permanece bloqueado apenas pelo gate visual combinado com Gabriel.
Após aprovação desta tela, a mesma branch seguirá, em fatias independentes,
para `/items/new`, `/item-categories` e `/stock-movements/new`. Cada fatia será
comparada com a direção V2, testada e apresentada antes da próxima.

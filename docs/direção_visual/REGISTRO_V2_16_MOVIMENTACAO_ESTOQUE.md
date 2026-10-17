# Registro do marco V2-16 — Movimentação de estoque

**Branch:** `feat/frontend-v2-movimentacao-estoque`

**Base:** `3508f1d` — cadastro de produto V2

**Status:** implementação e gates locais concluídos; aguardando aprovação visual

**Referência principal:** `referencias_por_tela/04-estoque-desktop.png`

## 1. Escopo implementado

- `/stock-movements/new` deixou de usar `PageHeader`, `panel-card`, `form-grid`
  e `detail-grid` da camada visual escura;
- desktop organiza formulário e resumo do lote lado a lado;
- mobile usa fluxo vertical próprio, sem tabela comprimida ou overflow horizontal;
- o resumo mostra produto, imagem governada/fallback, lote, validade, saldo atual
  e saldo projetado antes da confirmação;
- microcopy extensa foi reduzida e placeholders de exemplo foram removidos;
- campos e ações foram ampliados para a escala tipográfica V2;
- cancelamento de formulário alterado passou a pedir confirmação.

## 2. Contratos preservados

- rota e RBAC de `/stock-movements/new` não mudaram;
- `GET /items`, `GET /stock-batches` e `POST /stock-movements` permanecem os
  contratos utilizados;
- o payload continua contendo `batch_id`, `movement_type`, `quantity` e `notes`;
- saída manual continua bloqueada para lote futuro, vencido, sem validade
  obrigatória, sem saldo, em quarentena, bloqueado ou de produto inativo;
- perda por validade continua limitada a lote vencido ou sem validade obrigatória;
- ajustes e perdas continuam exigindo motivo;
- quantidade permanece inteira e não pode superar o saldo nas reduções;
- ordenação FEFO e retorno ao detalhe do produto foram preservados;
- nenhuma API, migration, regra de estoque ou permissão foi alterada.

## 3. Acessibilidade e responsividade

- regiões de formulário, resumo, situação do lote e saldo projetado possuem
  nomes acessíveis;
- erro continua focando o primeiro campo inválido ou o resumo global;
- controles mantêm labels persistentes, foco visível e indicação semântica;
- ação primária tem pelo menos 48 px e aparece antes de Cancelar no mobile;
- proteção de saída usa confirmação apenas quando houve alteração;
- `prefers-reduced-motion` desativa transições de controles;
- viewports validados: 390×844 e 1440×900.

## 4. Evidências

- galeria clicável: `frontend/showcase/evidence/v2-16/index.html`;
- `movimentacao-desktop-1440.png`;
- `movimentacao-mobile-390.png`;
- `movimentacao-mobile-completo-390.png`.

## 5. Gates executados

- lint completo do frontend: aprovado;
- TypeScript e build de produção: aprovados;
- gate de escala tipográfica: aprovado;
- regressão funcional Playwright: **40/40 aprovada**;
- testes focados de FEFO, descarte, query inválida e item inativo: aprovados;
- gate visual V2-16: **2 aprovados e 2 skips intencionais por viewport**;
- ausência de overflow horizontal: aprovada;
- publicação externa: não realizada.

## 6. Diferenças deliberadas da referência

A referência de Estoque não possui um formulário dedicado de movimentação. A
tela reutiliza sua linguagem de painel contextual, superfícies claras, bordas,
tipografia e ação primária, mas exibe somente operações existentes. Exportação,
transferência entre depósitos e metadados inexistentes não foram adicionados.

## 7. Próximo gate

Após aprovação visual de Gabriel, o próximo recorte será o cadastro e a edição
de famílias, preservando contratos sociais e separando essa etapa da posterior
migração de pessoas e benefícios.

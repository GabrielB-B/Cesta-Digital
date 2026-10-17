# Registro do marco V2-08A — Contrato de Estoque

**Branch:** `feat/backend-v2-estoque-contrato`  
**Base:** `767969c` (`V2-07B` aprovado)  
**Status:** contrato concluído localmente e pronto para sustentar o V2-08B  
**Referência visual vinculada:** `04-estoque-desktop.png`

## 1. Objetivo

Criar uma projeção paginada e global para a aba Estoque, permitindo reproduzir
os indicadores e filtros da referência sem somar somente a página visível e sem
confundir cadastro de produtos com famílias ou pessoas.

## 2. Contrato criado

`GET /stock-overview`

Parâmetros:

- `q`: nome, unidade ou categoria do produto;
- `is_active`: situação cadastral do produto;
- `attention`: `estoque_baixo`, `vencendo_em_breve`, `vencido`,
  `validade_ausente` ou `restrito`;
- `due_soon_days`: janela de vencimento, de 1 a 365 dias, padrão 15;
- `limit`: 1 a 200, padrão 25;
- `offset`: deslocamento paginado.

A resposta fornece `items`, `total`, parâmetros efetivos, data operacional,
resumo global e `X-Total-Count`. Cada item informa saldo utilizável, estoque
mínimo, próxima validade utilizável e contagens de lotes próximos do vencimento,
vencidos, sem validade obrigatória e restritos.

## 3. Regras operacionais preservadas

- O saldo disponível reutiliza a política canônica de estoque utilizável; lote
  vencido, restrito, futuro, inativo ou sem validade obrigatória não infla a
  quantidade disponível.
- “Estoque baixo” compara o saldo utilizável com o estoque mínimo do produto.
- “Vencendo em breve” conta lotes utilizáveis entre a data operacional e a
  janela configurada.
- Lotes vencidos continuam aparecendo como risco físico mesmo quando estão
  restritos, pois ainda exigem tratamento operacional.
- A data civil usa `America/Sao_Paulo`, evitando mudança de classificação na
  virada de UTC.
- Busca, filtros, ordenação por urgência, contagem e paginação são executados no
  banco; o frontend não agrega páginas incompletas.

## 4. Fidelidade sem funcionalidade cenográfica

O contrato sustenta os três indicadores reais da referência: estoque baixo,
vencimentos em até 15 dias e vencidos. Exportação e transferência de estoque
não foram criadas porque não existem contratos aprovados. Ações existentes de
entrada, movimentação e detalhe permanecem nas rotas atuais.

Imagens ilustrativas de produtos também não foram incorporadas: a etapa visual
usará ícones semânticos até existir um campo de mídia governado no domínio.

## 5. Segurança, banco e compatibilidade

- `admin` e `operador` podem consultar a visão;
- `lider_social` recebe 403 e requisição anônima recebe 401;
- `/stock-summary` foi preservado para consumidores existentes;
- nenhuma tabela, migration ou payload de escrita foi alterado;
- nenhum dado de família ou pessoa integra a nova projeção.

## 6. Evidências locais

- `python -m compileall app tests`: aprovado;
- suíte backend completa: 62/62 testes aprovados;
- testes novos cobrem contadores globais, saldo utilizável, riscos vencido e
  restrito, filtros, busca, paginação, validação e RBAC;
- `git diff --check`: aprovado;
- frontend e banco de dados não foram alterados neste marco.

## 7. Próximo gate

O V2-08B será executado em `feat/frontend-v2-estoque`, usando a referência
`04-estoque-desktop.png`. A rota `/items` será preservada e receberá tabela com
painel contextual no desktop e cards próprios em 360/390/768. A etapa ficará
aguardando aprovação visual de Gabriel antes de iniciar a aba Entradas.

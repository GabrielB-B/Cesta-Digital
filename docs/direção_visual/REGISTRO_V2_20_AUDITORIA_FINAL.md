# Registro do marco V2-20 — Auditoria visual final

**Data:** 16/09/2026

**Branch:** `chore/frontend-v2-auditoria-final`

**Base funcional:** `feat/frontend-v2-beneficios-formulario`
**Status:** auditoria técnica concluída; aguardando aceite visual final de Gabriel

## 1. Escopo vistoriado

A revisão percorreu as 28 rotas congeladas do frontend e as onze entradas
visuais principais: Login, Início, Famílias, Avaliações, Estoque, Entradas,
Categorias, Entregas, Tipos de Cesta, Relatórios e Administração. Também foram
revisados os caminhos internos de detalhe, cadastro, edição, movimentação,
histórico, acesso restrito e página inexistente.

Os viewports obrigatórios continuaram sendo 360, 390, 768 e 1440 pixels, com
uma verificação adicional em 1920 pixels nos módulos de Estoque e Categorias.

## 2. Resíduos encontrados e corrigidos

- removida a folha `global.css` de 4.768 linhas, que ainda carregava a antiga
  linguagem escura, gradientes decorativos e classes genéricas em produção;
- estados de acesso restrito e página inexistente foram reconstruídos com
  superfícies claras, texto conciso, ação de recuperação e sem classes legadas;
- carregamento da aplicação, aviso de ambiente, mensagens do shell e campo
  monetário passaram a usar módulos CSS próprios;
- dependências tipográficas não utilizadas de Nunito Sans e Sora foram
  removidas; Inter local permanece como fonte única do produto;
- componentes e tipos sem referência foram excluídos, inclusive a antiga tela
  financeira já substituída por redirecionamento compatível;
- gradientes decorativos remanescentes em cartões, imagens e skeletons foram
  removidos; a exceção aprovada permanece restrita à marca, login e CTAs
  primários;
- títulos de rota receberam acentuação consistente;
- os dois placeholders que ainda continham exemplos fictícios foram removidos
  ou convertidos em orientação neutra;
- o detalhe de produto passou a integrar a evidência visual obrigatória para
  impedir o retorno do painel escuro relatado anteriormente.

## 3. Coerência por domínio

| Área | Verificação final |
|---|---|
| Início | resumo operacional sem repetir métricas nem inventar entradas diárias |
| Famílias | lista, detalhe e formulários usam exclusivamente dados sociais reais |
| Avaliações | cálculo do sistema, decisão técnica e próxima reavaliação permanecem separados |
| Estoque | somente produtos, categorias, saldos, lotes, imagens e validade; nenhuma informação de famílias |
| Entradas | recebimento e histórico usam produto, lote, origem, quantidade e validade reais |
| Entregas | cadastro disponibiliza apenas famílias aptas; agenda e histórico preservam rastreabilidade |
| Tipos de Cesta | composição e capacidade derivam do estoque utilizável; duplicação inexistente não é simulada |
| Relatórios | indicadores e downloads correspondem aos contratos existentes |
| Administração | usuários, perfis e auditoria; configurações ou 2FA inexistentes não são prometidos |
| Estados do sistema | permissão insuficiente e rota inexistente mantêm shell, responsividade e linguagem V2 |

## 4. Gates executados

- lint completo do frontend: aprovado;
- TypeScript e build de produção: aprovados;
- auditoria npm: zero vulnerabilidades conhecidas;
- piso tipográfico: nenhuma página abaixo de 12 pixels;
- regressão funcional Playwright: **47/47 aprovada**;
- contrato de rotas: 28 caminhos, títulos e RBAC preservados;
- matrizes visuais: desktop, tablet e mobile aprovados; skips são restrições de
  viewport declaradas nos próprios testes, não falhas;
- detalhe de produto, acesso restrito e página inexistente receberam novas
  evidências automatizadas em 1440 e 390 pixels;
- busca estática: nenhuma referência produtiva a `global.css`, Nunito, Sora,
  `hero-card`, `panel-card`, `page-stack`, `data-table` ou `stat-card`;
- build gerado em `frontend/dist` com sucesso.

O build ainda registra aviso de bundle JavaScript acima de 500 kB. Isso não é
regressão funcional nem visual, mas permanece como backlog de performance para
code splitting antes do encerramento do gate profissional.

## 5. Evidência para aceite

A galeria consolidada está em
`frontend/showcase/evidence/v2-20/index.html`. Ela reúne as capturas finais de
todas as abas, jornadas internas e estados raros, sempre com acesso ao PNG
original.

## 6. Limite desta aprovação

Este marco permite o aceite **visual e funcional local** do Frontend V2 com
dados sintéticos ou anonimizados. Ele não altera o `NO-GO` profissional do
produto. Os itens `DOM-002`, `QA-001`, `SEC-001` e demais gates abertos no
documento canônico continuam impedindo uso ampliado com dados pessoais e
entregas reais.

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
Concluí esta fase. Depois dela, faltam 2 fases:

QA visual/responsivo tela por tela: conferir no navegador desktop/mobile, fluxo real de login, listagens, detalhes e formulários.
Fechamento técnico: revisar diff final, organizar documentação, checklist de entrega e deixar pronto para commit/deploy.
Nesta fase apliquei os padrões em:
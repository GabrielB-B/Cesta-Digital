# Registro do marco V2-05 — Início

**Branch:** `feat/frontend-v2-inicio`
**Base:** `12d3d73` (`V2-04` aprovado)
**Status:** aprovado por Gabriel em 19/08/2026
**Referência principal:** `referencias_por_tela/01-inicio-desktop.png`

## 1. Resultado implementado

- Saudação curta com o primeiro nome do usuário e resumo operacional.
- Quatro KPIs em uma linha no desktop e grade 2 × 2 em 360/390/768 px.
- Dois painéis centrais para prioridades e alertas de estoque.
- Ações rápidas em linha no desktop e grade própria no mobile.
- Cards claros, bordas neutras, sombra curta, ícones lineares e cor somente com
  função semântica, seguindo a referência específica.
- Hero promocional, sinais duplicados e tabela extensa foram removidos.

## 2. Mapeamento seguro da referência

| Área visual | Implementação real | Decisão |
|---|---|---|
| Famílias ativas | `active_families` e `total_families` | contrato existente |
| Entregas | `deliveries_this_month` | período real fornecido pela API |
| Terceiro KPI | `pending_schedules` | substitui “Entradas hoje”, que não existe no contrato |
| Itens em alerta | `items_below_minimum_count` | contrato existente |
| Tarefas | reavaliações, famílias em análise, retiradas e primeira composição de cesta | somente campos de `DashboardOverviewResponse` |
| Alertas | `stock_alerts`, com saldo e mínimo | sem validade fictícia |
| Quarto atalho | Tipos de cesta | substitui “Relatório rápido”, rota inexistente |

Nenhuma soma, tendência, período ou atividade foi inventada. O endpoint continua
sendo `GET /dashboard/overview` e o backend não foi alterado.

## 3. Reavaliação e aptidão

A primeira prioridade social comunica “Reavaliar N famílias”, mostra o próximo
prazo real e o status vigente. A microcopy registra que a aptidão precisa ser
recalculada e que a decisão final combina cálculo e parecer social. O link segue
para `/families`, pois a fila global de Avaliações depende do contrato V2-07A e
não pode ser simulada antecipadamente.

## 4. Rotas e RBAC preservados

- Social: `/families`, `/families/new` e filtro `status=em_analise`.
- Operações: `/items`, `/stock-batches/new`, `/deliveries`,
  `/deliveries/schedules/new` e `/basket-types`.
- Indicadores sem autorização correspondente continuam informativos e não viram
  links para rotas proibidas.
- Nenhuma rota, regra de acesso, payload, autenticação ou redirect mudou.

## 5. Responsividade e acessibilidade

- 1440 px: quatro KPIs, dois painéis paralelos e quatro ações em linha.
- 768 px: KPIs 2 × 2 e painéis empilhados.
- 360/390 px: leitura em um fluxo, cards compactos, badges sob o texto e bottom
  navigation preservada.
- Ausência de overflow horizontal comprovada nos quatro viewports.
- Um único `h1`, seções nomeadas, foco visível, estados de loading/erro e retry
  acessível.
- Movimento reduzido desativa transições e animação do skeleton.

## 6. Limpeza aplicada

Os seletores legados exclusivos do antigo Dashboard foram removidos de
`global.css`: hero específico, signal grid, seção de prioridades e variações do
MetricGrid. Componentes e estilos compartilhados por outras telas permaneceram
intactos.

## 7. Evidências

Com o showcase em execução:

```powershell
cd frontend
npm run showcase
```

Abrir:

`http://127.0.0.1:4174/showcase/evidence/v2-05/`

A galeria contém a referência integral, desktop 1440, mobile 360/390 e tablet
768. Cada imagem abre diretamente em uma nova aba.

Para regenerar as capturas e os testes próprios:

```powershell
cd frontend
npm run test:visual:dashboard
```

## 8. Gates locais

- `npm run lint`: aprovado;
- `npm run build`: aprovado;
- `npm run test:e2e`: 35/35 aprovados;
- `npm run test:visual:dashboard`: 12/12 aprovados;
- `npm run test:visual:shell`: 11 aprovados e 1 skip desktop intencional;
- `git diff --check`: aprovado;
- backend não alterado.

## 9. Aprovação e continuidade

Gabriel aprovou a etapa em 19/08/2026. O marco foi consolidado no commit
`2abf89b`, e o branch `feat/frontend-v2-familias` foi aberto a partir dessa base
para executar o V2-06 sem misturar o histórico do Dashboard.

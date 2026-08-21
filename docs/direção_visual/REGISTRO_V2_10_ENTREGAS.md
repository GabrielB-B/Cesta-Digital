# Registro do marco V2-10 — Entregas

**Branch:** `feat/frontend-v2-entregas`

**Base aprovada:** `78d114a` (`V2-09A`)

**Status:** implementação concluída localmente; aguardando aprovação visual de Gabriel

**Referência:** `referencias_por_tela/06-entregas-desktop.png`

## 1. Escopo entregue

- A rota `/deliveries` foi reformulada seguindo a composição da referência 06:
  quatro indicadores, períodos operacionais, busca, agenda e contexto selecionado.
- Desktop mantém sidebar fixa, tabela paginada e painel contextual à direita.
- 360, 390 e 768 usam cartões próprios; nenhuma tabela é comprimida no mobile.
- A rota `/delivery-schedules/new` recebeu o mesmo padrão visual e preserva o
  payload existente de agendamento.
- Confirmação, cancelamento, reagendamento e rastreabilidade continuam
  disponíveis conforme o estado real de cada agenda.

## 2. Contrato operacional adicionado

- `GET /delivery-operations` entrega uma projeção paginada e pesquisável da
  agenda, com períodos `hoje`, `amanha`, `semana` e `todos`.
- Os quatro contadores são globais e calculados no servidor: agendadas,
  reagendadas, concluídas e ocorrências.
- Cada item reúne agenda, tipo de cesta, código interno da família, decisão
  social atual e metadados de status necessários à interface.
- A data civil é calculada no fuso operacional de São Paulo.
- O novo endpoint é somente leitura. Tabelas, migrations, contratos de escrita
  e políticas de baixa de estoque não foram alterados.

## 3. Aptidão social refletida na entrega

- O painel selecionado distingue `apta_recorrente`, `apta_emergencial` e
  família ainda em avaliação.
- O formulário de nova entrega oferece apenas famílias cuja decisão registrada
  é apta e explica que essa decisão vem da avaliação social vigente.
- A ação de confirmar entrega também explicita a aptidão no contexto visual.
- O backend legado de criação continua bloqueando famílias `inativa` e
  `inapta`. Endurecer a regra para rejeitar todos os demais estados no servidor
  seria uma mudança adicional de negócio, com impacto em fluxos existentes, e
  permanece fora deste marco visual até aprovação e testes próprios.

## 4. Diferenças deliberadas da referência

| Elemento ilustrado | Decisão implementada |
|---|---|
| Mapa e rota do dia | omitidos porque o domínio não armazena coordenadas, paradas nem otimização de rota; substituídos por painel real da entrega selecionada |
| Faixas de horário | não simuladas; a agenda atual possui data, mas não janela de atendimento |
| Nomes e endereços de família na listagem | usados códigos internos e decisão social, pois o contrato da agenda não possui um endereço logístico consolidado para exibição |
| Indicador “em andamento” | substituído por reagendadas, que é um estado real do domínio |
| Indicador “canceladas” | ampliado para ocorrências, reunindo cancelamentos e faltas existentes |
| Sino e notificações | shell real preservado; não existe contrato de notificações |

## 5. Responsividade e acessibilidade

- `>= 1180 px`: quatro KPIs, tabela operacional e painel de contexto.
- `768 px`: indicadores em grade, cartões e navegação mobile ativa.
- `360/390 px`: uma coluna, ações por estado, contexto legível e barra inferior.
- Tabs usam estado selecionado, busca possui label acessível, carregamento e
  erros possuem feedback semântico, e os botões mantêm foco visível.
- Não há overflow horizontal nos quatro viewports automatizados.

## 6. Evidências locais

- backend `compileall` aprovado e suíte completa 69/69;
- frontend lint e build aprovados;
- regressão funcional 37/37 E2E aprovada;
- gate visual V2-10: 8 testes aprovados e 4 skips intencionais por viewport;
- viewports 360×800, 390×844, 768×1024 e 1440×900;
- galeria clicável: `frontend/showcase/evidence/v2-10/index.html`;
- referência integral e oito capturas de implementação incluídas;
- banco e migrations: nenhuma alteração;
- publicação externa: não realizada; o `NO-GO` profissional permanece.

## 7. Gate

O marco V2-10 está pronto para inspeção visual de Gabriel. Tipos de Cesta
(`V2-11`) não avança antes da aprovação explícita deste checkpoint.

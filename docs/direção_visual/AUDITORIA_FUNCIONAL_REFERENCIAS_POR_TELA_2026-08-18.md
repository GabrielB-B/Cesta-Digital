# Auditoria funcional das referências por tela — 18/08/2026

## 1. Objetivo

Esta auditoria compara cada nova referência visual com as rotas, tipos e APIs
existentes. O objetivo é alcançar alta fidelidade sem transformar conteúdo de
mockup em funcionalidade fictícia e sem quebrar deep links, RBAC ou regras de
domínio.

## 2. AppShell comum

| Referência | Contrato real | Decisão de implementação |
|---|---|---|
| Sidebar fixa no desktop | `AppLayout` já filtra navegação por papel e resolve seção ativa | Preservar RBAC; adotar a proporção e o estado ativo das imagens sem expor links inexistentes. |
| Topbar com conta, avatar e sino | `/auth/me` retorna nome, login e papéis; não há avatar nem notificações | Mostrar identidade textual/initials e menu de conta. Não criar badge de notificação cenográfico. |
| Nove entradas de menu iguais em todas as telas | O frontend possui nove destinos reais, mas não os mesmos do mockup, e cada papel vê um subconjunto | Exibir somente destinos reais e autorizados. “Avaliações”, “Entradas” e “Relatórios” entram apenas após contratos/rotas aprovados. |
| Coluna contextual à direita | Algumas rotas têm detalhe real; outras não | Usar painel no desktop e drawer/rota no mobile somente quando existir dado real; preservar URL/deep link. |
| Mobile | Não há referência mobile entre as dez imagens | Derivar da direção já aprovada: 360/390 primeiro, bottom navigation para destinos principais e drawer para o restante. |

## 3. Matriz tela a tela

### 3.1 Início — referência 01

**Existe hoje:** `/` e `GET /dashboard/overview`.

O contrato fornece famílias totais/ativas e por estado, retiradas pendentes,
entregas no mês, reavaliações próximas, alertas de estoque e cestas possíveis.
Não fornece “entradas hoje”, variação semanal, lista genérica de tarefas nem a
quantidade de “itens distribuídos” mostrada em outras referências.

**Fidelidade segura:** reproduzir saudação, quatro KPIs, dois painéis de
prioridades e ações rápidas usando exclusivamente `DashboardOverviewResponse`.
Os cards serão renomeados para dados reais. Não haverá cálculo inventado nem
nova API neste branch.

### 3.2 Famílias — referência 02

**Existe hoje:** lista, busca, filtro de status, paginação por headers, detalhe,
edição, pessoas, benefícios e avaliações sob `/families`.

`FamilyResponse` não possui “nome da família” nem nome do responsável na
projeção de lista. O detalhe possui pessoas e endereço, mas não CPF. Copiar as
colunas do mockup literalmente criaria N+1 requests ou campos inexistentes.

**Fidelidade segura:** manter a composição busca/filtro/CTA + tabela desktop +
lista mobile. Usar código, status, endereço/região e datas reais na listagem. O
painel lateral pode carregar o detalhe sob demanda ou encaminhar à rota
`/families/:familyId`; CPF não entra. Qualquer projeção de “família/responsável”
no endpoint de lista será requisito backend separado.

### 3.3 Avaliações — referência 03

**Existe hoje:** `GET/POST /families/{family_id}/assessments` e rota de nova
avaliação dentro da família.

Não existe listagem global, busca global, etapas “triagem → análise documental
→ visita → entrevista → parecer”, status de andamento ou histórico por etapa.
O modelo atual registra uma avaliação concluída com pontuação, sugestão do
sistema e decisão final.

**Fidelidade segura:** aplicar a linguagem de timeline/status ao histórico real
da família e ao formulário existente. Uma aba global “Avaliações” com o
comportamento da imagem depende de decisão funcional e novo contrato; não será
simulada.

### 3.4 Estoque — referência 04

**Existe hoje:** itens, categorias, `GET /stock-summary`, `GET /stock-alerts`,
lotes, movimentos, detalhe e registros de entrada/saída.

O resumo fornece quantidade total, número de lotes, mínimo e alerta de estoque
baixo. Não fornece diretamente contadores globais “vencendo em 15 dias” e
“vencidos”. Esses dados estão nos lotes, mas não há endpoint agregado próprio.

**Fidelidade segura:** reproduzir busca, filtros, tabela/lista, alerta de baixo
estoque e painel contextual com item, lotes e movimentos reais. Métricas de
validade só serão mostradas se puderem ser calculadas sem paginação incompleta
ou se receberem contrato agregado. O erro textual “Entoque” da imagem não será
copiado.

### 3.5 Entradas — referência 05

**Existe no backend:** `GET/POST /stock-batches` com paginação e metadados de
lote. **Existe no frontend:** apenas `/stock-batches/new`.

O contrato não possui nome de fornecedor, nome do responsável ou filtros de
data/busca no servidor; possui tipo de origem, código do lote, quantidade,
entrada, validade, localização e `created_by_user_id`.

**Fidelidade segura:** a tela visual é viável com dados reais, mas a aba exige
uma nova rota frontend de histórico. Essa mudança será isolada e aprovada no
branch `feat/frontend-v2-entradas`; não exige inventar endpoint, mas exige
congelar path, RBAC, comportamento de Voltar e novos testes. Campos não
suportados serão substituídos pelos metadados reais do lote.

### 3.6 Entregas — referência 06

**Existe hoje:** agendamentos, atualização de agenda, confirmação de entrega,
lista e detalhe rastreável.

Não há contrato de geolocalização, otimização de rota, paradas, horários em
faixa ou mapa. Os agendamentos retornam IDs de família/cesta, data, status e
notas; nomes/endereço exigem composição com dados já existentes.

**Fidelidade segura:** manter KPIs, filtros temporais possíveis, lista/tabela e
painel contextual com agendamentos/entregas reais. O espaço do mapa será
substituído por resumo da próxima retirada/entrega ou ficará ausente. Mapa só
entra como feature funcional própria, com privacidade e fornecedor definidos.

### 3.7 Tipos de Cesta — referência 07

**Existe hoje:** lista, criação, detalhe, edição backend, composição de itens e
disponibilidade por cesta.

O valor estimado não vem pronto no detalhe, mas pode ser calculado com valores
de referência dos itens somente se a composição buscar esses contratos de modo
consistente. “Duplicar cesta” não é operação única existente; desativar pode
ser representado por atualização de `is_active` quando a UI atual permitir.

**Fidelidade segura:** alta fidelidade para cards de cesta, composição, status e
resumo. Ações secundárias aparecem apenas quando implementadas com chamadas
reais e proteção contra estados parciais.

### 3.8 Relatórios — referência 08

**Existe hoje:** `GET /financial-summary` e exportação CSV de auditoria em
`GET /audit-logs/export`.

Não existe `/reports`, período comum nem exportação Excel dos seis relatórios
mostrados. KPIs de impacto e arquivos `.xlsx` não podem ser prometidos pela UI.

**Fidelidade segura:** a linguagem visual poderá organizar Resumo Financeiro e
Auditoria/CSV. Uma aba global “Relatórios” equivalente à imagem depende de
requisito, matriz de acesso e contratos de geração/exportação. Nenhum tile de
download será exibido sem arquivo real.

### 3.9 Administração — referência 09

**Existe hoje:** usuários, papéis disponíveis, criação, edição, reset de senha,
ativação/inativação e auditoria. O acesso é exclusivo de `admin`.

Não há avatar, organização, ID público, configuração de cadastro, 2FA, sessão
automática, notificações, fuso ou idioma. Papéis são opções de atribuição, não
um CRUD de perfis.

**Fidelidade segura:** aplicar a composição com navegação interna a Usuários e
Auditoria, tabela/lista responsiva e ações reais. O painel direito mostrará
resumo administrativo suportado ou contexto do usuário selecionado; toggles
inexistentes não serão renderizados.

### 3.10 Login — referência 10

**Existe hoje:** login por `login_name`, senha, cookie HttpOnly, logout,
recuperação por e-mail e aviso de ambiente.

O backend não autentica por e-mail, não recebe “lembrar-me” e não fornece canal
para “fale com nosso time”. O cromado de janela é apenas moldura do mockup.

**Fidelidade segura:** reproduzir o split institucional desktop, marca grande,
formulário branco, recuperação de senha real e CTA com assinatura rosa → roxo.
No mobile, a marca permanece visível sem competir com o formulário. O rótulo
será “Nome de login”, o cookie manterá sua política atual e não haverá controle
de persistência fictício.

## 4. Riscos de quebra e controles

| Risco | Controle obrigatório |
|---|---|
| Menu visual divergir de RBAC | Reutilizar `ROUTE_ACCESS` e ampliar testes dos três papéis. |
| Painel lateral eliminar deep link | Painel nunca substitui a rota de detalhe; navegação e Voltar permanecem testados. |
| Desktop fiel e mobile espremido | Capturas 390/1440 e teste de overflow; lista mobile própria. |
| Métricas ilustrativas virarem informação falsa | Tipar todo valor a partir da resposta real; sem fallback numérico hardcoded. |
| CTA sem capacidade real | Não renderizar ação até haver handler/rota/API e estados loading/success/error. |
| Gradiente voltar a poluir a UI | Restringir ao CTA primário e login; testes/revisão visual bloqueiam uso em superfície operacional. |
| Mudança visual quebrar formulários | Preservar payload, validação, alterações não salvas e E2E existente. |

## 5. Primeiro recorte executável

O próximo recorte é somente o AppShell comum. Ele deve implementar sidebar fixa
no desktop, navegação mobile, topbar, marca, conta, localização ativa e RBAC,
sem redesenhar o conteúdo das abas. Depois das capturas e aprovação desse shell,
o trabalho segue para Login e então Início. Nenhuma outra aba avança junto.

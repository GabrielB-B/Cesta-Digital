# Auditoria de fidelidade — Baseline Frontend V2

**Referência visual:** `Cesta_Digital_Frontend_V2_Baseline_Desktop.png`

**Implementação comparada:** showcase V2-02 no branch
`feat/frontend-v2-foundation`.

**Regra:** a imagem governa identidade, composição, densidade e hierarquia. O
código e o plano governam rotas, RBAC, dados e capacidades reais. Fidelidade
visual não autoriza criar funcionalidade inexistente.

## 1. Resultado executivo

A fundação V2 está alinhada em marca, Inter, paleta, superfícies, bordas,
radius, sombra discreta, estados semânticos, tabela/lista responsiva e drawer.
Ela não representa telas finais de Dashboard, Famílias, Avaliação ou Estoque.
Cada uma será migrada no marco próprio e terá uma comparação independente em
390 e 1440 px.

Esta auditoria encontrou e corrigiu no V2-02:

- estado ativo que perdia o rosa da marca durante hover;
- ausência do botão secundário branco com contorno rosa da baseline;
- falta de distinção entre ação secundária de marca e ação neutra;
- identidade do usuário posicionada no rodapé da sidebar em vez da topbar;
- numeração incorreta das futuras etapas de Famílias, Estoque e Entregas;
- ausência de evidência específica para primitives em mobile e desktop.

## 2. Matriz da fundação

| Parte da baseline | Situação V2-02 | Decisão |
|---|---|---|
| Símbolo rosa/roxo | fiel | preservar o asset original; nunca redesenhar o gradiente em CSS |
| Inter e hierarquia compacta | fiel | manter tokens tipográficos aprovados |
| Fundo `#F7F8FA` e superfícies brancas | fiel | manter em todos os módulos |
| Texto grafite e borda neutra | fiel | evitar preto absoluto e contornos pesados |
| CTA rosa preenchido | fiel | uma ação dominante por região |
| Secundário branco/rosa | corrigido | variante `secondary` representa ação de marca não dominante |
| Ação neutra branca/cinza | corrigido | variante `neutral` separada para cancelar/voltar |
| Estados verde/amarelo/vermelho/azul | fiel | cor somente por significado operacional |
| Sidebar desktop | fiel como fundação | largura 232 px; item atual rosa; sem perfil no rodapé |
| Conta no topo direito | fiel como composição | preview estático no showcase; menu real pertence ao V2-03 |
| Bottom navigation | adaptação mobile | quatro destinos prioritários; demais destinos irão para “Mais” no shell real |
| Breadcrumb dinâmico | divergência deliberada | mantido no showcase para responder ao feedback de localização; V2-03 decide sua necessidade sem poluir a topbar |

## 3. Fidelidade por tela e marco

### V2-03 — AppShell

- desktop com sidebar fixa, marca no topo, navegação limpa e item atual rosa;
- topbar compacta com controle da navegação, notificação e conta à direita;
- mobile com marca ampliada, topbar de 56 px, bottom nav e drawer “Mais”;
- rota atual deve vir de `location.pathname`, nunca de estado visual isolado;
- menus filtrados pelos mesmos grupos RBAC do router;
- preservar skip link, foco, Escape, `inert`, restauração e scroll lock.

### V2-04 — Login

- composição clara e imediata, símbolo oficial com presença adequada;
- labels persistentes, erro inline e botão Entrar como único CTA primário;
- nenhum vídeo ou splash bloqueante;
- autenticação, cookies e redirects idênticos ao contrato atual.

### V2-05 — Dashboard

- saudação curta no início, sem hero grande;
- até quatro KPIs individuais e compactos;
- tarefas/pendências e alertas de estoque abaixo dos KPIs;
- ações rápidas em uma linha discreta;
- remover CTA genérico “Novo atendimento” se não houver destino real;
- usar somente `DashboardOverviewResponse`, sem transformar números da imagem
  em novos requisitos de API.

### V2-06 — Famílias: lista e detalhe

- PageHeader compacto, busca, filtros e “Nova família” como CTA primário;
- tabela desktop com código, família/responsável, status e última avaliação;
- lista mobile sem scroll horizontal de página;
- detalhe lateral pode reproduzir a composição da imagem, mas deve preservar
  `/families/:familyId` e deep link;
- filtros e paginação continuam no URL.

### V2-07 — Famílias: formulários e avaliação

- stepper visível para avaliação quando útil;
- resumo da família, membros e informações sociais em seções claras;
- action bar mobile e foco no primeiro erro;
- não prometer “Salvar rascunho” sem persistência real no backend;
- payloads atuais permanecem compatíveis.

### V2-08 — Estoque e doações

- `/items` vira visão operacional de alimentos, higiene, limpeza e essenciais;
- filtros compactos, tabela desktop e CTA “Registrar entrada”;
- produto, categoria, unidade, quantidade, lote, validade e status formam o
  núcleo visual;
- drawer de entrada pode reproduzir a baseline preservando
  `/stock-batches/new`;
- mobile usa lista com saldo, validade/alerta e status;
- famílias e pessoas nunca aparecem como conteúdo de estoque;
- “Exportar” só entra quando existir capacidade real aprovada.

### V2-09 — Cestas e distribuição

- separar tipos de cesta, agendamentos e entregas;
- entregas organizadas por hoje, pendentes e concluídas;
- manter regras de estoque prometível, confirmação e rastreabilidade de lotes;
- seguir a mesma gramática visual quando a baseline não trouxer mockup completo.

### V2-10 — Administração e financeiro

- aplicar a mesma identidade sem inventar uma composição ausente na imagem;
- usuários e auditoria continuam restritos a admin;
- dados técnicos de auditoria ficam disponíveis sob demanda, não como ruído
  primário.

## 4. Navegação: imagem versus sistema real

A imagem contém “Avaliações”, “Entradas” e “Relatórios” como destinos de
primeiro nível. O sistema não possui todas essas rotas como listagens globais.
Portanto:

- avaliação continua filha de família;
- registrar entrada é CTA dentro de Estoque e preserva a rota existente;
- resumo financeiro permanece no módulo social;
- itens, categorias, cestas, entregas, usuários e auditoria mantêm rotas e RBAC;
- aparência segue a baseline, mas nenhum item vazio será criado só para copiar o
  menu da imagem.

## 5. Gate obrigatório para cada tela

Uma tela só pode ser considerada fiel quando:

1. foi comparada lado a lado com a região correspondente da baseline;
2. possui evidência 390x844 e 1440x900, mais 768x1024 quando houver mudança;
3. item ativo, título e contexto concordam entre si;
4. desktop table possui MobileList equivalente quando aplicável;
5. loading, vazio, erro, sucesso e permissão foram tratados;
6. foco, teclado, contraste e ausência de overflow foram verificados;
7. rotas, RBAC, API e payloads passaram pelo safety net;
8. Gabriel aprovou visualmente antes do próximo marco.

## 6. Evidências do V2-02

A galeria versionada está em `frontend/showcase/evidence/v2-02/` e pode ser
aberta com o showcase local. Ela contém visão geral, contexto de estoque e
primitives em mobile/desktop.

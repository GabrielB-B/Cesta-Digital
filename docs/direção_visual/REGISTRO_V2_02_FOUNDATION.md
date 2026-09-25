# Registro do marco V2-02 — Fundação visual

**Branch:** `feat/frontend-v2-foundation`

**Base aprovada:** `16f787b` (`V2-01`)

**Status:** fundação aprovada; referências específicas por tela incorporadas antes do AppShell.

**Objetivo:** transformar a direção aprovada em tokens e componentes reais,
validáveis de forma isolada antes de alterar o AppShell ou qualquer jornada
operacional.

## 1. Escopo implementado

- Tokens V2 em CSS custom properties, derivados dos arquivos canônicos desta
  pasta.
- Inter Variable carregada localmente pelo pacote `@fontsource-variable/inter`.
- Símbolo oficial copiado sem redesenho para `frontend/public/brand/`.
- Primitives com CSS Modules: `Button`, `TextField`, `StatusBadge`, `Surface`,
  `PageHeader`, `DataTable`, `MobileList`, `Drawer`, `SideNavigation` e
  `BottomNavigation`.
- Showcase responsivo em `frontend/showcase/index.html`, separado do router,
  autenticação, APIs e bundle atual do produto.
- Build próprio do showcase e suíte Playwright própria em 360, 390, 768 e
  1440 px.

## 2. Como visualizar

No diretório `frontend`:

```powershell
npm run showcase
```

Abrir `http://127.0.0.1:4174/showcase/`.

Para regenerar as evidências:

```powershell
npm run test:visual:foundation
```

As capturas são gravadas em `frontend/test-results/foundation-v2/`. A pasta é
ignorada pelo Git por ser evidência regenerável.

## 3. Comparação com a baseline aprovada

| Critério | Implementação V2-02 |
|---|---|
| Marca | símbolo oficial preservado como asset; sem redesenho em CSS |
| Tipografia | Inter Variable, com hierarquia compacta de 12 a 28 px |
| Superfícies | página `#F7F8FA`, painéis brancos, borda neutra e sombra mínima |
| Cor de marca | rosa funcional em ação principal, foco, navegação ativa e pequenos marcadores |
| Estados | verde, amarelo, vermelho e azul apenas para semântica operacional |
| Composição | sidebar de 232 px no desktop, topbar compacta e conteúdo com máximo de 1440 px |
| Mobile | navegação inferior, ação primária em largura total e tabela convertida em lista |
| Restrições | nenhum gradiente em superfície operacional, glow, glassmorphism, textura ou hover em superfície estática; exceções de marca seguem o manifesto por tela |

O showcase usa conteúdo operacional plausível somente para exercitar a
fundação. Números, nomes e ações são demonstrações e não criam domínio, rota ou
endpoint.

## 4. Acessibilidade e responsividade

- foco visível global e contraste sem depender apenas de cor;
- labels, hint, erro, `aria-invalid` e `aria-describedby` nos campos;
- `caption` de tabela e lista móvel nomeada;
- navegação atual com `aria-current="page"`;
- drawer com `role="dialog"`, nome e descrição acessíveis, foco inicial,
  contenção de Tab, Escape, restauração de foco e scroll lock;
- respeito a `prefers-reduced-motion`;
- ausência de overflow horizontal validada em 360, 390, 768 e 1440 px.

## 5. Isolamento e contratos preservados

- nenhuma rota de `App.tsx` foi incluída, removida ou alterada;
- nenhuma regra RBAC, chamada Axios, cookie, payload ou endpoint mudou;
- login, dashboard e telas operacionais continuam renderizando o frontend
  legado até aprovação explícita do próximo marco;
- o build principal continua tendo somente seu entrypoint original; o showcase
  possui build separado em `dist-showcase`;
- nenhum arquivo do backend foi alterado.

## 6. Gates locais

- `npm run lint`: aprovado;
- `npm run build`: aprovado;
- `npm run build:showcase`: aprovado;
- `npm run test:visual:foundation`: 16/16 aprovados;
- `npm run test:e2e`: 35/35 aprovados, sem retry;
- `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas;
- `git diff --check`: aprovado.

## 7. Diferenças deliberadas

- A baseline desktop é uma imagem estática. O showcase acrescenta estados
  acessíveis e responsivos indispensáveis para produção sem mudar sua linguagem.
- Em larguras abaixo de 900 px, a sidebar dá lugar à navegação inferior. A
  largura de 768 px também usa esse modo por falta de espaço útil para operação.
- A tabela vira lista abaixo de 680 px para manter legibilidade em 360/390 px.
- O drawer ocupa quase toda a largura no celular, preservando uma pequena faixa
  do contexto e uma área confortável de toque.

## 8. Riscos conhecidos

- O bundle legado continua com aproximadamente 513 kB de JavaScript e o logo
  legado de aproximadamente 1,38 MB. Este marco não os remove porque o produto
  atual ainda depende deles; a migração e o code splitting pertencem aos marcos
  de shell/performance.
- O showcase não deve ser confundido com rota pública ou dashboard conectado.
  Ele é um ambiente de decisão e teste da fundação.
- As APIs dos primitives foram mantidas pequenas. Estados adicionais só devem
  ser incluídos quando uma jornada real provar a necessidade.

## 9. Próximo gate

Gabriel aprovou a fundação e forneceu dez referências específicas por tela. O
`V2-03 — AppShell e navegação` pode começar em branch próprio, mantendo este
branch sem migração de telas reais e sem publicação.

## 10. Revisão visual do responsável

Após a primeira avaliação, a direção de cor, densidade e composição mobile foi
considerada adequada. O símbolo no cabeçalho móvel passou de 24 para 32 px e o
nome do produto recebeu maior peso para corrigir a presença insuficiente da
marca. O comportamento responsivo permanece explícito: sidebar fixa a partir de
900 px e navegação inferior abaixo desse breakpoint.

## 11. Correção de contexto e localização

A revisão seguinte identificou que os itens “Estoque” e “Entregas” ainda eram
âncoras demonstrativas para seções sem relação com seus nomes, enquanto “Visão
geral” permanecia marcada como ativa. Embora não fossem rotas reais, esse
comportamento gerava uma interpretação incorreta do domínio.

A fundação passou a demonstrar navegação contextual de forma explícita:

- item ativo e breadcrumb mudam juntos em desktop e mobile;
- “Estoque” apresenta somente o escopo de alimentos, higiene, limpeza,
  categorias, unidade, quantidade, lote, validade e movimentos;
- cadastros de famílias e pessoas não aparecem no contexto de estoque;
- “Famílias” e “Entregas” têm escopos próprios e informam em qual etapa real
  serão migradas;
- uma mensagem deixa claro que o conteúdo é showcase e não uma rota operacional
  já concluída;
- a suíte visual valida a troca de contexto nas quatro larguras.

As capturas de aprovação foram copiadas para
`frontend/showcase/evidence/v2-02/`, com galeria HTTP própria, evitando links
locais frágeis ou caminhos com caracteres especiais.

## 12. Fechamento da auditoria de fidelidade

A comparação detalhada com a baseline gerou
`AUDITORIA_FIDELIDADE_BASELINE_V2_2026-08-18.md` e corrigiu quatro diferenças da
fundação antes do AppShell:

- item ativo permanece rosa também em hover;
- botão secundário de marca recebeu contorno rosa, separado do botão neutro;
- identidade do usuário foi movida do rodapé da sidebar para a topbar desktop;
- Famílias, Estoque e Entregas passaram a indicar corretamente V2-06, V2-08 e
  V2-09.

O showcase continua sem substituir telas reais. Dashboard, Famílias, Avaliação,
Estoque e Distribuição obedecerão ao gate individual documentado na auditoria.

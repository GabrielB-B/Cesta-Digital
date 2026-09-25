# Diagnóstico executivo — Frontend V2

**Data:** 18/08/2026

**Marco:** `V2-00 — Registrar a decisão`

**Baseline revalidada:** `4e3d24e12a3ab24bba06895052a6f2768e6881c7` (`main`)

**Branch documental:** `docs/frontend-v2-decision`

## Veredito

O Cesta Digital deve evoluir como um Frontend V2 dentro da aplicação React
atual. Não há justificativa técnica para reescrever o backend, duplicar o
frontend ou alterar banco, URLs, RBAC e payloads por causa do redesign.

A migração segura é incremental: congelar contratos, implantar fundação visual,
migrar o shell e então avançar jornada por jornada. O CSS global não pode ser
substituído em massa porque ainda governa simultaneamente shell, login,
componentes compartilhados e todas as telas de negócio.

## Propósito que deve orientar a interface

O produto é a central confiável de abastecimento e cuidado social da
organização: cada alimento rastreável, cada família atendida com contexto, cada
decisão justificável e cada entrega comprovável. O visual deve transmitir
confiança, cuidado, organização, rastreabilidade e eficiência operacional.

“Premium” significa composição precisa, legibilidade, consistência e interação
segura. Não significa efeitos, decoração ou uma landing page dentro do sistema.

## Baseline técnica observada

| Área | Estado em 18/08/2026 | Consequência para a V2 |
| --- | --- | --- |
| Rotas | 25 rotas de aplicação mapeadas, mais fallback; deep links existentes | Congelar paths e `RoleRoute.allowedRoles` |
| Perfis | `admin`, `lider_social` e `operador` | Menu e navegação mobile precisam continuar filtrados por papel |
| Sessão | Axios central, `withCredentials`, `/auth/login`, `/auth/me`, `/auth/logout` | Não criar cliente HTTP ou protocolo paralelo |
| Backend | FastAPI em camadas, RBAC também aplicado nos routers | Nenhuma mudança de backend é necessária nos marcos visuais iniciais |
| CSS | `global.css`: 5.039 linhas, 107.851 bytes, 116 gradientes e 9 `!important` | Migrar por componente/tela com CSS Modules; reduzir o legado em cada marco |
| Código de páginas | Maiores arquivos entre 658 e 869 linhas; estado, API e UI concentrados | Extrair por feature gradualmente; evitar refatoração ampla junto do redesign |
| Bundle | JS único 513,26 kB (136,19 kB gzip); CSS 81,03 kB; aviso de chunk > 500 kB | Lazy routes entram após estabilização das jornadas, com medição por marco |
| Marca | `logoupg.png` com 1.378,79 kB no build | Usar símbolo oficial otimizado no shell; provar equivalência visual antes de remover asset |
| Fontes atuais | Nunito Sans + Sora | Substituir pela Inter aprovada apenas na fundação visual |
| Testes | Playwright cobre 27 jornadas/contratos em Chromium | Preservar cobertura e desacoplar seletores de classes visuais |

## Baseline de qualidade executada

| Gate | Resultado |
| --- | --- |
| `npm ci` | Dependências restauradas conforme lockfile |
| `npm run lint` | Aprovado |
| `npm run build` | Aprovado; warning de chunk monolítico registrado |
| `npm run test:e2e` | 27/27 aprovados, sem retry |
| `git diff --check` | Aprovado antes do marco documental |
| Backend compile/test | Não executado: `backend/.venv` ausente e Python global sem FastAPI |

O ambiente de backend deve ser restaurado conforme a documentação antes de
qualquer marco que altere backend. Os primeiros marcos visuais não autorizam
mudanças de backend.

## Risco de dependências

`npm audit` reportou 6 vulnerabilidades: 5 altas e 1 moderada. Há achados em
`react-router`/`react-router-dom` 7.13.1 e dependências transitivas
(`brace-expansion`, `js-yaml`, `nanoid` e `postcss`).

A correção deve ocorrer como mudança técnica isolada em `V2-01`, com diff do
lockfile revisado e todos os 27 E2E verdes. Não executar `npm audit fix` de forma
automática dentro de um marco visual.

## Comparação visual: atual × baseline aprovada

| Atual | Frontend V2 aprovado |
| --- | --- |
| Fundo escuro e textura global | Fundo `#F7F8FA`, superfícies brancas e bordas neutras |
| Gradientes, sombras e bordas coloridas recorrentes | Gradiente apenas dentro do símbolo oficial; sombras raras e funcionais |
| Hero autenticado grande | Cabeçalho operacional compacto |
| Métricas repetidas em hero, sinais e seis cards | Até quatro KPIs úteis, sem duplicação |
| Muitos cards, inclusive aninhados | Seções, divisores, respiro e cards apenas quando estruturais |
| Drawer lateral no mobile e tabelas horizontais | Bottom navigation por papel, drawer “Mais” e MobileList |
| Várias ações com peso semelhante | Uma ação primária dominante por região |
| Marca raster pesada | Símbolo oficial otimizado, com proporção preservada |

## Contratos imutáveis nos marcos visuais

- paths atuais e `RoleRoute.allowedRoles`;
- comportamento de `ProtectedRoute` e `RoleRoute`;
- cliente Axios e sessão por cookie;
- fluxo `/auth/login` → `/auth/me` e `/auth/logout`;
- endpoints, tipos, payloads e regras de estoque, elegibilidade e entrega;
- `PageLifecycle`, skip link, foco visível, `aria-live` e proteção contra perda
  de preenchimento;
- cobertura E2E existente; teste não pode ser removido ou relaxado para acomodar
  o redesign;
- aviso seguro de ambiente enquanto a política de homologação exigir.

## Análise de quebra por área

### Shell e rotas

Maior risco estrutural. A extração de sidebar, bottom navigation, drawer “Mais”
e menu de conta pode quebrar item ativo em rotas filhas, filtragem por perfil,
foco, Escape, `inert`, restauração de foco e scroll lock. A rota continua sendo a
fonte de verdade; drawer e painéis nunca substituem deep links.

### Login

O contrato de autenticação pode ser preservado integralmente. A tela deve mudar
somente apresentação. O componente de splash/vídeo não está no fluxo atual da
`LoginPage`; sua remoção definitiva depende de busca de referências e dos testes
de login, loading, concorrência de `/auth/me`, erro e reduced motion.

### Dashboard

Não requer endpoint novo. A composição V2 deve usar somente
`DashboardOverviewResponse`. A principal mudança é remover duplicação entre
hero, sinais e métricas, escolhendo prioridades reais por perfil e pelos dados
existentes.

### Listas e tabelas

`DataTable` hoje oferece apenas wrapper com rolagem. Famílias, itens, lotes,
entregas, usuários e auditoria precisam de apresentação mobile própria usando o
mesmo dataset. A tabela desktop permanece quando comparação entre colunas for
útil.

### Formulários sociais

Criação e edição de família são os maiores arquivos do front. O wizard inicial
deve manter estado apenas no cliente e enviar o payload atual. Não prometer
rascunho retomável sem persistência real. React Hook Form e Zod entram por caso
de uso, mantendo o backend como autoridade.

### Estoque e distribuição

Validade continua pertencendo ao lote. Entrada, movimentação, capacidade
prometível e rastreabilidade de entrega não podem ser reinterpretadas para
imitar o mockup. Overlays podem ser adotados depois, mantendo suas URLs.

### Server state e performance

TanStack Query e lazy routes são evoluções válidas, mas não devem entrar no
mesmo diff do primeiro redesign de uma feature. Primeiro estabilizar a
apresentação e seus testes; depois migrar cache/invalidation e chunks com
evidência própria.

## Sequência de branches e aprovações

| Marco | Branch prevista | Evidência/pausa |
| --- | --- | --- |
| V2-00 decisão | `docs/frontend-v2-decision` | Docs e direção versionados; sem mudança visual |
| V2-01 safety net | `test/frontend-v2-safety-net` | Rotas/RBAC/fluxos congelados; 27+ E2E verdes |
| V2-02 foundation | `feat/frontend-v2-foundation` | Showcase de primitives em 390/768/1440; aguardar aprovação visual |
| V2-03 shell | `feat/frontend-v2-app-shell` | Todas as rotas por papel + screenshots; aguardar aprovação visual |
| V2-04 login | `feat/frontend-v2-login` | Login 390/1440, teclado, erros e reduced motion; aguardar aprovação |
| V2-05 dashboard | `feat/frontend-v2-dashboard` | Dados reais do contrato, sem duplicação; aguardar aprovação |
| V2-06 famílias | `feat/frontend-v2-families` | Lista e detalhe responsivos; aguardar aprovação |
| V2-07 formulários sociais | `feat/frontend-v2-family-forms` | Payloads/erros/dirty state preservados; aguardar aprovação |
| V2-08 estoque | `feat/frontend-v2-stock` | Entrada/lote/movimento e MobileList; aguardar aprovação |
| V2-09 distribuição | `feat/frontend-v2-distribution` | Cestas, agenda e entregas; aguardar aprovação |
| V2-10 administração | `feat/frontend-v2-administration` | Usuários, auditoria e financeiro; aguardar aprovação |
| V2-11 plataforma | `refactor/frontend-v2-server-state` | Cache e mutations sem fetch duplicado |
| V2-12 cleanup | `refactor/frontend-v2-performance` | Lazy routes, CSS/assets mortos e budgets |
| V2-13 homologação | `release/frontend-v2-homologation` | WCAG, browsers, dispositivos, smoke e aprovação final |

Cada branch nasce da `main` aprovada do marco anterior. Não empilhar branches
visuais não aprovadas. A integração e publicação continuam submetidas aos gates
do `AGENTS.md`; não há push direto para `main`.

## Protocolo de entrega visual

Para cada marco com UI:

1. comparar novamente a implementação com a baseline desta pasta;
2. executar lint, build, E2E e `git diff --check`;
3. capturar 390x844 e 1440x900, mais 768x1024 quando material;
4. apresentar lado a lado baseline, antes e proposta;
5. documentar divergências deliberadas e contratos preservados;
6. interromper o avanço e aguardar aprovação de Gabriel.

## Estado de produto

O redesign não altera a decisão `NO-GO` profissional registrada no documento
canônico. Homologação continua limitada a dados sintéticos ou anonimizados até
os gates de domínio, segurança, LGPD e operação serem concluídos.

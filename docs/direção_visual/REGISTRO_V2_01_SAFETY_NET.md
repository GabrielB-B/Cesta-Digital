# Registro do marco V2-01 — Safety net funcional

**Branch:** `test/frontend-v2-safety-net`

**Base aprovada:** `56b2a44` (`V2-00`)

**Objetivo:** congelar contratos funcionais e preparar evidências reproduzíveis
antes do primeiro código visual do Frontend V2.

## 1. Escopo e arquivos

- Centralização dos grupos de acesso conhecidos em
  `frontend/src/routes/routeAccess.ts`.
- Tipagem dos perfis autenticados como `admin`, `lider_social` e `operador`.
- Router, sidebar e ações do dashboard passam a consumir os mesmos grupos,
  mantendo a mesma saída visual e funcional.
- Matriz E2E independente com 25 paths, títulos, seção ativa e papéis
  autorizados.
- Matriz de nove destinos de navegação, validada para os três perfis.
- Cobertura de deep link anônimo, fallback de rota desconhecida e captura de
  evidências em 390x844 e 1440x900.
- Atualização restrita do lockfile para versões corrigidas dentro das faixas já
  permitidas pelo `package.json`.

## 2. Contratos preservados

- Nenhum path ou `RoleRoute.allowedRoles` foi alterado.
- `/auth/login`, `/auth/me`, `/auth/logout`, cookie de sessão e cliente Axios
  permanecem intactos.
- Nenhum endpoint, tipo de payload, regra de domínio, migration ou arquivo de
  backend foi alterado.
- Filtros de menu continuam equivalentes às proteções de rota.
- `PageLifecycle`, redirects, tela de acesso restrito e fallback 404 foram
  preservados.

## 3. Diferenças visuais

Nenhuma. Não houve alteração em JSX renderizado, classes, CSS, fontes, assets ou
layout. As capturas continuam mostrando o frontend legado escuro; servem como
evidência “antes” para as futuras comparações com a baseline V2.

## 4. Acessibilidade

- Testes existentes de skip/foco do shell, `inert`, Escape, scroll lock e
  restauração de foco continuam ativos.
- A matriz usa navegação e headings semânticos, sem depender de classes V2.
- Deep link anônimo comprova que conteúdo protegido não aparece antes do
  redirect para login.

## 5. Dependências e segurança

`npm audit fix`, sem `--force`, atualizou somente `package-lock.json`:

- `react-router` e `react-router-dom`: 7.18.1 → 7.18.2;
- `postcss`: 8.5.19 → 8.5.26;
- `nanoid`: 3.3.16 → 3.3.18;
- `js-yaml`: 4.3.0 → 4.3.1;
- `brace-expansion`: 1.1.16 → 1.1.18 e 5.0.7 → 5.0.9.

Resultado: `npm audit --audit-level=moderate` sem vulnerabilidades conhecidas.

## 6. Gates

- `npm ci`: aprovado com lockfile reproduzível;
- `npm run lint`: aprovado;
- `npm run build`: aprovado;
- `npm run test:e2e`: 35/35 aprovados, sem retry;
- `npm audit --audit-level=moderate`: zero vulnerabilidades;
- `git diff --check`: aprovado.

## 7. Legado removido

Nenhum CSS ou asset foi removido neste marco. O safety net precisa existir antes
da redução progressiva do legado.

## 8. Riscos e próximos passos

- O bundle JS permanece acima de 500 kB e será tratado no marco de performance.
- O logo legado de aproximadamente 1,38 MB permanece até a migração visual da
  marca comprovar equivalência.
- A suíte atual executa Chromium; cobertura cross-browser pertence à homologação
  V2-13.
- O ambiente virtual local do backend continua ausente. Como o backend não foi
  alterado, isso não bloqueia este marco, mas deve ser restaurado antes de
  qualquer mudança de backend.
- Próximo marco: `V2-02 — Fundação visual`, com showcase de primitives e pausa
  obrigatória para aprovação em 390, 768 e 1440 px.

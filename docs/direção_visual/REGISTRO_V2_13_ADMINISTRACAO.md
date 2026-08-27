# Registro do marco V2-13 — Administração

**Branch:** `feat/frontend-v2-administracao`

**Base aprovada:** `f6071e6` (`V2-12`)

**Status:** implementação e gates locais concluídos; validação UX manual solicitada por Gabriel

**Referência:** `referencias_por_tela/09-administracao-desktop.png`

## 1. Escopo entregue

- O menu principal reúne as rotas administrativas existentes sob uma única
  seção “Administração”, como na referência, sem remover os endereços `/users`
  e `/audit-logs`.
- A navegação interna separa Usuários, Perfis e Auditoria e mantém a localização
  ativa em desktop e mobile.
- Usuários possui busca local, filtro por perfil, resumo de acessos, tabela no
  desktop e cartões em 360/390/768.
- Criação e edição continuam usando `POST /users` e `PUT /users/{id}`. A
  redefinição de senha usa `PUT /users/{id}/password` e informa que a ação foi
  auditada.
- Perfis descreve somente os três papéis reais retornados por `/users/roles` e
  suas responsabilidades já autorizadas pelo sistema.
- Auditoria preserva consulta paginada, filtros, exportação CSV e detalhe
  técnico sob demanda. Em mobile, a tabela é substituída por cartões legíveis.

## 2. Contratos preservados

- As 28 rotas continuam disponíveis; somente o agrupamento visual de `/users`
  e `/audit-logs` passou a apontar para a seção comum `/users`.
- `admin` continua sendo o único papel autorizado nas duas rotas e nos
  endpoints administrativos.
- Autenticação por cookie, cliente Axios, payloads, validação de senha e
  proteção do último administrador ativo não foram alterados.
- Nenhuma migration, tabela, coluna ou endpoint foi criado nesta etapa.
- Configurações de organização, autenticação em duas etapas e toggles do mockup
  não foram simulados porque não possuem contrato funcional aprovado.

## 3. Segurança e acessibilidade

- O diálogo bloqueia rolagem do documento, fecha com `Escape`, contém o foco e
  o devolve ao controle de origem.
- Formulários avisam sobre descarte de alterações não salvas e preservam os
  dados quando a API falha.
- Estados de carregamento, vazio, erro, sucesso e restrição por papel permanecem
  explícitos.
- Controles possuem foco visível; superfícies operacionais não usam gradiente,
  blur, glow ou elevação decorativa.
- Auditoria é somente leitura na interface e dados técnicos ficam recolhidos
  até solicitação explícita.

## 4. Evidências

- frontend lint aprovado;
- frontend build de produção aprovado;
- regressão funcional Playwright: 38/38 aprovada;
- gate visual V2-13: 10 testes aprovados e 6 skips intencionais por viewport;
- viewports: 360×800, 390×844, 768×1024 e 1440×900;
- evidências: `frontend/showcase/evidence/v2-13/`;
- `git diff --check`: sem whitespace inválido;
- publicação externa: não realizada.

## 5. Diferenças deliberadas da referência

| Elemento ilustrado | Decisão implementada |
|---|---|
| Configurações da organização | omitidas; não há API nem política aprovada para esses controles |
| Alternadores de 2FA, sessão e e-mail | omitidos para não prometer proteção inexistente |
| Perfis editáveis | perfis são explicados, mas não alterados; o backend expõe catálogo somente para leitura |
| Fotos de usuários | iniciais consistentes; não existe avatar persistido no contrato atual |
| Paginação fictícia de usuários | lista real é exibida integralmente porque `/users` não fornece contrato paginado |

## 6. Gate seguinte

As onze abas previstas na sequência visual possuem implementação V2. Por
instrução explícita de Gabriel, o próximo trabalho é uma etapa separada de
segurança da dependência `cryptography`, seguida de homologação local isolada
com dados sintéticos para validação UX manual. O `NO-GO` para dados pessoais
reais e publicação permanece vigente.

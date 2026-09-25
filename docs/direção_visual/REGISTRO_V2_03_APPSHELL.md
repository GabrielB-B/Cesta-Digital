# Registro do marco V2-03 — AppShell e navegação

**Branch:** `feat/frontend-v2-shell`  
**Base:** `9691cb3` (`V2-02` + referências por tela)  
**Status:** aprovado por Gabriel em 19/08/2026 e sucedido pelo marco V2-04
**Escopo visual:** somente a moldura autenticada; conteúdo das abas permanece
fora deste marco

## 1. Resultado implementado

- Sidebar desktop fixa de 276 px, branca, com marca em escala equivalente às
  referências e modo recolhido persistido em `localStorage`.
- Navegação plana, sem grupos visuais extras, com ícone/texto rosa e fundo rosa
  suave na seção ativa.
- Localização corrigida também em rotas filhas: cadastro de família mantém
  “Famílias” ativa; entrada/movimentação continuam sob “Estoque”.
- Topbar branca de 88 px com título da seção, identidade real da sessão e menu
  de conta.
- Drawer móvel com foco inicial, contenção de Tab, Escape, `inert`, bloqueio de
  rolagem e restauração de foco.
- Navegação inferior móvel com três destinos prioritários por papel e acesso ao
  menu completo.
- Marca mobile reforçada com símbolo de 38 px e lockup “Cesta Digital”.
- Inter carregada na aplicação real e tokens V2 disponíveis sem remover as
  fontes das telas legadas ainda não migradas.

## 2. Fidelidade às referências

| Elemento | Implementação | Diferença deliberada |
|---|---|---|
| Sidebar desktop | proporção, marca, lista, ativo e propósito no rodapé seguem as telas 01–09 | itens continuam sendo rotas reais e filtradas por RBAC |
| Topbar | seção à esquerda; conta à direita | sem sino/contador porque não existe contrato de notificações |
| Conta | nome e papel reais com iniciais | sem fotografia porque o usuário não possui avatar no backend |
| Navegação | “Início”, “Famílias”, “Estoque”, “Tipos de Cesta” e destinos reais | “Avaliações”, “Entradas” e “Relatórios” não são links globais até seus contratos serem aprovados |
| Mobile | topbar, bottom navigation e drawer acessível | derivado da direção mobile-first; não há mockup mobile entre as dez imagens |

O Dashboard escuro visível nas capturas é conteúdo legado e não faz parte da
aprovação V2-03. Alterá-lo aqui violaria a regra de uma aba por branch. Ele será
substituído somente em `feat/frontend-v2-inicio`.

## 3. Contratos preservados

- 25 paths e seus elementos de rota permanecem inalterados.
- `ROUTE_ACCESS` e autorização backend permanecem inalterados.
- Nenhum endpoint, payload, cookie ou estado de domínio foi modificado.
- Os rótulos visuais do menu foram alinhados à linguagem aprovada sem trocar os
  destinos: Dashboard → Início, Itens → Estoque e Cestas → Tipos de Cesta.
- Logout, deep links, fallback 404 e EnvironmentNotice continuam ativos.

## 4. Evidências para aprovação

Com o showcase em execução:

```powershell
cd frontend
npm run showcase
```

Abrir:

`http://127.0.0.1:4174/showcase/evidence/v2-03/`

A galeria inclui referência desktop, implementação 1440, tablet 768, mobile
360/390 e drawer 390. Todas as imagens são clicáveis e abrem em tamanho
integral.

Para regenerar:

```powershell
cd frontend
npm run test:visual:shell
```

## 5. Gates locais

- `npm run lint`: aprovado;
- `npm run build`: aprovado;
- `npm run test:e2e`: 35/35 aprovados, sem retry;
- `npm run test:visual:shell`: 11 aprovados e 1 skip intencional do fluxo de
  drawer no projeto desktop;
- 360, 390, 768 e 1440 px sem overflow horizontal;
- `git diff --check`: aprovado.

No momento deste marco, o warning de bundle acima de 500 kB e o asset legado
`logoupg.png` de aproximadamente 1,38 MB permaneciam. O asset e o splash sem uso
foram removidos no V2-04; o fracionamento do bundle continua registrado como
dívida global de performance.

## 6. Aprovação e continuidade

Gabriel autorizou prosseguir em 19/08/2026. O branch
`feat/frontend-v2-login` foi aberto a partir deste marco; o conteúdo das abas
autenticadas continuou isolado e inalterado.

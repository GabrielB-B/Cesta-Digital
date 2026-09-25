# Registro do marco V2-14B — Escala visual e Categorias

**Branch:** `feat/frontend-v2-estoque-fluxos-secundarios`

**Base funcional:** `fix/homologacao-cryptography`

**Status:** implementação e gates locais concluídos; validação visual solicitada

**Referências principais:** `referencias_por_tela/04-estoque-desktop.png` e os
fundamentos claros do AppShell V2 aprovado

## 1. Diagnóstico confirmado

A auditoria em monitor Full HD confirmou a percepção reportada: a interface
operacional possuía muitos textos entre aproximadamente 9 e 11 pixels, com
maior concentração em Estoque, lotes, Entregas, Tipos de Cesta, Relatórios e
Administração. A análise estática encontrou 240 declarações de página abaixo de
12 pixels em 15 módulos CSS.

A rota `/item-categories` ainda utilizava `hero-card` e `panel-card` do tema
escuro anterior, ficando visualmente desconectada de Estoque e do restante do
produto.

## 2. Escopo implementado

- definida escala raiz fluida entre 16 e 18 pixels, sem zoom artificial;
- estabelecido piso de 12 pixels para textos dos módulos de página;
- ampliadas linhas, cabeçalhos, filtros, resumo lateral e paginação de Estoque;
- removido o excesso de área vazia da lista de produtos em monitores Full HD;
- reescrita completa de Categorias na direção clara V2;
- lista e busca de categorias reunidas em uma superfície única;
- formulário contextual fixo no desktop e priorizado antes da lista no mobile;
- removida a ação duplicada “Nova categoria” quando o formulário de criação já
  está disponível;
- estados ativo/inativo, vazio, carregamento, erro e sucesso preservados;
- proteção contra descarte acidental de alterações mantida;
- incluído gate automatizado para impedir regressão tipográfica abaixo de 12
  pixels nos módulos de página.

## 3. Contratos preservados

- rota e RBAC de `/item-categories` não mudaram;
- `GET /item-categories`, `POST /item-categories` e
  `PUT /item-categories/{id}` continuam usando os contratos existentes;
- criação, edição, ativação e inativação continuam dependentes da API real;
- nenhuma categoria, contagem ou descrição fictícia foi adicionada à aplicação;
- rotas, payloads, regras de estoque, cálculo de validade e componentes de
  imagem de produto não foram alterados pela revisão tipográfica;
- nenhuma migration ou alteração de backend foi necessária.

## 4. Decisões de UX

| Problema anterior | Decisão V2-14B |
|---|---|
| cartões escuros em Categorias | superfícies claras, bordas suaves e hierarquia V2 |
| formulário e CTA repetindo “Nova categoria” | formulário único sempre acessível |
| textos operacionais pequenos | piso automatizado de 12 px e raiz fluida |
| tabela de Estoque comprimida | linhas de 74 px ou mais e leitura ampliada |
| espaço inferior sem uso | painel principal dimensionado pelo conteúdo operacional |
| exemplos nos campos | campos de cadastro vazios; busca mantém apenas instrução funcional |

## 5. Evidências visuais

- `frontend/showcase/evidence/v2-14/estoque-escala-desktop-1920.png`;
- `frontend/showcase/evidence/v2-14/categorias-desktop-1920.png`;
- `frontend/showcase/evidence/v2-14/categorias-mobile-390.png`.

As evidências anteriores de Estoque, Entradas, Entregas e Tipos de Cesta foram
preservadas e não fazem parte deste checkpoint.

## 6. Gates executados

- lint completo do frontend: aprovado;
- TypeScript e build de produção: aprovados;
- gate de escala tipográfica: aprovado, nenhuma página abaixo de 12 px;
- regressão funcional Playwright: **39/39 aprovada**;
- teste CRUD e responsivo de Categorias: aprovado;
- teste visual de Estoque em Full HD: aprovado;
- testes visuais de Categorias em 1920×950 e 390×844: aprovados;
- ausência de overflow horizontal nos viewports testados: aprovada;
- `git diff --check`: aprovado;
- publicação externa: não realizada.

## 7. Gate seguinte

O próximo avanço depende da aprovação visual deste recorte. Depois da aprovação,
a lapidação segue para os fluxos secundários restantes de Estoque, começando por
`/items/new` e validando cada rota antes de avançar.

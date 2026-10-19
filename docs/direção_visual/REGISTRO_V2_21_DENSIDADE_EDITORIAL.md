# Registro do marco V2-21 — Densidade editorial

**Branch:** `feat/analises-layout-premium`

**Status:** implementação, homologação local e aceite visual de Gabriel concluídos

## Diagnóstico

O shell repetia o nome da rota na topbar e no título principal. As páginas
operacionais ainda adicionavam subtítulos genéricos que descreviam novamente o
que a navegação, o título e os controles já comunicavam. Em telas densas, essa
camada extra aumentava a rolagem e enfraquecia a hierarquia.

## Decisão de UX

- topbar reservada a controles globais de ambiente e conta;
- um único título visível por página principal;
- remoção de descrições que apenas reformulavam o título;
- preservação de textos que evitam erro ou orientam decisões de negócio;
- manutenção dos estados de erro, vazio, carregamento e sucesso;
- piso tipográfico de 12 px restabelecido no selo de perfil recomendado.

A decisão segue sistemas de design oficiais: breadcrumbs são secundários e
desnecessários em hierarquias planas com navegação principal já visível; textos
auxiliares devem existir somente quando acrescentam informação necessária.

## Escopo

- `AppLayout`: remoção da localização textual duplicada na topbar;
- Dashboard, Famílias, Estoque, Entradas, Categorias, Entregas, Tipos de Cesta,
  Relatórios e Administração: cabeçalhos principais simplificados;
- estilos exclusivos dos textos removidos também eliminados;
- campos monetários de novos cadastros começam vazios, evitando assumir renda
  zero e impedindo anexação acidental de dígitos em navegadores diferentes;
- nenhuma mudança em rotas, payloads, permissões ou regras de negócio.

## Gates

- lint e build de produção: aprovados;
- escala tipográfica: aprovada;
- E2E: 50/50 aprovados;
- três cenários monetários críticos repetidos cinco vezes em execução serial:
  15/15 aprovados;
- shell: 13 aprovados, 3 skips por viewport;
- Dashboard: 13 aprovados, 3 skips;
- Famílias: 25 aprovados, 15 skips;
- Análises sociais: 13 aprovados, 7 skips;
- Estoque/Categorias: 20 aprovados, 16 skips;
- Entradas: 6 aprovados, 2 skips;
- Entregas: 8 aprovados, 4 skips;
- Tipos de Cesta: 9 aprovados, 7 skips;
- Relatórios: 6 aprovados, 2 skips;
- Administração: 11 aprovados, 9 skips;
- overflow horizontal: ausente nos viewports cobertos.

## Próximo gate

Publicar a branch aprovada no ambiente de homologação e executar o roteiro
manual por perfil. Merge em `main`, promoção a produção e uso de dados pessoais
reais continuam fora deste checkpoint.

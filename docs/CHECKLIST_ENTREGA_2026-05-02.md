# Checklist de Entrega - 2026-05-02

Este checklist fecha a rodada de QA visual/responsivo e fechamento tecnico do frontend do Cesta Digital.

## Escopo da rodada

- Restaurar a ordem das fases apos a parada anterior.
- Executar QA visual/responsivo em desktop e mobile.
- Conferir fluxo real de login.
- Conferir dashboard, familias, estoque, tipos de cesta, entregas, usuarios e auditoria.
- Corrigir problemas encontrados no QA.
- Rodar validacoes finais.
- Deixar a entrega pronta para commit e deploy de preview/local.

## QA visual/responsivo

Ambiente usado:

- Backend local: `http://127.0.0.1:8000`.
- Frontend local: `http://127.0.0.1:5173`.
- Banco validado via `/health/db`.
- Migration e seed inicial executados antes da conferencia.

Telas e estados conferidos:

- Login antes do envio em desktop e mobile.
- Login real com usuario administrador local em desktop e mobile.
- Dashboard.
- Listagem de familias.
- Detalhe de familia.
- Edicao de familia.
- Cadastro de familia.
- Listagem de itens/estoque.
- Detalhe de item.
- Cadastro de item.
- Entrada de lote.
- Listagem de tipos de cesta.
- Detalhe, receita e disponibilidade de tipo de cesta.
- Cadastro de tipo de cesta.
- Listagem de entregas e agendamentos.
- Novo agendamento.
- Usuarios e perfis.
- Auditoria administrativa.

Resultado do QA:

- 36 telas/estados conferidos entre desktop e mobile.
- Sem erro de console.
- Sem overlay de erro do Vite.
- Sem alerta inesperado durante a navegacao.
- Sem overflow horizontal de pagina apos ajuste responsivo.
- Tabelas longas permanecem contidas no wrapper responsivo.

## Ajuste aplicado

- `frontend/src/styles/global.css`
  - Adicionado `min-width: 0` em grids, pilhas, filhos de grid e paineis para evitar que tabelas largas forcem a largura da pagina no mobile.
  - Adicionado `max-width: 100%` em `.table-wrapper` para manter a rolagem horizontal dentro do componente de tabela.

## Validacoes tecnicas

Executado em 2026-05-02:

- `npm run lint`: OK.
- `npm run build`: OK.
- `npm audit --audit-level=high`: OK.
- `git diff --check`: OK, com apenas aviso esperado de LF/CRLF no Windows.
- Backend `/health/db`: OK.
- Frontend local HTTP 200: OK.

## Estado para entrega

- Pronto para commit da rodada.
- Pronto para deploy de preview ou validacao local.
- Nao declarar producao final sem staging real, observabilidade externa, politica final de HTTPS/proxy e homologacao funcional por perfil.

## Arquivos alterados nesta rodada

- `docs/DESIGN_FRONTEND_CESTA_DIGITAL.md`.
- `docs/CHECKLIST_ENTREGA_2026-05-02.md`.
- `frontend/src/styles/global.css`.

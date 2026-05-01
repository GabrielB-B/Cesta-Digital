# Stack e Versoes

## Estado de versao do produto

- Backend app version: `0.1.0` em `backend/app/core/config.py`
- Frontend package version: `0.0.0` em `frontend/package.json`
- Status real: ainda nao existe uma politica unica de versionamento de release para o produto completo

## Ambiente validado nesta analise

- Python `3.12.6`
- Node.js `22.16.0`
- npm `10.9.2`

## Backend

### Frameworks e libs principais

- FastAPI `0.135.1`
- SQLAlchemy `2.0.48`
- Alembic `1.18.4`
- Pydantic `2.12.5`
- Pydantic Settings `2.13.1`
- PyMySQL `1.1.2`
- PyJWT `2.12.0`
- python-multipart `0.0.26`
- cryptography `46.0.7`
- passlib `1.7.4`
- bcrypt `4.0.1`
- Uvicorn `0.42.0`

### Funcao do backend

- autenticacao via JWT
- administracao de usuarios, perfis e redefinicao de senha
- familias, pessoas e beneficios
- avaliacao social e preview de elegibilidade
- itens, lotes, movimentacoes e resumo de estoque
- tipos de cesta, receita e disponibilidade
- agendamentos e entregas
- resumo financeiro estimado

## Frontend

### Frameworks e libs principais

- React `19.2.4`
- React DOM `19.2.4`
- React Router DOM `7.13.1`
- Axios `1.13.6`
- Vite `8.0.0`
- TypeScript `5.9.3`
- ESLint `9.39.4`

### Funcao do frontend

- login e protecao de rotas
- controle de acesso por perfil nas rotas internas
- dashboard
- cadastro e detalhe de familias
- cadastro de pessoas, beneficios e avaliacoes
- administracao de usuarios
- cadastro de categorias de item
- consulta de itens e detalhe de estoque
- entrada de lotes
- movimentacao manual de estoque
- cadastro de tipos de cesta, receita e detalhe de disponibilidade
- agendamento e confirmacao de entregas
- resumo financeiro

## Banco e migracoes

- banco esperado: MySQL via driver `mysql+pymysql`
- migracoes versionadas com Alembic em `backend/alembic/versions`
- seed inicial cobre perfis, primeiro admin e categorias basicas

## Arquitetura de pastas

### Backend

- `backend/app/api`: rotas FastAPI
- `backend/app/services`: regras de negocio
- `backend/app/models`: modelos ORM
- `backend/app/schemas`: contratos Pydantic
- `backend/app/core`: configuracoes e seguranca
- `backend/app/db`: conexao, metadata e sessao

### Frontend

- `frontend/src/pages`: telas
- `frontend/src/layouts`: layouts
- `frontend/src/contexts`: autenticacao
- `frontend/src/api`: cliente HTTP principal
- `frontend/src/types`: contratos TS

## Mapa de maturidade por modulo

| Modulo | Backend | Frontend | Status |
| --- | --- | --- | --- |
| Login JWT | pronto | pronto | bom ponto de partida |
| Dashboard | pronto | pronto | usavel |
| Familias | pronto | pronto | usavel |
| Pessoas | pronto | parcial | cria e lista, sem tela de edicao/exclusao |
| Beneficios | pronto | parcial | cria e lista, sem tela de edicao/exclusao |
| Avaliacao social | pronto | pronto | funcional com snapshot economico |
| Categorias de item | pronto | pronto | operacional |
| Itens | pronto | pronto | funcional |
| Lotes | pronto | pronto | funcional |
| Movimentacoes manuais | pronto | pronto | operacional |
| Tipos de cesta | pronto | pronto | criacao, detalhe e receita |
| Disponibilidade de cesta | pronto | pronto | funcional |
| Entregas | pronto | pronto | funcional |
| Resumo financeiro | pronto | pronto | operacional |
| Usuarios e perfis | pronto | pronto | modulo admin inicial entregue |

## Ferramentas que ainda faltam

- cobertura de testes mais ampla
- observabilidade
- padrao de versionamento de release
- deploy e rotina de rollback

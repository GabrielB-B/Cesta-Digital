# Manual Simples do Programador

Este manual ajuda qualquer pessoa tecnica a abrir, rodar, testar e evoluir o Cesta Digital sem precisar descobrir o projeto do zero.

## Visao rapida

O Cesta Digital tem dois blocos principais:

- `backend/`: API FastAPI, SQLAlchemy, Alembic, regras de negocio e testes.
- `frontend/`: React, Vite, TypeScript e interface web.

Documentacao fica em `docs/`.

## Como rodar o backend

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\backend
.venv\Scripts\Activate.ps1
alembic upgrade head
python scripts\seed_initial_data.py
uvicorn app.main:app --reload
```

URLs:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Healthcheck DB: `http://127.0.0.1:8000/health/db`

## Como rodar o frontend

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\frontend
npm run dev
```

URL:

- Frontend: `http://127.0.0.1:5173`

## Onde mexer no backend

- Rotas da API: `backend/app/api/routes/`
- Servicos e regras de negocio: `backend/app/services/`
- Modelos do banco: `backend/app/models/`
- Schemas de entrada e resposta: `backend/app/schemas/`
- Configuracoes: `backend/app/core/config.py`
- Seguranca e senha: `backend/app/core/security.py`
- Banco e sessao: `backend/app/db/`
- Migracoes: `backend/alembic/versions/`
- Testes: `backend/tests/`

Regra pratica:

- Rota deve receber request, validar permissao e chamar servico.
- Servico deve concentrar regra de negocio.
- Schema deve representar contrato de entrada e saida.
- Model deve representar tabela e relacionamento.

## Onde mexer no frontend

- Rotas principais: `frontend/src/App.tsx`
- Layout autenticado: `frontend/src/layouts/AppLayout.tsx`
- Paginas: `frontend/src/pages/`
- Cliente HTTP: `frontend/src/api/client.ts`
- Contexto de auth: `frontend/src/contexts/`
- Tipos TypeScript: `frontend/src/types/`
- Estilos globais: `frontend/src/styles/global.css`
- Componentes reutilizaveis: `frontend/src/components/`

Regra pratica:

- Pagina deve orquestrar dados e renderizar fluxo.
- Tipo deve refletir o contrato da API.
- Utilitario deve guardar regra repetida de interface, como erro de API.
- CSS deve preservar consistencia visual e responsividade.

## Como criar migration

Depois de alterar ou criar modelo:

```powershell
cd backend
alembic revision --autogenerate -m "descricao_da_mudanca"
alembic upgrade head
```

Sempre revise o arquivo gerado em `backend/alembic/versions/` antes de commitar.

## Como rodar validacoes

Backend:

```powershell
cd backend
.venv\Scripts\python.exe -m compileall app scripts tests
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

## Como trabalhar com Git

Antes de mexer:

```powershell
git status --short
```

Depois de mexer:

```powershell
git add -A
git commit -m "mensagem clara do que foi feito"
git push origin main
```

Use mensagens de commit objetivas, por exemplo:

- `feat: adiciona auditoria operacional`
- `fix: corrige baixa transacional de estoque`
- `docs: adiciona checkpoint do MVP`

## Cuidados importantes

- Nao coloque `.env` real no Git.
- Use `.env.example` para documentar variaveis.
- Rode testes antes de push.
- Rode `alembic upgrade head` depois de nova migration.
- Se mudar contrato da API, atualize tipos do frontend.
- Se criar acao critica, registre auditoria.
- Se mexer em estoque ou entrega, pense em transacao e concorrencia.

## Fluxo recomendado para nova feature

1. Entender qual papel pode acessar a feature.
2. Criar ou ajustar schema.
3. Criar ou ajustar service.
4. Criar ou ajustar rota.
5. Criar migration se houver banco.
6. Criar ou ajustar pagina no frontend.
7. Adicionar teste para o fluxo principal.
8. Rodar validacoes.
9. Atualizar docs quando afetar uso ou operacao.

## Problemas comuns

### Login falha

- Confirme se o backend esta rodando.
- Confirme se o seed criou o admin.
- Confirme `VITE_API_URL` no frontend.
- Limpe o token no navegador se necessario:

```js
localStorage.removeItem("cesta_digital_token")
```

### Migration falha

- Confirme conexao com MySQL.
- Confirme variaveis do `.env`.
- Rode `alembic current` para ver a revision atual.

### Frontend nao conecta

- Confirme se a API esta em `http://127.0.0.1:8000`.
- Confirme `frontend/.env`.
- Reinicie `npm run dev` depois de mudar `.env`.

## Comandos rapidos para iniciar localmente

### Backend

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\backend
.venv\Scripts\Activate.ps1
alembic upgrade head
python scripts\seed_initial_data.py
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd C:\Users\Gabriel\Documents\cesta-digital\frontend
npm run dev
```

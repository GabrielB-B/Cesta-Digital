# AGENTS.md - Cesta Digital

## Contexto fixo de producao

O Cesta Digital ja esta online e integrado:

- Repositorio GitHub: `https://github.com/GabrielB-B/Cesta-Digital`
- Branch oficial de publicacao: `main`
- Frontend publico: `https://cesta-digital.vercel.app`
- Backend/API publica: `https://cesta-digital-api.onrender.com`
- Healthcheck do banco: `https://cesta-digital-api.onrender.com/health/db`
- API docs: `https://cesta-digital-api.onrender.com/docs`

## Regra de publicacao

Quando Gabriel pedir "manda pra la", "publica", "sobe online", "atualiza o site" ou equivalente, entender que a rota oficial e:

1. Validar alteracoes localmente.
2. Commitar alteracoes intencionais.
3. Executar `git push origin main`.
4. A Vercel publica o frontend automaticamente.
5. O Render acompanha o backend a partir do mesmo repositorio quando houver alteracao de backend.

Nao tratar `localhost` como entrega final. Ambiente local serve apenas para desenvolvimento e validacao.

## Validacoes antes do push

Para mudancas so de frontend:

```powershell
cd frontend
npm run lint
npm run build
npm run test:e2e
```

Para mudancas de backend:

```powershell
cd backend
.venv\Scripts\python.exe -m compileall app scripts tests
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Sempre rodar tambem:

```powershell
git diff --check
```

## Validacao depois do push

Apos `git push origin main`, consultar o status do commit no GitHub. O deploy so deve ser declarado pronto quando:

- status `Vercel` estiver `success`;
- checks `frontend` e `backend` estiverem `success`, quando existirem;
- `https://cesta-digital.vercel.app/login` responder;
- `https://cesta-digital-api.onrender.com/health/db` responder `{"database":"ok"}`.

## Seguranca

- Nunca commitar `.env`, tokens, senhas ou secrets.
- Nunca expor credenciais do banco, Vercel, Render, Aiven ou GitHub em resposta.
- Se a API publica estiver fora do ar, verificar Render primeiro; nao trocar URL de producao sem confirmacao.
- Se a Vercel estiver apontando para `localhost`, corrigir `VITE_API_URL` nas variaveis da Vercel para `https://cesta-digital-api.onrender.com`.
- Se houver migration de banco, considerar backup antes de publicar backend.

## Identidade visual

Preservar o dark premium institucional do Cesta Digital:

- magenta/rosa como assinatura;
- dourado como acento;
- verde escuro como base;
- textura sutil;
- cards administrativos;
- mobile sem regressao;
- sem redesign radical sem aprovacao de Gabriel.

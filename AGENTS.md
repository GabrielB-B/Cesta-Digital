# AGENTS.md - Cesta Digital

## Fonte permanente de verdade

O documento mestre do produto e [`docs/PROJETO_PROFISSIONAL_CESTA_DIGITAL.md`](docs/PROJETO_PROFISSIONAL_CESTA_DIGITAL.md).

Antes de qualquer mudanca relevante de dominio, banco, API, UX, identidade, seguranca ou deploy:

1. consultar a decisao vigente e o backlog desse documento;
2. relacionar a mudanca a um ID do plano;
3. respeitar os criterios de aceite e a ordem das fases;
4. atualizar o documento e a homologacao com evidencias ao concluir.

Documentos datados e roadmaps anteriores sao historico, nao fonte do estado atual. Enquanto a decisao vigente for `NO-GO`, nao declarar o produto pronto para ampliar uso real. O fechamento isolado da Fase 0 autoriza apenas continuar a homologacao tecnica com dados sinteticos ou anonimizados; o `GO profissional` depende de todos os gates obrigatorios, ausencia de P0/P1 e aprovacao final de Gabriel. Mudanca grande de banco, identidade visual ou politica de dados exige diagnostico e aprovacao de Gabriel antes da implementacao.

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
2. Commitar alteracoes intencionais em branch de trabalho.
3. Enviar a branch e executar os checks `frontend` e `backend` antes de integrar em `main`.
4. Apresentar a Gabriel o resultado, riscos, migrations e escopo exato da publicacao.
5. Somente com checks verdes e aprovacao de Gabriel, integrar o commit aprovado em `main`.
6. A Vercel publica o frontend automaticamente.
7. O Render acompanha o backend a partir do mesmo repositorio quando houver alteracao de backend.

Enquanto `BLQ-003` estiver aberto, `main` possui deploy automatico e um push direto publica antes de o CI terminar. Portanto, nao usar `git push origin main` como forma de descobrir se o commit passa. Se nao houver branch/PR ou outro gate previo disponivel, interromper a publicacao e informar o bloqueio. Push direto em `main` so pode ocorrer como excecao emergencial explicitamente autorizada por Gabriel e nao deve ser declarado release profissional.

Nao tratar `localhost` como entrega final. Ambiente local serve apenas para desenvolvimento e validacao.

## Validacoes antes do envio para gate e publicacao

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
- Antes de qualquer migration em banco compartilhado ou publico, gerar backup verificado, registrar exit code, tamanho e checksum e comprovar restore em ambiente seguro. Sem essa evidencia, nao publicar a migration.

## Identidade visual

Preservar o dark premium institucional do Cesta Digital:

- magenta/rosa como assinatura;
- dourado como acento;
- verde escuro como base;
- textura sutil;
- cards administrativos;
- mobile sem regressao;
- sem redesign radical sem aprovacao de Gabriel.

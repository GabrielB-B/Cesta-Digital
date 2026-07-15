# Rota segura de publicação — Cesta Digital

Este documento registra o fluxo oficial de branch, revisão e publicação. O
ambiente público atual é **homologação/staging**, aceita somente dados sintéticos
ou anonimizados e permanece `NO-GO` até o fechamento da Fase 4.

## Endpoints oficiais

- Frontend: `https://cesta-digital.vercel.app`
- Backend/API: `https://cesta-digital-api.onrender.com`
- Readiness do banco: `https://cesta-digital-api.onrender.com/health/db`
- API docs: `https://cesta-digital-api.onrender.com/docs`
- Repositório: `https://github.com/GabrielB-B/Cesta-Digital`
- Branch publicada: `main`

## Fluxo obrigatório

```text
branch → validação local → push da branch → CI verde do SHA
→ revisão registrada (PR quando disponível) → aprovação de Gabriel
→ fast-forward do mesmo SHA em main
→ deploy → smoke → evidência
```

Push direto em `main` é proibido como forma de descobrir se o commit passa. O
Blueprint declara `autoDeployTrigger: checksPass`, mas a proteção de `main` e a
configuração efetiva do gatilho no GitHub/Render **ainda não têm evidência
comprovada**. Até essa prova existir, a segurança depende do SHA verde da branch,
da aprovação explícita e do fast-forward exato descrito abaixo.

### 1. Criar uma branch por fase ou entrega

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/fase-N-descricao
```

Antes de adicionar arquivos, revisar `git status --short` e preservar alterações
do usuário que não pertençam à entrega.

### 2. Validar localmente

Frontend:

```powershell
cd frontend
npm ci
npm run lint
npm run build
npm run test:e2e
```

Backend:

```powershell
cd backend
.venv\Scripts\python.exe -m compileall app scripts tests
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Operação e integridade do diff:

```powershell
cd ..
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\tests\backup_restore_contract.ps1
git diff --check
```

### 3. Salvar e enviar somente o escopo intencional

```powershell
git add <arquivos-da-entrega>
git diff --cached --check
git diff --cached
git commit -m "tipo: descricao objetiva"
git push -u origin feat/fase-N-descricao
```

Nunca adicionar `.env`, dumps, manifesto de backup, evidência com dados pessoais,
tokens, senhas, cookies ou certificados privados.

### 4. Obter o gate remoto e registrar a revisão

Branches `feat/**`, `fix/**`, `chore/**` e `docs/**` executam o CI antes de
`main`. Registrar o SHA enviado e conferir os três jobs:

```powershell
$approvedSha = git rev-parse HEAD
$approvedSha
```

A revisão precisa registrar, preferencialmente em PR quando o repositório o
permitir:

- IDs do plano atendidos;
- comportamento anterior e novo;
- arquivos, migrations e riscos;
- comandos e resultados dos testes;
- evidência de backup/restore quando houver migration;
- screenshots sem dados reais quando houver mudança visual.

Os checks obrigatórios são `frontend`, `backend` e `operations`. Novo commit na
branch exige nova rodada. Não aprovar uma revisão desatualizada em relação a
`main`. PR é o mecanismo preferido, mas não deve ser tratado como proteção ativa
até o ruleset de `main` ser comprovado.

### 5. Aprovar e integrar o mesmo SHA

Gabriel decide a aprovação final do escopo. Somente depois da aprovação e dos
checks verdes a branch pode ser integrada. Não adicionar commit depois do gate.
A integração local deve preservar exatamente a revisão testada:

```powershell
$approvedSha = git rev-parse HEAD
git fetch origin
git switch main
git merge --ff-only origin/main
git merge --ff-only $approvedSha

if ((git rev-parse HEAD) -ne $approvedSha) {
    throw "O SHA em main difere da revisao aprovada."
}

git push origin "${approvedSha}:refs/heads/main"
```

Se `git merge --ff-only` falhar, voltar à branch, atualizá-la com `main`, resolver
conflitos, validar e reenviar. Os checks antigos deixam de valer. A proteção de
`main` no GitHub deve exigir revisão/checks, branch atualizada e bloquear force
push/bypass. Se um ruleset futuro exigir integração somente pelo GitHub e o
método escolhido gerar outro commit, esse novo SHA precisa completar seus
próprios checks antes de qualquer declaração de publicação.

Mudança com migration segue antes o runbook
[`OPERACAO_STAGING_E_BACKUP.md`](./OPERACAO_STAGING_E_BACKUP.md): backup válido,
restore em banco isolado, migration ensaiada e conciliação.

### 6. Acompanhar a publicação

Para o mesmo SHA integrado:

1. confirmar GitHub Actions verde;
2. confirmar status Vercel verde;
3. confirmar status Render verde;
4. abrir o login público;
5. validar a conexão do banco.

```powershell
$frontend = Invoke-WebRequest `
  -UseBasicParsing `
  -Uri "https://cesta-digital.vercel.app/login"
$database = Invoke-RestMethod `
  -Uri "https://cesta-digital-api.onrender.com/health/db"

if ($frontend.StatusCode -ne 200 -or $database.database -ne "ok") {
    throw "Publicacao nao passou no smoke."
}
```

Não declarar publicação concluída se o provedor mostrar outro SHA, algum check
estiver pendente/vermelho ou o smoke falhar.

### Particularidade do backend gratuito

O Render gratuito não oferece `preDeployCommand`. O serviço inicia por
`python scripts/start_service.py`: o processo serializa a preparação com
`GET_LOCK`, aplica apenas migrations Alembic pendentes, confirma o head, executa
o seed idempotente e somente então faz `exec` do Uvicorn. Falha em qualquer etapa
impede a API de iniciar. Migrations desse caminho devem ser estritamente
aditivas/expand; alterações destrutivas permanecem bloqueadas pelo runbook de
backup e restore.

## Exceção emergencial

Uma exceção não vira fluxo normal. Push direto, bypass, restore no banco de origem
ou rollback com alteração de schema exigem autorização explícita de Gabriel,
registro do incidente e justificativa. Ainda assim, secrets e dados pessoais não
podem aparecer em commit, log ou evidência.

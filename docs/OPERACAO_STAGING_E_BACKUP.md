# Operação de homologação, backup e restore

Este é o runbook operacional vigente do Cesta Digital para `BLQ-003`,
`BLQ-004` e `BLQ-005`. Ele complementa o
[`PROJETO_PROFISSIONAL_CESTA_DIGITAL.md`](./PROJETO_PROFISSIONAL_CESTA_DIGITAL.md)
e não substitui os gates de homologação.

## 1. Classificação obrigatória do ambiente

| Item | Classificação vigente |
|---|---|
| Frontend público | Homologação (`staging`) |
| Backend público | Homologação (`APP_ENV=staging`) |
| Banco conectado | Banco destinado a homologação; conteúdo não verificado |
| Decisão de produto | `NO-GO` até o fechamento da Fase 4 e aprovação final de Gabriel |
| Dados permitidos | Apenas dados sintéticos ou efetivamente anonimizados |

Os endereços públicos são:

- frontend: `https://cesta-digital.vercel.app`;
- API: `https://cesta-digital-api.onrender.com`;
- readiness do banco: `https://cesta-digital-api.onrender.com/health/db`;
- documentação da API: `https://cesta-digital-api.onrender.com/docs`.

Ser acessível pela internet não torna o ambiente produção. O plano gratuito do
Render pode suspender a instância, causar cold start e não oferece as garantias
de disponibilidade de uma operação profissional. O produto permanece em
homologação. A frase “conteúdo não verificado” é intencional: a revisão da base
conectada e a confirmação de ausência de dados reais continuam pendentes.

### Política de dados enquanto houver `NO-GO`

É proibido inserir ou importar dados que identifiquem uma pessoa real, incluindo:

- nome, CPF, NIS, telefone, e-mail ou endereço reais;
- composição familiar, renda, benefícios, deficiência ou vulnerabilidades reais;
- documentos, observações livres ou combinações que permitam reidentificação;
- estoque e entregas usados como registro oficial de uma operação real.

Anonimização exige impedir reidentificação; apenas trocar o nome por iniciais não
é suficiente. Para testes, usar personagens fictícios e valores inventados. Se
dados reais forem encontrados, interromper os testes, restringir o acesso,
registrar o incidente sem copiar o conteúdo sensível e solicitar a remoção segura
ao responsável autorizado.

## 2. Gate de branch, CI e publicação

O fluxo obrigatório é:

```text
branch de trabalho
→ push da branch e CI do mesmo SHA
→ revisão do escopo (PR quando disponível)
→ frontend + backend + operations verdes
→ revisão do escopo, riscos e migrations
→ aprovação de Gabriel
→ integração em main
→ deploy do commit aprovado
→ smoke nos endpoints públicos
→ registro da evidência
```

Regras:

1. Não usar push direto em `main` como teste de CI; branches `feat/**`, `fix/**`,
   `chore/**` e `docs/**` já disparam o workflow.
2. Registrar o SHA verde da branch; qualquer novo commit depois da aprovação
   invalida os checks anteriores.
3. A branch deve ficar atualizada com `main` antes da aprovação final. Se
   `main` avançar, atualizar a branch e repetir o CI.
4. Mudança com migration exige o ensaio de backup/restore da seção 5 antes da
   integração.
5. O Blueprint declara `autoDeployTrigger: checksPass` e readiness `/health/db`,
   mas a configuração efetiva do serviço ainda precisa ser comprovada no painel.
6. O deploy só é concluído quando o mesmo SHA aprovado aparece verde nos checks,
   nos provedores e no smoke público.

No GitHub, a proteção da branch `main` deve exigir:

- pull request antes de integrar;
- checks `frontend`, `backend` e `operations`;
- branch atualizada antes do merge;
- bloqueio de force push, exclusão e bypass não emergencial.

O arquivo de workflow não consegue ativar sozinho a proteção do repositório. A
configuração deve ser confirmada em **Settings → Rules → Rulesets** e registrada
como evidência de `BLQ-003`. **A proteção de `main` não está comprovada neste
repositório no momento desta revisão.** Por isso, PR é a rota preferida de
revisão, mas não pode ser descrito como gate técnico já garantido.

Quando a integração for feita por Git local, ela deve ser `--ff-only`, mantendo em
`main` exatamente o SHA já aprovado e testado na branch. Registrar
`$approvedSha = git rev-parse HEAD`, atualizar `origin/main`, executar
`git merge --ff-only $approvedSha`, confirmar que `git rev-parse HEAD` continua
igual a `$approvedSha` e enviar explicitamente
`git push origin "${approvedSha}:refs/heads/main"`. Se o fast-forward não for
possível, não criar merge improvisado: atualizar a branch, reenviar e aguardar os
novos checks.

### Inicialização no Render gratuito

O plano gratuito não disponibiliza `preDeployCommand`. O Blueprint inicia
`python scripts/start_service.py`. Em todo cold start, esse runner:

1. adquire `GET_LOCK` no MySQL com timeout, mantendo a mesma conexão aberta;
2. compara a revisão atual com o único head Alembic conhecido pelo código;
3. executa `alembic upgrade head` somente quando há migration pendente;
4. confirma novamente a igualdade dos heads;
5. executa o seed idempotente;
6. substitui o processo pelo Uvicorn somente após sucesso integral.

Falha de lock, migration, verificação ou seed impede a API de iniciar. Isso
serializa instâncias concorrentes, mas não transforma o plano gratuito em alta
disponibilidade nem elimina cold starts.

## 3. O que o CI valida

### Frontend

- instalação reproduzível com `npm ci`;
- lint e build;
- auditoria de dependências;
- Chromium do Playwright;
- E2E contra `vite preview` do bundle construído, em porta exclusiva e um worker
  no CI.

### Backend

- Python 3.12 e dependências de desenvolvimento;
- compilação de `app`, `scripts` e `tests`;
- testes unitários e de integração existentes;
- auditoria das dependências de runtime.

### Operação

- contrato dos scripts PowerShell, inclusive ACL e limpeza da credencial
  temporária em sucesso e falha;
- falha nativa, dump vazio, origem instável e adulteração de dump/manifesto;
- inventário exato de tabelas, views, rotinas, eventos, triggers e revisão
  Alembic;
- recusa de restore sobre a origem ou qualquer banco com objetos;
- igualdade exata do inventário após restore v2 e bypass legado explícito;
- evidência estrutural após restore isolado, sem linhas do banco.

## 4. Configuração mínima de homologação

Backend no Render:

```env
APP_ENV=staging
BOOTSTRAP_ADMIN_ENABLED=false
AUTH_COOKIE_SAMESITE=none
FRONTEND_CORS_ORIGINS=https://cesta-digital.vercel.app
DB_SSL_REQUIRED=true
```

Frontend na Vercel:

```env
VITE_API_URL=https://cesta-digital-api.onrender.com
```

Secrets, credenciais, cookies, certificados privados e senhas permanecem apenas
nos cofres/painéis autorizados. O CA público do provedor do banco deve ser
armazenado fora do repositório e usado para verificação de identidade TLS. No
Render, a opção preferida é criar um **Secret File** com o CA da Aiven montado em
`/etc/secrets/aiven-ca.pem` e definir `DB_SSL_CA` com esse caminho. Como
alternativa, `DB_SSL_CA` aceita o conteúdo PEM inline injetado como secret. O PEM
real nunca deve ser gravado no `render.yaml`, em commit, log ou evidência.

## 5. Backup verificável antes de migration

### Pré-condições

- clientes MySQL 8 (`mysql` e `mysqldump`) instalados;
- certificado CA do provedor disponível fora do repositório;
- usuário de backup com o menor privilégio possível;
- pasta de saída protegida e fora de qualquer sincronização pública;
- banco e ambiente confirmados verbalmente por duas informações independentes,
  como nome do serviço e host.

Nunca passe senha como texto em argumento. Prefira um `SecureString` lido no
momento da operação:

```powershell
$dbPassword = Read-Host "Senha do usuario de backup" -AsSecureString

$backup = .\scripts\backup_mysql.ps1 `
  -Database "cesta_digital_staging" `
  -User "backup_operator" `
  -Password $dbPassword `
  -Host "host-do-mysql" `
  -Port 3306 `
  -SslMode VERIFY_IDENTITY `
  -SslCa "C:\caminho-seguro\ca.pem" `
  -OutputDir "C:\caminho-seguro\backups"

Remove-Variable dbPassword
$backup | Format-List
```

Em automações autorizadas, a variável de processo `CESTA_DB_PASSWORD` pode ser
injetada por um cofre de secrets e deve ser removida ao final. Não preenchê-la em
texto no histórico do terminal.

O script só retorna sucesso quando:

- resolve, executa `--version` e registra caminho/versão de `mysql` e
  `mysqldump`, sem credenciais;
- cria e valida primeiro um diretório temporário privado (ACL exclusiva do
  usuário/SID atual ou modo `0700`), grava dentro dele o option file como
  primeiro argumento do cliente, restringe o arquivo a ACL exclusiva ou modo
  `0600` e remove ambos no `finally`;
- `mysqldump` termina com exit code zero;
- o `.sql` existe e não está vazio;
- o inventário estrutural da origem antes e depois do dump é idêntico; qualquer
  alteração detectada nesse inventário aborta a operação;
- o manifesto v2 registra origem, tamanho, hash, binários, tabelas, views,
  rotinas, eventos, triggers e revisão Alembic;
- o `.sha256` cobre tanto o dump quanto o manifesto;
- nenhum artefato parcial permanece após falha.

Os três arquivos formam uma unidade e devem ter a mesma retenção. Não commitar,
anexar a PR, enviar por mensagem ou colocar em evidência pública.

### Custódia, retenção e descarte

Nenhum backup real de homologação foi executado ou comprovado nesta revisão.
Antes da primeira execução, registrar na rodada:

- **responsável operacional nominal** pela geração, custódia, restore e descarte;
- **criptografia em repouso** do conjunto dump/manifesto/checksum, em volume ou
  contêiner criptografado, com chave mantida separadamente;
- **retenção mínima necessária**; na ausência de requisito aprovado, usar no
  máximo sete dias corridos após o drill e não renovar silenciosamente;
- **descarte verificável** no host e no provedor ao final da retenção, com data,
  responsável e confirmação na evidência, sem anexar o conteúdo do backup.

Sem responsável designado, armazenamento criptografado e política de descarte,
o backup real permanece bloqueado. Cópia em pasta sincronizada, repositório,
mensagem ou mídia sem criptografia é proibida.

## 6. Ensaio obrigatório de restore

O backup só é considerado recuperável depois de restaurado em banco temporário,
vazio, isolado e com nome diferente da origem. Provisione o banco de ensaio no
provedor autorizado; não use a base compartilhada.

```powershell
$dbPassword = Read-Host "Senha do usuario do banco de ensaio" -AsSecureString

$restore = .\scripts\restore_mysql.ps1 `
  -InputFile "C:\caminho-seguro\backups\cesta_digital_staging-AAAAMMDD-HHMMSSmmm.sql" `
  -TargetDatabase "cesta_restore_drill_20260714" `
  -User "restore_operator" `
  -Password $dbPassword `
  -Host "host-do-mysql-de-ensaio" `
  -Port 3306 `
  -SslMode VERIFY_IDENTITY `
  -SslCa "C:\caminho-seguro\ca.pem" `
  -EvidenceDir "C:\caminho-seguro\evidencias"

Remove-Variable dbPassword
$restore | Format-List
```

Por padrão, o script:

1. exige `.sha256` e manifesto v2, validando o hash dos dois antes de interpretar
   o manifesto;
2. compara hash, nome e tamanho do dump;
3. recusa banco-alvo que contenha tabela, view, rotina, evento, trigger ou
   revisão Alembic;
4. recusa restaurar sobre o banco de origem;
5. verifica exit code do cliente MySQL;
6. exige ao menos uma tabela e a tabela `alembic_version`;
7. exige igualdade exata entre o inventário/revisão do destino e o manifesto;
8. grava uma evidência JSON sem linhas ou dados pessoais.

`-AllowNonEmptyTarget`, `-AllowInPlaceRestore` e
`-AllowLegacyBackupWithoutManifest` são exceções de incidente. Não fazem parte de
um ensaio normal e exigem autorização explícita, janela de manutenção e registro
do motivo. Backup legado sem manifesto também exige
`-LegacySourceDatabase <origem>`; restore legado in-place só passa com os dois
switches `-AllowLegacyBackupWithoutManifest` e `-AllowInPlaceRestore`. Esse modo
faz apenas validação mínima e fica identificado como `legacy-minimum-only` na
evidência.

### Conciliação após o script

A validação estrutural não substitui a conciliação do produto. Ainda no banco de
ensaio:

1. apontar uma instância temporária da API para a restauração;
2. executar migrations pendentes nessa cópia;
3. validar `/health/db`;
4. comparar contagens agregadas previamente aprovadas de itens, lotes, famílias,
   cestas e entregas, sem exportar registros pessoais;
5. executar login e smoke dos fluxos críticos;
6. destruir com segurança o banco temporário após a retenção da evidência.

## 7. Publicação sem migration

1. Confirmar branch/SHA, escopo, revisão registrada (PR quando disponível) e checks verdes.
2. Obter aprovação de Gabriel.
3. Integrar o commit aprovado em `main`.
4. Confirmar que o Render aguardou os checks de `main`.
5. Acompanhar Vercel, Render e GitHub pelo mesmo SHA.
6. Executar os smokes:

```powershell
$frontend = Invoke-WebRequest `
  -UseBasicParsing `
  -Uri "https://cesta-digital.vercel.app/login"
$database = Invoke-RestMethod `
  -Uri "https://cesta-digital-api.onrender.com/health/db"

if ($frontend.StatusCode -ne 200 -or $database.database -ne "ok") {
    throw "Smoke publico falhou."
}
```

## 8. Publicação com migration

1. Parar e não integrar se não houver backup e restore comprovados.
2. Gerar backup novo da base de homologação.
3. Restaurar em banco isolado e guardar a evidência JSON.
4. Aplicar a migration primeiro na restauração.
5. Conciliar estrutura e agregados.
6. Reexecutar CI se qualquer arquivo mudar.
7. Aprovar e integrar o mesmo escopo validado.
8. Acompanhar o runner `scripts/start_service.py`, o lock, a revisão Alembic,
   readiness e logs sem expor dados.
9. Confirmar que o Uvicorn só iniciou depois de migration e seed verdes.
10. Executar smoke público e registrar horário, SHA e resultado.

No startup automático são permitidas somente migrations **aditivas/expand**:
criação de tabela ou índice compatível e inclusão de coluna nullable ou com
default retrocompatível. Drop, rename, estreitamento de tipo, mudança de
semântica, `NOT NULL` incompatível, reescrita massiva ou remoção de dados não
podem entrar nesse caminho. Alterações contrativas exigem release posterior,
janela aprovada, telemetria de compatibilidade e plano específico. Migration
destrutiva, irreversível ou sem estratégia expand/contract permanece bloqueada,
mesmo que o script de backup passe.

## 9. Rollback e incidente

Em falha pós-deploy:

1. interromper novas operações no ambiente;
2. registrar SHA, horário, endpoint e sintoma sem conteúdo sensível;
3. reverter a aplicação para o último artefato saudável;
4. não executar downgrade destrutivo de schema por impulso;
5. restaurar banco somente com incidente aprovado e backup verificado;
6. validar `/health/db`, login, saldo e entregas antes de reabrir;
7. registrar causa raiz e ação preventiva.

## 10. Evidência mínima dos gates

| Campo | Exemplo permitido |
|---|---|
| Branch/PR | nome e URL, sem token |
| SHA aprovado | hash do commit |
| Checks | resultado de `frontend`, `backend` e `operations` |
| Backup | horário, tamanho, hashes do dump/manifesto, retenção, criptografia e responsável; nunca anexar o SQL |
| Restore | JSON gerado pelo script, após revisar que não contém dados pessoais |
| Deploy | status Vercel/Render e SHA |
| Smoke | código HTTP e `{"database":"ok"}` |
| Responsável/aprovação | nome, data e decisão |
| Descarte | data, responsável e confirmação de remoção do dump/manifesto/checksum |

Sem todos os itens aplicáveis, o gate fica `Bloqueado` ou `Em homologação`, nunca
`Concluído`.

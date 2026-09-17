# Homologação local UX — 27/08/2026

> Para iniciar os próprios cadastros em uma base vazia, use o procedimento mais
> recente em [HOMOLOGACAO_LOCAL_LIMPA_2026-09-17.md](./HOMOLOGACAO_LOCAL_LIMPA_2026-09-17.md).

**Escopo:** validação manual do Frontend V2 completo e dos fluxos funcionais
com dados exclusivamente sintéticos.

**IDs relacionados:** `V2-13`, `HOM-UX-001`, `HOM-UX-003`, `HOM-UX-004` e
`HOM-ENV-001`.

**Classificação:** ambiente local descartável. Não usar nomes, contatos,
endereços, documentos ou operações de pessoas reais.

## Acesso desta estação

| Recurso | Endereço |
|---|---|
| Frontend recomendado neste computador | `http://127.0.0.1:5173` |
| API recomendada neste computador | `http://127.0.0.1:8010` |
| Healthcheck | `http://127.0.0.1:8010/health/db` |

Frontend e API usam o mesmo host para que o cookie HttpOnly com `SameSite=lax`
permaneça válido. Misturar `127.0.0.1`, hostname e IPv4 no mesmo acesso faz o
navegador descartar a sessão após o login. Não foi usada liberação ampla de
hosts no Vite.

O login administrativo é `ux.admin`. A senha é gerada localmente no primeiro
início e pode ser consultada, sem ser versionada, com:

```powershell
Get-Content .\.ux-sandbox\access.json |
  ConvertFrom-Json |
  Select-Object login_name,password
```

## Iniciar e encerrar

Na raiz do repositório:

```powershell
.\scripts\start_ux_local.ps1
```

Para testar em outro dispositivo na mesma rede, reinicie escolhendo o IPv4 como
host do navegador e abra o endereço exibido pelo comando:

```powershell
.\scripts\stop_ux_local.ps1
.\scripts\start_ux_local.ps1 -BrowserHost 172.23.18.136
```

Para encerrar somente os processos registrados pelo sandbox:

```powershell
.\scripts\stop_ux_local.ps1
```

O inicializador não encerra processos que já ocupem as portas. A API usa a
porta `8010` porque a porta `8000` está reservada por um serviço do Windows
nesta máquina.

## Isolamento e persistência

- a API substitui a dependência de sessão por SQLite apenas nesse processo;
- o MySQL configurado para outros ambientes não é acessado;
- banco, credenciais, estado e logs ficam em `.ux-sandbox/`, ignorado pelo Git;
- reiniciar preserva cadastros para permitir uma sessão de teste contínua;
- o seed é idempotente e contém somente pessoas, famílias e operações fictícias;
- o banner do frontend identifica o contexto de homologação.

O cenário inicial inclui três perfis, categorias de alimentos, higiene e
limpeza, seis produtos, lotes válidos, alertas de estoque, quatro famílias
sintéticas, avaliações com reavaliação de aptidão, dois tipos de cesta,
agendamentos, uma entrega concluída e eventos de auditoria.

## Evidência automatizada da rodada

| Verificação | Resultado |
|---|---|
| Healthcheck do SQLite isolado | `database=ok` |
| Login pelo endpoint real | `ux.admin`, papel `admin` |
| Cadastro real pela API | `Produto Teste UX Local`, ID 7, EAN válido |
| Produto refletido no frontend | encontrado na tela Estoque |
| Rotas autenticadas percorridas | 10/10 |
| Respostas HTTP 500 durante navegação desktop | 0 |
| Erros JavaScript de página durante navegação desktop | 0 |
| Rotas verificadas em 390 × 844 | 10/10 |
| Overflow horizontal documental em 390 × 844 | 0 |

Em 28/08/2026, o inicializador passou a alinhar API e frontend em
`127.0.0.1` por padrão após a reprodução de login 200 seguido por `/auth/me`
401 quando hosts diferentes eram misturados.

Rotas percorridas: Início, Famílias, Avaliações, Estoque, Entradas, Entregas,
Tipos de cesta, Relatórios, Usuários e Auditoria.

## Roteiro manual para Gabriel

1. Entrar com o usuário local e confirmar menu lateral no desktop.
2. Percorrer todas as áreas e conferir a indicação visual da rota ativa.
3. Em Estoque, abrir o produto de smoke e cadastrar outro produto sintético.
4. Registrar uma entrada com lote e validade futura.
5. Conferir alertas, composição de cesta e disponibilidade.
6. Abrir uma família fictícia e revisar cálculo, sugestão e decisão da
   avaliação/reavaliação de aptidão.
7. Criar um agendamento somente para família apta e validar Entregas.
8. Em Administração, criar um usuário de teste, editar seus papéis, revisar
   salvaguardas e consultar Auditoria.
9. Repetir as tarefas críticas com a janela estreita ou em um celular na mesma
   rede.

Esta rodada habilita avaliação UX local, mas não altera o `NO-GO` profissional
para dados reais, publicação ou operação de entregas reais.

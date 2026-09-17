# Homologação local limpa — 17/09/2026

## Objetivo

Disponibilizar o Frontend V2 completo para cadastro manual desde uma base vazia,
sem misturar os dados sintéticos usados nas demonstrações anteriores. Este
ambiente é local, descartável e exclusivo para testes com informações fictícias
ou anonimizadas.

## Estado inicial garantido

O modo `minimal` cria apenas a infraestrutura necessária para autenticação:

- três perfis de acesso: `admin`, `lider_social` e `operador`;
- um usuário administrativo local: `ux.admin`;
- nenhuma categoria, produto, família, pessoa, benefício, avaliação, lote,
  movimentação, tipo de cesta, agendamento ou entrega.

O MySQL e os ambientes publicados não são acessados. Banco, credenciais, logs e
estado ficam em `.ux-sandbox/`, fora do Git.

## Acesso ativo nesta estação

| Recurso | Endereço |
|---|---|
| Frontend | `http://127.0.0.1:5173/login` |
| API | `http://127.0.0.1:8010` |
| Saúde do banco | `http://127.0.0.1:8010/health/db` |

O nome de login é `ux.admin`. Para consultar somente o login e a senha gerados
localmente, sem imprimir a chave interna do sandbox:

```powershell
Get-Content .\.ux-sandbox\access.json |
  ConvertFrom-Json |
  Select-Object login_name,password
```

## Iniciar, preservar ou limpar os testes

Na raiz do repositório, iniciar uma base totalmente limpa:

```powershell
.\scripts\stop_ux_local.ps1
.\scripts\start_ux_local.ps1 -SeedMode minimal -ResetData
```

Depois do primeiro cadastro, reiniciar preservando os dados já criados:

```powershell
.\scripts\stop_ux_local.ps1
.\scripts\start_ux_local.ps1 -SeedMode minimal
```

`-ResetData` remove exclusivamente o SQLite do sandbox e seus arquivos `-wal` e
`-shm`, depois de validar que o destino é a pasta `.ux-sandbox` deste
repositório. Ele não apaga código, evidências, credenciais nem banco externo.

## Ordem recomendada do teste manual

1. Cadastrar categorias.
2. Cadastrar produtos, opcionalmente com EAN e imagem governada.
3. Registrar entradas com lote, quantidade e validade.
4. Criar tipos de cesta e suas composições.
5. Cadastrar famílias, membros e benefícios.
6. Executar a avaliação social e conferir cálculo, sugestão e decisão de
   aptidão como informações distintas.
7. Agendar e confirmar uma entrega para uma família apta.
8. Conferir relatórios, usuários, perfis e auditoria.
9. Repetir os fluxos críticos em desktop e em uma janela móvel.

Não usar nomes, contatos, documentos, endereços ou operações de pessoas reais.

## Evidência automatizada desta rodada

| Verificação | Resultado |
|---|---|
| Banco mínimo e idempotente | 2/2 testes unitários aprovados |
| Conteúdo inicial de domínio | 0 registros em todas as tabelas operacionais |
| Login, API, healthcheck e dashboard | aprovados |
| Rotas autenticadas | 11/11 em desktop e 11/11 em mobile |
| Erros JavaScript e HTTP 5xx | 0 |
| Overflow horizontal em 390 × 844 | 0 |
| Frontend lint, build e escala tipográfica | aprovados |

## Limite desta aprovação

Esta etapa libera o teste manual local de UX e dos fluxos com dados fictícios.
Ela ainda não autoriza publicação, dados pessoais reais ou entregas reais. Após
o aceite manual, o próximo gate é publicar a branch no GitHub, executar o CI no
mesmo commit e preparar um staging isolado com configuração e banco próprios.

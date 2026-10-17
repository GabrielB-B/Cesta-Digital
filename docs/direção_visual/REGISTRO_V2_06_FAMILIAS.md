# Registro do marco V2-06 — Famílias

**Branch:** `feat/frontend-v2-familias`
**Base:** `2abf89b` (`V2-05` aprovado)
**Status:** aprovado por Gabriel em 19/08/2026
**Referência principal:** `referencias_por_tela/02-familias-desktop.png`

## 1. Resultado implementado

- Cabeçalho compacto, busca, filtro e CTA único “Nova família”, seguindo a
  hierarquia da referência.
- Tabela no desktop com seleção persistida e painel lateral da família
  selecionada.
- Cards próprios em 360, 390 e 768 px, sem comprimir a tabela nem criar overflow
  horizontal.
- Detalhe reorganizado por aptidão, resumo, composição, contatos, vínculo
  comunitário, benefícios, histórico e gestão do cadastro.
- Formulários de criação e edição não foram redesenhados neste marco.

## 2. Fidelidade segura ao contrato real

| Área da referência | Implementação real | Decisão |
|---|---|---|
| Nome da família | código estável | a projeção de lista não fornece nome |
| Responsável na tabela | região, moradores e renda per capita | evita uma requisição de detalhe por linha |
| CPF no painel | não exibido | o contrato de detalhe não fornece CPF |
| Família selecionada | detalhe sob demanda de um único registro | preserva o painel lateral sem N+1 |
| Busca, status e página | parâmetros na URL | Voltar/Avançar preservam o contexto |

Nenhum nome, CPF ou atributo social foi inventado. A lista continua usando
`GET /families`; somente a seleção atual usa `GET /families/:familyId`.

## 3. Aptidão e avaliação social

O detalhe diferencia explicitamente:

1. **Sugestão calculada**, retornada pela prévia de elegibilidade;
2. **Última decisão registrada**, produzida pela avaliação social;
3. **Prioridade social**, apresentada como informação de apoio.

A interface informa que o cálculo orienta a análise e não substitui a decisão
técnica. Em tablet e mobile, esse bloco aparece antes do resumo cadastral para
que a finalidade da avaliação seja compreendida no primeiro fluxo de leitura.

## 4. Rotas, API e RBAC preservados

- `/families` mantém busca, status, paginação e acesso de `admin` e
  `lider_social`.
- `/families/:familyId` preserva vínculos para edição, Igreja/UPG, pessoas,
  benefícios e nova avaliação.
- `PATCH /families/:familyId/status` e as regras de alteração de status não
  mudaram.
- Autenticação, redirects, payloads, permissões e backend permaneceram
  inalterados.

## 5. Responsividade e acessibilidade

- 1440 px: sidebar global fixa, tabela, painel selecionado e detalhe em duas
  colunas.
- 768 px: lista em cards e detalhe em fluxo vertical.
- 360/390 px: ações empilhadas, cartões compactos, bottom navigation e aptidão
  antes do resumo.
- Ausência de overflow horizontal verificada nos quatro viewports.
- Controles possuem nomes acessíveis, foco visível, estados de carregamento,
  vazio e erro, além de suporte a movimento reduzido.

## 6. Evidências

Com o showcase em execução:

```powershell
cd frontend
npm run showcase
```

Abrir:

`http://127.0.0.1:4174/showcase/evidence/v2-06/`

A galeria contém referência integral, lista em 360/390/768/1440 e detalhe em
desktop e mobile. Cada captura abre diretamente em uma nova aba.

Para regenerar a matriz visual e os testes próprios:

```powershell
cd frontend
npm run test:visual:families
```

## 7. Gates locais

- `npm run lint`: aprovado;
- `npm run build`: aprovado, mantendo o aviso conhecido do bundle único de
  aproximadamente 534,50 kB;
- `npm run test:e2e`: 35/35 aprovados;
- `npm run test:visual:families`: 13 aprovados e 3 skips intencionais do cenário
  de seleção exclusivo do desktop;
- `npm run test:visual:shell`: 11 aprovados e 1 skip desktop intencional;
- backend não alterado.

## 8. Aprovação e continuidade

Gabriel aprovou a etapa em 19/08/2026. O marco foi consolidado no commit
`380fd9c`, e a branch `feat/backend-v2-avaliacoes-contrato` foi aberta a partir
dessa base para executar o V2-07A antes da interface da referência 03.

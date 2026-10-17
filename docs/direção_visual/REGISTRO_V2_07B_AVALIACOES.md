# Registro do marco V2-07B — Avaliações

**Branch:** `feat/frontend-v2-avaliacoes`
**Base:** `6544624` (`V2-07A`)
**Status:** aprovado por Gabriel em 20/08/2026
**Referência principal:** `referencias_por_tela/03-avaliacoes-desktop.png`

## 1. Resultado implementado

- Nova rota global protegida `/assessments`, com item próprio “Avaliações” no
  menu e estado ativo correto no desktop e no mobile.
- Quatro situações operacionais reais: sem avaliação, reavaliação vencida,
  reavaliação próxima e avaliação em dia.
- Busca, filtro, paginação e seleção persistidos na URL.
- Tabela com painel contextual no desktop e cards próprios em 360, 390 e 768
  px, sem tabela comprimida nem overflow horizontal.
- Formulário de avaliação reorganizado em dados atuais, cálculo, decisão
  técnica e próxima reavaliação.

## 2. Fidelidade segura à referência

| Área da referência | Implementação real | Decisão |
|---|---|---|
| Contadores de situação | quatro estados de prazo/avaliação do backend | substitui status ilustrativos por urgência operacional real |
| Tabela global | projeção paginada de `GET /social-assessments/queue` | não agrega páginas incompletas no navegador |
| Painel selecionado | última decisão versus cálculo atual | torna explícita uma possível mudança de cenário |
| Etapas de triagem/documentos/visita | não exibidas | esses estados não existem no domínio |
| Ação principal | Avaliar/Reavaliar a família selecionada | preserva a rota contextual e o histórico familiar |

## 3. Aptidão, cálculo e decisão humana

A tela distingue quatro informações que não podem ser confundidas:

1. dados atuais da família;
2. sugestão e score calculados pelo servidor;
3. última decisão técnica registrada;
4. próxima data em que a aptidão volta para análise.

O score deixou de ser editável no frontend e não é enviado pelo novo fluxo. O
servidor o recalcula ao gravar. Quando a decisão humana diverge da sugestão, a
fundamentação técnica torna-se obrigatória na interface e permanece sujeita à
validação do backend.

## 4. Rotas, API e RBAC

- `/assessments`: nova rota autorizada para `admin` e `lider_social`;
- `/families/:familyId/assessments/new`: preservada, agora pertencente à seção
  ativa “Avaliações”;
- menu mobile da liderança prioriza Início, Famílias e Avaliações;
- `operador` continua sem acesso à rota e ao item de navegação;
- a matriz E2E passou de 25 para 26 rotas por mudança funcional intencional;
- nenhuma migration, alteração de tabela ou novo campo de dados foi criado.

## 5. Responsividade e acessibilidade

- 1440 px: sidebar fixa, quatro indicadores, tabela e painel contextual sticky;
- 768 px: indicadores em duas colunas e fila em cards;
- 360/390 px: indicadores e cards empilhados, CTA amplo e bottom navigation;
- formulário em uma coluna no mobile, com resumo antes da confirmação final;
- foco visível, nomes acessíveis, estados loading/vazio/erro, movimento reduzido
  e ausência de overflow verificados.

## 6. Evidências

Com o showcase em execução:

```powershell
cd frontend
npm run showcase
```

Abrir:

`http://127.0.0.1:4174/showcase/evidence/v2-07/`

A galeria contém referência integral, fila em 360/390/768/1440 e formulário em
desktop/mobile. Todas as imagens são links para o arquivo em resolução original.

Para regenerar a matriz:

```powershell
cd frontend
npm run test:visual:assessments
```

## 7. Gates locais

- `npm run lint`: aprovado;
- `npm run build`: aprovado, com o aviso conhecido de bundle único acima de
  500 kB;
- `npm run test:e2e`: 35/35 aprovados;
- `npm run test:visual:assessments`: 11 aprovados e 5 skips intencionais de
  cenários capturados/contratuais executados apenas nos viewports relevantes;
- backend V2-07A: `compileall` e 60/60 testes aprovados no marco anterior;
- migration: não aplicável.

## 8. Aprovação e continuidade

Gabriel aprovou a continuidade em 20/08/2026. O marco será consolidado em commit
próprio e a aba Estoque será iniciada em uma nova branch. O `NO-GO` para
operação e dados reais permanece vigente; esta branch não foi publicada.

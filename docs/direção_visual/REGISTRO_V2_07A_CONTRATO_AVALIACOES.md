# Registro do marco V2-07A — Contrato de Avaliações

**Branch:** `feat/backend-v2-avaliacoes-contrato`
**Base:** `380fd9c` (`V2-06` aprovado)
**Status:** contrato concluído localmente e pronto para sustentar o V2-07B
**IDs canônicos:** `DOM-007`, `UX-006` e `UX-SOC-001`

## 1. Objetivo

Criar a fonte backend paginada para a fila global de avaliação e reavaliação de
aptidão, sem agregar páginas incompletas no cliente, e impedir que o snapshot do
score social diverja silenciosamente do cálculo executado no servidor.

## 2. Contrato criado

`GET /social-assessments/queue`

Parâmetros:

- `q`: código, bairro, cidade ou nome da pessoa responsável;
- `status`: `sem_avaliacao`, `reavaliacao_vencida`,
  `reavaliacao_proxima` ou `em_dia`;
- `due_soon_days`: janela configurável de 1 a 365 dias, padrão 30;
- `limit`: 1 a 200, padrão 25;
- `offset`: deslocamento paginado.

A resposta fornece `items`, `total`, parâmetros efetivos, data operacional,
contadores completos por situação e `X-Total-Count`. Cada item distingue:

- última sugestão e decisão registradas;
- responsável técnico pela última avaliação;
- próxima reavaliação;
- nova sugestão e score calculados com os dados atuais;
- prioridade social e sinal explícito quando a nova prévia diverge da decisão.

## 3. Classificação operacional

| Situação | Regra |
|---|---|
| `sem_avaliacao` | família ativa sem avaliação registrada |
| `reavaliacao_vencida` | prazo anterior à data operacional ou avaliação legada sem próximo prazo |
| `reavaliacao_proxima` | prazo entre hoje e a janela configurada |
| `em_dia` | prazo posterior à janela configurada |

Famílias inativas não entram na fila. Uma avaliação antiga sem próxima data é
classificada conservadoramente como ação vencida, mas recebe o motivo específico
`prazo_nao_definido`; a interface poderá comunicar “prazo não definido” sem
inventar uma data.

A data civil usa `America/Sao_Paulo`, igual às demais regras operacionais
sensíveis à virada do dia.

## 4. Integridade do score

O `POST /families/:familyId/assessments` agora calcula
`vulnerability_score` no servidor a partir dos agravantes atuais. O campo legado
continua temporariamente aceito para compatibilidade, mas:

- se omitido, o servidor grava o valor calculado;
- se enviado com o mesmo valor da prévia, a requisição permanece compatível;
- se divergir, a API responde 422 e não grava avaliação;
- auditoria e resposta usam exclusivamente o snapshot calculado.

Campos desconhecidos passaram a ser rejeitados nesse payload. Não foi criado
override de score no frontend; qualquer exceção futura continua exigindo regra,
permissão, motivo e auditoria próprios.

## 5. Consulta e desempenho

- A última avaliação é resolvida por janela SQL, ordenada por data e ID.
- A paginação e a contagem acontecem no banco.
- Pessoas da página são carregadas em lote; o cálculo atual reutiliza esses
  dados e não executa uma consulta por família.
- Busca pelo responsável usa `EXISTS`, evitando duplicação de linhas.
- Nenhuma migration ou alteração de tabela foi necessária.

## 6. Segurança e RBAC

- `admin` e `lider_social` podem consultar a fila.
- `operador` recebe 403.
- requisição anônima recebe 401.
- famílias inativas e dados sem finalidade operacional ficam fora da projeção.

## 7. Evidências locais

- `python -m compileall app scripts tests`: aprovado;
- suíte backend completa: 60/60 testes aprovados;
- novos testes cobrem paginação, contadores, ordenação, busca, filtros,
  validação, RBAC, prazo ausente, prévia versus decisão e score server-owned;
- `git diff --check`: executado no fechamento da branch;
- frontend e banco de dados não foram alterados neste marco;
- migration: não aplicável.

## 8. Próximo gate

O V2-07B será executado na branch planejada
`feat/frontend-v2-avaliacoes`, usando a referência
`03-avaliacoes-desktop.png`. A interface não reproduzirá etapas fictícias de
triagem, documentos, visita ou entrevista: mostrará a fila real de aptidão,
última decisão, nova prévia e ações Avaliar/Reavaliar.

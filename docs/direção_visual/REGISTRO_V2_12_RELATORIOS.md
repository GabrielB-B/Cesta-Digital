# Registro do marco V2-12 — Relatórios

**Branch:** `feat/frontend-v2-relatorios`

**Base aprovada:** `9b9beb2` (`V2-11`)

**Status:** implementação e aprovação visual concluídas por Gabriel em 26/08/2026

**Referência:** `referencias_por_tela/08-relatorios-desktop.png`

## 1. Escopo entregue

- A nova rota canônica `/reports` reproduz a composição da referência 08 com
  período, tipo, três indicadores e grade de arquivos disponíveis.
- `/financial-summary` foi preservada como endereço legado e redireciona os
  perfis já autorizados para `/reports`; o endpoint de backend homônimo não foi
  removido nem alterado.
- Desktop mantém sidebar fixa, filtro horizontal, três indicadores e seis
  cartões de relatório para administrador.
- 360, 390 e 768 reorganizam filtros, indicadores e downloads em cartões sem
  overflow horizontal.
- O menu passou a exibir “Relatórios” para os três perfis e mantém localização
  ativa em desktop e na navegação inferior mobile.

## 2. Contrato de indicadores

- `GET /reports/overview` recebe `start_date` e `end_date`, limita a consulta a
  no máximo 367 dias e usa a data operacional de São Paulo como padrão.
- “Famílias atendidas” conta famílias distintas com entrega concluída no
  período.
- “Cestas entregues” conta registros reais de entrega com status `concluida`.
- “Itens distribuídos” soma movimentações `saida_entrega` vinculadas às
  entregas concluídas do período.
- A resposta informa somente os relatórios permitidos para os papéis do usuário.

## 3. Arquivos reais e matriz de acesso

| Relatório | Admin | Liderança social | Operador | Recorte |
|---|---:|---:|---:|---|
| Atendimentos por período | sim | sim | não | período selecionado |
| Cestas entregues | sim | não | sim | período selecionado |
| Estoque movimentado | sim | não | sim | período selecionado |
| Benefícios concedidos | sim | sim | não | benefícios iniciados no período |
| Famílias cadastradas | sim | sim | não | cadastro no período |
| Alertas de estoque | sim | não | sim | posição atual |

- Cada botão chama `GET /reports/{report_key}/export` e baixa um CSV UTF-8 com
  separador compatível com planilhas em português.
- Células textuais iniciadas por caracteres de fórmula são neutralizadas antes
  da geração, reduzindo risco de injeção ao abrir o CSV.
- Toda exportação registra em auditoria ator, chave do relatório, período,
  formato e quantidade de linhas. O conteúdo exportado não é copiado para o log.
- A autorização é repetida no backend; ocultar o cartão no frontend não é a
  barreira de segurança.

## 4. Diferenças deliberadas da referência

| Elemento ilustrado | Decisão implementada |
|---|---|
| Arquivos `.xlsx` | CSV UTF-8 realmente gerado, compatível com Excel, sem introduzir uma biblioteca binária e uma promessa ainda não testada de planilha formatada |
| Tendências em verde | não simuladas; não existe série comparativa aprovada para afirmar aumento percentual |
| Mesmos seis downloads para todos | opções filtradas pelo papel para não expor dados sociais à operação nem dados operacionais à liderança |
| Alertas “no período” | declarado como posição atual porque alertas são derivados do estoque utilizável presente, não de snapshots históricos |
| Métricas ilustrativas | substituídas por contagens derivadas de entregas e movimentações reais |

## 5. Compatibilidade e dados

- A matriz passa de 27 para 28 paths ao adicionar `/reports`; o path legado
  permanece testado e restrito a `admin`/`lider_social` como antes.
- O overview agregado pode ser visto por todos os usuários autenticados; cada
  arquivo detalhado obedece sua própria matriz social ou operacional.
- Nenhuma tabela, coluna, migration ou contrato de escrita foi alterado.
- Resumo financeiro e exportação administrativa de auditoria continuam
  disponíveis em seus endpoints existentes.

## 6. Evidências locais

- backend `compileall` aprovado e suíte completa 74/74;
- contrato focado de relatórios 3/3 aprovado após inclusão da auditoria;
- frontend lint e build aprovados;
- regressão funcional 38/38 E2E aprovada, incluindo download CSV e 28 rotas;
- gate visual V2-12: 6 testes aprovados e 2 skips intencionais por viewport;
- viewports 360×800, 390×844, 768×1024 e 1440×900;
- galeria clicável: `frontend/showcase/evidence/v2-12/index.html`;
- referência integral e quatro capturas da implementação incluídas;
- banco e migrations: nenhuma alteração;
- publicação externa: não realizada; o `NO-GO` profissional permanece.

## 7. Gate

Gabriel aprovou o marco V2-12 em 26/08/2026 ao autorizar a continuidade. A
decisão encerra o gate de Relatórios e libera exclusivamente a branch própria
de Administração (`V2-13`).

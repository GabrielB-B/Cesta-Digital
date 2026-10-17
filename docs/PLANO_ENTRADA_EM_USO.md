# Plano de entrada em uso — Cesta Digital

Este plano transforma a V2 em um piloto controlado sem ampliar o escopo do
produto. O documento mestre continua sendo
[`PROJETO_PROFISSIONAL_CESTA_DIGITAL.md`](./PROJETO_PROFISSIONAL_CESTA_DIGITAL.md).

## Escopo do primeiro piloto

O fluxo prioritário é:

1. autenticar usuários por perfil;
2. localizar ou cadastrar família;
3. cadastrar membros com o perfil colaborador e registrar a decisão com a liderança social;
4. cadastrar produtos, lotes e entradas de estoque;
5. agendar e confirmar uma entrega;
6. consultar o histórico e a auditoria.

Não entram como requisito para o piloto: PWA, novos dashboards, novos
relatórios, integrações comerciais ou novas fontes de imagens.

## Gates obrigatórios

| Gate | Evidência exigida | Estado em 17/10/2026 |
|---|---|---|
| Código e dependências | lint, build, E2E, backend e auditorias verdes | CI remota aprovada no commit técnico `80827d2` ([execução 39042883332](https://github.com/GabrielB-B/Cesta-Digital/actions/runs/39042883332)) |
| MySQL/Alembic | ciclo completo em MySQL 8 | Upgrade, rollback até a base e novo upgrade aprovados em MySQL 8 na CI |
| Banco público | backup, checksum, restore isolado e conciliação | Obrigatório antes da promoção; não executar sem credenciais autorizadas |
| Segurança web | cookie HttpOnly, origem confiável, CSP, RBAC e rate limit | Implementado localmente; aguarda staging |
| Privacidade | responsável, aviso preenchido, retenção e revisão de acesso | Pendente de decisão organizacional |
| Domínio de estoque | política para kg/litro versus itens fechados | Pendente de decisão de Gabriel |
| Domínio social | fonte oficial dos agregados familiares | Pendente de decisão de Gabriel |
| UX real | roteiro completo em celular por cada perfil | Pendente de aceite manual |
| Operação | responsável, suporte, incidentes e rollback | Pendente de nomes e contatos reais |

Enquanto algum gate obrigatório estiver pendente, o ambiente aceita somente
dados sintéticos ou efetivamente anonimizados.

## Checklist de promoção

- [x] Registrar o SHA técnico `80827d2` e executar todos os checks na branch.
- [ ] Confirmar proteção da `main` e deploy somente após checks verdes.
- [ ] Classificar o conteúdo atual do banco sem exportar dados pessoais.
- [ ] Gerar backup verificável e restaurar em banco isolado.
- [ ] Aplicar migrations na restauração e conciliar contagens agregadas.
- [ ] Publicar preview com origem exata autorizada no CORS.
- [ ] Testar desktop e celulares de 360/390 px com admin, liderança, operador e colaborador.
- [ ] Preencher e aprovar o aviso de privacidade.
- [ ] Definir responsável por acesso, backup, suporte e incidente.
- [ ] Promover por fast-forward o mesmo SHA aprovado.
- [ ] Confirmar Vercel, Render, healthcheck, login e fluxo crítico.
- [ ] Registrar rollback e manter o piloto limitado a 2 ou 3 operadores.

## Critérios para interromper o piloto

Interromper novas operações e seguir o runbook em indisponibilidade, erro de
migration, divergência de saldo/entrega, acesso indevido, perda de auditoria,
falha mobile impeditiva ou ausência de backup restaurável.

## Indicadores das primeiras duas semanas

- percentual de cadastros concluídos sem ajuda;
- tempo para localizar uma família e confirmar uma entrega;
- erros por etapa e perfil;
- divergências de estoque;
- tempo de primeira resposta após inatividade do backend;
- solicitações de correção ou exclusão;
- incidentes de permissão, privacidade ou disponibilidade.

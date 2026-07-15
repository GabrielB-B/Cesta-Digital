# Docs Cesta Digital

Documentacao operacional e tecnica do projeto.

## Fonte de verdade vigente

- [PROJETO_PROFISSIONAL_CESTA_DIGITAL.md](./PROJETO_PROFISSIONAL_CESTA_DIGITAL.md): documento canônico e vivo com visão, diagnóstico, regras, modelo-alvo, UX, identidade, segurança, backlog e decisão go/no-go.
- [HOMOLOGACAO_MVP.md](./HOMOLOGACAO_MVP.md): matriz executável de homologação e evidências.

Em 14/07/2026, a decisão vigente é **NO-GO para ampliar uso com dados e entregas reais** até o fechamento de todos os gates obrigatórios, ausência de defeitos P0/P1 e aprovação final de Gabriel. A Fase 0 apenas permite continuar a homologação técnica controlada com dados sintéticos ou anonimizados; não libera produção real. Os checkpoints e roadmaps datados abaixo permanecem como histórico e não substituem o documento canônico.

## Arquivos

- [PROJETO_PROFISSIONAL_CESTA_DIGITAL.md](./PROJETO_PROFISSIONAL_CESTA_DIGITAL.md): fonte permanente do estado atual e plano de profissionalização.
- [SETUP_E_USO.md](./SETUP_E_USO.md): como ativar, configurar e usar o sistema.
- [STACK_E_VERSOES.md](./STACK_E_VERSOES.md): tecnologias, arquitetura e versoes.
- [ANALISE_CRITICA_E_ROADMAP_MVP.md](./ANALISE_CRITICA_E_ROADMAP_MVP.md): leitura histórica anterior; consultar o documento canônico para o estado vigente.
- [OPERACAO_STAGING_E_BACKUP.md](./OPERACAO_STAGING_E_BACKUP.md): procedimento de staging, backup, restore e checklist de release.
- [LGPD_PRIVACIDADE.md](./LGPD_PRIVACIDADE.md): politica tecnica minima de privacidade, dados tratados, retencao e incidentes.
- [HOMOLOGACAO_MVP.md](./HOMOLOGACAO_MVP.md): matriz vigente de homologação funcional, segurança, UX e operação.
- [CHECKPOINT_2026-04-28.md](./CHECKPOINT_2026-04-28.md): checkpoint detalhado do que foi feito ate o momento.
- [CHECKPOINT_2026-05-01.md](./CHECKPOINT_2026-05-01.md): checkpoint da rodada premium, design inicial e preparacao para GitHub.
- [CHECKLIST_ENTREGA_2026-05-02.md](./CHECKLIST_ENTREGA_2026-05-02.md): checklist de QA visual/responsivo e fechamento tecnico da entrega.
- [MANUAL_PROGRAMADOR.md](./MANUAL_PROGRAMADOR.md): guia simples para programadores rodarem, testarem e evoluirem o sistema.
- [PLANO_PENDENCIAS_MVP_PROFISSIONAL.md](./PLANO_PENDENCIAS_MVP_PROFISSIONAL.md): plano histórico anterior; não usar como status vigente.

## Validação mais recente

- Data: 14/07/2026.
- Commit auditado: `c0fd3994d91836b20bb81d594c9847acf3b68761`.
- Frontend público `/login`: HTTP 200.
- Backend público `/health/db`: `{"database":"ok"}`.
- Frontend local: lint e build OK.
- Frontend local: Playwright 14/14 OK com servidor controlado.
- Backend local: compile e 29/29 testes OK.
- Último CI do commit publicado: **falha no frontend E2E**; backend verde. O release não é considerado verde.
- Auditoria encontrou bloqueio P0 de validade: vencidos ainda entram no saldo utilizável e podem ser selecionados na entrega.

## Observação importante

O projeto possui uma boa fundação, mas os próximos passos não se limitam a observabilidade. Segurança alimentar, jornada de lote/validade, consistência do domínio social, UX mobile, identidade visual, gate de release e governança LGPD precisam ser fechados conforme o documento canônico antes de uma aprovação profissional.

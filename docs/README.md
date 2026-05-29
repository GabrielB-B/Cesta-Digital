# Docs Cesta Digital

Documentacao operacional e tecnica do projeto.

## Arquivos

- [SETUP_E_USO.md](./SETUP_E_USO.md): como ativar, configurar e usar o sistema.
- [STACK_E_VERSOES.md](./STACK_E_VERSOES.md): tecnologias, arquitetura e versoes.
- [ANALISE_CRITICA_E_ROADMAP_MVP.md](./ANALISE_CRITICA_E_ROADMAP_MVP.md): leitura senior do estado atual e plano para MVP profissional.
- [OPERACAO_STAGING_E_BACKUP.md](./OPERACAO_STAGING_E_BACKUP.md): procedimento de staging, backup, restore e checklist de release.
- [LGPD_PRIVACIDADE.md](./LGPD_PRIVACIDADE.md): politica tecnica minima de privacidade, dados tratados, retencao e incidentes.
- [HOMOLOGACAO_MVP.md](./HOMOLOGACAO_MVP.md): checklist de homologacao funcional por perfil.
- [CHECKPOINT_2026-04-28.md](./CHECKPOINT_2026-04-28.md): checkpoint detalhado do que foi feito ate o momento.
- [CHECKPOINT_2026-05-01.md](./CHECKPOINT_2026-05-01.md): checkpoint da rodada premium, design inicial e preparacao para GitHub.
- [CHECKLIST_ENTREGA_2026-05-02.md](./CHECKLIST_ENTREGA_2026-05-02.md): checklist de QA visual/responsivo e fechamento tecnico da entrega.
- [MANUAL_PROGRAMADOR.md](./MANUAL_PROGRAMADOR.md): guia simples para programadores rodarem, testarem e evoluirem o sistema.
- [PLANO_PENDENCIAS_MVP_PROFISSIONAL.md](./PLANO_PENDENCIAS_MVP_PROFISSIONAL.md): plano estruturado das pendencias restantes por fase e prioridade.

## Validacao recente

- Backend: compile OK em 2026-05-04.
- Backend: testes automatizados OK em 2026-05-04.
- Backend: compile OK em 2026-05-11.
- Backend: testes automatizados OK em 2026-05-11.
- Backend: `python -m pip_audit -r requirements.txt` OK em 2026-05-11.
- Frontend: `npm run lint` OK em 2026-05-11.
- Frontend: `npm run build` OK em 2026-05-11.
- Frontend: `npm audit --audit-level=high` OK em 2026-05-11.
- Frontend: `npm run test:e2e` OK em 2026-05-11.
- Frontend: `npm run build` OK em 2026-05-04.
- Frontend: QA visual/responsivo desktop/mobile OK em 2026-05-02.
- Frontend: `npm run lint` OK em 2026-05-02.
- Frontend: `npm run build` OK em 2026-05-02.
- Frontend: `npm audit --audit-level=high` OK em 2026-05-02.
- Local: frontend HTTP 200 e backend `/health/db` OK em 2026-05-02.
- Frontend: `npm run lint` OK em 2026-05-01.
- Frontend: `npm run build` OK em 2026-05-01.
- Frontend: `npm audit --audit-level=high` OK em 2026-05-01.
- Backend: `python -m compileall app scripts tests` OK em 2026-05-01.
- Backend: `python -m unittest discover -s tests -v` OK em 2026-05-01.
- Backend: `python -m pip_audit -r requirements.txt` OK em 2026-05-01.
- Local: frontend HTTP 200 e backend `/health/db` OK em 2026-05-01.

## Observacao importante

O projeto agora possui modulo administrativo de usuarios, ACL por papel no backend e no frontend, trilha de auditoria com exportacao CSV, cookie `HttpOnly` para sessao do frontend, limite de login persistido no banco, scripts operacionais de backup, testes automatizados de backend para fluxos centrais, smoke/e2e de frontend com Playwright, filtros/paginacao server-side nas listas principais e historicos operacionais, CI inicial, edicao completa do cadastro de familia, identidade visual premium inicial, QA visual/responsivo manual, checklist de LGPD e checklist de homologacao por perfil. Os proximos passos ficam concentrados em deploy gerenciado, observabilidade externa e validacao real em staging.

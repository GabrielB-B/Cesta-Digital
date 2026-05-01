# Docs Cesta Digital

Documentacao operacional e tecnica do projeto.

## Arquivos

- [SETUP_E_USO.md](./SETUP_E_USO.md): como ativar, configurar e usar o sistema.
- [STACK_E_VERSOES.md](./STACK_E_VERSOES.md): tecnologias, arquitetura e versoes.
- [ANALISE_CRITICA_E_ROADMAP_MVP.md](./ANALISE_CRITICA_E_ROADMAP_MVP.md): leitura senior do estado atual e plano para MVP profissional.
- [OPERACAO_STAGING_E_BACKUP.md](./OPERACAO_STAGING_E_BACKUP.md): procedimento de staging, backup, restore e checklist de release.
- [CHECKPOINT_2026-04-28.md](./CHECKPOINT_2026-04-28.md): checkpoint detalhado do que foi feito ate o momento.
- [MANUAL_PROGRAMADOR.md](./MANUAL_PROGRAMADOR.md): guia simples para programadores rodarem, testarem e evoluirem o sistema.
- [PLANO_PENDENCIAS_MVP_PROFISSIONAL.md](./PLANO_PENDENCIAS_MVP_PROFISSIONAL.md): plano estruturado das pendencias restantes por fase e prioridade.

## Validacao feita nesta analise

- Frontend: `npm run lint` OK em 2026-04-29.
- Frontend: `npm run build` OK em 2026-04-29.
- Frontend: `npm audit` OK em 2026-04-29.
- Backend: `python -m compileall app scripts tests` OK em 2026-04-29.
- Backend: `python -m unittest discover -s tests -v` OK em 2026-04-29, com 18 testes.
- Backend: `python -m pip_audit -r requirements.txt` OK em 2026-04-29.
- Backend: `python -m pip_audit` OK em 2026-04-29.

## Observacao importante

O projeto agora possui modulo administrativo de usuarios, ACL por papel no backend e no frontend, trilha de auditoria com exportacao CSV, limite de login, scripts operacionais de backup, testes automatizados de backend para fluxos centrais, filtros/paginacao server-side nas listas principais e CI inicial. Os proximos passos ficam concentrados em deploy gerenciado, observabilidade externa, edicao completa do cadastro de familia e ampliacao de cobertura frontend/e2e.

# Docs Cesta Digital

Documentacao operacional e tecnica do projeto.

## Arquivos

- [SETUP_E_USO.md](./SETUP_E_USO.md): como ativar, configurar e usar o sistema.
- [STACK_E_VERSOES.md](./STACK_E_VERSOES.md): tecnologias, arquitetura e versoes.
- [ANALISE_CRITICA_E_ROADMAP_MVP.md](./ANALISE_CRITICA_E_ROADMAP_MVP.md): leitura senior do estado atual e plano para MVP profissional.
- [OPERACAO_STAGING_E_BACKUP.md](./OPERACAO_STAGING_E_BACKUP.md): procedimento de staging, backup, restore e checklist de release.
- [CHECKPOINT_2026-04-28.md](./CHECKPOINT_2026-04-28.md): checkpoint detalhado do que foi feito ate o momento.
- [MANUAL_PROGRAMADOR.md](./MANUAL_PROGRAMADOR.md): guia simples para programadores rodarem, testarem e evoluirem o sistema.

## Validacao feita nesta analise

- Frontend: `npm run lint` OK em 2026-04-28.
- Frontend: `npm run build` OK em 2026-04-28.
- Backend: `python -m compileall app scripts tests` OK em 2026-04-28.
- Backend: `python -m unittest discover -s tests -v` OK em 2026-04-28.

## Observacao importante

O projeto agora possui modulo administrativo de usuarios, ACL por papel no backend e no frontend, trilha de auditoria, limite de login, scripts operacionais de backup, testes automatizados de backend para fluxos centrais e CI inicial. Os proximos passos ficam concentrados em deploy gerenciado, observabilidade externa e ampliacao de cobertura.

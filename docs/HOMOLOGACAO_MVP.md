# Homologacao do MVP

Este checklist deve ser executado antes de declarar o MVP entregue para uso real.

## Pre-condicoes

- Ambiente de staging acessivel por URL real.
- HTTPS ativo para frontend e backend.
- Variaveis de ambiente revisadas, sem secrets padrao.
- Banco migrado com `alembic upgrade head`.
- Seed inicial executado com senha forte e exclusiva.
- Backup realizado antes da rodada de homologacao.
- Restore testado em ambiente limpo.
- Smoke local ou de staging executado com `scripts/smoke_local.ps1`.

## Perfil Admin

- Login com admin ativo usando nome de login.
- Criar usuario operador.
- Criar usuario lider social.
- Alterar perfil de usuario.
- Redefinir senha de usuario.
- Validar que o ultimo admin ativo nao pode ser removido ou desativado.
- Consultar auditoria.
- Exportar auditoria em CSV.

## Perfil Lider Social

- Login com lider social usando nome de login.
- Criar familia.
- Editar cadastro completo da familia.
- Adicionar, editar e excluir membro familiar.
- Adicionar, editar e excluir beneficio.
- Gerar preview de elegibilidade.
- Registrar avaliacao social.
- Validar bloqueio de acesso a usuarios, estoque e entregas.

## Perfil Operador

- Login com operador usando nome de login.
- Criar categoria e item de estoque.
- Registrar lote de entrada.
- Registrar movimentacao manual.
- Criar tipo de cesta.
- Adicionar e alterar receita da cesta.
- Criar agendamento para familia apta ou em analise.
- Confirmar entrega e validar baixa automatica de estoque.
- Cancelar ou marcar falta em agendamento.
- Validar bloqueio de acesso ao modulo social e usuarios.

## Fluxos Negativos

- Login com senha errada ate acionar rate limit.
- Criar familia sem informar codigo e validar codigo automatico.
- Tentar registrar saida maior que saldo de lote.
- Tentar confirmar entrega sem estoque suficiente.
- Tentar agendar familia inativa ou inapta.
- Tentar agendar tipo de cesta inativo.
- Tentar acessar rota sem permissao.

## Evidencias

Registrar para cada rodada:

- data e responsavel pela homologacao;
- versao/tag ou commit testado;
- ambiente usado;
- resultado por perfil;
- falhas encontradas;
- decisao final: aprovado, aprovado com ressalvas ou reprovado.

# LGPD e Privacidade - Cesta Digital

Este documento define o minimo operacional de privacidade para o MVP do Cesta Digital.

## Dados Tratados

O sistema pode armazenar dados pessoais e dados sensiveis vinculados a familias atendidas:

- identificacao operacional: codigo interno da familia, nomes de membros e parentesco;
- contato: telefone, WhatsApp, endereco e ponto de referencia;
- dados sociais: renda, beneficios, composicao familiar, escolaridade, trabalho e observacoes sociais;
- dados sensiveis: deficiencia, doenca cronica, gestacao, lactacao e vulnerabilidades sociais;
- dados de usuarios internos: nome, nome de login, email de recuperacao, perfil, status, ultimo login e hash de senha;
- auditoria: email do ator, IP, request id, tipo de evento, entidade afetada e detalhes operacionais.

## Finalidade

Os dados devem ser usados somente para:

- avaliar elegibilidade social;
- organizar acompanhamento de familias;
- controlar estoque e entrega de cestas;
- prestar contas da operacao;
- auditar acoes administrativas e operacionais;
- garantir seguranca e rastreabilidade do sistema.

## Perfis de Acesso

- `admin`: administracao de usuarios, auditoria e acesso amplo aos modulos.
- `lider_social`: familias, pessoas, beneficios, avaliacoes e resumo financeiro.
- `operador`: estoque, tipos de cesta, agendamentos e entregas.

Qualquer novo perfil deve ser documentado antes de entrar em uso.

## Regras de Minimização

- Nao registrar documentos pessoais se nao houver necessidade real aprovada.
- Evitar detalhes excessivos em observacoes livres.
- Nao colocar senhas, documentos, dados bancarios ou historicos medicos completos em campos de texto.
- Usar apenas dados suficientes para tomada de decisao social e execucao da entrega.

## Auditoria e Retencao

- Eventos criticos devem gerar registro em `audit_logs`.
- Logs de auditoria podem conter email, IP, entidade e detalhes resumidos da acao.
- A retencao minima recomendada para auditoria operacional e de 12 meses.
- Backups devem seguir a mesma politica de protecao dos dados de producao.
- Qualquer exclusao definitiva ou anonimizacao deve preservar, quando necessario, a rastreabilidade minima exigida pela operacao.

## Direitos dos Titulares

Quando uma familia solicitar acesso, correcao ou exclusao de dados, a equipe deve:

1. registrar a solicitacao internamente;
2. validar identidade ou vinculo com a familia;
3. revisar impactos operacionais e legais;
4. corrigir dados incorretos quando aplicavel;
5. anonimizar ou excluir dados apenas quando nao houver necessidade operacional, legal ou de auditoria.

## Backups

- Backups devem ser armazenados fora do repositorio Git.
- Arquivos `.sql`, `.sha256` e copias restauradas devem ser protegidos por acesso restrito.
- Antes de migracao em staging/producao, executar backup e validar checksum.
- O restore deve ser testado em ambiente limpo antes de uma entrega publica.

## Incidentes

Em caso de suspeita de vazamento, acesso indevido ou exposicao de backup:

1. bloquear credenciais afetadas;
2. preservar logs e evidencias;
3. identificar familias, usuarios e dados impactados;
4. corrigir a falha;
5. documentar causa, impacto e medidas adotadas;
6. avaliar necessidade de comunicacao aos titulares e autoridades competentes.

## Pendencias Para Producao

- Definir encarregado/responsavel formal pelo tratamento dos dados.
- Criar aviso de privacidade em linguagem simples para a operacao social.
- Definir rotina de revisao de acessos por perfil.
- Validar politica final de dominio, HTTPS e cookies em staging real.
- Ligar observabilidade externa com cuidado para nao registrar dados pessoais excessivos.

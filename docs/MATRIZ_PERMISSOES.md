# Matriz de permissões

Versão aprovada em 18/10/2026. Esta matriz substitui as definições anteriores
do perfil `colaborador`.

## Princípios

- Cada usuário recebe um único perfil principal.
- A API é a autoridade de autorização; ocultar um menu não concede segurança.
- O colaborador recebe somente os dados mínimos necessários para a logística.
- Dados financeiros, de saúde, benefícios, contatos, avaliações e observações
  sociais não são retornados nas consultas operacionais.

## Perfis

| Capacidade | Admin | Liderança social | Operador | Colaborador |
|---|:---:|:---:|:---:|:---:|
| Consultar diretório operacional de famílias | Sim | Sim | Sim | Sim |
| Criar/editar família, pessoas e benefícios | Sim | Sim | Não | Não |
| Registrar avaliações e decisões sociais | Sim | Sim | Não | Não |
| Consultar catálogo e saldo de alimentos | Sim | Não | Sim | Sim |
| Criar/editar produtos e imagens | Sim | Não | Sim | Não |
| Configurar categorias e tipos de cesta | Sim | Não | Sim | Não |
| Registrar entrada de alimentos | Sim | Não | Sim | Sim |
| Registrar saída manual | Sim | Não | Sim | Sim |
| Registrar perda, ajuste positivo/negativo e editar lote | Sim | Não | Sim | Não |
| Agendar e confirmar entregas | Sim | Não | Sim | Sim |
| Consultar relatórios | Sim | Sim | Sim | Não |
| Gerenciar usuários e auditoria | Sim | Não | Não | Não |

## Consultas mínimas do colaborador

- `GET /operational/families`: identificador, nome familiar, situação, quantidade
  de moradores e localidade resumida.
- `GET /operational/basket-types`: identificador e nome das cestas ativas.

As rotas completas `/families`, `/item-categories` e `/basket-types` não são
liberadas ao colaborador. Tentativas diretas recebem `403`.

## Validação

O contrato é coberto por testes de API e E2E. Os testes verificam permissões
positivas, negações por acesso direto e ausência de campos pessoais sensíveis na
projeção operacional.

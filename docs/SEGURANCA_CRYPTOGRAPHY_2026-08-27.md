# Atualização de segurança — cryptography 50.0.1

**Data:** 27/08/2026

**Branch:** `fix/homologacao-cryptography`

**Escopo:** dependência Python do backend; sem mudança de API, banco ou frontend

## Decisão

O pin `cryptography==48.0.1` foi atualizado para `cryptography==50.0.1`, versão
estável mais recente confirmada no PyPI em 27/08/2026.

A série 50 corrige o CVE-2026-69247, no qual erros ou diferenças de tempo na
descriptografia PKCS#7 poderiam funcionar como um oráculo de Bleichenbacher para
chamadores que processassem mensagens não confiáveis. A versão 50.0.1 também
atualiza os wheels oficiais para OpenSSL 4.0.2.

## Gates executados

- instalação no ambiente virtual local: aprovada;
- versão importada em runtime: `50.0.1`;
- `pip check`: nenhuma dependência quebrada;
- `python -m compileall -q app`: aprovado;
- backend: 74 testes e 7 subtestes aprovados;
- `pip-audit` sobre os pins de produção: nenhuma vulnerabilidade conhecida;
- migration e schema: nenhuma alteração;
- publicação externa: não realizada.

## Observação operacional

O aviso de depreciação entre o `TestClient` legado e Starlette permanece como
dívida não bloqueante e não foi causado pela atualização de `cryptography`.
Atualizá-lo exige uma tarefa própria porque envolve a infraestrutura de testes.

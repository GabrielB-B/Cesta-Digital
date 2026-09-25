# Registro do marco V2-04 — Login

**Branch:** `feat/frontend-v2-login`
**Base:** `5d6d2d8` (`V2-03` + direção funcional de Avaliações)
**Status:** aprovado por Gabriel em 19/08/2026 e sucedido pelo V2-05
**Referência principal:** `referencias_por_tela/10-login-desktop.png`

## 1. Resultado implementado

- Split desktop de 43,5% para marca e 56,5% para acesso, acompanhando a
  proporção da referência.
- Símbolo oficial e wordmark em escala ampla, com ambiente rosa muito sutil e
  ondas institucionais somente no painel permitido do Login.
- Cartão branco centralizado, título “Bem-vindo de volta!”, labels persistentes,
  ícones lineares e CTA único rosa → roxo.
- Mobile e tablet em uma coluna própria; a marca continua grande e o formulário
  permanece utilizável sem overflow em 360/390/768 px.
- Mostrar/ocultar senha com estado e nome acessíveis.
- Recuperação existente preservada, com `aria-expanded`, foco automático no
  e-mail, feedback seguro e submissão real para `/auth/password-recovery`.
- Aviso de ambiente preservado fora de produção e adaptado ao tema claro.

## 2. Fidelidade e diferenças deliberadas

| Elemento | Implementação | Diferença deliberada |
|---|---|---|
| Composição | split, escala de marca, cartão, campos, espaçamento e CTA seguem a referência | cromado de janela não faz parte do aplicativo |
| Identificação | rótulo “Nome de login” e `autocomplete=username` | backend não autentica por e-mail |
| Persistência | cookie HttpOnly e política atual preservados | “Lembrar-me” não foi simulado porque não existe contrato |
| Recuperação | fluxo real expansível dentro do cartão | substitui o link meramente ilustrativo da referência |
| Rodapé | mensagem institucional não interativa | “Fale com nosso time” não aparece sem canal real configurado |
| Mobile | lockup de 72–80 px no cabeçalho, cartão vertical e safe areas | derivação mobile-first; não existe referência mobile específica |

## 3. Contratos preservados

- Rota pública `/login` e redirects permanecem inalterados.
- `POST /auth/login` continua recebendo `username`, `password` e
  `grant_type=password` como formulário URL encoded.
- `GET /auth/me`, cookie HttpOnly, logout e proteção contra resposta obsoleta
  permanecem no `AuthContext` sem mudança.
- Recuperação continua usando `POST /auth/password-recovery` e mensagem segura.
- Nenhum backend, endpoint, RBAC, payload ou regra de domínio foi alterado.

## 4. Acessibilidade e responsividade

- Um único `h1`, labels reais, `autocomplete`, `aria-invalid` e mensagens
  anunciadas com `aria-live`.
- Mostrar senha possui `aria-label` e `aria-pressed` coerentes.
- Abertura da recuperação move o foco para o campo correto.
- Foco visível, targets mínimos de 44 px e `prefers-reduced-motion` respeitado.
- Testes em 360×800, 390×844, 768×1024 e 1440×900 comprovam ausência de
  overflow horizontal.

## 5. Limpeza e performance

- `LoginSuccessOverlay.tsx` removido por estar sem uso e contrariar o acesso
  imediato aprovado.
- `public/animations/login-splash.mp4` removido: 2.500.401 bytes.
- `src/assets/logoupg.png` removido: 1.378.797 bytes.
- `BrandLockup` passou a reutilizar `/logo-symbol.png`, com 31.893 bytes.
- O warning global de chunk JavaScript acima de 500 kB permanece e será tratado
  no marco de lazy routes/performance; não existe mais vídeo ou logo de 1,38 MB
  no caminho de build.

## 6. Evidências para aprovação

Com o showcase em execução:

```powershell
cd frontend
npm run showcase
```

Abrir:

`http://127.0.0.1:4174/showcase/evidence/v2-04/`

A galeria contém a referência original, desktop 1440, mobile 360/390, tablet
768 e a recuperação aberta em desktop/mobile. Todas as capturas são clicáveis.

Para regenerar:

```powershell
cd frontend
npm run test:visual:login
```

## 7. Gates locais

- `npm run lint`: aprovado;
- `npm run build`: aprovado;
- `npm run test:e2e`: 35/35 aprovados, sem retry;
- `npm run test:visual:login`: 12/12 aprovados;
- `git diff --check`: aprovado;
- backend não alterado.

## 8. Aprovação e continuidade

Gabriel aprovou as telas apresentadas em 19/08/2026. O branch
`feat/frontend-v2-inicio` foi aberto a partir do commit `12d3d73`; nenhum
conteúdo de outra aba foi incluído no marco do Login.

# Manifesto das referências visuais por tela — Frontend V2

**Data da decisão:** 18/08/2026  
**Status:** referências aprovadas por Gabriel para implementação incremental  
**Dimensão das imagens:** 1586 × 992 px  
**Local versionado:** `docs/direção_visual/referencias_por_tela/`

## 1. Autoridade das referências

As dez imagens deste manifesto são a referência visual específica de cada tela.
Para a tela correspondente, elas têm precedência sobre a imagem ampla
`Cesta_Digital_Frontend_V2_Baseline_Desktop.png`. A baseline anterior permanece
válida para princípios gerais e para lacunas não definidas pelas novas imagens.

Essa precedência é visual, não funcional. Textos, pessoas, números, datas,
notificações, mapas, relatórios, configurações e itens de menu mostrados nas
imagens são conteúdo ilustrativo. Eles não autorizam criar dados, rotas,
permissões, endpoints ou regras de negócio inexistentes.

Em caso de conflito, a ordem é:

1. segurança, LGPD, regras de domínio, backend e RBAC existentes;
2. referência específica da tela;
3. baseline geral do Frontend V2;
4. decisões responsivas e acessíveis necessárias para produção.

## 2. Integridade e rastreabilidade

| Ordem | Tela | Arquivo versionado | SHA-256 |
|---|---|---|---|
| 01 | Início | `01-inicio-desktop.png` | `65BD08E9CB95566C6D0B523E5FCC448EA4148D87D0993C9E9AA57E2C154BA7F1` |
| 02 | Famílias | `02-familias-desktop.png` | `F2151B46195D3FE85E5DDA3430DC0CCAE95E0F39CAF3B7DD55C951786F88B0CD` |
| 03 | Avaliações | `03-avaliacoes-desktop.png` | `3590B787546C66494C128050623BCB10895A1A0B426EEACBB6982C30DA65C175` |
| 04 | Estoque | `04-estoque-desktop.png` | `C16C7E7D50B6489B68475EE1AAD15D7891AFF6F57D5F9153A36037D089A87C43` |
| 05 | Entradas | `05-entradas-desktop.png` | `49045568B95F986EC411311ECC87953527A516B7A07BDC6F9FB9B257E3132CD8` |
| 06 | Entregas | `06-entregas-desktop.png` | `AB455E504FED54FF5AB9BBEEC1A339904473DFA2FB220313DA1A6778759DCEC5` |
| 07 | Tipos de Cesta | `07-tipos-de-cesta-desktop.png` | `3D2BDD24DDDB7D6FD0E6484D5DCF045A02C1A226B7A5E5891BEA17BB80A9A0F7` |
| 08 | Relatórios | `08-relatorios-desktop.png` | `38902FEFB0BE578DD5515CE9B3B74085E4325CBF0165A8F86FE9635B271011A3` |
| 09 | Administração | `09-administracao-desktop.png` | `A1B10A70FFEE44D246E17EB6AD9AC93FC87541B2295C123E40405471C5EEACDD` |
| 10 | Login | `10-login-desktop.png` | `D5F1DFD7D235D0607D3CC80826DADA2B220147413CA38E3F6748CC50842B3D99` |

O arquivo `index.html` na mesma pasta forma uma galeria clicável. Cada imagem
abre em resolução integral, permitindo inspeção lado a lado durante a aprovação.

## 3. Sistema visual confirmado

- Desktop com sidebar fixa larga, topbar horizontal e área de trabalho clara.
- Marca em escala suficiente na sidebar; não reduzir o símbolo a um detalhe.
- Navegação ativa com fundo rosa muito claro, ícone e texto em rosa.
- Conta no canto superior direito; dados reais da sessão, sem avatar ou
  notificação inventados.
- Conteúdo operacional em superfícies brancas, bordas neutras, raio moderado e
  sombra sutil.
- Título, descrição curta, busca/filtros e uma ação principal dominante.
- Tabela no desktop; lista operacional, drawer ou fluxo vertical no mobile.
- Coluna contextual à direita quando a tela possuir detalhe real. No mobile,
  essa coluna vira drawer/rota/detalhe em bloco e preserva deep link.
- Rosa para ação/seleção; verde, amarelo, vermelho e azul para estados.
- Inter como tipografia, hierarquia compacta e alta densidade legível.

### Exceção controlada para gradientes

As novas referências refinam a regra anterior. Gradientes continuam proibidos
como decoração genérica em cards, tabelas, fundos operacionais, bordas, sombras
e navegação. São permitidos somente quando a própria referência os usa como
assinatura de marca:

1. dentro do asset oficial;
2. no CTA primário rosa → roxo, com contraste validado e sem glow;
3. no ambiente institucional do login e em suas ondas muito sutis.

Essa exceção não autoriza gradientes em badges, ícones de estado, painéis ou
elementos não interativos das telas autenticadas.

## 4. Correções deliberadas da referência

- O texto duplicado/incorreto “Entoque” não será reproduzido; o módulo real é
  “Estoque”.
- O cromado de janela desenhado no login não faz parte do aplicativo web.
- CPF não será exibido ou criado apenas porque aparece no mockup de Famílias; a
  política canônica orienta não coletá-lo sem finalidade aprovada.
- Sinos, avatares fotográficos, mapas, rotas otimizadas, downloads e toggles só
  aparecem quando existir contrato real e testável.
- Todos os itens do menu continuam filtrados por papel. Fidelidade não pode
  expor uma área proibida a `lider_social` ou `operador`.

## 5. Sequência de implementação e aprovação

Cada linha é um branch independente. Um branch visual só começa após aprovação
das evidências 390 × 844 e 1440 × 900 do branch anterior.

| Ordem | Branch planejado | Entrega | Referência principal |
|---|---|---|---|
| 1 | `feat/frontend-v2-shell` | AppShell desktop/mobile comum | telas 01–09 |
| 2 | `feat/frontend-v2-login` | Login | tela 10 |
| 3 | `feat/frontend-v2-inicio` | aba Início | tela 01 |
| 4 | `feat/frontend-v2-familias` | aba Famílias | tela 02 |
| 5 | `feat/frontend-v2-avaliacoes` | avaliações dentro do escopo funcional real | tela 03 |
| 6 | `feat/frontend-v2-estoque` | aba Estoque | tela 04 |
| 7 | `feat/frontend-v2-entradas` | histórico/registro de entradas, condicionado à rota | tela 05 |
| 8 | `feat/frontend-v2-entregas` | aba Entregas sem mapa fictício | tela 06 |
| 9 | `feat/frontend-v2-tipos-cesta` | aba Tipos de Cesta | tela 07 |
| 10 | `feat/frontend-v2-relatorios` | relatórios suportados por contratos reais | tela 08 |
| 11 | `feat/frontend-v2-administracao` | usuários e auditoria reais | tela 09 |

O AppShell é tratado primeiro porque sidebar, topbar, localização ativa e
responsividade são compartilhados por todas as abas. As telas seguintes não
serão implementadas em lote.

# Hopi Hari · Guia de marca para implementação

Identidade extraída do site hopihari.com.br e da demo de gamificação deste
repositório. Três arquivos implementam tudo:

| Arquivo | O que é |
|---|---|
| `src/styles/hopi-brand.css` | Tokens CSS + classes de componente prontas (`.hh-btn-primary`, `.hh-card`, `.hh-chip`, `.hh-progress`, `.hh-hero`…) |
| `src/lib/hopiBrand.ts` | Os mesmos tokens em TypeScript + extensão de cores para o Tailwind + paleta de gráficos |
| `src/pages/BrandShowcase.tsx` | Página de referência com tudo aplicado (cole no Lovable e confira no olho) |

## A essência da marca

- **Azul royal `#1c3eb8`** é a cor da marca — títulos, faixas hero, navegação.
- **Amarelo Hopi `#ffc72c`** é ação — todo CTA principal é uma pílula amarela
  com gradiente para `#f0a800`, texto azul-profundo `#122a80` e brilho quente.
- **Verde Hopi `#62bb46`** é sucesso e progresso — barras, checks, missões.
- **Texto nunca é preto**: a tinta é azul-marinho `#122456` (secundário a 66%,
  terciário a 42% de opacidade).
- **Fundo claro e otimista**: azul gelo `#f2f6ff`, com o gradiente de página
  assinatura descendo para um toque de verde (`#e8efff → #f6f9ff → #eaf6e4`).
- **Forma**: cantos generosos (cartões 18px, botões e chips sempre 999px/pílula),
  sombras azuladas suaves em vez de bordas duras.
- **Tipografia**: bold arredondada — Nunito (pesos 600–900). Títulos em peso
  900 com tracking -0.015em. Kickers em caps, peso 800, tracking 0.26em, verde.
- **Vermelho `#e84b3c`** só para alerta/urgência — nunca decorativo.
- **Hora do Horror** (sazonal): roxo profundo `#140c24`/`#241634` + dourado
  `#ffd86b` + roxo néon `#c77dff` + laranja `#ff8a1e`. É uma pele de campanha,
  não substitui a marca.

## Como aplicar no Lovable

1. Cole `hopi-brand.css`, `hopiBrand.ts` e `BrandShowcase.tsx` nos caminhos
   indicados, com um pedido assim:

   > Adicione estes arquivos de identidade visual do Hopi Hari exatamente como
   > estão. Ao criar qualquer tela nova, use os tokens e classes de
   > `src/styles/hopi-brand.css` (container com classe `hh-brand`) e as cores
   > de `src/lib/hopiBrand.ts` — não invente outra paleta nem troque as fontes.

2. Para usar via Tailwind, peça também:

   > Estenda o `tailwind.config` com `hopiTailwindColors` de
   > `src/lib/hopiBrand.ts` (`theme.extend.colors`) e adicione
   > `borderRadius: { hopi: '18px' }`.

   Aí valem classes como `bg-hopi-blue`, `text-hopi-ink`, `bg-hopi-yellow`,
   `rounded-hopi`, `rounded-full` para pílulas.

3. Regras rápidas para manter a marca consistente:
   - Um CTA amarelo por tela; ações secundárias em azul sólido ou ghost.
   - Texto sobre amarelo é sempre `#122a80`; sobre azul, branco.
   - Progresso/sucesso em verde; nunca usar o verde como CTA.
   - Cartões brancos sobre o fundo azul-gelo; sombra `--hh-shadow-card`.

## E o dashboard de vendas?

O painel de Gestão à Vista usa deliberadamente um tema próprio "broadcast"
escuro (feito para TV, alto contraste, fontes condensadas) — ele NÃO segue a
pele clara da marca, e sim o papel de "telão financeiro". Se quiser uma versão
do dashboard na pele da marca, os tokens de `hopiBrand.ts` cobrem isso:
fundo `#f2f6ff`, cartões brancos, realizado em azul royal, Meta Site em
amarelo Hopi, metas atingidas em verde. Para gráficos, use `hopiChartPalette`
(ordem fixa das séries: azul → amarelo-profundo → verde → vermelho → roxo).

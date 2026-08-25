# Gestão à Vista · Vendas — pacote para o Lovable

> Também incluso: **kit de identidade visual do Hopi Hari** — veja
> [`BRAND.md`](./BRAND.md) (`src/styles/hopi-brand.css`,
> `src/lib/hopiBrand.ts` e a página de referência
> `src/pages/BrandShowcase.tsx`).

Dashboard broadcast (estilo financial TV) de acompanhamento de vendas do
Hopi Hari, com destaque para a entrega do Marketing no canal site.
Convertido para React + TypeScript no formato padrão dos projetos Lovable
(Vite, alias `@/` para `src/`).

## Estrutura

```
src/
  lib/dashboardData.ts               ← dados (Carla edita aqui), formatadores e cálculos
  styles/dashboard.css               ← tema broadcast escuro (escopado em .hh-dash)
  pages/GestaoAVista.tsx             ← página que monta o painel
  components/dashboard/
    Gauge.tsx                        ← velocímetro SVG com ponteiro e zonas
    Ticker.tsx                       ← fita de cotações (YoY por canal)
    RaceTrack.tsx                    ← corrida da meta (Realizado → Meta Site → Meta Geral)
    MarketingSpotlight.tsx           ← destaque do canal site
    MoversBoard.tsx                  ← maiores altas / pontos de atenção
    InsightsBI.tsx                   ← leituras de BI do consumidor
    UpdateDrawer.tsx                 ← gaveta "⚙ Atualizar números"
```

## Como colar no Lovable

1. Crie (ou abra) um projeto no Lovable.
2. No chat do Lovable, cole o conteúdo dos arquivos desta pasta pedindo algo como:

   > Adicione esta página de dashboard ao projeto exatamente como está, sem
   > reescrever o CSS nem trocar as fontes. Crie os arquivos nos mesmos
   > caminhos (`src/lib/dashboardData.ts`, `src/styles/dashboard.css`,
   > `src/pages/GestaoAVista.tsx` e `src/components/dashboard/*`) e registre
   > a rota `/` (ou `/gestao-a-vista`) apontando para `GestaoAVista`.

   Se preferir, cole um arquivo por mensagem, sempre indicando o caminho.
3. Peça ao Lovable para tornar `GestaoAVista` a página inicial (substituindo
   o `Index.tsx` padrão ou adicionando a rota no `App.tsx`).

Nenhuma dependência extra é necessária: só React. As fontes (Barlow
Condensed, Archivo, IBM Plex Mono) são carregadas por `@import` do Google
Fonts dentro de `dashboard.css`.

## Atualização diária (Carla)

- Pelo próprio painel: botão **⚙ Atualizar números** (canto inferior
  direito) → preencher → **Salvar**. Os valores ficam no `localStorage` do
  navegador e todo o painel recalcula sozinho.
- Ou editando os `DEFAULTS` em `src/lib/dashboardData.ts` (vale para todos
  que abrirem o app).

## Leituras usadas

- **Meta Site (gauge e corrida)** segue o briefing: realizado **total** vs
  Meta Site (ex.: R$ 19,7 mi ÷ R$ 7,31 mi = 270% ✓).
- O painel "Entrega do Marketing" mostra também a visão do canal: site
  R$ 5,28 mi = 72% da meta própria do canal, +53% YoY.
- **Ritmo** = realizado ÷ parcial esperada até a data (80% da meta do mês).

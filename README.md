# Hopi Hari · O Parque como Videojogo — Protótipo de Demonstração

Protótipo **demo** da proposta de gamificação do Hopi Hari (Fase 1 · Quick wins),
para apresentação à direção. Não é um produto de produção: todos os dados são
fictícios/semeados, não há backend, base de dados, autenticação nem leitura real
de QR codes. Tudo funciona offline e instantaneamente.

## O que a demo mostra

1. **Entrada** — opt-in do visitante e escolha de perfil (Conquistador Radical,
   Explorador de Mistério, Família Aventureira).
2. **Missão do Dia** — barra de progresso, checklist das atrações, saldo de Hari
   Coins e resgate de recompensa.
3. **Caça ao Tesouro** — 6 totens pelas 5 zonas; tocar num totem simula o scan
   do QR e revela a lenda Hari.
4. **Cartas Colecionáveis** — álbum com cartas bloqueadas/desbloqueadas, animação
   de flip na revelação (banner de raridade, arte, intensidade / pontos /
   raridade, desafio). Álbum a 100% = recompensa real (Fast Pass + desconto).
5. **Desafio Fotográfico** — "tirar foto" usa uma ilustração placeholder e mostra
   o estado "em destaque nos ecrãs do parque".
6. **Hora do Horror** (edição especial sazonal) — separador com dois jogos novos:
   - **Caça aos Monstros** (estilo Pokémon Go): mapa GPS real do parque com a
     localização do visitante, pinos dos monstros da Hora do Horror, direções
     (distância + minutos a pé + rota traçada) e captura com a "Hari Orb".
   - **As 25 Moedas**: uma moeda por cada ano de Hora do Horror. Escaneia a
     moeda, joga o mini-jogo "Quebra a Maldição" e desbloqueia a história do
     tema dessa edição. Completar as 25 dá recompensas VIP.

O separador **Mapa** (antiga Caça ao Tesouro) também passou a ser um mapa GPS
do parque com direções até cada brinquedo e scan do totem no local.

## Controlos de apresentação

Por baixo do telemóvel há uma barra discreta para o apresentador:

- **▶ Tour guiado** — percorre toda a história em 8 toques no botão "Próximo";
  cada passo mostra uma legenda do que está a acontecer.
- **⚙ Demo** — abre atalhos de estado: `Início`, `Meio (2/4)` (o ecrã da Missão
  do Dia igual ao do deck), `Quase (5/6)`, `Completo`, e **↺ Reset** para
  recomeçar sem dar refresh.

Todo o estado vive em memória React — um refresh também repõe tudo.

## Como correr

Requisitos: Node 18+.

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

## Build / deploy

```bash
npm run build      # gera ./dist (estático, base relativa)
npm run preview    # serve o build localmente
```

A pasta `dist/` é 100% estática e self-contained (sem fontes ou serviços
externos): pode ser arrastada para Netlify/Vercel, servida do GitHub Pages, ou
aberta a partir de qualquer servidor de ficheiros. Para a reunião, basta
`npm run dev` num portátil — funciona sem internet.

## Stack

React 18 + TypeScript + Vite. Sem mais dependências: animações em CSS,
ilustrações em SVG inline, estado em React.

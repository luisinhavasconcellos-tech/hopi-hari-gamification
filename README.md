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

7. **Giralata — Tampinhas em Órbita** (novo, rota isolada `/giralata` ou
   `?game=giralata`) — minijogo 3D de mira e física com câmara isométrica fixa:
   três anéis contrarrotativos, latas-bumper, seis portos coloridos e uma
   tampinha lançada com um dedo (puxe · mire · solte). 60 segundos, seis entregas,
   Rodopio, HopiCoins e Istampi. Estados de demo: `?demo=giralata` e
   `?demo=giralata-complete`. Também empacotado como **APK Android**
   (`android/dist/giralata-debug.apk`, ver `ANDROID_HANDOFF.md`).

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
npm test           # testes unitários (vitest) — física e regras do Giralata
```

Giralata: `http://localhost:5173/giralata` (ou `?game=giralata`).

## Build / deploy

```bash
npm run build      # gera ./dist (estático, base relativa)
npm run preview    # serve o build localmente
```

A pasta `dist/` é 100% estática e self-contained (sem fontes ou serviços
externos): pode ser arrastada para Netlify/Vercel, servida do GitHub Pages, ou
aberta a partir de qualquer servidor de ficheiros. Para a reunião, basta
`npm run dev` num portátil — funciona sem internet.

## APK Android (Giralata)

```bash
npm run apk        # gera android/app/src/main/assets/www e android/dist/giralata-debug.apk
```

`android/build-apk.sh` compila sem Android SDK (aapt2, dx e apksig vêm do Maven
Central). A pasta `android/` é também um projeto Android Studio / Gradle normal.
Detalhes e validação em `ANDROID_HANDOFF.md`.

## Stack

React 18 + TypeScript + Vite. Babylon.js (`@babylonjs/core`) apenas na rota
Giralata, com física própria determinística (sem plugin). Restante da demo:
animações em CSS, ilustrações em SVG inline, estado em React.

## Estrutura do Giralata (`src/giralata/`)

| Ficheiro | Papel |
|---|---|
| `config.ts` | duração, raios, velocidades, força, amortecimento, recompensas |
| `math.ts` | vetores XZ, reflexão, cruzamento swept, arrasto → lançamento |
| `physics.ts` | passo fixo 1/120 s, anéis, latas, borda, moedas, portos |
| `world.ts` | `GiralataWorld`: fases, timer, Rodopio, pontos, HopiCoins, snapshot |
| `scene.ts` | engine Babylon, câmara fixa, luzes, malhas, sync por quadro |
| `input.ts` | mouse, toque e teclado → mesmo estado de mira |
| `Giralata.tsx` + `giralata.css` | HUD, intro, pausa, ajuda, resultado |
| `assets/*.svg` | emblema, tampinha, lata-bumper, porto, moeda, arena |
| `__tests__/giralata.test.ts` | testes vitest |

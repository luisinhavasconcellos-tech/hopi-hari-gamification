# Hopi Hari · Plataforma Digital

Monorepo com os dois produtos digitais do Hopi Hari, organizados em pastas
independentes (cada uma com seu próprio `package.json`, build e testes):

```
├── platform/   Plataforma de Inteligência (BI) — produto principal
└── demo/       Protótipo de gamificação "O Parque como Videojogo"
```

---

## `platform/` — Plataforma de Inteligência

Plataforma unificada de inteligência de audiência e crescimento social:
dashboards de redes sociais (Instagram, TikTok, LinkedIn, Facebook, YouTube, X),
inteligência de audiência e vendas (distribuidores, funil, visitantes, CRM,
mapas de leads no Brasil), benchmarks, reputação, influenciadores e mais.

**Stack:** React 18 + TypeScript + Vite · Tailwind + shadcn/ui · Supabase
(autenticação, banco e RPCs) · TanStack Query · Recharts.

### Acesso e login

A plataforma é protegida por login (portal em `/auth`):

- Qualquer rota acessada sem sessão redireciona para o portal, preservando o
  destino (`/auth?next=…`) — depois do login você cai exatamente onde queria ir.
- O portal tem **Entrar**, **Criar Conta**, **Esqueci minha senha** e reenvio de
  link de confirmação de e-mail.
- Contas novas nascem **pendentes**: um administrador aprova o acesso na página
  `/users` (a tela de "aguardando aprovação" orienta o usuário nesse meio-tempo).
- Papéis: `admin` (gerencia usuários) e `viewer`.

### Como rodar

```bash
cd platform
npm install
npm run dev        # http://localhost:8080 (porta do Vite)
npm test           # vitest — inclui o teste de que TODAS as rotas exigem login
npm run build      # build de produção em platform/dist
```

O `.env` versionado contém apenas a URL do projeto Supabase e a chave
**publishable** (anônima) — que é pública por design; os dados são protegidos
por RLS no Supabase. As migrações e functions estão em `platform/supabase/`.

### Identidade visual

Tema claro com a identidade 2025 do parque: verde Hopi `#006B59`, creme
`#F3EEE0`, dourado `#D9A02B` e terracota `#C0442C`, tipografia display
Fraunces e a bandeira/arabescos da marca. Os tokens vivem em
`platform/src/index.css` (CSS variables consumidas pelo Tailwind).

---

## `demo/` — Protótipo de gamificação

Demo offline da proposta "O Parque como Videojogo" (missões, caça ao tesouro,
cartas colecionáveis, Hora do Horror com caça aos monstros por GPS e as 25
moedas). Todos os dados são fictícios; não há backend.

```bash
cd demo
npm install
npm run dev        # http://localhost:5173
npm run build      # gera demo/dist (100% estático e self-contained)
```

O arquivo `demo/hopi-hari-demo.html` é o build single-file para compartilhar
(funciona aberto direto do disco, sem internet). Detalhes no `demo/README.md`
— controles de apresentação, tour guiado e atalhos de estado.

### Deploy da demo

O workflow `.github/workflows/deploy.yml` publica `demo/dist` no GitHub Pages
a cada push na `main` que toque em `demo/` (ou manualmente via *workflow
dispatch*).

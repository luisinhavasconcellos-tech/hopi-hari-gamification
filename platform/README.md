# Hopi Hari · Plataforma de Inteligência

Plataforma unificada de inteligência de audiência e crescimento social do
Hopi Hari: dashboards de redes sociais, inteligência de audiência e vendas,
benchmarks, reputação, influenciadores, CRM e mapas de leads no Brasil.

**Stack:** React 18 + TypeScript + Vite · Tailwind + shadcn/ui · Supabase ·
TanStack Query · Recharts.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # vitest
npm run build      # build de produção em ./dist
```

## Login e controle de acesso

Todas as rotas de conteúdo exigem sessão autenticada — o portal fica em
`/auth` e preserva o destino original em `?next=`. Contas novas nascem
pendentes e são aprovadas por um administrador em `/users`. O teste
`src/test/protectedRoutes.test.tsx` garante que nenhuma rota nova escape do
login: ao criar uma rota em `src/App.tsx`, adicione-a também ao manifesto
`src/test/protectedRoutes.ts`.

## Identidade visual

Tokens da marca (identidade 2025 — verde Hopi, creme, dourado, terracota,
tipografia Fraunces) em `src/index.css`, consumidos pelo Tailwind via
`tailwind.config.ts`. Componha telas com as classes semânticas
(`bg-background`, `text-muted-foreground`, `border-border`, `glass`,
`brand-rule`…) em vez de cores fixas.

## Supabase

`.env` traz a URL do projeto e a chave publishable (anônima e pública por
design; os dados são protegidos por RLS). Migrações e edge functions em
`./supabase`.

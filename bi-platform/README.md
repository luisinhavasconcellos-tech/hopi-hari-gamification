# Hopi Hari · Plataforma de Inteligência (BI)

Dashboard executivo do Hopi Hari: audiência social, vendas, operação do parque,
campanhas (Google Drive), Hora do Horror, briefing diário narrado e relatório
semanal 360.

- **Frontend**: React 18 + TypeScript + Vite + Tailwind/shadcn, `client/`
- **Backend**: Express + tRPC + Drizzle (MySQL/TiDB), `server/`
- **Dados**: MySQL (snapshots operacionais, importações) e Supabase (dados
  sociais/CRM). Autenticação via Supabase e-mail/senha com aprovação por admin.

## Como correr

Requisitos: Node 22+, pnpm 10.

```bash
cp .env.example .env      # preencher valores (ver SECURITY.md)
pnpm install --frozen-lockfile
pnpm dev                  # http://localhost:3000
```

Verificações:

```bash
pnpm check                # typecheck (client + server)
pnpm test                 # vitest (client + server)
pnpm build && pnpm start  # build de produção
node scripts/check-secrets.mjs   # varredura de segredos (também corre no CI)
```

Migrações: `pnpm db:generate` gera SQL em `drizzle/` a partir de
`drizzle/schema.ts`; aplique a migração `0012_*` (colunas JSON para
`MEDIUMTEXT`) antes de publicar esta versão.

## Segurança

Ver [SECURITY.md](./SECURITY.md) para a camada de segurança (headers, CSP,
rate limiting, guarda CSRF, proxy de storage autenticado, gestão de acessos) e
para as variáveis de ambiente que a configuram.

**Nunca** faça commit de `.env`, `.project-config.json` ou exports da
plataforma: contêm credenciais. Se algum desses ficheiros já circulou, rode as
credenciais (ver "Secrets handling" no SECURITY.md).

## Estrutura

```
client/src/pages        páginas (rotas em client/src/App.tsx)
client/src/components   painéis e UI
client/src/hooks        acesso a dados (Supabase / tRPC)
client/src/lib          utilitários, exportações PDF/CSV, estatística
server/_core            infra: auth, segurança, env, pool MySQL, Supabase
server/routes           rotas REST (briefings, campanhas, operacional, auth)
server/routers.ts       tRPC (acessos, redes sociais, correlações, relatórios)
server/lib              regras de negócio e importadores
drizzle                 schema + migrações
scripts                 utilitários de linha de comando
```

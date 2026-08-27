/**
 * Manifesto das rotas da plataforma. Todas as rotas de conteúdo são
 * PROTEGIDAS: uma sessão anônima deve ser redirecionada para /auth.
 *
 * Ao adicionar uma rota nova em src/App.tsx, adicione-a aqui também —
 * o teste `src/test/protectedRoutes.test.tsx` falha se alguma rota ficar de fora.
 */
export const PROTECTED_ROUTES = [
  "/",
  "/dashboard",
  "/posts",
  "/posts/:id",
  "/tiktok",
  "/linkedin",
  "/facebook",
  "/youtube",
  "/growth",
  "/benchmarks",
  "/followers",
  "/sources",
  "/dominio",
  "/users",
  "/admin/seguidores/importar",
  "/audience",
  "/audience/channels",
  "/audience/sales-channels",
  "/audience/funnel",
  "/audience/visitors",
  "/audience/attendance",
  "/audience/profile",
  "/audience/segments",
  "/audience/percapita",
  "/audience/products",
  "/audience/attractions",
  "/audience/heatmaps",
  "/audience/weekdays",
  "/audience/events",
  "/audience/campaigns",
  "/audience/influencers",
  "/audience/influencers/:platform",
  "/audience/influencers/:platform/:niche",
  "/audience/loyalty",
  "/audience/insights",
  "/audience/content-plan",
  "/audience/operations",
  "/audience/crm",
  "/audience/search-demand",
  "/audience/competitive",
  "/audience/reputation",
  "/audience/x-listening",
  "/audience/identity",
  "/audience/gender-audit",
  "/audience/transparency",
  "/audience/admin",
] as const;

/** Rotas acessíveis sem login (portal de acesso e afins). */
export const PUBLIC_ROUTES = [
  "/auth",
  "/reset-password",
  "/.lovable/oauth/consent",
  "*",
] as const;

/** Substitui params (`:id`) por um valor concreto navegável. */
export function toConcretePath(pattern: string): string {
  return pattern
    .replace(":platform", "instagram")
    .replace(":niche", "familia")
    .replace(":id", "1");
}

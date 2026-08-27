import { auth, defineMcp } from "@lovable.dev/mcp-js";
import socialKpisTool from "./tools/social-kpis";
import topPostsTool from "./tools/top-posts";
import followerGrowthTool from "./tools/follower-growth";
import reputationTool from "./tools/reputation";
import parkPerformanceTool from "./tools/park-performance";
import salesOverviewTool from "./tools/sales-overview";
import parkEventsTool from "./tools/park-events";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hopi-hari-insights",
  title: "Hopi Hari Insights",
  version: "0.1.0",
  instructions:
    "Ferramentas de leitura da plataforma Hopi Hari Insights: KPIs e melhores posts das redes sociais, crescimento de seguidores, reputação (ReclameAqui/TripAdvisor), público e per capita do parque, vendas por canal e eventos. Todos os dados são reais e ficam restritos ao usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    socialKpisTool,
    topPostsTool,
    followerGrowthTool,
    reputationTool,
    parkPerformanceTool,
    salesOverviewTool,
    parkEventsTool,
  ],
});

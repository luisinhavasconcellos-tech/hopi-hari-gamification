import { PageHeader, Card, CardTitle } from "@/components/dashboard/primitives";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

export default function InsightsPage() {
  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Inteligência"
        title="AI Insights"
        subtitle="Leituras automáticas geradas a partir dos dados reais conectados à plataforma."
      />

      <div className="mt-6 rounded-xl border border-border bg-muted/50 p-5 text-xs leading-relaxed text-muted-foreground">
        <div className="text-sm font-medium text-foreground">Fontes usadas nesta análise</div>
        <p className="mt-2">
          As leituras abaixo usam os dados já carregados na plataforma: posts e seguidores das redes sociais, público e
          embarques do parque, per capita de F&amp;B, vendas por canal, funil B2B, leads de CRM e reputação. Para ver a
          contagem de registros de cada fonte, consulte a página Admin.
        </p>
      </div>

      <div className="mt-6">
        <Card>
          <CardTitle title="Análise sob demanda" hint="Gera uma leitura nova com os dados atuais das redes" />
          <AIAnalysisPanel title="Análise IA — Redes Sociais" />
        </Card>
      </div>
    </div>
  );
}

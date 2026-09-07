import { Archive, CheckCircle2, FileImage, Film, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function CampaignArchiveImportPanel() {
  const imports = trpc.campaignArchiveImports.list.useQuery();
  if (imports.isLoading) return <div className="mb-6 h-28 animate-pulse rounded-2xl border border-border bg-card" />;
  if (imports.error) return <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Não foi possível carregar a verificação dos arquivos de campanha.</div>;
  if (!imports.data?.length) return null;
  const verified = imports.data.filter(item => item.verificationStatus === "verified_match");
  const images = imports.data.reduce((sum, item) => sum + item.imageFiles, 0);
  const videos = imports.data.reduce((sum, item) => sum + item.videoFiles, 0);
  const assets = imports.data.reduce((sum, item) => sum + item.matchedAssetCount, 0);

  return (
    <section aria-labelledby="campaign-archive-imports-title" className="mb-6 rounded-2xl border border-success/25 bg-success/5 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-success"><ShieldCheck className="size-4" /> Arquivos validados</div>
          <h2 id="campaign-archive-imports-title" className="mt-2 font-display text-2xl text-foreground">Pacotes de campanha adicionados</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Os arquivos enviados foram conferidos com o catálogo sincronizado do Google Drive. Os binários não foram duplicados; a proveniência do pacote e a correspondência de cada criativo ficaram registradas no BI.</p>
        </div>
        <div className="rounded-xl border border-success/20 bg-card px-4 py-3 text-sm text-muted-foreground"><p className="font-semibold text-foreground">{verified.length} de {imports.data.length} verificados</p><p>Sem arquivos pendentes de revisão</p></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card p-4"><Archive className="size-4 text-success" /><p className="mt-2 text-2xl font-semibold text-foreground">{assets}</p><p className="text-xs text-muted-foreground">criativos correspondentes</p></div>
        <div className="rounded-xl border border-border/70 bg-card p-4"><FileImage className="size-4 text-primary" /><p className="mt-2 text-2xl font-semibold text-foreground">{images}</p><p className="text-xs text-muted-foreground">imagens verificadas</p></div>
        <div className="rounded-xl border border-border/70 bg-card p-4"><Film className="size-4 text-accent" /><p className="mt-2 text-2xl font-semibold text-foreground">{videos}</p><p className="text-xs text-muted-foreground">vídeos verificados</p></div>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {imports.data.map(item => <article key={item.id} className="rounded-xl border border-border/70 bg-card p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-foreground">{item.campaignName}</h3><p className="mt-1 text-xs text-muted-foreground">{item.totalFiles} arquivos · {item.imageFiles} imagens · {item.videoFiles} vídeos</p></div><CheckCircle2 className={item.verificationStatus === "verified_match" ? "size-4 shrink-0 text-success" : "size-4 shrink-0 text-warning"} /></div><p className="mt-2 truncate text-[11px] text-muted-foreground" title={item.archiveName}>{item.archiveName}</p></article>)}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">A validação dos arquivos não determina o período oficial da campanha nem atribui vendas. Registre datas, UTMs ou códigos promocionais na aba <strong>Campanhas × Vendas</strong> para habilitar a leitura comercial.</p>
    </section>
  );
}

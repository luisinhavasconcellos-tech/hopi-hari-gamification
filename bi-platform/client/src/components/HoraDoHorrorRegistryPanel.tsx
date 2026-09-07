import { CalendarDays, ExternalLink, FileImage, Link2, Plus, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";

type CampaignStatus = "draft" | "scheduled" | "active" | "completed";
type CreativeStatus = "planned" | "published" | "paused";
type CreativePlatform = "instagram" | "facebook" | "tiktok" | "multiplatform";

const campaignStatusLabels: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  completed: "Completed",
};

const creativeStatusLabels: Record<CreativeStatus, string> = {
  planned: "Planned",
  published: "Published",
  paused: "Paused",
};

const platformLabels: Record<CreativePlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  multiplatform: "Multi-platform",
};

export default function HoraDoHorrorRegistryPanel() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const registry = trpc.horaDoHorrorRegistry.list.useQuery();
  const [campaign, setCampaign] = useState({ edition: "", periodStart: "", periodEnd: "", status: "scheduled" as CampaignStatus, notes: "" });
  const [creative, setCreative] = useState({ campaignId: "", creativeName: "", platform: "instagram" as CreativePlatform, creativeFormat: "", publishedDate: "", targetUrl: "", utmCampaign: "", callToAction: "", status: "planned" as CreativeStatus, notes: "" });

  const refresh = async () => {
    await Promise.all([
      utils.horaDoHorrorRegistry.list.invalidate(),
      utils.horaDoHorror.correlation.invalidate(),
    ]);
  };

  const saveCampaign = trpc.horaDoHorrorRegistry.saveCampaign.useMutation({
    onSuccess: async () => {
      setCampaign({ edition: "", periodStart: "", periodEnd: "", status: "scheduled", notes: "" });
      await refresh();
      toast({ title: "Official campaign saved", description: "The campaign window is now available to the Hora do Horror correlation." });
    },
    onError: error => toast({ title: "Unable to save campaign", description: error.message, variant: "destructive" }),
  });
  const saveCreative = trpc.horaDoHorrorRegistry.saveCreative.useMutation({
    onSuccess: async () => {
      setCreative(current => ({ ...current, creativeName: "", creativeFormat: "", publishedDate: "", targetUrl: "", utmCampaign: "", callToAction: "", notes: "", status: "planned" }));
      await refresh();
      toast({ title: "Creative saved", description: "Its platform, date and measurement fields are now part of the official registry." });
    },
    onError: error => toast({ title: "Unable to save creative", description: error.message, variant: "destructive" }),
  });

  const submitCampaign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveCampaign.mutate(campaign);
  };
  const submitCreative = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveCreative.mutate({ ...creative, campaignId: Number(creative.campaignId) });
  };

  return (
    <section aria-labelledby="hora-do-horror-registry-title" className="mb-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="size-4" /> Official campaign registry</div>
          <h2 id="hora-do-horror-registry-title" className="mt-2 font-display text-2xl text-foreground">Hora do Horror dates and creatives</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Register the official campaign window and each creative here. The correlation workspace will only use operating and social signals inside registered campaign dates.</p>
        </div>
        <Link to="/growth" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-card px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"><Link2 className="size-4" /> Open correlation <ExternalLink className="size-3.5" /></Link>
      </div>

      {registry.isLoading ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3"><div className="h-28 animate-pulse rounded-xl bg-muted" /><div className="h-28 animate-pulse rounded-xl bg-muted" /><div className="h-28 animate-pulse rounded-xl bg-muted" /></div>
      ) : registry.error ? (
        <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">The protected Hora do Horror registry could not be loaded.</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Official editions</p><p className="mt-2 font-display text-3xl text-foreground">{registry.data?.length ?? 0}</p></div>
            <div className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registered creatives</p><p className="mt-2 font-display text-3xl text-foreground">{registry.data?.reduce((sum, item) => sum + item.creativeCount, 0) ?? 0}</p></div>
            <div className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correlation scope</p><p className="mt-2 text-sm font-semibold text-foreground">Official dates only</p><p className="mt-1 text-xs text-muted-foreground">Prevents untagged days from being treated as campaign evidence.</p></div>
          </div>

          {(registry.data?.length ?? 0) > 0 ? (
            <div className="mt-5 space-y-3">
              {registry.data?.map(item => (
                <article key={item.id} className="rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg text-card-foreground">{item.edition}</h3><span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{campaignStatusLabels[item.status]}</span></div><p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-3.5 text-primary" /> {item.periodStart} to {item.periodEnd}</p>{item.notes && <p className="mt-2 text-sm text-secondary-foreground">{item.notes}</p>}</div><p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"><FileImage className="size-4" /> {item.creativeCount} creative{item.creativeCount === 1 ? "" : "s"}</p></div>
                  {item.creatives.length > 0 && <div className="mt-4 overflow-x-auto rounded-lg border border-border/70"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5">Creative</th><th className="px-3 py-2.5">Platform</th><th className="px-3 py-2.5">Format</th><th className="px-3 py-2.5">Publication</th><th className="px-3 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-border/70">{item.creatives.map(creativeItem => <tr key={creativeItem.id}><td className="px-3 py-2.5 font-medium text-foreground">{creativeItem.targetUrl ? <a href={creativeItem.targetUrl} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">{creativeItem.creativeName}</a> : creativeItem.creativeName}{creativeItem.utmCampaign && <p className="mt-0.5 text-xs font-normal text-muted-foreground">UTM: {creativeItem.utmCampaign}</p>}</td><td className="px-3 py-2.5 text-muted-foreground">{platformLabels[creativeItem.platform]}</td><td className="px-3 py-2.5 text-muted-foreground">{creativeItem.creativeFormat}</td><td className="px-3 py-2.5 text-muted-foreground">{creativeItem.publishedDate}</td><td className="px-3 py-2.5 text-muted-foreground">{creativeStatusLabels[creativeItem.status]}</td></tr>)}</tbody></table></div>}
                </article>
              ))}
            </div>
          ) : <p className="mt-5 rounded-xl border border-dashed border-border bg-card/70 p-5 text-sm text-muted-foreground">No official Hora do Horror campaign dates or creatives have been registered yet. Add the confirmed campaign window first, then its creative pieces.</p>}

          {isAdmin ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <form onSubmit={submitCampaign} className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-center gap-2"><Plus className="size-4 text-primary" /><h3 className="font-display text-lg text-card-foreground">Register official dates</h3></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Edition<input required value={campaign.edition} onChange={event => setCampaign(current => ({ ...current, edition: event.target.value }))} placeholder="e.g. Hora do Horror 2026" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">Start date<input required type="date" value={campaign.periodStart} onChange={event => setCampaign(current => ({ ...current, periodStart: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">End date<input required type="date" min={campaign.periodStart || undefined} value={campaign.periodEnd} onChange={event => setCampaign(current => ({ ...current, periodEnd: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Campaign status<select value={campaign.status} onChange={event => setCampaign(current => ({ ...current, status: event.target.value as CampaignStatus }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2">{Object.entries(campaignStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Internal note (optional)<textarea value={campaign.notes} onChange={event => setCampaign(current => ({ ...current, notes: event.target.value }))} className="min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label></div>
                <button type="submit" disabled={saveCampaign.isPending} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"><Plus className="size-4" /> {saveCampaign.isPending ? "Saving…" : "Save official dates"}</button>
              </form>

              <form onSubmit={submitCreative} className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-center gap-2"><FileImage className="size-4 text-primary" /><h3 className="font-display text-lg text-card-foreground">Register creative</h3></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Official edition<select required value={creative.campaignId} onChange={event => setCreative(current => ({ ...current, campaignId: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2"><option value="" disabled>Select an edition</option>{registry.data?.map(item => <option key={item.id} value={item.id}>{item.edition}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Creative name<input required value={creative.creativeName} onChange={event => setCreative(current => ({ ...current, creativeName: event.target.value }))} placeholder="e.g. Teaser 01 — suspense" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">Platform<select value={creative.platform} onChange={event => setCreative(current => ({ ...current, platform: event.target.value as CreativePlatform }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2">{Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">Format<input required value={creative.creativeFormat} onChange={event => setCreative(current => ({ ...current, creativeFormat: event.target.value }))} placeholder="Reel, Story, Video…" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">Publication date<input required type="date" value={creative.publishedDate} onChange={event => setCreative(current => ({ ...current, publishedDate: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">Creative status<select value={creative.status} onChange={event => setCreative(current => ({ ...current, status: event.target.value as CreativeStatus }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2">{Object.entries(creativeStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">Destination URL (optional)<input type="url" value={creative.targetUrl} onChange={event => setCreative(current => ({ ...current, targetUrl: event.target.value }))} placeholder="https://…" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">UTM campaign (optional)<input value={creative.utmCampaign} onChange={event => setCreative(current => ({ ...current, utmCampaign: event.target.value }))} placeholder="hdo_2026_teaser" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">CTA (optional)<input value={creative.callToAction} onChange={event => setCreative(current => ({ ...current, callToAction: event.target.value }))} placeholder="Buy tickets" className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary/30 transition focus:ring-2" /></label></div>
                <button type="submit" disabled={saveCreative.isPending || (registry.data?.length ?? 0) === 0} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"><Plus className="size-4" /> {saveCreative.isPending ? "Saving…" : "Save creative"}</button>
              </form>
            </div>
          ) : <p className="mt-5 rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground">Only platform administrators can register or update official campaign dates and creatives. The measurement registry remains visible to approved users.</p>}
        </>
      )}
    </section>
  );
}

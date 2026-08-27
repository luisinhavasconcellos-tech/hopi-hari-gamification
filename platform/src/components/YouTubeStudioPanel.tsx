import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";

interface ChannelTotals {
  views: number;
  watch_time_hours: number;
  subscribers_gained: number;
  impressions: number;
  ctr: number;
  snapshot_date: string;
}
interface DailyPoint { date: string; views: number; }
interface VideoRow {
  id: string;
  video_id: string;
  caption: string | null;
  view_count: number | null;
  watch_time_hours: number | null;
  impressions: number | null;
  ctr: number | null;
  subscribers_gained: number | null;
  duration_seconds: number | null;
  timestamp: string | null;
}

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 h-full flex flex-col">
      <p className="text-[10px] uppercase leading-snug tracking-wider text-muted-foreground min-h-[2.25rem]">{label}</p>
      <p className="text-xl sm:text-2xl font-bold leading-tight tabular-nums text-foreground mt-1 break-words">{value}</p>
      {sub && <p className="text-[10px] leading-snug text-muted-foreground mt-auto pt-2">{sub}</p>}
    </div>
  );
}

export default function YouTubeStudioPanel() {
  const [totals, setTotals] = useState<ChannelTotals | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [topVideos, setTopVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: d }, { data: v }] = await Promise.all([
        supabase.from("youtube_channel_totals").select("*").order("snapshot_date", { ascending: false }).limit(1),
        supabase.from("youtube_channel_daily").select("date,views").order("date", { ascending: true }),
        supabase.from("youtube_posts")
          .select("id,video_id,caption,view_count,watch_time_hours,impressions,ctr,subscribers_gained,duration_seconds,timestamp")
          .order("view_count", { ascending: false })
          .limit(10),
      ]);
      if (t?.[0]) setTotals(t[0] as any);
      setDaily((d ?? []) as DailyPoint[]);
      setTopVideos((v ?? []) as VideoRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="rounded-2xl border border-border bg-card p-6 mb-6 text-sm text-muted-foreground">Carregando dados do YouTube Studio…</div>;
  if (!totals) return null;

  const avgVideoCtr = topVideos.length
    ? topVideos.reduce((s, v) => s + (v.ctr ?? 0), 0) / topVideos.filter(v => v.ctr != null).length
    : 0;

  return (
    <div className="space-y-6 mb-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">YouTube Studio — totais do canal</h2>
            <p className="text-[11px] text-muted-foreground">Últimos 28 dias · snapshot {new Date(totals.snapshot_date).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Tile label="Visualizações" value={fmt(totals.views)} sub="período" />
          <Tile label="Tempo de exibição" value={`${fmt(totals.watch_time_hours)}h`} sub="horas assistidas" />
          <Tile label="Inscritos ganhos" value={fmt(totals.subscribers_gained)} sub="líquido" />
          <Tile label="Impressões" value={fmt(totals.impressions)} sub="vezes mostrado" />
          <Tile label="CTR de impressões" value={fmtPct(totals.ctr)} sub={`média top vídeos ${fmtPct(avgVideoCtr || 0)}`} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Visualizações diárias do canal</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11}
                tickFormatter={(d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => fmt(v)} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                labelFormatter={(d) => new Date(d).toLocaleDateString("pt-BR")}
                formatter={(v: number) => [fmt(v), "Views"]}
              />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 vídeos por visualizações</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topVideos.map(v => ({
              name: (v.caption ?? v.video_id ?? "").slice(0, 30),
              views: v.view_count ?? 0,
              watch: v.watch_time_hours ?? 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-25} textAnchor="end" height={70} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => fmt(v)} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number, k) => [fmt(v), k === "views" ? "Views" : "Horas"]}
              />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">Vídeo</th>
                <th className="text-right py-2 font-medium">Views</th>
                <th className="text-right py-2 font-medium">Watch (h)</th>
                <th className="text-right py-2 font-medium">Impressões</th>
                <th className="text-right py-2 font-medium">CTR</th>
                <th className="text-right py-2 font-medium">+Inscritos</th>
              </tr>
            </thead>
            <tbody>
              {topVideos.map(v => (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="py-2 pr-2 text-foreground truncate max-w-xs">{v.caption ?? v.video_id}</td>
                  <td className="py-2 text-right">{fmt(v.view_count ?? 0)}</td>
                  <td className="py-2 text-right">{fmt(v.watch_time_hours ?? 0)}</td>
                  <td className="py-2 text-right">{fmt(v.impressions ?? 0)}</td>
                  <td className="py-2 text-right">{v.ctr != null ? fmtPct(v.ctr) : "—"}</td>
                  <td className="py-2 text-right">{fmt(v.subscribers_gained ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

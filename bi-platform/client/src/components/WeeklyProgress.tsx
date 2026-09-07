import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface PostLike {
  timestamp: string | null;
  like_count: number;
  comments_count: number;
  share_count?: number | null;
  view_count?: number | null;
}

function fmtDay(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function WeeklyProgress({ posts, weeks = 8 }: { posts: PostLike[]; weeks?: number }) {
  const data = useMemo(() => {
    // Rolling 7-day windows (7×24h) ending now — most recent = "esta semana"
    const nowMs = Date.now();
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const buckets: { key: string; label: string; start: number; end: number; posts: number; likes: number; comments: number; shares: number; views: number }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const end = nowMs - i * WEEK_MS;
      const start = end - WEEK_MS;
      buckets.push({ key: String(end), label: fmtDay(new Date(end)), start, end, posts: 0, likes: 0, comments: 0, shares: 0, views: 0 });
    }
    posts.forEach((p) => {
      if (!p.timestamp) return;
      const t = new Date(p.timestamp).getTime();
      const b = buckets.find((x) => t >= x.start && t <= x.end);
      if (!b) return;
      b.posts += 1;
      b.likes += p.like_count ?? 0;
      b.comments += p.comments_count ?? 0;
      b.shares += p.share_count ?? 0;
      b.views += p.view_count ?? 0;
    });
    return buckets;
  }, [posts, weeks]);

  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const delta = (a: number, b: number) => {
    if (b === 0) return a > 0 ? 100 : 0;
    return ((a - b) / b) * 100;
  };
  const dPosts = last && prev ? delta(last.posts, prev.posts) : 0;
  const dEng = last && prev ? delta(last.likes + last.comments + last.shares, prev.likes + prev.comments + prev.shares) : 0;
  const dViews = last && prev ? delta(last.views, prev.views) : 0;

  const Pill = ({ label, value, pct }: { label: string; value: string; pct: number }) => (
    <div className="flex-1 min-w-[120px] rounded-xl border border-border bg-background p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
      <p className={`text-[11px] font-semibold mt-0.5 ${pct > 0 ? "text-success" : pct < 0 ? "text-destructive" : "text-muted-foreground"}`}>
        {pct > 0 ? "▲" : pct < 0 ? "▼" : "—"} {Math.abs(pct).toFixed(1)}% vs semana anterior
      </p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Progresso Semanal</h2>
          <p className="text-[11px] text-muted-foreground">Janelas móveis de 7 dias — últimos {weeks * 7} dias</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Pill label="Posts (esta semana)" value={String(last?.posts ?? 0)} pct={dPosts} />
        <Pill label="Engajamento total" value={(last ? last.likes + last.comments + last.shares : 0).toLocaleString("pt-BR")} pct={dEng} />
        <Pill label="Visualizações" value={(last?.views ?? 0).toLocaleString("pt-BR")} pct={dViews} />
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" />
          <XAxis dataKey="label" tick={{ fill: "hsl(0,0%,45%)", fontSize: 11 }} />
          <YAxis tick={{ fill: "hsl(0,0%,45%)", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(0,0%,89%)", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, n: string) => [v.toLocaleString("pt-BR"), n]}
          />
          <Bar dataKey="likes" name="Curtidas" fill="hsl(25,95%,53%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="comments" name="Comentários" fill="hsl(330,80%,60%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="posts" name="Posts" fill="hsl(0,0%,45%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

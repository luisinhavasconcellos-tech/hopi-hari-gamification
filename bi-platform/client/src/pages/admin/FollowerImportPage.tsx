import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  reading_date: string;
  instagram: number;
  tiktok: number;
  facebook: number;
  youtube: number;
  linkedin: number;
  is_anomaly?: boolean;
  anomaly_note?: string | null;
  source?: string;
};

const REQUIRED = ["reading_date", "instagram", "tiktok", "facebook", "youtube", "linkedin"] as const;

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function toInt(raw: string): number | null {
  const s = (raw ?? "").replace(/[^\d-]/g, "");
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function parseCsv(text: string): { rows: Row[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], errors: ["Arquivo vazio ou sem linhas de dados."] };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], errors: [`Colunas ausentes: ${missing.join(", ")}`] };

  const idx = (name: string) => header.indexOf(name);
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = normalizeDate(cells[idx("reading_date")] ?? "");
    if (!date) {
      errors.push(`Linha ${i + 1}: data inválida (${cells[idx("reading_date")] ?? ""}).`);
      continue;
    }
    const nums: Record<string, number> = {};
    let bad = false;
    for (const c of ["instagram", "tiktok", "facebook", "youtube", "linkedin"]) {
      const v = toInt(cells[idx(c)] ?? "");
      if (v == null) {
        errors.push(`Linha ${i + 1}: valor inválido em ${c}.`);
        bad = true;
        break;
      }
      nums[c] = v;
    }
    if (bad) continue;

    const anomalyRaw = idx("is_anomaly") >= 0 ? (cells[idx("is_anomaly")] ?? "").trim().toLowerCase() : "";
    const noteRaw = idx("anomaly_note") >= 0 ? (cells[idx("anomaly_note")] ?? "").trim() : "";
    const sourceRaw = idx("source") >= 0 ? (cells[idx("source")] ?? "").trim() : "";

    rows.push({
      reading_date: date,
      instagram: nums.instagram,
      tiktok: nums.tiktok,
      facebook: nums.facebook,
      youtube: nums.youtube,
      linkedin: nums.linkedin,
      is_anomaly: anomalyRaw === "true" || anomalyRaw === "1" || anomalyRaw === "sim",
      anomaly_note: noteRaw || null,
      source: sourceRaw || "manual",
    });
  }

  // dedupe by date, last wins
  const map = new Map<string, Row>();
  for (const r of rows) map.set(r.reading_date, r);
  return { rows: Array.from(map.values()).sort((a, b) => a.reading_date.localeCompare(b.reading_date)), errors };
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function FollowerImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed.rows);
    setErrors(parsed.errors);
  };

  const importar = async () => {
    if (!rows.length) return;
    setSaving(true);
    setResult(null);
    try {
      let done = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from("follower_daily").upsert(chunk, { onConflict: "reading_date" });
        if (error) throw error;
        done += chunk.length;
      }
      setResult(`${fmt(done)} leituras importadas com sucesso.`);
    } catch (e) {
      setResult(`Falha na importação: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Importar log de seguidores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          CSV com as colunas <code>reading_date, instagram, tiktok, facebook, youtube, linkedin</code>. As colunas{" "}
          <code>is_anomaly</code>, <code>anomaly_note</code> e <code>source</code> são opcionais. O upsert é feito por
          data de leitura.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border file:border-border file:bg-muted file:px-4 file:py-2 file:text-sm file:text-foreground hover:file:bg-muted/70"
        />
        {fileName && (
          <p className="text-xs text-muted-foreground">
            {fileName} · {fmt(rows.length)} linhas válidas
            {errors.length ? ` · ${fmt(errors.length)} problemas` : ""}
          </p>
        )}

        {errors.length > 0 && (
          <ul className="max-h-40 overflow-auto rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
            {errors.slice(0, 50).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2 text-right">Instagram</th>
                  <th className="px-3 py-2 text-right">TikTok</th>
                  <th className="px-3 py-2 text-right">Facebook</th>
                  <th className="px-3 py-2 text-right">YouTube</th>
                  <th className="px-3 py-2 text-right">LinkedIn</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r) => (
                  <tr key={r.reading_date} className="border-b border-border/50 text-foreground">
                    <td className="px-3 py-1.5">{new Date(`${r.reading_date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.instagram)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.tiktok)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.facebook)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.youtube)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.linkedin)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">
                      {fmt(r.instagram + r.tiktok + r.facebook + r.youtube + r.linkedin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                Pré-visualizando 10 de {fmt(rows.length)} linhas.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={importar}
            disabled={!rows.length || saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Importando…" : `Importar ${rows.length ? fmt(rows.length) + " linhas" : ""}`}
          </button>
          {result && <span className="text-sm text-muted-foreground">{result}</span>}
        </div>
      </div>
    </div>
  );
}

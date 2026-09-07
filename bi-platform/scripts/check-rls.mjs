#!/usr/bin/env node
/**
 * Reports which Supabase data-project tables the PUBLIC anon key can read.
 *
 * The dashboard queries the data project directly from the browser with the
 * anon key, so anything this script lists as "readable" is readable by anyone
 * who has the app's bundle — independent of the platform's login/approval.
 * Run it after tightening Row Level Security to confirm the lock-down.
 *
 * Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/check-rls.mjs [table ...]
 * Only HEAD/count requests are issued; no row data is downloaded or written.
 */
const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.SUPABASE_ANON_KEY ?? "";
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (the public anon key).");
  process.exit(2);
}

const DEFAULT_TABLES = [
  "crm_leads_geo", "customer_cpf_regions", "customer_registrations_daily", "customer_demographics",
  "distributors", "distributor_sales_monthly", "sales_revenue_monthly", "website_sales_daily",
  "park_public_monthly", "park_percapita_daily", "reputation_reviews", "audit_logs",
  "gender_audit_samples", "platform_settings", "instagram_posts", "follower_daily",
  "profiles", "user_roles", "x_mentions", "gsc_daily_queries",
];
const tables = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TABLES;

let exposed = 0;
for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
    signal: AbortSignal.timeout(20_000),
  }).catch(error => ({ status: 0, headers: new Headers(), error }));
  const range = res.headers.get("content-range") ?? "";
  const count = range.split("/")[1] ?? "?";
  let verdict;
  if (res.status === 200 || res.status === 206) {
    verdict = count === "0" ? "readable (0 rows visible — RLS may filter everything)" : `READABLE BY ANON (${count} rows)`;
    if (count !== "0") exposed += 1;
  } else if (res.status === 401 || res.status === 403) verdict = "denied (good)";
  else if (res.status === 404) verdict = "table not found";
  else verdict = `HTTP ${res.status}${res.error ? ` ${res.error.message}` : ""}`;
  console.log(`${table.padEnd(32)} ${verdict}`);
}
console.log(`\n${exposed} of ${tables.length} tables are readable with the public anon key.`);
process.exit(exposed ? 1 : 0);

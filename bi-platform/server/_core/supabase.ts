import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let dataClient: SupabaseClient | null = null;

/**
 * Shared read client for the BI data project (`SUPABASE_URL`). The anon key
 * is public by design; Row Level Security on the project decides what it may
 * read. Every server module must use this instance so there is exactly one
 * copy of the credentials.
 */
export function getSupabase(): SupabaseClient {
  if (!dataClient) {
    dataClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(20_000) }),
      },
    });
  }
  return dataClient;
}

/** Supabase caps a single response at `db-max-rows` (1000 by default). */
export const SUPABASE_PAGE_SIZE = 1000;

type PageQuery<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * Reads every row of a query by paging with `.range()`, so aggregates never
 * silently stop at the first 1000 rows. `build` must apply a stable ORDER BY.
 */
export async function fetchAllRows<T>(build: PageQuery<T>, maxRows = 50_000): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += SUPABASE_PAGE_SIZE) {
    const to = Math.min(from + SUPABASE_PAGE_SIZE, maxRows) - 1;
    const { data, error } = await build(from, to);
    if (error) return { rows, error: error.message };
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < to - from + 1) break;
  }
  return { rows, error: null };
}

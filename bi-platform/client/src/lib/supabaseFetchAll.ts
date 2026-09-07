/**
 * Paginação para consultas ao Supabase/PostgREST.
 *
 * O projeto limita silenciosamente cada resposta a 1000 linhas (db-max-rows);
 * qualquer tabela maior que isso era truncada sem erro. Este helper repete a
 * consulta com `.range(from, to)` até receber uma página curta.
 *
 * A consulta passada em `build` DEVE ter um ORDER BY estável terminado em uma
 * chave única (ex.: `.order("id")`) — sem isso, empates entre páginas geram
 * linhas duplicadas ou perdidas.
 */
export type FetchAllResult<T> = { rows: T[]; error: string | null };

export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  opts: { pageSize?: number; maxRows?: number } = {},
): Promise<FetchAllResult<T>> {
  const pageSize = Math.max(1, Math.min(opts.pageSize ?? 1000, 1000));
  const maxRows = opts.maxRows ?? Infinity;
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize, maxRows) - 1;
    const { data, error } = await build(from, to);
    if (error) return { rows, error: error.message };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < to - from + 1) break;
  }
  return { rows, error: null };
}

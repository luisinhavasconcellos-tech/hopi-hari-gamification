import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | null = null;

/**
 * One shared mysql2 pool for every raw-SQL module.
 *
 * Previously nine modules each created their own pool (35 connections in
 * total, plus drizzle's own pool), which is enough to exhaust
 * `max_connections` on a small managed MySQL when the weekly report fans out.
 */
export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  pool ??= mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE ?? 8) || 8,
    maxIdle: 4,
    idleTimeout: 60_000,
    enableKeepAlive: true,
  });
  return pool;
}

/** Closes the shared pool (tests / scripts). */
export async function closePool() {
  const current = pool;
  pool = null;
  if (current) await current.end();
}

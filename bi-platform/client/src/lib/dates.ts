/**
 * Datas no fuso de negócio (America/Sao_Paulo).
 *
 * `new Date("YYYY-MM-DD")` interpreta a string como UTC à meia-noite — no Brasil
 * (UTC-3) isso cai no dia anterior. `new Date().toISOString()` tem o problema
 * inverso à noite. Use estes helpers em vez das formas cruas.
 */

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const saoPauloDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data de hoje em São Paulo no formato YYYY-MM-DD. */
export function saoPauloToday(now: Date = new Date()): string {
  return saoPauloDateFormatter.format(now);
}

/**
 * Converte uma data "YYYY-MM-DD" em Date ao meio-dia local (imune a fuso).
 * Qualquer outro formato (timestamps completos) é repassado ao construtor Date.
 */
export function parseDateOnly(d: string): Date {
  return DATE_ONLY.test(d) ? new Date(`${d}T12:00:00`) : new Date(d);
}

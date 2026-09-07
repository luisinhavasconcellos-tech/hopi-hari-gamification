const SAO_PAULO_TZ = "America/Sao_Paulo";

const saoPauloFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SAO_PAULO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date (YYYY-MM-DD) in the park's timezone. */
export function saoPauloDate(now: Date = new Date()): string {
  return saoPauloFormatter.format(now);
}

/** Adds days to a YYYY-MM-DD string. Anchored at noon UTC so DST never shifts the day. */
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * UTC instants that bound a São Paulo calendar day. São Paulo has had no DST
 * since 2019, so the offset is a fixed -03:00.
 */
export function saoPauloDayRange(startDate: string, endDate: string) {
  return {
    startUtc: `${startDate}T03:00:00.000Z`,
    endUtc: `${addDays(endDate, 1)}T02:59:59.999Z`,
  };
}

export type HopiInformeRevenuePoint = {
  observedAt: string;
  businessDate: string;
  localHour: number;
  internalRevenueCents: number;
  externalRevenueCents: number;
  grossRevenueCents: number;
  internalPerCapitaCents: number | null;
  channels: Record<string, number>;
  messageIndex: number;
};

export type HopiInformeAttendancePoint = {
  observedAt: string;
  businessDate: string;
  localHour: number;
  publicCount: number;
  payingCount: number;
  complimentaryCount: number;
  entriesInterval: number;
  exitsInterval: number;
  currentlyInPark: number;
  messageIndex: number;
};

/** "FECHAMENTO DIÁRIO" block appended to the closing attendance message. */
export type HopiInformeDailyClosing = {
  observedAt: string;
  businessDate: string;
  forecastCount: number;
  realizedCount: number;
  variation: number;
  messageIndex: number;
};

/** One line of a "Previsão de Público" message: the forecast for a business date as issued at a moment in time. */
export type HopiInformeForecastPoint = {
  issuedAt: string;
  businessDate: string;
  forecastCount: number;
  messageIndex: number;
};

export type HopiInformeParseResult = {
  revenue: HopiInformeRevenuePoint[];
  attendance: HopiInformeAttendancePoint[];
  closings: HopiInformeDailyClosing[];
  forecasts: HopiInformeForecastPoint[];
  warnings: string[];
};

export type HopiInformeDedupeStats = {
  revenueDuplicates: number;
  attendanceDuplicates: number;
  closingDuplicates: number;
  forecastDuplicates: number;
};

export function shouldPreserveOperationalSource(existingSourceKey: string | null | undefined, incomingSourceKey: string) {
  return Boolean(existingSourceKey && existingSourceKey !== incomingSourceKey);
}

const HEADER = /^\[(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})\]/;
const BR_DATE = /Data\s*:?\s*\*?\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const HOUR = /(?:Hora|Atualizado às)\s*:?\s*\*?\s*(\d{1,2})(?::(\d{2}))?/i;
const FIELD = (label: string) => new RegExp(`${label}\\s*:?\\s*\\*?\\s*([0-9.]+)`, "i");
const SIGNED_FIELD = (label: string) => new RegExp(`${label}\\s*:?\\s*\\*?\\s*(-?[0-9.]+)`, "i");
const FORECAST_LINE = /^\*?[A-Za-zÀ-ú-]+\*?\s*\((\d{2})\/(\d{2})\/(\d{4})\)\s*:\s*\*?\s*([0-9.]+)/;
const MONEY_FIELD = (label: string) => new RegExp(`${label}\\s*:?\\s*\\*?\\s*R?\\$?\\s*([0-9.]+,[0-9]{2})`, "i");

const INTERNAL_CHANNELS = new Set(["A & B", "MERC", "SERV", "PLAKA"]);

function parseInteger(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/\./g, ""));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** Like parseInteger but keeps the sign (closing "Variação" and end-of-day in-park counts go negative). */
function parseSignedInteger(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/\./g, ""));
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Timestamp of the WhatsApp message header ("[dd/mm/yyyy, hh:mm:ss]") as a São Paulo instant. */
function headerTimestamp(block: string) {
  const match = block.match(HEADER);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`).toISOString();
}

function parseMoneyCents(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function businessTimestamp(date: string, hour: number, minute: number) {
  const [day, month, year] = date.split("/");
  return new Date(`${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`).toISOString();
}

function parseDate(block: string) {
  const match = block.match(BR_DATE);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : null;
}

function parseHour(block: string) {
  const match = block.match(HOUR);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : null;
}

function parseChannels(block: string) {
  const channels: Record<string, number> = {};
  const section = block.split(/RESUMO DO PERÍODO/i)[0];
  const lines = section.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/(?:🔹\s*)?([^:\n]+):\s*R?\$?\s*([0-9.]+,[0-9]{2})/i);
    if (!match) continue;
    const key = match[1].replace(/[*🔹]/gu, "").trim();
    const cents = parseMoneyCents(match[2]);
    if (key && cents !== null) channels[key] = cents;
  }
  return channels;
}

function validateRevenue(point: HopiInformeRevenuePoint, warnings: string[]) {
  const gross = Object.values(point.channels).reduce((sum, value) => sum + value, 0);
  const internal = Object.entries(point.channels)
    .filter(([channel]) => INTERNAL_CHANNELS.has(channel))
    .reduce((sum, [, value]) => sum + value, 0);
  if (gross !== point.grossRevenueCents) warnings.push(`${point.observedAt}:gross_total_mismatch`);
  if (internal !== point.internalRevenueCents) warnings.push(`${point.observedAt}:internal_total_mismatch`);
  if (gross - internal !== point.externalRevenueCents) warnings.push(`${point.observedAt}:external_total_mismatch`);
}

function parseForecastMessage(block: string, messageIndex: number, warnings: string[]): HopiInformeForecastPoint[] {
  const issuedAt = headerTimestamp(block);
  if (!issuedAt) return [];
  const points: HopiInformeForecastPoint[] = [];
  for (const line of block.split(/\r?\n/)) {
    const match = line.trim().match(FORECAST_LINE);
    if (!match) continue;
    const forecastCount = parseInteger(match[4]);
    if (forecastCount === null) {
      warnings.push(`${issuedAt}:invalid_forecast_value`);
      continue;
    }
    points.push({ issuedAt, businessDate: `${match[3]}-${match[2]}-${match[1]}`, forecastCount, messageIndex });
  }
  if (!points.length) warnings.push(`${issuedAt}:empty_forecast`);
  return points;
}

export function parseHopiInformeExport(raw: string): HopiInformeParseResult {
  const revenue: HopiInformeRevenuePoint[] = [];
  const attendance: HopiInformeAttendancePoint[] = [];
  const closings: HopiInformeDailyClosing[] = [];
  const forecasts: HopiInformeForecastPoint[] = [];
  const warnings: string[] = [];
  const blocks = raw.split(/(?=^\[\d{2}\/\d{2}\/\d{4},)/m).filter(Boolean);

  blocks.forEach((block, messageIndex) => {
    if (/Previsão de Público/i.test(block)) {
      forecasts.push(...parseForecastMessage(block, messageIndex, warnings));
      return;
    }
    const date = parseDate(block);
    const time = parseHour(block);
    if (!date || !time) return;
    const observedAt = businessTimestamp(date, time.hour, time.minute);
    const base = { observedAt, businessDate: date.split("/").reverse().join("-"), localHour: time.hour, messageIndex };

    if (/FATURAMENTO/i.test(block)) {
      const channels = parseChannels(block);
      const internalRevenueCents = parseMoneyCents(block.match(MONEY_FIELD("Receita Interna"))?.[1]);
      const externalRevenueCents = parseMoneyCents(block.match(MONEY_FIELD("Receita Externa"))?.[1]);
      const grossRevenueCents = parseMoneyCents(block.match(MONEY_FIELD("Total Bruto"))?.[1]);
      const internalPerCapitaCents = parseMoneyCents(block.match(MONEY_FIELD("Per Capita"))?.[1]);
      if ([internalRevenueCents, externalRevenueCents, grossRevenueCents].some(value => value === null)) {
        warnings.push(`${observedAt}:incomplete_revenue`);
      } else {
        const point = { ...base, channels, internalRevenueCents, externalRevenueCents, grossRevenueCents, internalPerCapitaCents } as HopiInformeRevenuePoint;
        validateRevenue(point, warnings);
        revenue.push(point);
      }
    }

    if (/Público do dia/i.test(block)) {
      const publicCount = parseInteger(block.match(FIELD("Publico"))?.[1]);
      const payingCount = parseInteger(block.match(FIELD("Pagantes"))?.[1]);
      const complimentaryCount = parseInteger(block.match(FIELD("Cortesias"))?.[1]);
      const entriesInterval = parseInteger(block.match(FIELD("Entraram"))?.[1]);
      const exitsInterval = parseInteger(block.match(FIELD("Sairam"))?.[1]);
      // The 21:00 closing message reports the turnstile balance, which can be
      // slightly negative after the exits are counted; keep the source value.
      const currentlyInPark = parseSignedInteger(block.match(SIGNED_FIELD("Atualmente no parque"))?.[1]);
      if ([publicCount, payingCount, complimentaryCount, entriesInterval, exitsInterval, currentlyInPark].some(value => value === null)) {
        warnings.push(`${observedAt}:incomplete_attendance`);
      } else {
        if (payingCount! + complimentaryCount! !== publicCount) warnings.push(`${observedAt}:public_composition_mismatch`);
        if (currentlyInPark! < 0) warnings.push(`${observedAt}:negative_currently_in_park`);
        attendance.push({ ...base, publicCount, payingCount, complimentaryCount, entriesInterval, exitsInterval, currentlyInPark } as HopiInformeAttendancePoint);
      }

      if (/FECHAMENTO DI[ÁA]RIO/i.test(block)) {
        const forecastCount = parseInteger(block.match(FIELD("Previsão do dia"))?.[1]);
        const realizedCount = parseInteger(block.match(FIELD("Realizado"))?.[1]);
        const variation = parseSignedInteger(block.match(SIGNED_FIELD("Variação"))?.[1]);
        if (forecastCount === null || realizedCount === null || variation === null) {
          warnings.push(`${observedAt}:incomplete_daily_closing`);
        } else {
          if (realizedCount - forecastCount !== variation) warnings.push(`${observedAt}:closing_variation_mismatch`);
          if (publicCount !== null && realizedCount !== publicCount) warnings.push(`${observedAt}:closing_realized_mismatch`);
          closings.push({ ...base, forecastCount, realizedCount, variation });
        }
      }
    }
  });

  return { revenue, attendance, closings, forecasts, warnings };
}

/**
 * Collapses repeated observations so an export (or a re-export overlapping an
 * earlier one) never yields two rows for the same natural key. When a message
 * was re-sent for the same moment, the later message wins (it carries the
 * correction). Output is sorted chronologically.
 */
export function dedupeHopiInformeExport(result: HopiInformeParseResult): { data: HopiInformeParseResult; stats: HopiInformeDedupeStats } {
  const keepLast = <T extends { messageIndex: number }>(items: T[], keyOf: (item: T) => string, sortKey: (item: T) => string) => {
    const byKey = new Map<string, T>();
    for (const item of items) {
      const key = keyOf(item);
      const current = byKey.get(key);
      if (!current || current.messageIndex <= item.messageIndex) byKey.set(key, item);
    }
    const kept = [...byKey.values()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.messageIndex - b.messageIndex);
    return { kept, duplicates: items.length - kept.length };
  };

  const revenue = keepLast(result.revenue, point => point.observedAt, point => point.observedAt);
  const attendance = keepLast(result.attendance, point => point.observedAt, point => point.observedAt);
  const closings = keepLast(result.closings, point => point.businessDate, point => point.businessDate);
  const forecasts = keepLast(
    result.forecasts,
    point => `${point.businessDate}|${point.issuedAt}`,
    point => `${point.businessDate}|${point.issuedAt}`,
  );

  return {
    data: {
      revenue: revenue.kept,
      attendance: attendance.kept,
      closings: closings.kept,
      forecasts: forecasts.kept,
      warnings: [...new Set(result.warnings)],
    },
    stats: {
      revenueDuplicates: revenue.duplicates,
      attendanceDuplicates: attendance.duplicates,
      closingDuplicates: closings.duplicates,
      forecastDuplicates: forecasts.duplicates,
    },
  };
}

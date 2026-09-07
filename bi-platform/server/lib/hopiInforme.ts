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

export type HopiInformeParseResult = {
  revenue: HopiInformeRevenuePoint[];
  attendance: HopiInformeAttendancePoint[];
  warnings: string[];
};

export function shouldPreserveOperationalSource(existingSourceKey: string | null | undefined, incomingSourceKey: string) {
  return Boolean(existingSourceKey && existingSourceKey !== incomingSourceKey);
}

const HEADER = /^\[(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})\]/;
const BR_DATE = /Data\s*:?\s*\*?\s*(\d{2})\/(\d{2})\/(\d{4})/i;
const HOUR = /(?:Hora|Atualizado às)\s*:?\s*\*?\s*(\d{1,2})(?::(\d{2}))?/i;
const FIELD = (label: string) => new RegExp(`${label}\\s*:?\\s*\\*?\\s*([0-9.]+)`, "i");
const MONEY_FIELD = (label: string) => new RegExp(`${label}\\s*:?\\s*\\*?\\s*R?\\$?\\s*([0-9.]+,[0-9]{2})`, "i");

const INTERNAL_CHANNELS = new Set(["A & B", "MERC", "SERV", "PLAKA"]);

function parseInteger(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/\./g, ""));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
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

export function parseHopiInformeExport(raw: string): HopiInformeParseResult {
  const revenue: HopiInformeRevenuePoint[] = [];
  const attendance: HopiInformeAttendancePoint[] = [];
  const warnings: string[] = [];
  const blocks = raw.split(/(?=^\[\d{2}\/\d{2}\/\d{4},)/m).filter(Boolean);

  blocks.forEach((block, messageIndex) => {
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
      const currentlyInPark = parseInteger(block.match(FIELD("Atualmente no parque"))?.[1]);
      if ([publicCount, payingCount, complimentaryCount, entriesInterval, exitsInterval, currentlyInPark].some(value => value === null)) {
        warnings.push(`${observedAt}:incomplete_attendance`);
      } else {
        if (payingCount! + complimentaryCount! !== publicCount) warnings.push(`${observedAt}:public_composition_mismatch`);
        attendance.push({ ...base, publicCount, payingCount, complimentaryCount, entriesInterval, exitsInterval, currentlyInPark } as HopiInformeAttendancePoint);
      }
    }
  });

  return { revenue, attendance, warnings };
}

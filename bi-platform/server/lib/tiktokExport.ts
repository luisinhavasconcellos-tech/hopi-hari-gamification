import XLSX from "xlsx";

export type TiktokDailyRow = {
  observedDate: string;
  followers?: number | null;
  videoViews?: number | null;
  profileViews?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
};

export type TiktokViewerRow = {
  observedDate: string;
  totalViewers: number | null;
  newViewers: number | null;
  returningViewers: number | null;
};

export type TiktokFollowerActivityRow = {
  observedDate: string;
  hour: number;
  activeFollowers: number;
};

export type TiktokAudience = {
  gender: Array<{ name: string; sharePct: number }>;
  territories: Array<{ name: string; sharePct: number }>;
};

export type TiktokExport = {
  daily: TiktokDailyRow[];
  viewers: TiktokViewerRow[];
  audience: TiktokAudience;
  followerActivity: TiktokFollowerActivityRow[];
  warnings: string[];
};

const months = new Map([
  ["January", 1], ["February", 2], ["March", 3], ["April", 4], ["May", 5], ["June", 6],
  ["July", 7], ["August", 8], ["September", 9], ["October", 10], ["November", 11], ["December", 12],
]);

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "" || String(value).toLowerCase() === "undefined") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function decimalOrNull(value: unknown) {
  if (value === undefined || value === null || value === "" || String(value).toLowerCase() === "undefined") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * TikTok labels rows as "28 August" with no year. The export file name carries
 * the export date (e.g. `Overview_2026-01-13`), which is the *last* day the
 * data can cover. Roll the year forward whenever the month/day sequence wraps,
 * then shift the whole series back until it ends on or before the export
 * date, so a December → January export is not dated a year into the future.
 */
function parseDateSeries(labels: string[], anchor: { year: number; date: string | null }) {
  let year = anchor.year;
  let previousMonth = 0;
  let previousDay = 0;
  const parsed = labels.map(label => {
    const [dayText, monthText] = label.trim().split(/\s+/, 2);
    const month = months.get(monthText);
    const day = Number(dayText);
    if (!month || !Number.isInteger(day)) throw new Error(`tiktok_invalid_date:${label}`);
    if (previousMonth && (month < previousMonth || (month === previousMonth && day < previousDay))) year += 1;
    previousMonth = month;
    previousDay = day;
    return { year, month, day };
  });
  const format = (row: { year: number; month: number; day: number }, shift: number) =>
    `${row.year - shift}-${String(row.month).padStart(2, "0")}-${String(row.day).padStart(2, "0")}`;
  let shift = 0;
  const last = parsed.at(-1);
  if (anchor.date && last) {
    while (format(last, shift) > anchor.date) shift += 1;
  }
  return parsed.map(row => format(row, shift));
}

function csvRows(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) throw new Error("tiktok_empty_csv");
  const headers = lines[0].split(",").map(value => value.replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(value => value.replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseAnchor(sourceName: string) {
  const full = sourceName.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (full) return { year: Number(full[1]), date: `${full[1]}-${full[2]}-${full[3]}` };
  const yearOnly = sourceName.match(/(20\d{2})/);
  return { year: yearOnly ? Number(yearOnly[1]) : new Date().getUTCFullYear(), date: null };
}

export function parseOverviewCsv(text: string, sourceName = "Overview") {
  const rows = csvRows(text);
  const dates = parseDateSeries(rows.map(row => String(row.Date)), parseAnchor(sourceName));
  return rows.map((row, index) => ({
    observedDate: dates[index],
    videoViews: numberOrNull(row["Video Views"]),
    profileViews: numberOrNull(row["Profile Views"]),
    likes: numberOrNull(row.Likes),
    comments: numberOrNull(row.Comments),
    shares: numberOrNull(row.Shares),
  }));
}

export function parseViewersCsv(text: string, sourceName = "Viewers") {
  const rows = csvRows(text);
  const dates = parseDateSeries(rows.map(row => String(row.Date)), parseAnchor(sourceName));
  return rows.map((row, index) => ({
    observedDate: dates[index],
    totalViewers: numberOrNull(row["Total Viewers"]),
    newViewers: numberOrNull(row["New Viewers"]),
    returningViewers: numberOrNull(row["Returning Viewers"]),
  }));
}

function worksheetRows(buffer: Buffer, sheetName: string) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[sheetName] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`tiktok_missing_sheet:${sheetName}`);
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
}

export function parseFollowersXlsx(buffer: Buffer, sourceName = "Followers") {
  const rows = worksheetRows(buffer, "FollowerHistory");
  const dates = parseDateSeries(rows.map(row => String(row.Date)), parseAnchor(sourceName));
  return rows.map((row, index) => ({ observedDate: dates[index], followers: numberOrNull(row.Followers) }));
}

export function parseFollowerActivityXlsx(buffer: Buffer, sourceName = "Followers") {
  const rows = worksheetRows(buffer, "FollowerActivity");
  const dates = parseDateSeries(rows.map(row => String(row.Date)), parseAnchor(sourceName));
  return rows.map((row, index) => ({ observedDate: dates[index], hour: Number(row.Hour), activeFollowers: numberOrNull(row["Active followers"]) ?? 0 }));
}

export function parseAudienceXlsx(genderBuffer: Buffer, territoriesBuffer: Buffer) {
  const genderRows = worksheetRows(genderBuffer, "FollowerGender");
  const territoryRows = worksheetRows(territoriesBuffer, "FollowerTopTerritories");
  return {
    gender: genderRows.map(row => ({ name: String(row.Gender), sharePct: (decimalOrNull(row.Distribution) ?? 0) * 100 })),
    territories: territoryRows.map(row => ({ name: String(row["Top territories"]), sharePct: (decimalOrNull(row.Distribution) ?? 0) * 100 })),
  };
}

export function parseTiktokExport(input: {
  overviewCsv: string;
  viewersCsv: string;
  followersXlsx: Buffer;
  /** Export file names (carry the export date used to anchor the year). */
  overviewName?: string;
  followersName?: string;
  warnings?: string[];
}) {
  const warnings = [...(input.warnings ?? [])];
  const dailyOverview = parseOverviewCsv(input.overviewCsv, input.overviewName ?? "Overview");
  const followerHistory = parseFollowersXlsx(input.followersXlsx, input.followersName ?? "Followers");
  const followerByDate = new Map(followerHistory.map(row => [row.observedDate, row.followers]));
  const daily = dailyOverview.map(row => ({ ...row, followers: followerByDate.get(row.observedDate) ?? null }));
  if (daily.some(row => row.followers === null)) warnings.push("followers:missing_daily_value");
  return { daily, warnings };
}

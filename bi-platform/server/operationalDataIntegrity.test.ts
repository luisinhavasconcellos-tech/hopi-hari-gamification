import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import XLSX from "xlsx";

type Cell = string | number | boolean | Date | null | undefined;
type Row = Cell[];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (name: string) => path.join(ROOT, "data", "source-sheets", name);

function rows(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing sheet ${sheetName}`);
  return XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, raw: true, defval: null });
}

function canonicalUrl(value: string) {
  const url = new URL(value.trim());
  url.search = "";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

function isoDate(value: Cell) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}` : null;
  }
  return String(value ?? "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

describe("operational source integrity", () => {
  it("preserves all social-link rows while collapsing exact tracked URL duplicates", () => {
    const workbook = XLSX.readFile(source("social-listening.xlsx"), { cellDates: true });
    const rawUrls: Array<{ platform: string; url: string }> = [];
    for (const sheetName of workbook.SheetNames) {
      rows(workbook, sheetName).forEach(row => {
        const candidate = sheetName === "X" ? row[0] : row[1];
        if (typeof candidate === "string" && /^\s*https?:\/\//i.test(candidate)) {
          rawUrls.push({ platform: sheetName, url: canonicalUrl(candidate) });
        }
      });
    }
    const uniqueKeys = new Set(rawUrls.map(row => `${row.platform}:${crypto.createHash("sha256").update(row.url).digest("hex")}`));
    expect(rawUrls).toHaveLength(527);
    expect(uniqueKeys.size).toBe(500);
  });

  it("imports only observed weekly competitor follower cells", () => {
    const workbook = XLSX.readFile(source("competitor-followers.xlsx"), { cellDates: true });
    const sheetRows = rows(workbook, "COLETA");
    const headers = sheetRows[3];
    let observationCount = 0;
    for (const row of sheetRows.slice(4)) {
      if (!row[0] || !row[1]) continue;
      headers.forEach((header, index) => {
        if (index < 3 || !isoDate(header)) return;
        const value = row[index];
        if (value !== null && value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0) {
          observationCount += 1;
        }
      });
    }
    expect(observationCount).toBe(36);
  });

  it("preserves the full daily Hopi follower log and its four-million goal", () => {
    const workbook = XLSX.readFile(source("hopi-followers.xlsx"), { cellDates: true });
    const logRows = rows(workbook, "Log Diário");
    const observations = logRows.slice(4).reduce((count, row) => {
      if (!isoDate(row[0])) return count;
      return count + row.slice(1, 6).filter(value => Number.isInteger(Number(value)) && value !== null).length;
    }, 0);
    const goalRows = rows(workbook, "Meta 3M");
    expect(observations).toBe(420);
    expect(Number(goalRows[3][1])).toBe(4_000_000);
  });

  it("reconciles every operational revenue and attendance control total", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "operational", "2026-08-27.json"), "utf8"),
    ) as {
      revenue: Array<{
        channels: Record<string, number>;
        internalRevenueCents: number;
        externalRevenueCents: number;
        grossRevenueCents: number;
      }>;
      attendance: Array<{ publicCount: number; payingCount: number; complimentaryCount: number }>;
    };
    const internalChannels = new Set(["A & B", "MERC", "SERV", "PLAKA"]);
    expect(payload.revenue).toHaveLength(3);
    payload.revenue.forEach(point => {
      const gross = Object.values(point.channels).reduce((sum, value) => sum + value, 0);
      const internal = Object.entries(point.channels)
        .filter(([channel]) => internalChannels.has(channel))
        .reduce((sum, [, value]) => sum + value, 0);
      expect(Object.keys(point.channels)).toHaveLength(15);
      expect(gross).toBe(point.grossRevenueCents);
      expect(internal).toBe(point.internalRevenueCents);
      expect(gross - internal).toBe(point.externalRevenueCents);
    });
    expect(payload.attendance).toHaveLength(3);
    payload.attendance.forEach(point => {
      expect(point.payingCount + point.complimentaryCount).toBe(point.publicCount);
    });
  });
});

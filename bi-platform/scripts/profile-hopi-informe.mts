import fs from "node:fs";
import { parseHopiInformeExport } from "../server/lib/hopiInforme";

const file = process.argv[2];
if (!file) throw new Error("usage: tsx scripts/profile-hopi-informe.mts <chat-file>");
const raw = fs.readFileSync(file, "utf8");
const result = parseHopiInformeExport(raw);
console.log(JSON.stringify({
  bytes: Buffer.byteLength(raw),
  revenueCount: result.revenue.length,
  attendanceCount: result.attendance.length,
  warningCount: result.warnings.length,
  warnings: result.warnings.slice(0, 30),
  firstRevenue: result.revenue[0] ?? null,
  lastRevenue: result.revenue.at(-1) ?? null,
  firstAttendance: result.attendance[0] ?? null,
  lastAttendance: result.attendance.at(-1) ?? null,
}, null, 2));

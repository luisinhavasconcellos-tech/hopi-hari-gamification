import "dotenv/config";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { closePool, getPool } from "../server/_core/mysqlPool";
import { dedupeHopiInformeExport, parseHopiInformeExport } from "../server/lib/hopiInforme";
import {
  datasetToParseResult,
  importHopiInformeData,
  importHopiInformeExport,
  toOperationalDataset,
  type OperationalDataset,
} from "../server/lib/hopiInformeImport";

/**
 * Imports a WhatsApp "Hopi Informe" chat export (the .zip, its _chat.txt, or a
 * normalized dataset from data/operational/) into the operational tables,
 * without duplicating anything already stored.
 *
 *   pnpm tsx scripts/import-hopi-informe.mts <export.zip|_chat.txt|dataset.json> [--dry-run] [--emit <dataset.json>]
 *
 *   --dry-run  parse, deduplicate and print the reconciliation only (no DATABASE_URL needed)
 *   --emit     also write the normalized, deduplicated dataset as JSON (for data/operational/)
 */
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const emitIndex = args.indexOf("--emit");
const emitPath = emitIndex >= 0 ? args[emitIndex + 1] : null;
const emitValueIndex = emitIndex >= 0 ? emitIndex + 1 : -1;
const input = args.find((arg, index) => !arg.startsWith("--") && index !== emitValueIndex);
if (!input) throw new Error("usage: tsx scripts/import-hopi-informe.mts <export.zip|_chat.txt|dataset.json> [--dry-run] [--emit <dataset.json>]");

function readExport(file: string): string {
  if (file.toLowerCase().endsWith(".zip")) {
    // WhatsApp exports always contain `_chat.txt`; media attachments are ignored.
    return execFileSync("unzip", ["-p", file, "_chat.txt"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  }
  return fs.readFileSync(file, "utf8");
}

const fileName = path.basename(input);
const isDataset = input.toLowerCase().endsWith(".json");
const dataset: OperationalDataset | null = isDataset ? (JSON.parse(fs.readFileSync(input, "utf8")) as OperationalDataset) : null;
const raw = isDataset ? null : readExport(input);

if (emitPath) {
  if (!raw) throw new Error("--emit needs a chat export as input, not a dataset");
  fs.writeFileSync(emitPath, `${JSON.stringify(toOperationalDataset(raw, { fileName }), null, 2)}\n`);
  console.error(`dataset written to ${emitPath}`);
}

const parsedResult = dataset ? datasetToParseResult(dataset) : parseHopiInformeExport(raw!);

if (dryRun) {
  const { data, stats } = dedupeHopiInformeExport(parsedResult);
  const dates = [...data.revenue, ...data.attendance].map(point => point.businessDate).sort();
  console.log(JSON.stringify({
    status: "dry-run",
    file: fileName,
    parsed: { revenue: data.revenue.length, attendance: data.attendance.length, closings: data.closings.length, forecasts: data.forecasts.length },
    duplicatesCollapsed: stats,
    dateRange: dates.length ? [dates[0], dates.at(-1)] : null,
    warnings: data.warnings,
  }, null, 2));
  process.exit(0);
}

try {
  const result = dataset
    ? await importHopiInformeData(getPool(), parsedResult, { contentHash: dataset.contentHash, fileName: dataset.sourceFile ?? fileName })
    : await importHopiInformeExport(getPool(), raw!, { fileName });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await closePool();
}

import fs from "node:fs";

export type FacebookDailyRow = {
  observedDate: string;
  value: number;
  sourceFile: string;
  sourceRow: number;
};

export type FacebookDemographicSnapshot = {
  observedDate: string;
  demographics: {
    ageGender: Array<{ age: string; womenPct: number; menPct: number }>;
    cities: Array<{ name: string; sharePct: number }>;
    countries: Array<{ name: string; sharePct: number }>;
  };
  sourceFile: string;
};

export type FacebookCsvBundle = {
  daily: {
    followers: FacebookDailyRow[];
    linkClicks: FacebookDailyRow[];
    interactions: FacebookDailyRow[];
    visits: FacebookDailyRow[];
    views: FacebookDailyRow[];
    viewers: FacebookDailyRow[];
  };
  demographics: FacebookDemographicSnapshot;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current);
  return values;
}

function readLines(file: string): string[] {
  const buffer = fs.readFileSync(file);
  const encoding = buffer.includes(0) ? "utf16le" : "utf8";
  return buffer
    .toString(encoding)
    .replace(/^\uFEFF/, "")
    .replace(/^sep=,\r?\n/, "")
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0);
}

function parseNonNegative(value: string, sourceFile: string, sourceRow: number): number {
  const normalized = value.trim().replace(/\s/g, "");
  // `Number("")` is 0: an empty cell must be rejected, not stored as zero.
  if (normalized === "") throw new Error(`${sourceFile}:${sourceRow}:missing_value`);
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
    throw new Error(`${sourceFile}:${sourceRow}:invalid_non_negative_integer`);
  }
  return number;
}

function parsePercent(value: string, sourceFile: string, sourceRow: number): number {
  const number = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw new Error(`${sourceFile}:${sourceRow}:invalid_percentage`);
  }
  return number;
}

export function parseDailyMetricCsv(file: string, sourceFile = file): FacebookDailyRow[] {
  const lines = readLines(file);
  if (lines.length < 3) throw new Error(`${sourceFile}:missing_data`);
  const header = parseCsvLine(lines[1]).map(value => value.trim());
  if (header[0] !== "Data" || header[1] !== "Primary") throw new Error(`${sourceFile}:unexpected_header`);
  return lines.slice(2).map((line, offset) => {
    const sourceRow = offset + 3;
    const [dateTime, rawValue] = parseCsvLine(line);
    const observedDate = dateTime.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(observedDate)) throw new Error(`${sourceFile}:${sourceRow}:invalid_date`);
    return { observedDate, value: parseNonNegative(rawValue, sourceFile, sourceRow), sourceFile, sourceRow };
  });
}

export function parseDemographicsCsv(file: string, observedDate: string, sourceFile = file): FacebookDemographicSnapshot {
  const lines = readLines(file).map(parseCsvLine);
  const ageGenderStart = lines.findIndex(row => row[0] === "Faixa etária e gênero" || row[0] === "Faixa et�ria e g�nero");
  const citiesStart = lines.findIndex(row => row[0] === "Principais cidades" || row[0] === "Principais cidades");
  const countriesStart = lines.findIndex(row => row[0] === "Principais países" || row[0] === "Principais pa�ses");
  if (ageGenderStart < 0 || citiesStart < 0 || countriesStart < 0) throw new Error(`${sourceFile}:missing_demographic_sections`);
  const ageGender = lines.slice(ageGenderStart + 2, citiesStart).filter(row => row[0]).map((row, index) => ({
    age: row[0],
    womenPct: parsePercent(row[1], sourceFile, ageGenderStart + index + 3),
    menPct: parsePercent(row[2], sourceFile, ageGenderStart + index + 3),
  }));
  const cities = (lines[citiesStart + 1] ?? []).map((name, index) => ({ name, sharePct: parsePercent(lines[citiesStart + 2]?.[index] ?? "", sourceFile, citiesStart + 3) })).filter(row => row.name);
  const countries = (lines[countriesStart + 1] ?? []).map((name, index) => ({ name, sharePct: parsePercent(lines[countriesStart + 2]?.[index] ?? "", sourceFile, countriesStart + 3) })).filter(row => row.name);
  return { observedDate, demographics: { ageGender, cities, countries }, sourceFile };
}

export function parseFacebookBundle(files: { followers: string; linkClicks: string; interactions: string; visits: string; views: string; viewers: string; demographics: string }): FacebookCsvBundle {
  const daily = {
    followers: parseDailyMetricCsv(files.followers, "Seguidores"),
    linkClicks: parseDailyMetricCsv(files.linkClicks, "Cliquesnolink"),
    interactions: parseDailyMetricCsv(files.interactions, "Interacoes"),
    visits: parseDailyMetricCsv(files.visits, "Visitas"),
    views: parseDailyMetricCsv(files.views, "Visualizacoes"),
    viewers: parseDailyMetricCsv(files.viewers, "Visualizadores"),
  };
  const latestDate = [...daily.followers, ...daily.linkClicks, ...daily.interactions, ...daily.visits, ...daily.views, ...daily.viewers].map(row => row.observedDate).sort().at(-1);
  if (!latestDate) throw new Error("facebook_bundle:missing_daily_dates");
  return { daily, demographics: parseDemographicsCsv(files.demographics, latestDate, "Publico") };
}

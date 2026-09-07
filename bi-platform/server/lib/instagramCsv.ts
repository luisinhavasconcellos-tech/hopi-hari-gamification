import { parseDailyMetricCsv, parseDemographicsCsv, type FacebookDailyRow, type FacebookDemographicSnapshot } from "./facebookCsv";

export type InstagramCsvBundle = {
  daily: {
    followers: FacebookDailyRow[];
    linkClicks: FacebookDailyRow[];
    interactions: FacebookDailyRow[];
    visits: FacebookDailyRow[];
    reach: FacebookDailyRow[];
    views: FacebookDailyRow[];
  };
  demographics: FacebookDemographicSnapshot;
};

export function parseInstagramBundle(files: {
  followers: string;
  linkClicks: string;
  interactions: string;
  visits: string;
  reach: string;
  views: string;
  demographics: string;
}): InstagramCsvBundle {
  const daily = {
    followers: parseDailyMetricCsv(files.followers, "Instagram/Seguidores"),
    linkClicks: parseDailyMetricCsv(files.linkClicks, "Instagram/CliquesNoLink"),
    interactions: parseDailyMetricCsv(files.interactions, "Instagram/Interacoes"),
    visits: parseDailyMetricCsv(files.visits, "Instagram/Visitas"),
    reach: parseDailyMetricCsv(files.reach, "Instagram/Alcance"),
    views: parseDailyMetricCsv(files.views, "Instagram/Visualizacoes"),
  };
  const latestDate = [...daily.followers, ...daily.linkClicks, ...daily.interactions, ...daily.visits, ...daily.reach, ...daily.views]
    .map(row => row.observedDate)
    .sort()
    .at(-1);
  if (!latestDate) throw new Error("instagram_bundle:missing_daily_dates");
  return { daily, demographics: parseDemographicsCsv(files.demographics, latestDate, "Instagram/Publico") };
}

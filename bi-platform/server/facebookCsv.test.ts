import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDailyMetricCsv, parseDemographicsCsv, parseFacebookBundle } from "./lib/facebookCsv";

const upload = "/home/ubuntu/upload";
const files = {
  followers: `${upload}/Seguidores(1).csv`,
  linkClicks: `${upload}/Cliquesnolink.csv`,
  interactions: `${upload}/Interações.csv`,
  visits: `${upload}/Visitas.csv`,
  views: `${upload}/Visualizações.csv`,
  viewers: `${upload}/Visualizadores.csv`,
  demographics: `${upload}/Público(1).csv`,
};

const hasFixtures = Object.values(files).every(file => fs.existsSync(file));
const describeFixtures = hasFixtures ? describe : describe.skip;

describeFixtures("facebook CSV parser", () => {
  it("parses daily series without treating the title rows as data", () => {
    const rows = parseDailyMetricCsv(files.followers, "Seguidores");
    expect(rows.length).toBeGreaterThan(20);
    expect(rows[0]).toMatchObject({ observedDate: "2026-08-01", value: 25, sourceRow: 3 });
    expect(rows.at(-1)?.observedDate).toBe("2026-08-28");
  });

  it("parses the demographic report separately from daily metrics", () => {
    const snapshot = parseDemographicsCsv(files.demographics, "2026-08-28", "Publico");
    expect(snapshot.observedDate).toBe("2026-08-28");
    expect(snapshot.demographics.ageGender).toHaveLength(6);
    expect(snapshot.demographics.cities[0]).toMatchObject({ name: "São Paulo, SP", sharePct: 23.9 });
    expect(snapshot.demographics.countries[0]).toMatchObject({ name: "Brasil", sharePct: 97.5 });
  });

  it("builds the complete bundle and preserves all seven source files", () => {
    const bundle = parseFacebookBundle(files);
    expect(bundle.daily.followers.length).toBe(bundle.daily.views.length);
    expect(bundle.daily.linkClicks.at(-1)?.value).toBe(1006);
    expect(bundle.daily.interactions.at(-1)?.value).toBe(543);
    expect(bundle.daily.visits.at(-1)?.value).toBe(867);
    expect(bundle.daily.views.at(-1)?.value).toBe(296835);
    expect(bundle.daily.viewers.at(-1)?.value).toBe(215448);
    expect(fs.existsSync(files.demographics)).toBe(true);
  });
});

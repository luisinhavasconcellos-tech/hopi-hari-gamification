import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseInstagramBundle } from "./lib/instagramCsv";

const upload = "/home/ubuntu/upload";
const files = {
  followers: `${upload}/Seguidores(2).csv`,
  linkClicks: `${upload}/Cliquesnolink(1).csv`,
  interactions: `${upload}/Interações(1).csv`,
  visits: `${upload}/Visitas(1).csv`,
  reach: `${upload}/Alcance.csv`,
  views: `${upload}/Visualizações(1).csv`,
  demographics: `${upload}/Público(1).csv`,
};

const hasFixtures = Object.values(files).every(file => fs.existsSync(file));
const describeFixtures = hasFixtures ? describe : describe.skip;

describeFixtures("instagram CSV bundle", () => {
  it("parses the shared August date range and keeps Instagram metrics distinct", () => {
    const bundle = parseInstagramBundle(files);
    expect(bundle.daily.followers).toHaveLength(27);
    expect(bundle.daily.followers[0]).toMatchObject({ observedDate: "2026-08-01", value: 1476 });
    expect(bundle.daily.followers.at(-1)).toMatchObject({ observedDate: "2026-08-27", value: 1307 });
    expect(bundle.daily.interactions.at(-1)?.value).toBe(17336);
    expect(bundle.daily.reach.at(-1)?.value).toBe(305216);
    expect(bundle.daily.views.at(-1)?.value).toBe(996058);
    expect(bundle.daily.visits.at(-1)?.value).toBe(11422);
    expect(bundle.daily.linkClicks.at(-1)?.value).toBe(3165);
  });

  it("uses the latest daily date for the undated demographics export", () => {
    const bundle = parseInstagramBundle(files);
    expect(bundle.demographics.observedDate).toBe("2026-08-28");
    expect(bundle.demographics.demographics.countries[0]).toMatchObject({ name: "Brasil", sharePct: 97.5 });
  });
});

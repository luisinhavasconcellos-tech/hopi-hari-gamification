import { describe, expect, it } from "vitest";
import { collectBiSnapshot } from "./lib/biSnapshot";
import { sanitizeBriefingGrounding, validateBriefingGrounding, type GeneratedBriefing } from "./lib/dailyBriefing";

const section = (key: GeneratedBriefing["sections"][number]["key"], narrative: string) => ({
  key,
  title: key,
  status: "neutral" as const,
  narrative,
  metrics: [],
});

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase("daily briefing social grounding", () => {
  it("preserves imported Facebook and Instagram values in the narration", async () => {
    const snapshot = await collectBiSnapshot();
    const briefing: GeneratedBriefing = {
      title: "Briefing diário",
      executiveSummary: "Facebook e Instagram atualizados.",
      narration: "Instagram alcançou 305216 pessoas e Facebook registrou 1006 cliques.",
      sections: [
        section("sales", "Sem alteração."),
        section("attendance", "Sem alteração."),
        section("audience", "Sem alteração."),
        section("social", "Instagram alcançou 305216 pessoas e Facebook registrou 1006 cliques."),
        section("crm", "Sem alteração."),
        section("reputation", "Sem alteração."),
        section("campaigns", "Sem alteração."),
      ],
      priorities: [],
    };
    const sanitized = sanitizeBriefingGrounding(briefing, snapshot);
    expect(sanitized.narration).toContain("305216");
    expect(sanitized.narration).toContain("1006");
    expect(() => validateBriefingGrounding(sanitized, snapshot)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  type GeneratedBriefing,
  parseGeneratedBriefing,
  reportDateInSaoPaulo,
  sanitizeBriefingGrounding,
  validateBriefingGrounding,
} from "./lib/dailyBriefing";
import type { BiSnapshot } from "./lib/biSnapshot";

const fixedSnapshot = {
  asOf: "2026-08-27T10:00:00.000Z",
  sales: { revenue: 1200, quantity: 80 },
  attendance: { visitors: 5000 },
  audience: { totalFollowers: 100000 },
  social: { x: { available: false, reason: "credential_missing" } },
  crm: { totalLeads: 45 },
  reputation: { sampleSize: 20 },
  campaigns: { activeCount: 2 },
  coverage: { warnings: ["attendance: source_error"] },
} as unknown as BiSnapshot;

const validReport: GeneratedBriefing = {
  title: "Briefing de 27 de agosto de 2026",
  executiveSummary: "Receita medida em 1.200 e 80 unidades.",
  narration: "O snapshot registra 1.200 de receita e 100.000 seguidores.",
  sections: [
    { key: "sales", title: "Vendas", status: "neutral", narrative: "Receita de 1.200.", metrics: [] },
    { key: "attendance", title: "Público", status: "unavailable", narrative: "Fonte indisponível.", metrics: [] },
    { key: "audience", title: "Audiência", status: "neutral", narrative: "Base de 100.000.", metrics: [] },
    { key: "social", title: "Social", status: "attention", narrative: "X indisponível.", metrics: [] },
    { key: "crm", title: "CRM", status: "neutral", narrative: "Há 45 leads.", metrics: [] },
    { key: "reputation", title: "Reputação", status: "neutral", narrative: "Amostra de 20.", metrics: [] },
    { key: "campaigns", title: "Campanhas", status: "neutral", narrative: "Existem 2 ativas.", metrics: [] },
  ],
  priorities: [],
};

describe("daily briefing synthesis contract", () => {
  it("uses the São Paulo business date", () => {
    expect(reportDateInSaoPaulo(new Date("2026-08-28T01:30:00.000Z"))).toBe("2026-08-27");
  });

  it("rejects a report that omits required BI domains", () => {
    expect(() =>
      parseGeneratedBriefing(
        JSON.stringify({ title: "Relatório", executiveSummary: "Resumo", narration: "Narração", sections: [], priorities: [] }),
      ),
    ).toThrow();
  });

  it("accepts only numeric claims present in the fixed BI snapshot", () => {
    expect(() => validateBriefingGrounding(validReport, fixedSnapshot)).not.toThrow();
    expect(() =>
      validateBriefingGrounding(
        { ...validReport, executiveSummary: "A receita chegou a 9.999." },
        fixedSnapshot,
      ),
    ).toThrow(/unsupported_numbers=9.999/);
  });

  it("removes unsupported numeric claims before a report is persisted", () => {
    const sanitized = sanitizeBriefingGrounding(
      { ...validReport, executiveSummary: "Receita de 9.999 em 27 de agosto de 2026." },
      fixedSnapshot,
    );
    expect(sanitized.executiveSummary).not.toContain("9.999");
    expect(sanitized.executiveSummary).toContain("27");
    expect(() => validateBriefingGrounding(sanitized, fixedSnapshot)).not.toThrow();
  });

  it("requires failed sources to remain explicitly unavailable", () => {
    const sections = validReport.sections.map(section =>
      section.key === "attendance" ? { ...section, status: "neutral" as const } : section,
    );
    expect(() => validateBriefingGrounding({ ...validReport, sections }, fixedSnapshot)).toThrow(
      /invalid_unavailable_sections=attendance/,
    );
  });
});

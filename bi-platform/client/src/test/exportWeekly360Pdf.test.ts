import { describe, expect, it } from "vitest";
import { buildWeekly360PdfFileName } from "@/lib/exportWeekly360Pdf";

describe("weekly 360 PDF filename", () => {
  it("uses the exact operational week in a safe deterministic filename", () => {
    expect(buildWeekly360PdfFileName({
      report: { periodStart: "2026-08-24", periodEnd: "2026-08-30" },
    } as never)).toBe("hopi-hari-relatorio-360-semana-2026-08-24-a-2026-08-30.pdf");
  });
});

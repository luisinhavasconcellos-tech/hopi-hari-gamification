import { describe, expect, it } from "vitest";
import { parseHopiInformeExport, shouldPreserveOperationalSource } from "./lib/hopiInforme";

const sample = `[27/08/2026, 17:00:17] ~ Hopi Hari Informe: 📊 *Público do dia*
📅 *Data:* 27/08/2026
⏱ *Hora:* 17:00
👥 *Publico:* 4728
💳 *Pagantes:* 4230
🎟️ *Cortesias:* 498
⬆️ *Entraram:* 0
⬇️ *Sairam:* 1
🏟️ *Atualmente no parque:* 4650
[27/08/2026, 17:01:13] ~ Hopi Hari Informe: 💰 *FATURAMENTO*
⏱️ Atualizado às 17:00
📅 Data: 27/08/2026
🔹 A & B: R$ 189.218,29
🔹 MERC: R$ 19.487,45
🔹 SERV: R$ 82.434,16
🔹 E-COMMERCE: R$ 154.805,63
🔹 TLMKT: R$ 36.053,00
🔹 BILHETERIA: R$ 17.329,40
🔹 ESCOLA PARTICULAR: R$ 130.589,55
🔹 EVENTOS: R$ 33.105,30
🔹 TURISMO: R$ 30.759,46
🔹 ESCOLA PUBLICA: R$ 30.469,00
🔹 AGVT: R$ 5.015,00
🔹 HOPI NIVER: R$ 1.819,30
🔹 EMPRESA: R$ 826,40
🔹 PLAKA: R$ 645,00
📈 *RESUMO DO PERÍODO*
Receita Interna: R$ 291.784,90
Receita Externa: R$ 440.772,04
💵 Total Bruto: *R$ 732.556,94*
📊 TICKET MÉDIO INTERNO
💸 Per Capita: R$ 61,58`;

describe("Hopi Informe export parser", () => {
  it("extracts one revenue and one attendance point with São Paulo timestamps", () => {
    const result = parseHopiInformeExport(sample);
    expect(result.revenue).toHaveLength(1);
    expect(result.attendance).toHaveLength(1);
    expect(result.revenue[0]).toMatchObject({
      businessDate: "2026-08-27",
      localHour: 17,
      grossRevenueCents: 73255694,
      internalRevenueCents: 29178490,
      externalRevenueCents: 44077204,
      internalPerCapitaCents: 6158,
    });
    expect(result.attendance[0]).toMatchObject({
      publicCount: 4728,
      payingCount: 4230,
      complimentaryCount: 498,
      currentlyInPark: 4650,
    });
    expect(result.warnings).toEqual([]);
  });

  it("reports malformed totals without silently changing source values", () => {
    const malformed = sample.replace("Total Bruto: *R$ 732.556,94*", "Total Bruto: *R$ 732.556,95*");
    const result = parseHopiInformeExport(malformed);
    expect(result.revenue).toHaveLength(1);
    expect(result.warnings).toContain("2026-08-27T20:00:00.000Z:gross_total_mismatch");
  });

  it("preserves facts already owned by a different operational source", () => {
    expect(shouldPreserveOperationalSource("manual-operational-snapshots", "whatsapp-hopi-informe-export")).toBe(true);
    expect(shouldPreserveOperationalSource("whatsapp-hopi-informe-export", "whatsapp-hopi-informe-export")).toBe(false);
    expect(shouldPreserveOperationalSource(null, "whatsapp-hopi-informe-export")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { dedupeHopiInformeExport, parseHopiInformeExport, shouldPreserveOperationalSource } from "./lib/hopiInforme";

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

  it("keeps the negative end-of-day in-park balance and reads the daily closing summary", () => {
    const closing = `[27/08/2026, 21:00:16] ~ Hopi Hari Informe: 📊 *Público do dia*
📅 *Data:* 27/08/2026
⏱ *Hora:* 21:00
👥 *Publico:* 4772
💳 *Pagantes:* 4230
🎟️ *Cortesias:* 542
⬆️ *Entraram:* 0
⬇️ *Sairam:* 3821
🏟️ *Atualmente no parque:* -52

*FECHAMENTO DIÁRIO*
🎯 *Previsão do dia:* 5.445
✅ *Realizado:* 4.772
📊 *Variação: -673*`;
    const result = parseHopiInformeExport(closing);
    expect(result.attendance).toHaveLength(1);
    expect(result.attendance[0]).toMatchObject({ localHour: 21, publicCount: 4772, currentlyInPark: -52 });
    expect(result.closings).toEqual([
      expect.objectContaining({ businessDate: "2026-08-27", forecastCount: 5445, realizedCount: 4772, variation: -673 }),
    ]);
    expect(result.warnings).toEqual(["2026-08-28T00:00:00.000Z:negative_currently_in_park"]);
  });

  it("parses forecast messages as one point per business date, stamped with the message time", () => {
    const forecast = `[28/08/2026, 11:03:08] ~ Hopi Hari Informe: 📊 *Previsão de Público*
📅 *de 24/08/2026 a 07/09/2026*

*Quinta* (27/08/2026): 4.772
*Sábado* (29/08/2026): 12.564
`;
    const result = parseHopiInformeExport(forecast);
    expect(result.forecasts).toEqual([
      { issuedAt: "2026-08-28T14:03:08.000Z", businessDate: "2026-08-27", forecastCount: 4772, messageIndex: 0 },
      { issuedAt: "2026-08-28T14:03:08.000Z", businessDate: "2026-08-29", forecastCount: 12564, messageIndex: 0 },
    ]);
    expect(result.revenue).toHaveLength(0);
    expect(result.attendance).toHaveLength(0);
  });

  it("collapses re-sent messages for the same moment, keeping the later correction", () => {
    const resent = `${sample}
${sample.replace("*Atualmente no parque:* 4650", "*Atualmente no parque:* 4651").replace("Total Bruto: *R$ 732.556,94*", "Total Bruto: *R$ 732.556,94*")}`;
    const parsed = parseHopiInformeExport(resent);
    expect(parsed.attendance).toHaveLength(2);
    const { data, stats } = dedupeHopiInformeExport(parsed);
    expect(stats).toEqual({ revenueDuplicates: 1, attendanceDuplicates: 1, closingDuplicates: 0, forecastDuplicates: 0 });
    expect(data.attendance).toHaveLength(1);
    expect(data.attendance[0].currentlyInPark).toBe(4651);
    expect(data.revenue).toHaveLength(1);
  });
});

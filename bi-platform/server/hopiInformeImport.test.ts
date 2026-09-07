import { describe, expect, it } from "vitest";
import {
  channelBusinessGroup,
  channelClassification,
  contentHash,
  toOperationalDataset,
} from "./lib/hopiInformeImport";

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
🔹 A & B: R$ 100,00
🔹 BILHETERIA: R$ 50,00
📈 *RESUMO DO PERÍODO*
Receita Interna: R$ 100,00
Receita Externa: R$ 50,00
💵 Total Bruto: *R$ 150,00*`;

describe("Hopi Informe import helpers", () => {
  it("classifies channels with the dashboard taxonomy and a safe default", () => {
    expect(channelClassification("A & B")).toBe("internal");
    expect(channelClassification("E-COMMERCE")).toBe("external");
    expect(channelBusinessGroup("BILHETERIA")).toBe("Ingressos");
    expect(channelBusinessGroup("ESCOLA PUBLICA")).toBe("B2B & Grupos");
    expect(channelBusinessGroup("NOVO CANAL")).toBe("Ingressos");
  });

  it("produces a stable content hash so the same export is never imported twice", () => {
    expect(contentHash(sample)).toBe(contentHash(sample));
    expect(contentHash(sample)).not.toBe(contentHash(`${sample}\n`));
  });

  it("emits a normalized dataset without message indexes", () => {
    const dataset = toOperationalDataset(`${sample}\n${sample}`, { fileName: "_chat.txt" });
    expect(dataset.dateRange).toEqual(["2026-08-27", "2026-08-27"]);
    expect(dataset.duplicatesCollapsed).toEqual({ revenueDuplicates: 1, attendanceDuplicates: 1, closingDuplicates: 0, forecastDuplicates: 0 });
    expect(dataset.revenue).toHaveLength(1);
    expect(dataset.revenue[0]).not.toHaveProperty("messageIndex");
    expect(dataset.revenue[0]).toMatchObject({ grossRevenueCents: 15000, channels: { "A & B": 10000, BILHETERIA: 5000 } });
    expect(dataset.attendance[0]).toMatchObject({ publicCount: 4728 });
  });
});

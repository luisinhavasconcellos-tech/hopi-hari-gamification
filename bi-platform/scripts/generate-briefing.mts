import "dotenv/config";
import { generateDailyBriefing } from "../server/lib/dailyBriefing";

const briefing = await generateDailyBriefing({ force: true });

console.log(
  JSON.stringify(
    {
      id: briefing?.id ?? null,
      reportDate: briefing?.reportDate ?? null,
      status: briefing?.status ?? null,
      xStatus: briefing?.xStatus ?? null,
      model: briefing?.model ?? null,
    },
    null,
    2,
  ),
);

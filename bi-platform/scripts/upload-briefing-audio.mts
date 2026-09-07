import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getDailyBriefingByDate, saveDailyBriefingAudio } from "../server/db";
import { storagePut } from "../server/storage";

const [audioPath, reportDate] = process.argv.slice(2);

if (!audioPath || !reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
  throw new Error("Usage: upload-briefing-audio.mts <audio-path> <YYYY-MM-DD>");
}

// Verify the briefing exists before uploading, so a typo in the date does
// not leave an orphaned object in storage.
const existing = await getDailyBriefingByDate(reportDate);
if (!existing) throw new Error(`Briefing ${reportDate} does not exist; generate it before uploading narration audio`);

const audio = await readFile(audioPath);
const stored = await storagePut(`daily-briefings/${reportDate}/narration.wav`, audio, "audio/wav");
const briefing = await saveDailyBriefingAudio(reportDate, stored);

if (!briefing?.audioKey) throw new Error(`Briefing ${reportDate} was not updated with narration audio`);

console.log(JSON.stringify({ ok: true, reportDate, audioReady: true, bytes: audio.length }));
process.exit(0);

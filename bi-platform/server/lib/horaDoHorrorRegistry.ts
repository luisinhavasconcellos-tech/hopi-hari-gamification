import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getPool } from "../_core/mysqlPool";


const textOrNull = (value: string | undefined) => value?.trim() || null;
export const sourceLabelOrDefault = (value: string | undefined) => value?.trim() || "Registro oficial · Dashboard";

export type HoraDoHorrorCampaignRecord = {
  id: number;
  edition: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "scheduled" | "active" | "completed";
  notes: string | null;
  sourceLabel: string;
  creativeCount: number;
  creatives: HoraDoHorrorCreativeRecord[];
};

export type HoraDoHorrorCreativeRecord = {
  id: number;
  campaignId: number;
  creativeName: string;
  platform: "instagram" | "facebook" | "tiktok" | "multiplatform";
  creativeFormat: string;
  publishedDate: string;
  targetUrl: string | null;
  utmCampaign: string | null;
  callToAction: string | null;
  status: "planned" | "published" | "paused";
  notes: string | null;
  sourceLabel: string;
};

type CampaignRow = RowDataPacket & {
  id: number | string;
  edition: string;
  period_start: string;
  period_end: string;
  status: HoraDoHorrorCampaignRecord["status"];
  notes: string | null;
  source_label: string;
};

type CreativeRow = RowDataPacket & {
  id: number | string;
  campaign_id: number | string;
  creative_name: string;
  platform: HoraDoHorrorCreativeRecord["platform"];
  creative_format: string;
  published_date: string;
  target_url: string | null;
  utm_campaign: string | null;
  call_to_action: string | null;
  status: HoraDoHorrorCreativeRecord["status"];
  notes: string | null;
  source_label: string;
};

export type SaveCampaignInput = {
  id?: number;
  edition: string;
  periodStart: string;
  periodEnd: string;
  status: HoraDoHorrorCampaignRecord["status"];
  notes?: string;
  sourceLabel?: string;
  actorOpenId: string;
};

export type SaveCreativeInput = {
  id?: number;
  campaignId: number;
  creativeName: string;
  platform: HoraDoHorrorCreativeRecord["platform"];
  creativeFormat: string;
  publishedDate: string;
  targetUrl?: string;
  utmCampaign?: string;
  callToAction?: string;
  status: HoraDoHorrorCreativeRecord["status"];
  notes?: string;
  sourceLabel?: string;
  actorOpenId: string;
};

function mapCreative(row: CreativeRow): HoraDoHorrorCreativeRecord {
  return {
    id: Number(row.id),
    campaignId: Number(row.campaign_id),
    creativeName: row.creative_name,
    platform: row.platform,
    creativeFormat: row.creative_format,
    publishedDate: row.published_date,
    targetUrl: row.target_url,
    utmCampaign: row.utm_campaign,
    callToAction: row.call_to_action,
    status: row.status,
    notes: row.notes,
    sourceLabel: row.source_label,
  };
}

export async function listHoraDoHorrorRegistry(): Promise<HoraDoHorrorCampaignRecord[]> {
  const db = getPool();
  const [[campaignRows], [creativeRows]] = await Promise.all([
    db.query<CampaignRow[]>(
      `SELECT id, edition, period_start, period_end, status, notes, source_label
       FROM hora_do_horror_campaigns
       WHERE active = 1
       ORDER BY period_start DESC, id DESC`,
    ),
    db.query<CreativeRow[]>(
      `SELECT id, campaign_id, creative_name, platform, creative_format, published_date, target_url,
              utm_campaign, call_to_action, status, notes, source_label
       FROM hora_do_horror_creatives
       WHERE active = 1
       ORDER BY published_date ASC, id ASC`,
    ),
  ]);

  const creativesByCampaign = new Map<number, HoraDoHorrorCreativeRecord[]>();
  creativeRows.forEach(row => {
    const creative = mapCreative(row);
    const current = creativesByCampaign.get(creative.campaignId) ?? [];
    current.push(creative);
    creativesByCampaign.set(creative.campaignId, current);
  });

  return campaignRows.map(row => {
    const id = Number(row.id);
    const creatives = creativesByCampaign.get(id) ?? [];
    return {
      id,
      edition: row.edition,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      notes: row.notes,
      sourceLabel: row.source_label,
      creativeCount: creatives.length,
      creatives,
    };
  });
}

export async function saveHoraDoHorrorCampaign(input: SaveCampaignInput) {
  const db = getPool();
  const sourceLabel = sourceLabelOrDefault(input.sourceLabel);
  const values = [input.edition.trim(), input.periodStart, input.periodEnd, input.status, textOrNull(input.notes), sourceLabel, input.actorOpenId];

  if (input.id) {
    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE hora_do_horror_campaigns
       SET edition = ?, period_start = ?, period_end = ?, status = ?, notes = ?, source_label = ?, updated_by_open_id = ?
       WHERE id = ? AND active = 1`,
      [...values, input.id],
    );
    if (result.affectedRows === 0) throw new Error("Campaign was not found or is inactive");
    return { id: input.id };
  }

  await db.execute<ResultSetHeader>(
    `INSERT INTO hora_do_horror_campaigns
      (edition, period_start, period_end, status, notes, source_label, created_by_open_id, updated_by_open_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE period_start = VALUES(period_start), period_end = VALUES(period_end),
       status = VALUES(status), notes = VALUES(notes), source_label = VALUES(source_label), updated_by_open_id = VALUES(updated_by_open_id), active = 1`,
    [...values, input.actorOpenId],
  );
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id FROM hora_do_horror_campaigns WHERE edition = ? LIMIT 1",
    [input.edition.trim()],
  );
  return { id: Number(rows[0]?.id) };
}

export async function saveHoraDoHorrorCreative(input: SaveCreativeInput) {
  const db = getPool();
  const sourceLabel = sourceLabelOrDefault(input.sourceLabel);
  const values = [
    input.creativeName.trim(),
    input.platform,
    input.creativeFormat.trim(),
    input.publishedDate,
    textOrNull(input.targetUrl),
    textOrNull(input.utmCampaign),
    textOrNull(input.callToAction),
    input.status,
    textOrNull(input.notes),
    sourceLabel,
    input.actorOpenId,
  ];

  const [campaignRows] = await db.query<RowDataPacket[]>(
    "SELECT id FROM hora_do_horror_campaigns WHERE id = ? AND active = 1 LIMIT 1",
    [input.campaignId],
  );
  if (!campaignRows[0]) throw new Error("Campaign was not found or is inactive");

  if (input.id) {
    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE hora_do_horror_creatives
       SET creative_name = ?, platform = ?, creative_format = ?, published_date = ?, target_url = ?,
           utm_campaign = ?, call_to_action = ?, status = ?, notes = ?, source_label = ?, updated_by_open_id = ?
       WHERE id = ? AND campaign_id = ? AND active = 1`,
      [...values, input.id, input.campaignId],
    );
    if (result.affectedRows === 0) throw new Error("Creative was not found or is inactive");
    return { id: input.id };
  }

  await db.execute<ResultSetHeader>(
    `INSERT INTO hora_do_horror_creatives
      (campaign_id, creative_name, platform, creative_format, published_date, target_url, utm_campaign,
       call_to_action, status, notes, source_label, created_by_open_id, updated_by_open_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE platform = VALUES(platform), creative_format = VALUES(creative_format),
       target_url = VALUES(target_url), utm_campaign = VALUES(utm_campaign), call_to_action = VALUES(call_to_action),
       status = VALUES(status), notes = VALUES(notes), source_label = VALUES(source_label), updated_by_open_id = VALUES(updated_by_open_id), active = 1`,
    [input.campaignId, ...values, input.actorOpenId],
  );
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM hora_do_horror_creatives
     WHERE campaign_id = ? AND creative_name = ? AND published_date = ? LIMIT 1`,
    [input.campaignId, input.creativeName.trim(), input.publishedDate],
  );
  return { id: Number(rows[0]?.id) };
}

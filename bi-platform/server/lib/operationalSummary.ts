import { type RowDataPacket } from "mysql2/promise";
import { getPool } from "../_core/mysqlPool";


const number = (value: unknown) => Number(value ?? 0);
const nullableNumber = (value: unknown) => value === null || value === undefined ? null : Number(value);
const text = (value: unknown) => String(value ?? "");

export type OperationalSummary = Awaited<ReturnType<typeof getOperationalSummary>>;

export async function getOperationalSummary() {
  const db = getPool();
  const [revenueRows] = await db.query<RowDataPacket[]>(
    `SELECT id, business_date, local_hour, internal_revenue_cents, external_revenue_cents,
      gross_revenue_cents, internal_per_capita_cents, observed_at
     FROM revenue_snapshots ORDER BY observed_at DESC LIMIT 1`,
  );
  const revenueRow = revenueRows[0];
  const [channelRows] = revenueRow
    ? await db.query<RowDataPacket[]>(
        `SELECT c.code, c.business_group, c.classification, d.revenue_cents
         FROM revenue_channel_snapshots d
         JOIN revenue_channels c ON c.id = d.channel_id
         WHERE d.snapshot_id = ? ORDER BY d.revenue_cents DESC`,
        [revenueRow.id],
      )
    : [[] as RowDataPacket[], []];

  const [attendanceRows] = await db.query<RowDataPacket[]>(
    `SELECT business_date, local_hour, public_count, paying_count, complimentary_count,
      entries_interval, exits_interval, currently_in_park, observed_at
     FROM attendance_snapshots ORDER BY observed_at DESC LIMIT 1`,
  );

  const [audienceRows] = await db.query<RowDataPacket[]>(
    `SELECT f.observed_date, p.platform, f.follower_count
     FROM social_follower_snapshots f
     JOIN social_profiles p ON p.id = f.profile_id
     JOIN social_venues v ON v.id = p.venue_id
     WHERE v.is_hopi_hari = 1
       AND f.observed_date = (
         SELECT MAX(f2.observed_date)
         FROM social_follower_snapshots f2
         JOIN social_profiles p2 ON p2.id = f2.profile_id
         JOIN social_venues v2 ON v2.id = p2.venue_id
         WHERE v2.is_hopi_hari = 1
       )
     ORDER BY p.platform`,
  );
  const audienceDate = audienceRows[0] ? text(audienceRows[0].observed_date) : null;
  const audienceByPlatform = Object.fromEntries(
    audienceRows.map(row => [text(row.platform), number(row.follower_count)]),
  );
  const audienceTotal = audienceRows.reduce((sum, row) => sum + number(row.follower_count), 0);

  const [previousAudienceRows] = audienceDate
    ? await db.query<RowDataPacket[]>(
        `SELECT SUM(f.follower_count) AS total
         FROM social_follower_snapshots f
         JOIN social_profiles p ON p.id = f.profile_id
         JOIN social_venues v ON v.id = p.venue_id
         WHERE v.is_hopi_hari = 1
           AND f.observed_date = (
             SELECT MAX(f2.observed_date)
             FROM social_follower_snapshots f2
             JOIN social_profiles p2 ON p2.id = f2.profile_id
             JOIN social_venues v2 ON v2.id = p2.venue_id
             WHERE v2.is_hopi_hari = 1 AND f2.observed_date < ?
           )`,
        [audienceDate],
      )
    : [[] as RowDataPacket[], []];

  const [goalRows] = await db.query<RowDataPacket[]>(
    `SELECT target_count FROM social_audience_goals
     WHERE goal_key = 'total-followers' ORDER BY effective_from DESC LIMIT 1`,
  );
  const [competitorRows] = await db.query<RowDataPacket[]>(
    `SELECT v.name, MAX(f.observed_date) AS observed_date, SUM(f.follower_count) AS total_followers
     FROM social_follower_snapshots f
     JOIN social_profiles p ON p.id = f.profile_id
     JOIN social_venues v ON v.id = p.venue_id
     WHERE v.is_hopi_hari = 0 AND p.eligible_for_index = 1
       AND f.observed_date = (
         SELECT MAX(f2.observed_date) FROM social_follower_snapshots f2 WHERE f2.profile_id = f.profile_id
       )
     GROUP BY v.id, v.name ORDER BY total_followers DESC`,
  );
  const [contentRows] = await db.query<RowDataPacket[]>(
    "SELECT platform, COUNT(*) AS link_count FROM social_content_links GROUP BY platform ORDER BY platform",
  );
  const [sourceRows] = await db.query<RowDataPacket[]>(
    `SELECT s.name, r.status, r.rows_seen, r.rows_rejected, r.completed_at
     FROM operational_import_runs r
     JOIN operational_sources s ON s.id = r.source_id
     WHERE r.id IN (SELECT MAX(id) FROM operational_import_runs GROUP BY source_id)
     ORDER BY s.name`,
  );

  const attendance = attendanceRows[0];
  return {
    revenue: revenueRow
      ? {
          businessDate: text(revenueRow.business_date),
          localHour: number(revenueRow.local_hour),
          internalRevenueCents: number(revenueRow.internal_revenue_cents),
          externalRevenueCents: number(revenueRow.external_revenue_cents),
          grossRevenueCents: number(revenueRow.gross_revenue_cents),
          internalPerCapitaCents: nullableNumber(revenueRow.internal_per_capita_cents),
          observedAt: new Date(revenueRow.observed_at).toISOString(),
          channels: channelRows.map(row => ({
            code: text(row.code),
            businessGroup: text(row.business_group),
            classification: text(row.classification),
            revenueCents: number(row.revenue_cents),
          })),
        }
      : null,
    attendance: attendance
      ? {
          businessDate: text(attendance.business_date),
          localHour: number(attendance.local_hour),
          publicCount: number(attendance.public_count),
          payingCount: number(attendance.paying_count),
          complimentaryCount: number(attendance.complimentary_count),
          entriesInterval: number(attendance.entries_interval),
          exitsInterval: number(attendance.exits_interval),
          currentlyInPark: number(attendance.currently_in_park),
          observedAt: new Date(attendance.observed_at).toISOString(),
        }
      : null,
    audience: audienceDate
      ? {
          observedDate: audienceDate,
          totalFollowers: audienceTotal,
          previousTotalFollowers: nullableNumber(previousAudienceRows[0]?.total),
          // No previous reading → no delta (never "gained the whole base").
          followerChange: previousAudienceRows[0] ? audienceTotal - number(previousAudienceRows[0].total) : null,
          targetFollowers: nullableNumber(goalRows[0]?.target_count),
          byPlatform: audienceByPlatform,
        }
      : null,
    competitors: competitorRows.map(row => ({
      name: text(row.name),
      observedDate: text(row.observed_date),
      totalFollowers: number(row.total_followers),
    })),
    contentLinks: contentRows.map(row => ({ platform: text(row.platform), count: number(row.link_count) })),
    sources: sourceRows.map(row => ({
      name: text(row.name),
      status: text(row.status),
      rowsSeen: number(row.rows_seen),
      rowsRejected: number(row.rows_rejected),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    })),
  };
}

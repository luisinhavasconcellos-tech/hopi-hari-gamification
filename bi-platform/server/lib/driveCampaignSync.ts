import { GoogleAuth } from "google-auth-library";
import { getPool } from "../_core/mysqlPool";
import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

export const DRIVE_CAMPAIGN_ROOT_ID = "1MCCYMh2HZq-gxDw1xTJ3F_XFtWk7sI3m";
export const DRIVE_CAMPAIGN_CRON = "0 0 4,10,16,22 * * *";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  md5Checksum?: string;
  webViewLink?: string;
};

type CampaignAsset = DriveFile & { relativePath: string };

type StoredDriveAsset = {
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  md5Checksum: string | null;
  modifiedAt: string;
  relativePath: string | null;
  webViewLink: string | null;
};

export type DriveCampaignSyncResult = {
  sourceId: number;
  runId: number;
  rootFolderName: string;
  foldersSeen: number;
  assetsSeen: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsRejected: number;
  warnings: string[];
};


export function driveCampaignSlug(name: string, folderId: string) {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 190) || "campanha";
  return `${base}-${folderId.slice(-8).toLowerCase()}`;
}

const toEpochSeconds = (value: string | undefined | null) => {
  const ms = Date.parse(value ?? "");
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
};

export function hasDriveAssetChanged(existing: StoredDriveAsset, incoming: CampaignAsset) {
  const incomingSize = incoming.size ? Number(incoming.size) : null;
  // MySQL TIMESTAMP stores whole seconds while Drive reports milliseconds, so
  // compare at second precision or every Google-native file looks modified.
  const modifiedChanged = toEpochSeconds(existing.modifiedAt) !== toEpochSeconds(incoming.modifiedTime);
  const contentChanged = existing.md5Checksum && incoming.md5Checksum
    ? existing.md5Checksum !== incoming.md5Checksum
    : modifiedChanged || existing.sizeBytes !== incomingSize;
  return Boolean(contentChanged) || existing.name !== incoming.name || existing.mimeType !== incoming.mimeType ||
    existing.relativePath !== incoming.relativePath || existing.webViewLink !== (incoming.webViewLink ?? null);
}

export function driveAssetRejectionReason(asset: DriveFile) {
  if (!asset.id?.trim()) return "file_id_missing";
  if (!asset.name?.trim()) return "name_missing";
  if (!asset.mimeType?.trim() || asset.mimeType === FOLDER_MIME) return "mime_type_invalid";
  if (!asset.modifiedTime || Number.isNaN(Date.parse(asset.modifiedTime))) return "modified_time_missing_or_invalid";
  if (asset.size !== undefined && (!/^\d+$/.test(asset.size) || !Number.isSafeInteger(Number(asset.size)))) return "size_invalid";
  return null;
}

function privateKey() {
  return process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

async function driveAccessToken() {
  const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const key = privateKey();
  if (!clientEmail || !key) throw new Error("Google Drive service account secrets are not configured");
  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: key },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const token = await (await auth.getClient()).getAccessToken();
  if (!token.token) throw new Error("Google Drive access token was not issued");
  return token.token;
}

async function driveGet<T>(token: string, path: string, params: Record<string, string | number | boolean> = {}) {
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Drive ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

async function listChildren(token: string, folderId: string) {
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const page = await driveGet<{ files?: DriveFile[]; nextPageToken?: string }>(token, "files", {
      q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,md5Checksum,webViewLink)",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(pageToken ? { pageToken } : {}),
    });
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return files;
}

async function collectCampaignAssets(token: string, campaignFolder: DriveFile) {
  const assets: CampaignAsset[] = [];
  const subfolders: string[] = [];
  const queue: Array<{ id: string; path: string; depth: number }> = [{ id: campaignFolder.id, path: "", depth: 0 }];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth > 6) throw new Error(`${campaignFolder.id}:folder_depth_limit`);
    const children = await listChildren(token, current.id);
    for (const child of children) {
      const relativePath = current.path ? `${current.path}/${child.name}` : child.name;
      if (child.mimeType === FOLDER_MIME) {
        subfolders.push(relativePath);
        queue.push({ id: child.id, path: relativePath, depth: current.depth + 1 });
      } else {
        assets.push({ ...child, relativePath });
      }
      if (assets.length + subfolders.length > 5000) throw new Error(`${campaignFolder.id}:item_limit`);
    }
  }
  return { assets, subfolders };
}

function campaignFormats(assets: CampaignAsset[]) {
  const formats = new Set<string>();
  for (const asset of assets) {
    const extension = asset.name.includes(".") ? asset.name.split(".").pop()?.toLowerCase() : null;
    const dimensions = asset.name.match(/\b\d{3,4}[xX]\d{3,4}\b/)?.[0].toLowerCase();
    if (extension) formats.add(extension);
    if (dimensions) formats.add(dimensions);
  }
  return [...formats].sort();
}

function countOutcome(result: ResultSetHeader, stats: { rowsInserted: number; rowsUpdated: number }) {
  if (result.affectedRows === 1) stats.rowsInserted += 1;
  if (result.affectedRows === 2) stats.rowsUpdated += 1;
}

export async function syncDriveCampaigns(rootFolderId = DRIVE_CAMPAIGN_ROOT_ID): Promise<DriveCampaignSyncResult> {
  const token = await driveAccessToken();
  const root = await driveGet<DriveFile>(token, `files/${encodeURIComponent(rootFolderId)}`, { fields: "id,name,mimeType" });
  if (root.mimeType !== FOLDER_MIME) throw new Error("Configured Drive campaign root is not a folder");
  const rootChildren = await listChildren(token, rootFolderId);
  const campaignFolders = rootChildren.filter(file => file.mimeType === FOLDER_MIME);
  const warnings = rootChildren.filter(file => file.mimeType !== FOLDER_MIME).map(file => `${file.id}:root_non_folder_ignored`);
  const discovered = [] as Array<{ folder: DriveFile; assets: CampaignAsset[]; subfolders: string[] }>;
  // Folders whose scan failed (Drive 429/500, depth or item limits) are left
  // untouched instead of being deactivated as if they had been deleted.
  const failedFolderIds: string[] = [];
  for (const folder of campaignFolders) {
    try {
      discovered.push({ folder, ...(await collectCampaignAssets(token, folder)) });
    } catch (error) {
      failedFolderIds.push(folder.id);
      warnings.push(`${folder.id}:${error instanceof Error ? error.message : "campaign_scan_failed"}`);
    }
  }

  const db = getPool();
  const connection = await db.getConnection();
  let runId = 0;
  const stats = { rowsInserted: 0, rowsUpdated: 0 };
  try {
    await connection.execute(
      `INSERT INTO drive_campaign_sources (name, root_folder_id, root_folder_name, cron_expression, enabled)
       VALUES ('Hopi Hari campaign Drive', ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE root_folder_name = VALUES(root_folder_name), cron_expression = VALUES(cron_expression), enabled = 1`,
      [rootFolderId, root.name, DRIVE_CAMPAIGN_CRON],
    );
    const [sourceRows] = await connection.execute<RowDataPacket[]>("SELECT id FROM drive_campaign_sources WHERE root_folder_id = ? LIMIT 1", [rootFolderId]);
    const sourceId = Number(sourceRows[0].id);
    const [runResult] = await connection.execute<ResultSetHeader>("INSERT INTO drive_campaign_sync_runs (source_id, status) VALUES (?, 'started')", [sourceId]);
    runId = Number(runResult.insertId);
    await connection.beginTransaction();
    try {
      for (const item of discovered) {
        const images = item.assets.filter(asset => asset.mimeType.startsWith("image/"));
        const videos = item.assets.filter(asset => asset.mimeType.startsWith("video/"));
        const [campaignResult] = await connection.execute<ResultSetHeader>(
          `INSERT INTO drive_campaigns
            (source_id, drive_folder_id, slug, name, folder_url, asset_count, image_count, video_count,
             formats_json, subfolders_json, previews_json, active, last_observed_at, last_run_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?)
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), slug = VALUES(slug), name = VALUES(name), folder_url = VALUES(folder_url),
             asset_count = VALUES(asset_count), image_count = VALUES(image_count), video_count = VALUES(video_count),
             formats_json = VALUES(formats_json), subfolders_json = VALUES(subfolders_json), previews_json = VALUES(previews_json),
             active = 1, last_observed_at = NOW(), last_run_id = VALUES(last_run_id)`,
          [sourceId, item.folder.id, driveCampaignSlug(item.folder.name, item.folder.id), item.folder.name,
            item.folder.webViewLink ?? `https://drive.google.com/drive/folders/${item.folder.id}`, item.assets.length,
            images.length, videos.length, JSON.stringify(campaignFormats(item.assets)), JSON.stringify(item.subfolders),
            JSON.stringify(images.slice(0, 12).map(asset => ({ id: asset.id, name: asset.name }))), runId],
        );
        countOutcome(campaignResult, stats);
        const campaignId = Number(campaignResult.insertId);
        for (const asset of item.assets) {
          const rejection = driveAssetRejectionReason(asset);
          if (rejection) {
            warnings.push(`${asset.id || "unknown"}:${rejection}`);
            continue;
          }
          const [existingAssets] = await connection.execute<RowDataPacket[]>(
            `SELECT name, mime_type, size_bytes, md5_checksum, modified_at, relative_path, web_view_link
             FROM drive_campaign_assets WHERE drive_file_id = ? LIMIT 1`,
            [asset.id],
          );
          const existingAsset = existingAssets[0]
            ? {
                name: String(existingAssets[0].name),
                mimeType: String(existingAssets[0].mime_type),
                sizeBytes: existingAssets[0].size_bytes == null ? null : Number(existingAssets[0].size_bytes),
                md5Checksum: existingAssets[0].md5_checksum == null ? null : String(existingAssets[0].md5_checksum),
                modifiedAt: new Date(existingAssets[0].modified_at).toISOString(),
                relativePath: existingAssets[0].relative_path == null ? null : String(existingAssets[0].relative_path),
                webViewLink: existingAssets[0].web_view_link == null ? null : String(existingAssets[0].web_view_link),
              }
            : null;
          if (existingAsset && !hasDriveAssetChanged(existingAsset, asset)) {
            await connection.execute(
              "UPDATE drive_campaign_assets SET campaign_id = ?, active = 1, last_run_id = ? WHERE drive_file_id = ?",
              [campaignId, runId, asset.id],
            );
            continue;
          }
          const [assetResult] = await connection.execute<ResultSetHeader>(
            `INSERT INTO drive_campaign_assets
              (campaign_id, drive_file_id, name, mime_type, size_bytes, md5_checksum, modified_at, relative_path, web_view_link, active, last_run_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE campaign_id = VALUES(campaign_id), name = VALUES(name), mime_type = VALUES(mime_type),
               size_bytes = VALUES(size_bytes), md5_checksum = VALUES(md5_checksum), modified_at = VALUES(modified_at),
               relative_path = VALUES(relative_path), web_view_link = VALUES(web_view_link), active = 1, last_run_id = VALUES(last_run_id)`,
            [campaignId, asset.id, asset.name, asset.mimeType, asset.size ? Number(asset.size) : null, asset.md5Checksum ?? null,
              new Date(asset.modifiedTime!), asset.relativePath, asset.webViewLink ?? null, runId],
          );
          countOutcome(assetResult, stats);
        }
        await connection.execute("UPDATE drive_campaign_assets SET active = 0 WHERE campaign_id = ? AND last_run_id <> ?", [campaignId, runId]);
      }
      await connection.execute(
        `UPDATE drive_campaigns SET active = 0 WHERE source_id = ? AND last_run_id <> ?${
          failedFolderIds.length ? ` AND drive_folder_id NOT IN (${failedFolderIds.map(() => "?").join(", ")})` : ""
        }`,
        [sourceId, runId, ...failedFolderIds],
      );
      const assetsSeen = discovered.reduce((sum, item) => sum + item.assets.length, 0);
      await connection.execute(
        `UPDATE drive_campaign_sync_runs SET status = 'completed', folders_seen = ?, assets_seen = ?, rows_inserted = ?,
         rows_updated = ?, rows_rejected = ?, warnings_json = ?, completed_at = NOW() WHERE id = ?`,
        [discovered.length, assetsSeen, stats.rowsInserted, stats.rowsUpdated, warnings.length, JSON.stringify(warnings), runId],
      );
      await connection.execute("UPDATE drive_campaign_sources SET root_folder_name = ?, last_synced_at = NOW() WHERE id = ?", [root.name, sourceId]);
      await connection.commit();
      return { sourceId, runId, rootFolderName: root.name, foldersSeen: discovered.length, assetsSeen,
        rowsInserted: stats.rowsInserted, rowsUpdated: stats.rowsUpdated, rowsRejected: warnings.length, warnings };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    if (runId) {
      await connection.execute(
        "UPDATE drive_campaign_sync_runs SET status = 'failed', warnings_json = ?, completed_at = NOW() WHERE id = ?",
        [JSON.stringify([error instanceof Error ? error.message.slice(0, 500) : "drive_sync_failed"]), runId],
      );
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function getDriveCampaignSourceByTaskUid(taskUid: string) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, enabled, root_folder_id FROM drive_campaign_sources WHERE schedule_cron_task_uid = ? LIMIT 1",
    [taskUid],
  );
  return rows[0] as { id: number; enabled: number; root_folder_id: string } | undefined;
}

export async function saveDriveCampaignSchedule(rootFolderId: string, taskUid: string, cronExpression = DRIVE_CAMPAIGN_CRON) {
  await getPool().execute(
    `INSERT INTO drive_campaign_sources (name, root_folder_id, cron_expression, schedule_cron_task_uid, enabled)
     VALUES ('Hopi Hari campaign Drive', ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE cron_expression = VALUES(cron_expression), schedule_cron_task_uid = VALUES(schedule_cron_task_uid), enabled = 1`,
    [rootFolderId, cronExpression, taskUid],
  );
}

export async function listDriveCampaigns() {
  const [campaignRows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, drive_folder_id, slug, name, brand, period_start, period_end, folder_url, asset_count, image_count,
      video_count, formats_json, subfolders_json, previews_json, active, last_observed_at
     FROM drive_campaigns WHERE active = 1 ORDER BY last_observed_at DESC, name`,
  );
  const [sourceRows] = await getPool().query<RowDataPacket[]>(
    `SELECT name, root_folder_id, root_folder_name, cron_expression, last_synced_at,
      (SELECT status FROM drive_campaign_sync_runs r WHERE r.source_id = s.id ORDER BY r.id DESC LIMIT 1) AS last_status,
      (SELECT rows_rejected FROM drive_campaign_sync_runs r WHERE r.source_id = s.id ORDER BY r.id DESC LIMIT 1) AS last_rejected
     FROM drive_campaign_sources s WHERE enabled = 1 ORDER BY s.id`,
  );
  return {
    campaigns: campaignRows.map(row => ({
      id: String(row.drive_folder_id), slug: String(row.slug), name: String(row.name), brand: row.brand ? String(row.brand) : null,
      periodStart: row.period_start ? String(row.period_start) : null, periodEnd: row.period_end ? String(row.period_end) : null,
      source: "Google Drive", folderUrl: String(row.folder_url), assets: Number(row.asset_count ?? 0), images: Number(row.image_count ?? 0),
      videos: Number(row.video_count ?? 0), formats: JSON.parse(String(row.formats_json ?? "[]")),
      subfolders: JSON.parse(String(row.subfolders_json ?? "[]")), previews: JSON.parse(String(row.previews_json ?? "[]")),
      lastObservedAt: new Date(row.last_observed_at).toISOString(),
    })),
    sources: sourceRows.map(row => ({
      name: String(row.name), rootFolderId: String(row.root_folder_id), rootFolderName: row.root_folder_name ? String(row.root_folder_name) : null,
      cronExpression: String(row.cron_expression), lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at).toISOString() : null,
      lastStatus: row.last_status ? String(row.last_status) : null, lastRejected: Number(row.last_rejected ?? 0),
    })),
  };
}

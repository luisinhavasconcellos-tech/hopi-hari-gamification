import { type RowDataPacket } from "mysql2/promise";
import { getPool } from "../_core/mysqlPool";


type ArchiveImportRow = RowDataPacket & {
  id: number;
  archive_name: string;
  total_files: number | string;
  image_files: number | string;
  video_files: number | string;
  matched_asset_count: number | string;
  verification_status: "verified_match" | "needs_review";
  imported_at: Date | string;
  campaign_name: string;
  drive_folder_id: string;
};

export async function listCampaignArchiveImports() {
  const [rows] = await getPool().query<ArchiveImportRow[]>(
    `SELECT i.id, i.archive_name, i.total_files, i.image_files, i.video_files, i.matched_asset_count,
      i.verification_status, i.imported_at, c.name AS campaign_name, c.drive_folder_id
     FROM campaign_archive_imports i
     JOIN drive_campaigns c ON c.id = i.campaign_id
     WHERE c.active = 1
     ORDER BY i.imported_at DESC, c.name ASC`,
  );
  return rows.map(row => ({
    id: row.id,
    archiveName: String(row.archive_name),
    campaignName: String(row.campaign_name),
    driveFolderId: String(row.drive_folder_id),
    totalFiles: Number(row.total_files),
    imageFiles: Number(row.image_files),
    videoFiles: Number(row.video_files),
    matchedAssetCount: Number(row.matched_asset_count),
    verificationStatus: row.verification_status,
    importedAt: new Date(row.imported_at).toISOString(),
  }));
}

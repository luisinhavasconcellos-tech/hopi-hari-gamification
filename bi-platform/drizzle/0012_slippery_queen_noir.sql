ALTER TABLE `daily_briefings` MODIFY COLUMN `sections_json` mediumtext NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_briefings` MODIFY COLUMN `source_snapshot_json` mediumtext NOT NULL;--> statement-breakpoint
ALTER TABLE `drive_campaign_sync_runs` MODIFY COLUMN `warnings_json` mediumtext;--> statement-breakpoint
ALTER TABLE `drive_campaigns` MODIFY COLUMN `subfolders_json` mediumtext;--> statement-breakpoint
ALTER TABLE `operational_import_runs` MODIFY COLUMN `warnings_json` mediumtext;
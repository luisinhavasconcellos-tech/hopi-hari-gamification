CREATE TABLE `drive_campaign_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`drive_file_id` varchar(160) NOT NULL,
	`name` varchar(500) NOT NULL,
	`mime_type` varchar(180) NOT NULL,
	`size_bytes` bigint,
	`md5_checksum` varchar(64),
	`modified_at` timestamp NOT NULL,
	`relative_path` varchar(1000),
	`web_view_link` varchar(1200),
	`active` int NOT NULL DEFAULT 1,
	`last_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_campaign_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `drive_campaign_assets_file_unique` UNIQUE(`drive_file_id`)
);
--> statement-breakpoint
CREATE TABLE `drive_campaign_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`root_folder_id` varchar(160) NOT NULL,
	`root_folder_name` varchar(255),
	`cron_expression` varchar(80) NOT NULL DEFAULT '0 0 4,10,16,22 * * *',
	`schedule_cron_task_uid` varchar(65),
	`enabled` int NOT NULL DEFAULT 1,
	`last_synced_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_campaign_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `drive_campaign_sources_root_unique` UNIQUE(`root_folder_id`)
);
--> statement-breakpoint
CREATE TABLE `drive_campaign_sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_id` int NOT NULL,
	`status` enum('started','completed','failed') NOT NULL DEFAULT 'started',
	`folders_seen` int NOT NULL DEFAULT 0,
	`assets_seen` int NOT NULL DEFAULT 0,
	`rows_inserted` int NOT NULL DEFAULT 0,
	`rows_updated` int NOT NULL DEFAULT 0,
	`rows_rejected` int NOT NULL DEFAULT 0,
	`warnings_json` text,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `drive_campaign_sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drive_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_id` int NOT NULL,
	`drive_folder_id` varchar(160) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`name` varchar(255) NOT NULL,
	`brand` varchar(255),
	`period_start` varchar(10),
	`period_end` varchar(10),
	`folder_url` varchar(1000) NOT NULL,
	`asset_count` int NOT NULL DEFAULT 0,
	`image_count` int NOT NULL DEFAULT 0,
	`video_count` int NOT NULL DEFAULT 0,
	`formats_json` text,
	`subfolders_json` text,
	`previews_json` text,
	`active` int NOT NULL DEFAULT 1,
	`last_observed_at` timestamp NOT NULL,
	`last_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `drive_campaigns_source_folder_unique` UNIQUE(`source_id`,`drive_folder_id`),
	CONSTRAINT `drive_campaigns_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `drive_campaign_assets_campaign_idx` ON `drive_campaign_assets` (`campaign_id`,`active`);--> statement-breakpoint
CREATE INDEX `drive_campaign_sources_task_uid_idx` ON `drive_campaign_sources` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `drive_campaign_sync_runs_source_idx` ON `drive_campaign_sync_runs` (`source_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `drive_campaigns_active_idx` ON `drive_campaigns` (`active`,`last_observed_at`);
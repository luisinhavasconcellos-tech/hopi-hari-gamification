CREATE TABLE `attendance_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_at` timestamp NOT NULL,
	`business_date` varchar(10) NOT NULL,
	`local_hour` int NOT NULL,
	`public_count` int NOT NULL,
	`paying_count` int NOT NULL,
	`complimentary_count` int NOT NULL,
	`entries_interval` int NOT NULL,
	`exits_interval` int NOT NULL,
	`currently_in_park` int NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_snapshots_observed_at_unique` UNIQUE(`observed_at`)
);
--> statement-breakpoint
CREATE TABLE `operational_import_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_id` int NOT NULL,
	`content_hash` varchar(64) NOT NULL,
	`status` enum('started','completed','failed') NOT NULL DEFAULT 'started',
	`rows_seen` int NOT NULL DEFAULT 0,
	`rows_inserted` int NOT NULL DEFAULT 0,
	`rows_updated` int NOT NULL DEFAULT 0,
	`rows_rejected` int NOT NULL DEFAULT 0,
	`warnings_json` text,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `operational_import_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `operational_import_runs_source_hash_unique` UNIQUE(`source_id`,`content_hash`)
);
--> statement-breakpoint
CREATE TABLE `operational_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_key` varchar(120) NOT NULL,
	`source_type` enum('google_sheet','operational_message','api','manual') NOT NULL,
	`name` varchar(255) NOT NULL,
	`external_id` varchar(255),
	`source_url` varchar(1000),
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `operational_sources_key_unique` UNIQUE(`source_key`)
);
--> statement-breakpoint
CREATE TABLE `revenue_channel_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshot_id` int NOT NULL,
	`channel_id` int NOT NULL,
	`revenue_cents` bigint NOT NULL,
	`source_run_id` int NOT NULL,
	`source_row` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_channel_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_channel_snapshots_snapshot_channel_unique` UNIQUE(`snapshot_id`,`channel_id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(80) NOT NULL,
	`label` varchar(160) NOT NULL,
	`business_group` varchar(120) NOT NULL,
	`classification` enum('internal','external') NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_channels_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_channels_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `revenue_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_at` timestamp NOT NULL,
	`business_date` varchar(10) NOT NULL,
	`local_hour` int NOT NULL,
	`internal_revenue_cents` bigint NOT NULL,
	`external_revenue_cents` bigint NOT NULL,
	`gross_revenue_cents` bigint NOT NULL,
	`internal_per_capita_cents` int NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_snapshots_observed_at_unique` UNIQUE(`observed_at`)
);
--> statement-breakpoint
CREATE TABLE `social_audience_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goal_key` varchar(120) NOT NULL,
	`effective_from` varchar(10) NOT NULL,
	`target_count` int NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_audience_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_audience_goals_key_date_unique` UNIQUE(`goal_key`,`effective_from`)
);
--> statement-breakpoint
CREATE TABLE `social_content_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(40) NOT NULL,
	`canonical_url_hash` varchar(64) NOT NULL,
	`canonical_url` varchar(1000) NOT NULL,
	`original_url` varchar(1200) NOT NULL,
	`source_label` varchar(120),
	`source_order` int,
	`source_run_id` int NOT NULL,
	`source_sheet` varchar(120) NOT NULL,
	`source_row` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_content_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_content_links_platform_hash_unique` UNIQUE(`platform`,`canonical_url_hash`)
);
--> statement-breakpoint
CREATE TABLE `social_follower_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profile_id` int NOT NULL,
	`observed_date` varchar(10) NOT NULL,
	`follower_count` int NOT NULL,
	`source_run_id` int NOT NULL,
	`source_sheet` varchar(120) NOT NULL,
	`source_row` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_follower_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_follower_snapshots_profile_date_unique` UNIQUE(`profile_id`,`observed_date`)
);
--> statement-breakpoint
CREATE TABLE `social_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venue_id` int NOT NULL,
	`platform` varchar(40) NOT NULL,
	`profile_url` varchar(1000),
	`eligible_for_index` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_profiles_venue_platform_unique` UNIQUE(`venue_id`,`platform`)
);
--> statement-breakpoint
CREATE TABLE `social_venues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_hopi_hari` int NOT NULL DEFAULT 0,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_venues_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_venues_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `attendance_snapshots_business_date_idx` ON `attendance_snapshots` (`business_date`);--> statement-breakpoint
CREATE INDEX `operational_import_runs_source_idx` ON `operational_import_runs` (`source_id`);--> statement-breakpoint
CREATE INDEX `revenue_channel_snapshots_channel_idx` ON `revenue_channel_snapshots` (`channel_id`);--> statement-breakpoint
CREATE INDEX `revenue_snapshots_business_date_idx` ON `revenue_snapshots` (`business_date`);--> statement-breakpoint
CREATE INDEX `social_content_links_run_idx` ON `social_content_links` (`source_run_id`);--> statement-breakpoint
CREATE INDEX `social_follower_snapshots_date_idx` ON `social_follower_snapshots` (`observed_date`);--> statement-breakpoint
CREATE INDEX `social_follower_snapshots_run_idx` ON `social_follower_snapshots` (`source_run_id`);--> statement-breakpoint
CREATE INDEX `social_profiles_platform_idx` ON `social_profiles` (`platform`);
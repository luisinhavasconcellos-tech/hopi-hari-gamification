CREATE TABLE `tiktok_audience_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_date` varchar(10) NOT NULL,
	`demographics_json` text NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tiktok_audience_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `tiktok_audience_snapshots_date_unique` UNIQUE(`observed_date`)
);
--> statement-breakpoint
CREATE TABLE `tiktok_daily_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_date` varchar(10) NOT NULL,
	`followers` int,
	`video_views` int,
	`profile_views` int,
	`likes` int,
	`comments` int,
	`shares` int,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tiktok_daily_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `tiktok_daily_metrics_date_unique` UNIQUE(`observed_date`)
);
--> statement-breakpoint
CREATE TABLE `tiktok_follower_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_date` varchar(10) NOT NULL,
	`hour` int NOT NULL,
	`active_followers` int NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tiktok_follower_activity_id` PRIMARY KEY(`id`),
	CONSTRAINT `tiktok_follower_activity_date_hour_unique` UNIQUE(`observed_date`,`hour`)
);
--> statement-breakpoint
CREATE TABLE `tiktok_viewer_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_date` varchar(10) NOT NULL,
	`total_viewers` int,
	`new_viewers` int,
	`returning_viewers` int,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tiktok_viewer_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `tiktok_viewer_snapshots_date_unique` UNIQUE(`observed_date`)
);
--> statement-breakpoint
CREATE INDEX `tiktok_audience_snapshots_run_idx` ON `tiktok_audience_snapshots` (`source_run_id`);--> statement-breakpoint
CREATE INDEX `tiktok_daily_metrics_run_idx` ON `tiktok_daily_metrics` (`source_run_id`);--> statement-breakpoint
CREATE INDEX `tiktok_follower_activity_run_idx` ON `tiktok_follower_activity` (`source_run_id`);--> statement-breakpoint
CREATE INDEX `tiktok_viewer_snapshots_run_idx` ON `tiktok_viewer_snapshots` (`source_run_id`);
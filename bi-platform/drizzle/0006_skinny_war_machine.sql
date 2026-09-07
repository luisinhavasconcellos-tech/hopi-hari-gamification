CREATE TABLE `facebook_daily_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_date` varchar(10) NOT NULL,
	`followers` int,
	`link_clicks` int,
	`interactions` int,
	`visits` int,
	`views` int,
	`viewers` int,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facebook_daily_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `facebook_daily_metrics_date_unique` UNIQUE(`observed_date`)
);
--> statement-breakpoint
CREATE TABLE `facebook_demographics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observed_date` varchar(10) NOT NULL,
	`demographics_json` text NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facebook_demographics_id` PRIMARY KEY(`id`),
	CONSTRAINT `facebook_demographics_date_unique` UNIQUE(`observed_date`)
);
--> statement-breakpoint
CREATE INDEX `facebook_daily_metrics_run_idx` ON `facebook_daily_metrics` (`source_run_id`);--> statement-breakpoint
CREATE INDEX `facebook_demographics_run_idx` ON `facebook_demographics` (`source_run_id`);
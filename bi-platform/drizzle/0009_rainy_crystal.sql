CREATE TABLE `hora_do_horror_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`edition` varchar(160) NOT NULL,
	`period_start` varchar(10) NOT NULL,
	`period_end` varchar(10) NOT NULL,
	`status` enum('draft','scheduled','active','completed') NOT NULL DEFAULT 'draft',
	`notes` text,
	`source_label` varchar(160) NOT NULL DEFAULT 'Registro oficial · Dashboard',
	`created_by_open_id` varchar(64) NOT NULL,
	`updated_by_open_id` varchar(64) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hora_do_horror_campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `hora_do_horror_campaigns_edition_unique` UNIQUE(`edition`)
);
--> statement-breakpoint
CREATE TABLE `hora_do_horror_creatives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`creative_name` varchar(255) NOT NULL,
	`platform` enum('instagram','facebook','tiktok','multiplatform') NOT NULL,
	`creative_format` varchar(80) NOT NULL,
	`published_date` varchar(10) NOT NULL,
	`target_url` varchar(1200),
	`utm_campaign` varchar(255),
	`call_to_action` varchar(255),
	`status` enum('planned','published','paused') NOT NULL DEFAULT 'planned',
	`notes` text,
	`source_label` varchar(160) NOT NULL DEFAULT 'Registro oficial · Dashboard',
	`created_by_open_id` varchar(64) NOT NULL,
	`updated_by_open_id` varchar(64) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hora_do_horror_creatives_id` PRIMARY KEY(`id`),
	CONSTRAINT `hora_do_horror_creatives_campaign_name_date_unique` UNIQUE(`campaign_id`,`creative_name`,`published_date`)
);
--> statement-breakpoint
CREATE INDEX `hora_do_horror_campaigns_period_idx` ON `hora_do_horror_campaigns` (`active`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `hora_do_horror_creatives_campaign_idx` ON `hora_do_horror_creatives` (`campaign_id`,`active`,`published_date`);
CREATE TABLE `briefing_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`cron_expression` varchar(40) NOT NULL,
	`time_zone` varchar(80) NOT NULL DEFAULT 'America/Sao_Paulo',
	`schedule_cron_task_uid` varchar(65),
	`enabled` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `briefing_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `briefing_schedules_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `daily_briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_date` varchar(10) NOT NULL,
	`title` varchar(255) NOT NULL,
	`executive_summary` text NOT NULL,
	`narration` text NOT NULL,
	`sections_json` text NOT NULL,
	`source_snapshot_json` text NOT NULL,
	`model` varchar(80) NOT NULL,
	`x_status` varchar(40) NOT NULL,
	`status` enum('generating','ready','failed') NOT NULL DEFAULT 'ready',
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_briefings_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_briefings_report_date_unique` UNIQUE(`report_date`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `briefing_schedules_task_uid_idx` ON `briefing_schedules` (`schedule_cron_task_uid`);
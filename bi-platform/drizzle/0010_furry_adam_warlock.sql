ALTER TABLE `operational_sources` ADD `schedule_cron_task_uid` varchar(65);--> statement-breakpoint
CREATE INDEX `operational_sources_task_uid_idx` ON `operational_sources` (`schedule_cron_task_uid`);
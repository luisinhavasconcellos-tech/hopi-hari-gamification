ALTER TABLE `daily_briefings` ADD `audio_url` varchar(1000);--> statement-breakpoint
ALTER TABLE `daily_briefings` ADD `audio_key` varchar(500);--> statement-breakpoint
ALTER TABLE `daily_briefings` ADD `audio_duration_seconds` int;--> statement-breakpoint
ALTER TABLE `daily_briefings` ADD `audio_generated_at` timestamp;
CREATE TABLE `attendance_daily_closings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_date` varchar(10) NOT NULL,
	`observed_at` timestamp NOT NULL,
	`forecast_count` int NOT NULL,
	`realized_count` int NOT NULL,
	`variation` int NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_daily_closings_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_daily_closings_date_unique` UNIQUE(`business_date`)
);
--> statement-breakpoint
CREATE TABLE `attendance_forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_date` varchar(10) NOT NULL,
	`issued_at` timestamp NOT NULL,
	`forecast_count` int NOT NULL,
	`source_run_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_forecasts_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_forecasts_date_issued_unique` UNIQUE(`business_date`,`issued_at`)
);
--> statement-breakpoint
CREATE INDEX `attendance_forecasts_date_idx` ON `attendance_forecasts` (`business_date`);
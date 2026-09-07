CREATE TABLE `campaign_archive_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`archive_name` varchar(500) NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`total_files` int NOT NULL,
	`image_files` int NOT NULL DEFAULT 0,
	`video_files` int NOT NULL DEFAULT 0,
	`document_files` int NOT NULL DEFAULT 0,
	`other_files` int NOT NULL DEFAULT 0,
	`matched_asset_count` int NOT NULL DEFAULT 0,
	`verification_status` enum('verified_match','needs_review') NOT NULL,
	`source_label` varchar(160) NOT NULL DEFAULT 'Arquivo enviado · Usuário',
	`imported_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_archive_imports_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaign_archive_imports_sha256_unique` UNIQUE(`sha256`)
);
--> statement-breakpoint
CREATE INDEX `campaign_archive_imports_campaign_idx` ON `campaign_archive_imports` (`campaign_id`,`imported_at`);
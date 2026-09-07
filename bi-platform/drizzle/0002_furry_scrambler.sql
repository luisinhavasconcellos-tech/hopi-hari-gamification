CREATE TABLE `platform_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`full_name` varchar(255),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`role` enum('viewer','admin') NOT NULL DEFAULT 'viewer',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_access_email_unique` UNIQUE(`email`)
);

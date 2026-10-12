CREATE TABLE `exams` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`change_id` text NOT NULL,
	`entity` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_change_id_unique` ON `outbox` (`change_id`);--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`grade` integer NOT NULL,
	`reviewed_at` text NOT NULL,
	`device_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_logs_card_id_idx` ON `review_logs` (`card_id`);--> statement-breakpoint
CREATE TABLE `review_states` (
	`card_id` text PRIMARY KEY NOT NULL,
	`ease_factor` real NOT NULL,
	`interval_days` integer NOT NULL,
	`repetitions` integer NOT NULL,
	`due_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_states_due_at_idx` ON `review_states` (`due_at`);--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

CREATE TABLE `quiz_results` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`unit_index` integer NOT NULL,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`completed_at` text NOT NULL,
	`device_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quiz_results_deck_id_idx` ON `quiz_results` (`deck_id`);
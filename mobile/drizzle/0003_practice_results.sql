CREATE TABLE `practice_results` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`completed_at` text NOT NULL,
	`device_id` text NOT NULL
);

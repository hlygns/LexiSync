CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` text NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`deck_id` text NOT NULL,
	`term` text NOT NULL,
	`meaning` text NOT NULL,
	`example` text,
	`tags` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cards_deck_id_idx` ON `cards` (`deck_id`);--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` text NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`exam_id` integer NOT NULL,
	`name` text NOT NULL
);

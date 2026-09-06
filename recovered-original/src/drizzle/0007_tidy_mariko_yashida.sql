CREATE TABLE `match_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tournaments` ADD `created_by_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `created_by_name` text DEFAULT '' NOT NULL;
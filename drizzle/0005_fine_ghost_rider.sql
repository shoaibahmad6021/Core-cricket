CREATE TABLE `tournament_sponsors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer NOT NULL,
	`name` text DEFAULT 'Sponsor' NOT NULL,
	`logo_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `matches` ADD `innings` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `first_innings_runs` integer;--> statement-breakpoint
ALTER TABLE `matches` ADD `first_innings_wickets` integer;--> statement-breakpoint
ALTER TABLE `matches` ADD `result` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `tie_resolution` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `super_over_first_runs` integer;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `logo_url` text;
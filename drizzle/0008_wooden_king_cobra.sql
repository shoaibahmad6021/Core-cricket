ALTER TABLE `matches` ADD `toss_result` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `toss_winner_team_id` integer REFERENCES teams(id);--> statement-breakpoint
ALTER TABLE `matches` ADD `toss_decision` text;--> statement-breakpoint
ALTER TABLE `players` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_scorers` ADD `player_id` integer REFERENCES players(id);--> statement-breakpoint
ALTER TABLE `tournament_scorers` ADD `phone` text DEFAULT '' NOT NULL;
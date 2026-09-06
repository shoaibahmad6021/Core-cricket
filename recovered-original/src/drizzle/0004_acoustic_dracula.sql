ALTER TABLE `matches` ADD `umpire_one` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `umpire_two` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `tournament_admins_can_score` integer DEFAULT true NOT NULL;
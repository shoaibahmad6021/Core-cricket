ALTER TABLE `players` ADD `member_role` text DEFAULT 'Player' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `players` ADD `profile_bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `logo_url` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `captain_name` text DEFAULT 'Team captain' NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `invite_code` text DEFAULT 'CORE-TEAM' NOT NULL;
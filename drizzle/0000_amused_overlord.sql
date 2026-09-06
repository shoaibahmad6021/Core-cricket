CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`striker_before` integer,
	`non_striker_before` integer,
	`bowler_id` integer,
	`runs_batter` integer DEFAULT 0 NOT NULL,
	`extra_type` text,
	`extra_runs` integer DEFAULT 0 NOT NULL,
	`legal_ball` integer DEFAULT true NOT NULL,
	`wicket_type` text,
	`player_out_id` integer,
	`wicket_credit` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`striker_before`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`non_striker_before`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bowler_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_out_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer,
	`team_a_id` integer NOT NULL,
	`team_b_id` integer NOT NULL,
	`batting_team_id` integer NOT NULL,
	`bowling_team_id` integer NOT NULL,
	`striker_id` integer,
	`non_striker_id` integer,
	`bowler_id` integer,
	`overs` integer DEFAULT 20 NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`balls` integer DEFAULT 0 NOT NULL,
	`target` integer,
	`status` text DEFAULT 'Upcoming' NOT NULL,
	`venue` text DEFAULT 'Community Ground' NOT NULL,
	`streaming` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_a_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_b_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batting_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bowling_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`striker_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`non_striker_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bowler_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`role` text DEFAULT 'All-rounder' NOT NULL,
	`batting_style` text DEFAULT 'Right hand' NOT NULL,
	`bowling_style` text DEFAULT 'Right-arm medium' NOT NULL,
	`matches` integer DEFAULT 0 NOT NULL,
	`innings` integer DEFAULT 0 NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`balls_faced` integer DEFAULT 0 NOT NULL,
	`fours` integer DEFAULT 0 NOT NULL,
	`sixes` integer DEFAULT 0 NOT NULL,
	`highest` integer DEFAULT 0 NOT NULL,
	`not_outs` integer DEFAULT 0 NOT NULL,
	`wickets` integer DEFAULT 0 NOT NULL,
	`balls_bowled` integer DEFAULT 0 NOT NULL,
	`runs_conceded` integer DEFAULT 0 NOT NULL,
	`catches` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`city` text DEFAULT 'Ontario' NOT NULL,
	`color` text DEFAULT '#b7f34b' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`format` text DEFAULT 'T20' NOT NULL,
	`status` text DEFAULT 'Upcoming' NOT NULL,
	`start_date` text NOT NULL,
	`venue` text NOT NULL,
	`teams_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `teams` (`id`,`name`,`short_name`,`city`,`color`) VALUES
  (1,'GTA Falcons','GTF','Milton','#b9f44b'),
  (2,'Ontario Kings','OK','Brampton','#ff6e55'),
  (3,'Maple Strikers','MS','Mississauga','#69d3ff');
--> statement-breakpoint
INSERT INTO `players` (`id`,`team_id`,`name`,`initials`,`role`,`batting_style`,`bowling_style`,`matches`,`innings`,`runs`,`balls_faced`,`fours`,`sixes`,`highest`,`not_outs`,`wickets`,`balls_bowled`,`runs_conceded`,`catches`) VALUES
  (1,1,'Mohsin Bajwa','MB','Top-order batter','Right hand','Right-arm medium',28,27,842,618,74,38,104,4,12,288,341,17),
  (2,1,'Shoaib Ahmad','SA','All-rounder','Right hand','Right-arm fast',31,29,714,556,61,27,86,5,39,672,711,21),
  (3,1,'Shahzad Chaudhary','SC','Batter','Left hand','Leg break',24,23,591,472,52,18,78,3,8,162,184,11),
  (4,1,'Adeel Rana','AR','Wicketkeeper','Right hand','—',19,18,402,321,39,15,71,2,0,0,0,26),
  (5,2,'Hamza Malik','HM','Fast bowler','Right hand','Right-arm fast',27,16,186,151,14,7,31,6,47,738,702,8),
  (6,2,'Usman Tariq','UT','All-rounder','Left hand','Left-arm orthodox',22,21,488,391,42,19,69,4,28,504,486,13);
--> statement-breakpoint
INSERT INTO `tournaments` (`id`,`name`,`format`,`status`,`start_date`,`venue`,`teams_count`) VALUES
  (1,'Ontario Summer Premier League','T20','Live','2026-08-02','Milton Community Park',8),
  (2,'GTA Tape Ball Cup','T10','Upcoming','2026-09-06','Brampton',6);
--> statement-breakpoint
INSERT INTO `matches` (`id`,`tournament_id`,`team_a_id`,`team_b_id`,`batting_team_id`,`bowling_team_id`,`striker_id`,`non_striker_id`,`bowler_id`,`overs`,`runs`,`wickets`,`balls`,`status`,`venue`,`streaming`) VALUES
  (1,1,1,2,1,2,1,2,5,20,87,3,58,'Live','Milton Community Park',false),
  (2,1,3,2,3,2,NULL,NULL,NULL,20,0,0,0,'Upcoming','Chris Gibson Park',false);
--> statement-breakpoint
INSERT INTO `deliveries` (`match_id`,`sequence`,`striker_before`,`non_striker_before`,`bowler_id`,`runs_batter`,`extra_runs`,`legal_ball`) VALUES
  (1,1,1,2,5,1,0,true),
  (1,2,2,1,5,4,0,true),
  (1,3,2,1,5,0,0,true),
  (1,4,2,1,5,2,0,true);

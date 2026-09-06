DELETE FROM `live_sessions`;
--> statement-breakpoint
DELETE FROM `scoring_handoffs`;
--> statement-breakpoint
DELETE FROM `deliveries`;
--> statement-breakpoint
DELETE FROM `match_players`;
--> statement-breakpoint
DELETE FROM `tournament_scorers`;
--> statement-breakpoint
DELETE FROM `tournament_sponsors`;
--> statement-breakpoint
DELETE FROM `tournament_teams`;
--> statement-breakpoint
DELETE FROM `matches`;
--> statement-breakpoint
DELETE FROM `players`;
--> statement-breakpoint
DELETE FROM `teams`;
--> statement-breakpoint
DELETE FROM `tournaments`;
--> statement-breakpoint
DELETE FROM `sqlite_sequence` WHERE `name` IN ('live_sessions', 'scoring_handoffs', 'deliveries', 'match_players', 'tournament_scorers', 'tournament_sponsors', 'tournament_teams', 'matches', 'players', 'teams', 'tournaments');

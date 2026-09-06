CREATE TABLE "app_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "app_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"is_site_admin" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "app_users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"striker_before" integer,
	"non_striker_before" integer,
	"bowler_id" integer,
	"runs_batter" integer DEFAULT 0 NOT NULL,
	"extra_type" text,
	"extra_runs" integer DEFAULT 0 NOT NULL,
	"legal_ball" boolean DEFAULT true NOT NULL,
	"wicket_type" text,
	"player_out_id" integer,
	"wicket_credit" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"publish_key" text DEFAULT '' NOT NULL,
	"match_id" integer NOT NULL,
	"frame_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "live_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer,
	"team_a_id" integer NOT NULL,
	"team_b_id" integer NOT NULL,
	"batting_team_id" integer NOT NULL,
	"bowling_team_id" integer NOT NULL,
	"striker_id" integer,
	"non_striker_id" integer,
	"bowler_id" integer,
	"overs" integer DEFAULT 20 NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"wickets" integer DEFAULT 0 NOT NULL,
	"balls" integer DEFAULT 0 NOT NULL,
	"target" integer,
	"status" text DEFAULT 'Upcoming' NOT NULL,
	"venue" text DEFAULT 'Community Ground' NOT NULL,
	"umpire_one" text DEFAULT '' NOT NULL,
	"umpire_two" text DEFAULT '' NOT NULL,
	"streaming" boolean DEFAULT false NOT NULL,
	"awaiting_bowler" boolean DEFAULT false NOT NULL,
	"innings" integer DEFAULT 1 NOT NULL,
	"first_innings_runs" integer,
	"first_innings_wickets" integer,
	"result" text,
	"tie_resolution" text,
	"super_over_first_runs" integer,
	"toss_result" text,
	"toss_winner_team_id" integer,
	"toss_decision" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"role" text DEFAULT 'All-rounder' NOT NULL,
	"member_role" text DEFAULT 'Player' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"photo_url" text,
	"profile_bio" text DEFAULT '' NOT NULL,
	"batting_style" text DEFAULT 'Right hand' NOT NULL,
	"bowling_style" text DEFAULT 'Right-arm medium' NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"innings" integer DEFAULT 0 NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"balls_faced" integer DEFAULT 0 NOT NULL,
	"fours" integer DEFAULT 0 NOT NULL,
	"sixes" integer DEFAULT 0 NOT NULL,
	"highest" integer DEFAULT 0 NOT NULL,
	"not_outs" integer DEFAULT 0 NOT NULL,
	"wickets" integer DEFAULT 0 NOT NULL,
	"balls_bowled" integer DEFAULT 0 NOT NULL,
	"runs_conceded" integer DEFAULT 0 NOT NULL,
	"catches" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_handoffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"match_id" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "scoring_handoffs_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"city" text DEFAULT 'Ontario' NOT NULL,
	"color" text DEFAULT '#b7f34b' NOT NULL,
	"logo_url" text,
	"captain_name" text DEFAULT 'Team captain' NOT NULL,
	"invite_code" text DEFAULT 'CORE-TEAM' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_scorers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"player_id" integer,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text DEFAULT 'Sponsor' NOT NULL,
	"logo_url" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"format" text DEFAULT 'T20' NOT NULL,
	"status" text DEFAULT 'Upcoming' NOT NULL,
	"start_date" text NOT NULL,
	"venue" text NOT NULL,
	"teams_count" integer DEFAULT 0 NOT NULL,
	"tournament_admins_can_score" boolean DEFAULT true NOT NULL,
	"logo_url" text,
	"created_by_email" text DEFAULT '' NOT NULL,
	"created_by_name" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_striker_before_players_id_fk" FOREIGN KEY ("striker_before") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_non_striker_before_players_id_fk" FOREIGN KEY ("non_striker_before") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_bowler_id_players_id_fk" FOREIGN KEY ("bowler_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_player_out_id_players_id_fk" FOREIGN KEY ("player_out_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_batting_team_id_teams_id_fk" FOREIGN KEY ("batting_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_bowling_team_id_teams_id_fk" FOREIGN KEY ("bowling_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_striker_id_players_id_fk" FOREIGN KEY ("striker_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_non_striker_id_players_id_fk" FOREIGN KEY ("non_striker_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_bowler_id_players_id_fk" FOREIGN KEY ("bowler_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_toss_winner_team_id_teams_id_fk" FOREIGN KEY ("toss_winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_handoffs" ADD CONSTRAINT "scoring_handoffs_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_scorers" ADD CONSTRAINT "tournament_scorers_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_scorers" ADD CONSTRAINT "tournament_scorers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_sponsors" ADD CONSTRAINT "tournament_sponsors_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
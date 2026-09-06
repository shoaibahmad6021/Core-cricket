ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "first_innings_balls" integer;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "first_innings_batting_team_id" integer;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "winner_team_id" integer;

CREATE TABLE IF NOT EXISTS "tournament_groups" (
  "id" serial PRIMARY KEY NOT NULL,
  "tournament_id" integer NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "tournament_group_teams" (
  "id" serial PRIMARY KEY NOT NULL,
  "tournament_id" integer NOT NULL,
  "group_id" integer NOT NULL,
  "team_id" integer NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "match_mvp_overrides" (
  "id" serial PRIMARY KEY NOT NULL,
  "match_id" integer NOT NULL,
  "player_id" integer NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "tournament_mvp_overrides" (
  "id" serial PRIMARY KEY NOT NULL,
  "tournament_id" integer NOT NULL,
  "player_id" integer NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_first_innings_batting_team_id_teams_id_fk" FOREIGN KEY ("first_innings_batting_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "tournament_group_teams" ADD CONSTRAINT "tournament_group_teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "tournament_group_teams" ADD CONSTRAINT "tournament_group_teams_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "tournament_group_teams" ADD CONSTRAINT "tournament_group_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "match_mvp_overrides" ADD CONSTRAINT "match_mvp_overrides_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "match_mvp_overrides" ADD CONSTRAINT "match_mvp_overrides_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "tournament_mvp_overrides" ADD CONSTRAINT "tournament_mvp_overrides_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "tournament_mvp_overrides" ADD CONSTRAINT "tournament_mvp_overrides_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

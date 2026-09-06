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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tournament_group_teams" ADD CONSTRAINT "tournament_group_teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tournament_group_teams" ADD CONSTRAINT "tournament_group_teams_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tournament_group_teams" ADD CONSTRAINT "tournament_group_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "match_mvp_overrides" ADD CONSTRAINT "match_mvp_overrides_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "match_mvp_overrides" ADD CONSTRAINT "match_mvp_overrides_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tournament_mvp_overrides" ADD CONSTRAINT "tournament_mvp_overrides_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tournament_mvp_overrides" ADD CONSTRAINT "tournament_mvp_overrides_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "tournament_groups" ("tournament_id", "name", "sort_order")
SELECT t."id", 'Main Group', 0
FROM "tournaments" t
WHERE NOT EXISTS (
  SELECT 1 FROM "tournament_groups" g WHERE g."tournament_id" = t."id"
);

SELECT setval(pg_get_serial_sequence('teams','id'), COALESCE((SELECT MAX(id) FROM teams), 1), (SELECT MAX(id) IS NOT NULL FROM teams));
SELECT setval(pg_get_serial_sequence('players','id'), COALESCE((SELECT MAX(id) FROM players), 1), (SELECT MAX(id) IS NOT NULL FROM players));
SELECT setval(pg_get_serial_sequence('tournaments','id'), COALESCE((SELECT MAX(id) FROM tournaments), 1), (SELECT MAX(id) IS NOT NULL FROM tournaments));
SELECT setval(pg_get_serial_sequence('matches','id'), COALESCE((SELECT MAX(id) FROM matches), 1), (SELECT MAX(id) IS NOT NULL FROM matches));
SELECT setval(pg_get_serial_sequence('deliveries','id'), COALESCE((SELECT MAX(id) FROM deliveries), 1), (SELECT MAX(id) IS NOT NULL FROM deliveries));
SELECT setval(pg_get_serial_sequence('match_players','id'), COALESCE((SELECT MAX(id) FROM match_players), 1), (SELECT MAX(id) IS NOT NULL FROM match_players));
SELECT setval(pg_get_serial_sequence('tournament_sponsors','id'), COALESCE((SELECT MAX(id) FROM tournament_sponsors), 1), (SELECT MAX(id) IS NOT NULL FROM tournament_sponsors));
SELECT setval(pg_get_serial_sequence('tournament_scorers','id'), COALESCE((SELECT MAX(id) FROM tournament_scorers), 1), (SELECT MAX(id) IS NOT NULL FROM tournament_scorers));
SELECT setval(pg_get_serial_sequence('tournament_teams','id'), COALESCE((SELECT MAX(id) FROM tournament_teams), 1), (SELECT MAX(id) IS NOT NULL FROM tournament_teams));
SELECT setval(pg_get_serial_sequence('tournament_groups','id'), COALESCE((SELECT MAX(id) FROM tournament_groups), 1), (SELECT MAX(id) IS NOT NULL FROM tournament_groups));
SELECT setval(pg_get_serial_sequence('tournament_group_teams','id'), COALESCE((SELECT MAX(id) FROM tournament_group_teams), 1), (SELECT MAX(id) IS NOT NULL FROM tournament_group_teams));
SELECT setval(pg_get_serial_sequence('match_mvp_overrides','id'), COALESCE((SELECT MAX(id) FROM match_mvp_overrides), 1), (SELECT MAX(id) IS NOT NULL FROM match_mvp_overrides));
SELECT setval(pg_get_serial_sequence('tournament_mvp_overrides','id'), COALESCE((SELECT MAX(id) FROM tournament_mvp_overrides), 1), (SELECT MAX(id) IS NOT NULL FROM tournament_mvp_overrides));
SELECT setval(pg_get_serial_sequence('live_sessions','id'), COALESCE((SELECT MAX(id) FROM live_sessions), 1), (SELECT MAX(id) IS NOT NULL FROM live_sessions));
SELECT setval(pg_get_serial_sequence('scoring_handoffs','id'), COALESCE((SELECT MAX(id) FROM scoring_handoffs), 1), (SELECT MAX(id) IS NOT NULL FROM scoring_handoffs));
SELECT setval(pg_get_serial_sequence('app_users','id'), COALESCE((SELECT MAX(id) FROM app_users), 1), (SELECT MAX(id) IS NOT NULL FROM app_users));
SELECT setval(pg_get_serial_sequence('app_sessions','id'), COALESCE((SELECT MAX(id) FROM app_sessions), 1), (SELECT MAX(id) IS NOT NULL FROM app_sessions));

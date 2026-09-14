CREATE TABLE IF NOT EXISTS "live_replay_cache" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" text NOT NULL,
  "match_id" integer NOT NULL,
  "data_base64" text NOT NULL,
  "content_type" text DEFAULT 'video/webm' NOT NULL,
  "sequence" integer DEFAULT 0 NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "live_replay_cache_token_unique" ON "live_replay_cache" USING btree ("token");

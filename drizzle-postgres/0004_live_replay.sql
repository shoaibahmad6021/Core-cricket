ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "replay_url" text;
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "replay_until" text;
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "replay_sequence" integer DEFAULT 0 NOT NULL;
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "replay_duration_ms" integer DEFAULT 0 NOT NULL;

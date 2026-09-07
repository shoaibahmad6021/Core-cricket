ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "sponsor_index" integer DEFAULT -1 NOT NULL;
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "sponsor_overlay_until" text;

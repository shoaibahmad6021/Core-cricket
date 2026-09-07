CREATE TABLE IF NOT EXISTS "live_rtc_peers" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" text NOT NULL,
  "viewer_id" text NOT NULL,
  "offer_sdp" text NOT NULL,
  "answer_sdp" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "live_rtc_peers_token_viewer_uidx" ON "live_rtc_peers" USING btree ("token","viewer_id");

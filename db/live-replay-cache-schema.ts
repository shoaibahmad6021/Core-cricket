import { integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

export const liveReplayCache = pgTable("live_replay_cache", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  matchId: integer("match_id").notNull(),
  dataBase64: text("data_base64").notNull(),
  contentType: text("content_type").notNull().default("video/webm"),
  sequence: integer("sequence").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
}, (table) => ({
  tokenUnique: uniqueIndex("live_replay_cache_token_unique").on(table.token),
}));

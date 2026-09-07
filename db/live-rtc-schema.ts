import { boolean, serial, text, pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const liveRtcPeers = pgTable("live_rtc_peers", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  viewerId: text("viewer_id").notNull(),
  offerSdp: text("offer_sdp").notNull(),
  answerSdp: text("answer_sdp"),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tokenViewerUnique: uniqueIndex("live_rtc_peers_token_viewer_uidx").on(table.token, table.viewerId),
}));

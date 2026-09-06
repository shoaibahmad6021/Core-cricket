import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  city: text("city").notNull().default("Ontario"),
  color: text("color").notNull().default("#b7f34b"),
  logoUrl: text("logo_url"),
  captainName: text("captain_name").notNull().default("Team captain"),
  inviteCode: text("invite_code").notNull().default("CORE-TEAM"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull().default("All-rounder"),
  memberRole: text("member_role").notNull().default("Player"),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  photoUrl: text("photo_url"),
  profileBio: text("profile_bio").notNull().default(""),
  battingStyle: text("batting_style").notNull().default("Right hand"),
  bowlingStyle: text("bowling_style").notNull().default("Right-arm medium"),
  matches: integer("matches").notNull().default(0),
  innings: integer("innings").notNull().default(0),
  runs: integer("runs").notNull().default(0),
  ballsFaced: integer("balls_faced").notNull().default(0),
  fours: integer("fours").notNull().default(0),
  sixes: integer("sixes").notNull().default(0),
  highest: integer("highest").notNull().default(0),
  notOuts: integer("not_outs").notNull().default(0),
  wickets: integer("wickets").notNull().default(0),
  ballsBowled: integer("balls_bowled").notNull().default(0),
  runsConceded: integer("runs_conceded").notNull().default(0),
  catches: integer("catches").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  format: text("format").notNull().default("T20"),
  status: text("status").notNull().default("Upcoming"),
  startDate: text("start_date").notNull(),
  venue: text("venue").notNull(),
  teamsCount: integer("teams_count").notNull().default(0),
  tournamentAdminsCanScore: boolean("tournament_admins_can_score").notNull().default(true),
  logoUrl: text("logo_url"),
  createdByEmail: text("created_by_email").notNull().default(""),
  createdByName: text("created_by_name").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const matchPlayers = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournamentSponsors = pgTable("tournament_sponsors", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  name: text("name").notNull().default("Sponsor"),
  logoUrl: text("logo_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournamentScorers = pgTable("tournament_scorers", {
  id: serial("id").primaryKey(), tournamentId: integer("tournament_id").notNull().references(() => tournaments.id), playerId: integer("player_id").references(() => players.id), name: text("name").notNull(), email: text("email").notNull().default(""), phone: text("phone").notNull().default(""), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const liveSessions = pgTable("live_sessions", {
  id: serial("id").primaryKey(), token: text("token").notNull().unique(), publishKey: text("publish_key").notNull().default(""), matchId: integer("match_id").notNull().references(() => matches.id), frameUrl: text("frame_url"), active: boolean("active").notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scoringHandoffs = pgTable("scoring_handoffs", {
  id: serial("id").primaryKey(), token: text("token").notNull().unique(), matchId: integer("match_id").notNull().references(() => matches.id), active: boolean("active").notNull().default(true), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournamentTeams = pgTable("tournament_teams", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id),
  teamAId: integer("team_a_id").notNull().references(() => teams.id),
  teamBId: integer("team_b_id").notNull().references(() => teams.id),
  battingTeamId: integer("batting_team_id").notNull().references(() => teams.id),
  bowlingTeamId: integer("bowling_team_id").notNull().references(() => teams.id),
  strikerId: integer("striker_id").references(() => players.id),
  nonStrikerId: integer("non_striker_id").references(() => players.id),
  bowlerId: integer("bowler_id").references(() => players.id),
  overs: integer("overs").notNull().default(20),
  runs: integer("runs").notNull().default(0),
  wickets: integer("wickets").notNull().default(0),
  balls: integer("balls").notNull().default(0),
  target: integer("target"),
  status: text("status").notNull().default("Upcoming"),
  venue: text("venue").notNull().default("Community Ground"),
  umpireOne: text("umpire_one").notNull().default(""),
  umpireTwo: text("umpire_two").notNull().default(""),
  streaming: boolean("streaming").notNull().default(false),
  awaitingBowler: boolean("awaiting_bowler").notNull().default(false),
  innings: integer("innings").notNull().default(1),
  firstInningsRuns: integer("first_innings_runs"),
  firstInningsWickets: integer("first_innings_wickets"),
  firstInningsBalls: integer("first_innings_balls"),
  firstInningsBattingTeamId: integer("first_innings_batting_team_id").references(() => teams.id),
  winnerTeamId: integer("winner_team_id").references(() => teams.id),
  result: text("result"),
  tieResolution: text("tie_resolution"),
  superOverFirstRuns: integer("super_over_first_runs"),
  tossResult: text("toss_result"),
  tossWinnerTeamId: integer("toss_winner_team_id").references(() => teams.id),
  tossDecision: text("toss_decision"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  sequence: integer("sequence").notNull(),
  strikerBefore: integer("striker_before").references(() => players.id),
  nonStrikerBefore: integer("non_striker_before").references(() => players.id),
  bowlerId: integer("bowler_id").references(() => players.id),
  runsBatter: integer("runs_batter").notNull().default(0),
  extraType: text("extra_type"),
  extraRuns: integer("extra_runs").notNull().default(0),
  legalBall: boolean("legal_ball").notNull().default(true),
  wicketType: text("wicket_type"),
  playerOutId: integer("player_out_id").references(() => players.id),
  wicketCredit: boolean("wicket_credit").notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournamentGroups = pgTable("tournament_groups", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournamentGroupTeams = pgTable("tournament_group_teams", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  groupId: integer("group_id").notNull().references(() => tournamentGroups.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const matchMvpOverrides = pgTable("match_mvp_overrides", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournamentMvpOverrides = pgTable("tournament_mvp_overrides", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  isSiteAdmin: boolean("is_site_admin").notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appSessions = pgTable("app_sessions", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: integer("user_id").notNull().references(() => appUsers.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

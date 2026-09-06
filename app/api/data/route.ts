import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { deliveries, matches, matchMvpOverrides, matchPlayers, players, teams, tournamentGroupTeams, tournamentGroups, tournamentMvpOverrides, tournamentScorers, tournamentSponsors, tournamentTeams, tournaments } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

async function safeRows<T>(name: string, query: PromiseLike<T[]>): Promise<T[]> {
  try {
    return await query;
  } catch (error) {
    console.error(`[api/data] ${name} query failed`, error);
    return [];
  }
}

export async function GET() {
  if (!(await getChatGPTUser())) return Response.json({ error: "Sign in is required" }, { status: 401 });

  try {
    const db = getDb();
    const [teamRows, playerRows, tournamentRows, tournamentTeamRows, groupRows, groupTeamRows, sponsorRows, scorerRows, matchRows, matchPlayerRows, matchMvpRows, tournamentMvpRows, deliveryRows] = await Promise.all([
      safeRows("teams", db.select().from(teams).orderBy(asc(teams.name))),
      safeRows("players", db.select().from(players).orderBy(desc(players.runs), asc(players.name))),
      safeRows("tournaments", db.select().from(tournaments).orderBy(desc(tournaments.startDate))),
      safeRows("tournamentTeams", db.select().from(tournamentTeams).orderBy(asc(tournamentTeams.id))),
      safeRows("tournamentGroups", db.select().from(tournamentGroups).orderBy(asc(tournamentGroups.sortOrder), asc(tournamentGroups.id))),
      safeRows("tournamentGroupTeams", db.select().from(tournamentGroupTeams).orderBy(asc(tournamentGroupTeams.id))),
      safeRows("tournamentSponsors", db.select().from(tournamentSponsors).orderBy(asc(tournamentSponsors.id))),
      safeRows("tournamentScorers", db.select().from(tournamentScorers).orderBy(asc(tournamentScorers.id))),
      safeRows("matches", db.select().from(matches).orderBy(desc(matches.id))),
      safeRows("matchPlayers", db.select().from(matchPlayers).orderBy(asc(matchPlayers.id))),
      safeRows("matchMvpOverrides", db.select().from(matchMvpOverrides).orderBy(asc(matchMvpOverrides.id))),
      safeRows("tournamentMvpOverrides", db.select().from(tournamentMvpOverrides).orderBy(asc(tournamentMvpOverrides.id))),
      safeRows("deliveries", db.select().from(deliveries).orderBy(desc(deliveries.id))),
    ]);

    return Response.json({
      teams: teamRows,
      players: playerRows,
      tournaments: tournamentRows,
      tournamentTeams: tournamentTeamRows,
      tournamentGroups: groupRows,
      tournamentGroupTeams: groupTeamRows,
      tournamentSponsors: sponsorRows,
      tournamentScorers: scorerRows,
      matches: matchRows,
      matchPlayers: matchPlayerRows,
      matchMvpOverrides: matchMvpRows,
      tournamentMvpOverrides: tournamentMvpRows,
      deliveries: deliveryRows,
    });
  } catch (error) {
    console.error("[api/data] fatal refresh error", error);
    const message = error instanceof Error ? error.message : "Unable to load cricket data";
    return Response.json({ error: message }, { status: 500 });
  }
}

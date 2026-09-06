import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { deliveries, matches, matchMvpOverrides, matchPlayers, players, teams, tournamentGroupTeams, tournamentGroups, tournamentMvpOverrides, tournamentScorers, tournamentSponsors, tournamentTeams, tournaments } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getChatGPTUser())) return Response.json({ error: "Sign in is required" }, { status: 401 });

  try {
    const db = getDb();
    const [teamRows, playerRows, tournamentRows, tournamentTeamRows, groupRows, groupTeamRows, sponsorRows, scorerRows, matchRows, matchPlayerRows, matchMvpRows, tournamentMvpRows, deliveryRows] = await Promise.all([
      db.select().from(teams).orderBy(asc(teams.name)),
      db.select().from(players).orderBy(desc(players.runs), asc(players.name)),
      db.select().from(tournaments).orderBy(desc(tournaments.startDate)),
      db.select().from(tournamentTeams).orderBy(asc(tournamentTeams.id)),
      db.select().from(tournamentGroups).orderBy(asc(tournamentGroups.sortOrder), asc(tournamentGroups.id)),
      db.select().from(tournamentGroupTeams).orderBy(asc(tournamentGroupTeams.id)),
      db.select().from(tournamentSponsors).orderBy(asc(tournamentSponsors.id)),
      db.select().from(tournamentScorers).orderBy(asc(tournamentScorers.id)),
      db.select().from(matches).orderBy(desc(matches.id)),
      db.select().from(matchPlayers).orderBy(asc(matchPlayers.id)),
      db.select().from(matchMvpOverrides).orderBy(asc(matchMvpOverrides.id)),
      db.select().from(tournamentMvpOverrides).orderBy(asc(tournamentMvpOverrides.id)),
      db.select().from(deliveries).orderBy(desc(deliveries.id)),
    ]);

    return Response.json({ teams: teamRows, players: playerRows, tournaments: tournamentRows, tournamentTeams: tournamentTeamRows, tournamentGroups: groupRows, tournamentGroupTeams: groupTeamRows, tournamentSponsors: sponsorRows, tournamentScorers: scorerRows, matches: matchRows, matchPlayers: matchPlayerRows, matchMvpOverrides: matchMvpRows, tournamentMvpOverrides: tournamentMvpRows, deliveries: deliveryRows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load cricket data";
    return Response.json({ error: message }, { status: 500 });
  }
}

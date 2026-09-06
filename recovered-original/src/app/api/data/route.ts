import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { deliveries, matches, matchPlayers, players, teams, tournamentScorers, tournamentSponsors, tournamentTeams, tournaments } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getChatGPTUser())) return Response.json({ error: "Sign in is required" }, { status: 401 });

  try {
    const db = getDb();
    const [teamRows, playerRows, tournamentRows, tournamentTeamRows, sponsorRows, scorerRows, matchRows, matchPlayerRows, deliveryRows] = await Promise.all([
      db.select().from(teams).orderBy(asc(teams.name)),
      db.select().from(players).orderBy(desc(players.runs), asc(players.name)),
      db.select().from(tournaments).orderBy(desc(tournaments.startDate)),
      db.select().from(tournamentTeams).orderBy(asc(tournamentTeams.id)),
      db.select().from(tournamentSponsors).orderBy(asc(tournamentSponsors.id)),
      db.select().from(tournamentScorers).orderBy(asc(tournamentScorers.id)),
      db.select().from(matches).orderBy(desc(matches.id)),
      db.select().from(matchPlayers).orderBy(asc(matchPlayers.id)),
      db.select().from(deliveries).orderBy(desc(deliveries.id)).limit(500),
    ]);

    return Response.json({ teams: teamRows, players: playerRows, tournaments: tournamentRows, tournamentTeams: tournamentTeamRows, tournamentSponsors: sponsorRows, tournamentScorers: scorerRows, matches: matchRows, matchPlayers: matchPlayerRows, deliveries: deliveryRows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load cricket data";
    return Response.json({ error: message }, { status: 500 });
  }
}

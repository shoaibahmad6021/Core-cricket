import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { matchPlayers, matches, players, tournaments } from "@/db/schema";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { isCoreCricketAdmin } from "@/app/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { matchId?: number; teamId?: number; playerIds?: number[] };
    const matchId = Number(body.matchId); const teamId = Number(body.teamId);
    const playerIds = [...new Set((body.playerIds ?? []).map(Number).filter(Boolean))];
    if (!matchId || !teamId || playerIds.length !== 11) return Response.json({ error: "Select exactly 11 players" }, { status: 400 });
    const user = await getChatGPTUser(); if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const db = getDb();
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match || ![match.teamAId, match.teamBId].includes(teamId)) return Response.json({ error: "Team is not part of this match" }, { status: 404 });
    if (match.status !== "Upcoming") return Response.json({ error: "Playing XI cannot be changed after scoring starts" }, { status: 409 });
    const [tournament] = match.tournamentId ? await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1) : [];
    if (!(await canSelectTeam(user, teamId, tournament))) return Response.json({ error: "Only the team captain, team admin or tournament creator can select this XI" }, { status: 403 });
    const squad = await db.select({ id: players.id }).from(players).where(and(eq(players.teamId, teamId), inArray(players.id, playerIds)));
    if (squad.length !== 11) return Response.json({ error: "Every selected player must belong to this team's squad" }, { status: 400 });
    await db.batch([
      db.delete(matchPlayers).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.teamId, teamId))),
      db.insert(matchPlayers).values(playerIds.map((playerId) => ({ matchId, teamId, playerId }))),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && !error.message.toLowerCase().includes("failed query")
      ? error.message
      : "Unable to save the playing XI. Please try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function canSelectTeam(user: ChatGPTUser, teamId: number, tournament?: typeof tournaments.$inferSelect) {
  if (isCoreCricketAdmin(user)) return true;
  const email = user.email.trim().toLowerCase(); const name = (user.fullName || user.displayName).trim().toLowerCase();
  if (tournament && (tournament.createdByEmail.trim().toLowerCase() === email || tournament.createdByName.trim().toLowerCase() === name)) return true;
  const roster = await getDb().select().from(players).where(eq(players.teamId, teamId));
  return roster.some((player) => player.name.trim().toLowerCase() === name && ["captain", "team admin"].includes((player.memberRole || "").toLowerCase()));
}

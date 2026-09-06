import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { matchPlayers, matches, players, tournamentScorers, tournaments } from "@/db/schema";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { isCoreCricketAdmin } from "@/app/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { matchId?: number; action?: "toss" | "decision"; decision?: "Bat" | "Bowl" };
    const user = await getChatGPTUser(); if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const db = getDb(); const [match] = await db.select().from(matches).where(eq(matches.id, Number(body.matchId))).limit(1);
    if (!match) return Response.json({ error: "Match not found" }, { status: 404 });
    const [tournament] = match.tournamentId ? await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1) : [];
    if (!(await canSetUp(user, match.teamAId, match.teamBId, tournament))) return Response.json({ error: "Captain, team admin or tournament creator access is required" }, { status: 403 });
    const lineups = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
    const roster = await db.select().from(players);
    const requiredA = match.tournamentId ? 11 : Math.min(11, roster.filter((p) => p.teamId === match.teamAId).length);
    const requiredB = match.tournamentId ? 11 : Math.min(11, roster.filter((p) => p.teamId === match.teamBId).length);
    if (requiredA < 1 || requiredB < 1 || lineups.filter((row) => row.teamId === match.teamAId).length !== requiredA || lineups.filter((row) => row.teamId === match.teamBId).length !== requiredB) return Response.json({ error: match.tournamentId ? "Confirm both playing XIs first" : "Confirm both friendly-match squads first" }, { status: 409 });
    const scorers = match.tournamentId ? await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId, match.tournamentId)) : [];
    if (match.tournamentId && scorers.length < 1) return Response.json({ error: "Add at least one official scorer before the toss" }, { status: 409 });
    if (body.action === "toss") {
      const tossResult = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? "Heads" : "Tails";
      const tossWinnerTeamId = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? match.teamAId : match.teamBId;
      const [updated] = await db.update(matches).set({ tossResult, tossWinnerTeamId, tossDecision: null }).where(eq(matches.id, match.id)).returning();
      return Response.json({ match: updated });
    }
    if (body.action === "decision") {
      if (!match.tossWinnerTeamId || !["Bat", "Bowl"].includes(body.decision ?? "")) return Response.json({ error: "Run the toss and choose bat or bowl" }, { status: 400 });
      const winner = match.tossWinnerTeamId; const other = winner === match.teamAId ? match.teamBId : match.teamAId; const bat = body.decision === "Bat" ? winner : other;
      const [updated] = await db.update(matches).set({ tossDecision: body.decision, battingTeamId: bat, bowlingTeamId: bat === match.teamAId ? match.teamBId : match.teamAId }).where(eq(matches.id, match.id)).returning();
      return Response.json({ match: updated });
    }
    return Response.json({ error: "Unsupported setup action" }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to update match setup" }, { status: 500 }); }
}

async function canSetUp(user: ChatGPTUser, teamAId: number, teamBId: number, tournament?: typeof tournaments.$inferSelect) {
  if (isCoreCricketAdmin(user)) return true;
  const email = user.email.trim().toLowerCase(); const name = (user.fullName || user.displayName).trim().toLowerCase();
  if (tournament && (tournament.createdByEmail.toLowerCase() === email || tournament.createdByName.toLowerCase() === name)) return true;
  const roster = await getDb().select().from(players);
  return roster.some((player) => [teamAId, teamBId].includes(player.teamId ?? 0) && player.name.toLowerCase() === name && ["captain", "team admin"].includes((player.memberRole || "").toLowerCase()));
}

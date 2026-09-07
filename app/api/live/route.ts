import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deliveries, liveSessions, matches, players, scoringHandoffs, teams, tournamentScorers, tournamentSponsors, tournaments } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isCoreCricketAdmin } from "@/app/admin-auth";

async function canBroadcast(matchId: number, handoffToken?: string) {
  const user = await getChatGPTUser();
  if (!user) return false;
  if (isCoreCricketAdmin(user)) return true;
  const db = getDb();
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) return false;
  if (handoffToken) {
    const [handoff] = await db.select().from(scoringHandoffs).where(and(eq(scoringHandoffs.token, handoffToken), eq(scoringHandoffs.matchId, matchId), eq(scoringHandoffs.active, true))).limit(1);
    if (handoff) return true;
  }
  const name = (user.fullName || user.displayName).trim().toLowerCase();
  const email = user.email.trim().toLowerCase();
  if (match.tournamentId) {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);
    if (tournament && (tournament.createdByEmail.trim().toLowerCase() === email || tournament.createdByName.trim().toLowerCase() === name)) return true;
    const scorers = await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId, match.tournamentId));
    if (scorers.some((s) => s.email.trim().toLowerCase() === email || s.name.trim().toLowerCase() === name)) return true;
  }
  const roster = await db.select().from(players);
  return roster.some((p) => [match.teamAId, match.teamBId].includes(p.teamId ?? 0) && p.name.trim().toLowerCase() === name && ["captain", "team admin"].includes((p.memberRole || "").toLowerCase()));
}

export async function POST(request: Request) {
  const { matchId, handoffToken } = await request.json() as { matchId?: number; handoffToken?: string };
  if (!matchId) return Response.json({ error: "Choose a match" }, { status: 400 });
  if (!(await canBroadcast(matchId, handoffToken))) return Response.json({ error: "Live broadcast is available to site admins, tournament creators, assigned scorers, team captains and team admins." }, { status: 403 });
  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  const publishKey = crypto.randomUUID().replaceAll("-", "");
  const db = getDb();
  await db.insert(liveSessions).values({ token, publishKey, matchId, active: true });
  await db.update(matches).set({ streaming: true }).where(eq(matches.id, matchId));
  return Response.json({ token, publishKey });
}

export async function DELETE(request: Request) {
  const { token, publishKey } = await request.json() as { token?: string; publishKey?: string };
  const db = getDb();
  const [session] = token ? await db.select().from(liveSessions).where(eq(liveSessions.token, token)).limit(1) : [];
  if (!session || !publishKey || session.publishKey !== publishKey) return Response.json({ error: "Invalid broadcast key" }, { status: 403 });
  await db.update(liveSessions).set({ active: false }).where(eq(liveSessions.id, session.id));
  await db.update(matches).set({ streaming: false }).where(eq(matches.id, session.matchId));
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const matchId = Number(url.searchParams.get("matchId") ?? 0);
  const db = getDb();

  let session: typeof liveSessions.$inferSelect | undefined;
  if (token) {
    [session] = await db.select().from(liveSessions).where(eq(liveSessions.token, token)).limit(1);
  } else if (matchId) {
    [session] = await db.select().from(liveSessions).where(and(eq(liveSessions.matchId, matchId), eq(liveSessions.active, true))).orderBy(desc(liveSessions.id)).limit(1);
  }
  if (!session) return Response.json({ error: "No live broadcast is active for this match" }, { status: 404 });

  const [match] = await db.select().from(matches).where(eq(matches.id, session.matchId)).limit(1);
  if (!match) return Response.json({ error: "Match not found" }, { status: 404 });
  const [teamRows, playerRows, deliveryRows] = await Promise.all([
    db.select().from(teams),
    db.select().from(players),
    db.select().from(deliveries).where(eq(deliveries.matchId, match.id)),
  ]);
  const [tournament] = match.tournamentId ? await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1) : [];
  const sponsorRows = match.tournamentId ? await db.select().from(tournamentSponsors).where(eq(tournamentSponsors.tournamentId, match.tournamentId)) : [];
  const currentPlayerIds = new Set([match.strikerId, match.nonStrikerId, match.bowlerId].filter((id): id is number => typeof id === "number"));
  return Response.json({
    token: session.token,
    active: session.active,
    match,
    tournament,
    sponsors: sponsorRows,
    teams: teamRows.filter((team) => team.id === match.teamAId || team.id === match.teamBId),
    players: playerRows.filter((player) => currentPlayerIds.has(player.id)),
    deliveries: deliveryRows,
  });
}

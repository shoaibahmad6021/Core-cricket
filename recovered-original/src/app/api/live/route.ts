import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { liveSessions, matches, teams, tournaments } from "@/db/schema";
import { requireAdminApi } from "@/app/admin-auth";

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth) return auth;
  const { matchId } = await request.json() as { matchId?: number }; if (!matchId) return Response.json({ error: "Choose a match" }, { status: 400 });
  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 20); const publishKey = crypto.randomUUID().replaceAll("-", ""); const db = getDb();
  await db.insert(liveSessions).values({ token, publishKey, matchId, active: true }); await db.update(matches).set({ streaming: true }).where(eq(matches.id, matchId));
  return Response.json({ token, publishKey });
}

export async function DELETE(request: Request) {
  const { token, publishKey } = await request.json() as { token?: string; publishKey?: string }; const db = getDb();
  const [session] = token ? await db.select().from(liveSessions).where(eq(liveSessions.token, token)).limit(1) : [];
  if (!session || !publishKey || session.publishKey !== publishKey) return Response.json({ error: "Invalid broadcast key" }, { status: 403 });
  await db.update(liveSessions).set({ active: false }).where(eq(liveSessions.id, session.id)); await db.update(matches).set({ streaming: false }).where(eq(matches.id, session.matchId));
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""; const db = getDb();
  const [session] = await db.select().from(liveSessions).where(eq(liveSessions.token, token)).limit(1); if (!session) return Response.json({ error: "Live stream not found" }, { status: 404 });
  const [match] = await db.select().from(matches).where(eq(matches.id, session.matchId)).limit(1); if (!match) return Response.json({ error: "Match not found" }, { status: 404 });
  const teamRows = await db.select().from(teams); const [tournament] = match.tournamentId ? await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1) : [];
  return Response.json({ active: session.active, match, tournament, teams: teamRows.filter((team) => team.id === match.teamAId || team.id === match.teamBId) });
}

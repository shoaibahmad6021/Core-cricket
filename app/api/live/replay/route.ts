import { del, put } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { liveSessions, matches, players, scoringHandoffs, tournamentScorers, tournaments } from "@/db/schema";
import { liveReplayCache } from "@/db/live-replay-cache-schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isCoreCricketAdmin } from "@/app/admin-auth";

async function canReplay(matchId: number, handoffToken?: string) {
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
  const form = await request.formData();
  const file = form.get("file");
  const matchId = Number(form.get("matchId") ?? 0);
  const durationSec = Math.max(3, Math.min(20, Number(form.get("durationSec") ?? 10)));
  const handoffToken = String(form.get("handoffToken") ?? "").trim() || undefined;
  if (!(file instanceof File) || !matchId) return Response.json({ error: "Replay clip is missing" }, { status: 400 });
  if (!(await canReplay(matchId, handoffToken))) return Response.json({ error: "You are not authorized to trigger replay for this match" }, { status: 403 });
  if (file.size > 3.6 * 1024 * 1024) return Response.json({ error: "Replay clip is too large. Try 10 seconds." }, { status: 413 });

  const db = getDb();
  const [session] = await db.select().from(liveSessions).where(and(eq(liveSessions.matchId, matchId), eq(liveSessions.active, true))).orderBy(desc(liveSessions.id)).limit(1);
  if (!session) return Response.json({ error: "Start the live broadcast before using replay" }, { status: 400 });

  const nextSequence = (session.replaySequence ?? 0) + 1;
  const replayUntil = new Date(Date.now() + durationSec * 1000 + 5000).toISOString();
  const extension = file.type.includes("mp4") ? "mp4" : file.type.includes("webm") ? "webm" : "bin";
  let replayUrl = "";
  let usedDatabaseFallback = false;

  try {
    const uploaded = await put(`live-replays/${matchId}/${crypto.randomUUID()}.${extension}`, file, { access: "public", contentType: file.type || "video/webm" });
    replayUrl = uploaded.url;
    await db.delete(liveReplayCache).where(eq(liveReplayCache.token, session.token)).catch(() => undefined);
  } catch (error) {
    console.warn("[api/live/replay] blob unavailable, using database fallback", error instanceof Error ? error.message : "unknown");
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const contentType = file.type || "video/webm";
    await db.insert(liveReplayCache).values({
      token: session.token,
      matchId,
      dataBase64: base64,
      contentType,
      sequence: nextSequence,
      createdAt: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: liveReplayCache.token,
      set: { matchId, dataBase64: base64, contentType, sequence: nextSequence, createdAt: new Date().toISOString() },
    });
    replayUrl = `/api/live/replay/media?token=${encodeURIComponent(session.token)}&sequence=${nextSequence}`;
    usedDatabaseFallback = true;
  }

  await db.update(liveSessions).set({
    replayUrl,
    replayUntil,
    replaySequence: nextSequence,
    replayDurationMs: durationSec * 1000,
  }).where(eq(liveSessions.id, session.id));

  if (!usedDatabaseFallback && session.replayUrl?.includes(".blob.vercel-storage.com")) void del(session.replayUrl).catch(() => undefined);
  return Response.json({ ok: true, replayUrl, sequence: nextSequence, durationMs: durationSec * 1000, storage: usedDatabaseFallback ? "database" : "blob" });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const matchId = Number(url.searchParams.get("matchId") ?? 0);
  if (!token && !matchId) return Response.json({ error: "Missing match" }, { status: 400 });
  const db = getDb();
  let session: typeof liveSessions.$inferSelect | undefined;
  if (token) [session] = await db.select().from(liveSessions).where(eq(liveSessions.token, token)).limit(1);
  else [session] = await db.select().from(liveSessions).where(and(eq(liveSessions.matchId, matchId), eq(liveSessions.active, true))).orderBy(desc(liveSessions.id)).limit(1);
  if (!session) return Response.json({ active: false, replay: null });
  return Response.json({
    active: session.active,
    matchId: session.matchId,
    replay: session.replayUrl ? {
      url: session.replayUrl,
      until: session.replayUntil,
      sequence: session.replaySequence,
      durationMs: session.replayDurationMs,
    } : null,
  });
}

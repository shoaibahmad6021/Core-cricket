import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { liveSessions, matches, players, tournamentScorers, tournaments } from "@/db/schema";
import { liveRtcPeers } from "@/db/live-rtc-schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isCoreCricketAdmin } from "@/app/admin-auth";

async function canPublish(token: string) {
  const user = await getChatGPTUser();
  if (!user) return false;
  if (isCoreCricketAdmin(user)) return true;
  const db = getDb();
  const [session] = await db.select().from(liveSessions).where(and(eq(liveSessions.token, token), eq(liveSessions.active, true))).limit(1);
  if (!session) return false;
  const [match] = await db.select().from(matches).where(eq(matches.id, session.matchId)).limit(1);
  if (!match) return false;
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

async function waitForIceComplete(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 2500);
    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export async function POST(request: Request) {
  const body = await request.json() as { action?: "offer" | "answer" | "close"; token?: string; viewerId?: string; sdp?: string };
  const token = body.token?.trim() ?? "";
  const viewerId = body.viewerId?.trim() ?? "";
  if (!token || !viewerId) return Response.json({ error: "Missing live connection details" }, { status: 400 });
  const db = getDb();
  const [session] = await db.select().from(liveSessions).where(and(eq(liveSessions.token, token), eq(liveSessions.active, true))).limit(1);
  if (!session) return Response.json({ error: "Live broadcast is not active" }, { status: 404 });

  if (body.action === "offer") {
    if (!body.sdp) return Response.json({ error: "Missing viewer offer" }, { status: 400 });
    await db.insert(liveRtcPeers).values({ token, viewerId, offerSdp: body.sdp, answerSdp: null, active: true })
      .onConflictDoUpdate({ target: [liveRtcPeers.token, liveRtcPeers.viewerId], set: { offerSdp: body.sdp, answerSdp: null, active: true } });
    return Response.json({ ok: true });
  }

  if (body.action === "answer") {
    if (!(await canPublish(token))) return Response.json({ error: "Broadcast control not authorized" }, { status: 403 });
    if (!body.sdp) return Response.json({ error: "Missing broadcaster answer" }, { status: 400 });
    await db.update(liveRtcPeers).set({ answerSdp: body.sdp }).where(and(eq(liveRtcPeers.token, token), eq(liveRtcPeers.viewerId, viewerId)));
    return Response.json({ ok: true });
  }

  if (body.action === "close") {
    await db.update(liveRtcPeers).set({ active: false }).where(and(eq(liveRtcPeers.token, token), eq(liveRtcPeers.viewerId, viewerId)));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unsupported signaling action" }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const viewerId = url.searchParams.get("viewerId") ?? "";
  const publisher = url.searchParams.get("publisher") === "1";
  if (!token) return Response.json({ error: "Missing live token" }, { status: 400 });
  const db = getDb();

  if (publisher) {
    if (!(await canPublish(token))) return Response.json({ error: "Broadcast control not authorized" }, { status: 403 });
    const peers = await db.select().from(liveRtcPeers).where(and(eq(liveRtcPeers.token, token), eq(liveRtcPeers.active, true), isNull(liveRtcPeers.answerSdp)));
    return Response.json({ peers: peers.map((peer) => ({ viewerId: peer.viewerId, offerSdp: peer.offerSdp })) });
  }

  if (!viewerId) return Response.json({ error: "Missing viewer id" }, { status: 400 });
  const [peer] = await db.select().from(liveRtcPeers).where(and(eq(liveRtcPeers.token, token), eq(liveRtcPeers.viewerId, viewerId), eq(liveRtcPeers.active, true))).limit(1);
  if (!peer) return Response.json({ pending: true });
  return Response.json({ pending: !peer.answerSdp, answerSdp: peer.answerSdp });
}

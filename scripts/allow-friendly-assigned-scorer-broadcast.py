from pathlib import Path

p=Path('components/core-cricket-app.tsx')
s=p.read_text()
old='''  async function startLive() { if (!activeMatch) return; if (!canBroadcastActiveMatch) { setNotice("Live broadcast is available to admins, team captains/admins, tournament creators and official scorers."); return; } if (!cameraOn) await enableCamera(); try { const result = await apiPost("/api/live", { matchId: activeMatch.id }) as { token?: string; publishKey?: string };'''
new='''  async function startLive() { if (!activeMatch) return; if (!canBroadcastActiveMatch) { setNotice("Live broadcast is available to admins, team captains/admins, tournament creators and assigned scorers."); return; } if (!cameraOn) await enableCamera(); try { const result = await apiPost("/api/live", { matchId: activeMatch.id, handoffToken: scoreHandoffToken || undefined }) as { token?: string; publishKey?: string };'''
if old not in s: raise SystemExit('startLive marker not found')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('app/api/live/route.ts')
s=p.read_text()
s=s.replace('import { eq } from "drizzle-orm";','import { and, eq } from "drizzle-orm";',1)
s=s.replace('import { deliveries, liveSessions, matches, players, teams, tournamentScorers, tournaments } from "@/db/schema";','import { deliveries, liveSessions, matches, players, scoringHandoffs, teams, tournamentScorers, tournaments } from "@/db/schema";',1)
s=s.replace('async function canBroadcast(matchId: number) {','async function canBroadcast(matchId: number, handoffToken?: string) {',1)
old='''  if (!match) return false;
  const name = (user.fullName || user.displayName).trim().toLowerCase();'''
new='''  if (!match) return false;
  if (handoffToken) {
    const [handoff] = await db.select().from(scoringHandoffs).where(and(eq(scoringHandoffs.token, handoffToken), eq(scoringHandoffs.matchId, matchId), eq(scoringHandoffs.active, true))).limit(1);
    if (handoff) return true;
  }
  const name = (user.fullName || user.displayName).trim().toLowerCase();'''
if old not in s: raise SystemExit('live auth marker not found')
s=s.replace(old,new,1)
s=s.replace('''  const { matchId } = await request.json() as { matchId?: number };
  if (!matchId) return Response.json({ error: "Choose a match" }, { status: 400 });
  if (!(await canBroadcast(matchId))) return Response.json({ error: "Live broadcast is available to site admins, tournament creators, official scorers, team captains and team admins." }, { status: 403 });''','''  const { matchId, handoffToken } = await request.json() as { matchId?: number; handoffToken?: string };
  if (!matchId) return Response.json({ error: "Choose a match" }, { status: 400 });
  if (!(await canBroadcast(matchId, handoffToken))) return Response.json({ error: "Live broadcast is available to site admins, tournament creators, assigned scorers, team captains and team admins." }, { status: 403 });''',1)
p.write_text(s)
print('Assigned scorer broadcast patch applied')

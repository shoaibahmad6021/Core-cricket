import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { deliveries, matches, matchPlayers, players, scoringHandoffs, tournamentScorers, tournaments } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isCoreCricketAdmin } from "@/app/admin-auth";

type ScoreBody = {
  action: "delivery" | "undo" | "start" | "changeBowler" | "endInnings" | "resolveTie";
  matchId: number;
  runsBatter?: number;
  extraType?: string | null;
  extraRuns?: number;
  wicketType?: string | null;
  nextBatterId?: number | null;
  strikerId?: number;
  nonStrikerId?: number;
  bowlerId?: number;
  playerOutId?: number | null;
  strikerAfterId?: number | null;
  tieResolution?: "superOver" | "sharedPoints" | "walkoverA" | "walkoverB";
  handoffToken?: string;
};

const creditedWickets = new Set(["Bowled", "Caught", "LBW", "Stumped", "Hit wicket"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScoreBody;
    const db = getDb();
    const [match] = await db.select().from(matches).where(eq(matches.id, Number(body.matchId))).limit(1);
    if (!match) return Response.json({ error: "Match not found" }, { status: 404 });
    const user = await getChatGPTUser(); if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    if (!match.tournamentId) return Response.json({ error: "Scoring must be started from a tournament" }, { status: 403 });
    const officials = await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId, match.tournamentId));
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);
    const [handoff] = body.handoffToken ? await db.select().from(scoringHandoffs).where(and(eq(scoringHandoffs.token, body.handoffToken), eq(scoringHandoffs.matchId, match.id), eq(scoringHandoffs.active, true))).limit(1) : [];
    const email = user.email.trim().toLowerCase(); const name = (user.fullName || user.displayName).trim().toLowerCase();
    const creator = tournament && (tournament.createdByEmail.trim().toLowerCase() === email || tournament.createdByName.trim().toLowerCase() === name);
    if (!handoff && !creator && !isCoreCricketAdmin(user) && !officials.some((scorer) => scorer.email.trim().toLowerCase() === email || scorer.name.trim().toLowerCase() === name)) return Response.json({ error: "Only the tournament creator, an official scorer or an authorized handoff device can update the score" }, { status: 403 });

    if (body.action === "start") {
      if (!match.tossWinnerTeamId || !match.tossDecision) return Response.json({ error: "Complete the toss and batting decision before scoring" }, { status: 409 });
      const selected = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
      if (selected.filter((item) => item.teamId === match.teamAId).length !== 11 || selected.filter((item) => item.teamId === match.teamBId).length !== 11) return Response.json({ error: "Select the playing XI for both teams before scoring" }, { status: 409 });
      if (!body.strikerId || !body.nonStrikerId || !body.bowlerId) return Response.json({ error: "Select two batters and a bowler" }, { status: 400 });
      const eligible = new Set(selected.map((item) => item.playerId));
      if (![body.strikerId, body.nonStrikerId, body.bowlerId].every((id) => eligible.has(Number(id)))) return Response.json({ error: "Opening players must be selected in the playing XI" }, { status: 400 });
      if (body.strikerId === body.nonStrikerId) return Response.json({ error: "Select two different opening batters" }, { status: 400 });
      const [updated] = await db.update(matches).set({
        strikerId: body.strikerId,
        nonStrikerId: body.nonStrikerId,
        bowlerId: body.bowlerId,
        status: (match.innings ?? 1) >= 3 ? "Super Over" : "Live",
      }).where(eq(matches.id, match.id)).returning();
      return Response.json({ match: updated });
    }

    if (body.action === "changeBowler") {
      if (!body.bowlerId) return Response.json({ error: "Select the next bowler" }, { status: 400 });
      if (body.bowlerId === match.bowlerId) return Response.json({ error: "A bowler cannot bowl consecutive overs" }, { status: 400 });
      const [updated] = await db.update(matches).set({ bowlerId: body.bowlerId, awaitingBowler: false }).where(eq(matches.id, match.id)).returning();
      return Response.json({ match: updated });
    }

    if (body.action === "resolveTie") {
      if (body.tieResolution === "walkoverA" || body.tieResolution === "walkoverB") {
        const winner = body.tieResolution === "walkoverA" ? "Team A" : "Team B";
        const [updated] = await db.update(matches).set({ status: "Completed", result: `${winner} won by walkover`, tieResolution: "Walkover" }).where(eq(matches.id, match.id)).returning();
        return Response.json({ match: updated });
      }
      if (body.tieResolution === "sharedPoints") {
        const [updated] = await db.update(matches).set({ status: "Completed", result: "Match tied — 1 point each", tieResolution: "Shared points" }).where(eq(matches.id, match.id)).returning();
        return Response.json({ match: updated });
      }
      const [updated] = await db.update(matches).set({ innings: 3, overs: 1, runs: 0, wickets: 0, balls: 0, target: null, battingTeamId: match.teamAId, bowlingTeamId: match.teamBId, strikerId: null, nonStrikerId: null, bowlerId: null, status: "Super Over", tieResolution: "Super Over", awaitingBowler: false }).where(eq(matches.id, match.id)).returning();
      return Response.json({ match: updated, needsPlayers: true });
    }

    if (body.action === "endInnings") {
      if ((match.innings ?? 1) === 1) {
        const [updated] = await db.update(matches).set({ innings: 2, firstInningsRuns: match.runs, firstInningsWickets: match.wickets, target: match.runs + 1, battingTeamId: match.bowlingTeamId, bowlingTeamId: match.battingTeamId, runs: 0, wickets: 0, balls: 0, strikerId: null, nonStrikerId: null, bowlerId: null, awaitingBowler: false, status: "Innings break" }).where(eq(matches.id, match.id)).returning();
        return Response.json({ match: updated, needsPlayers: true });
      }
      if (match.innings === 3) {
        const [updated] = await db.update(matches).set({ innings: 4, superOverFirstRuns: match.runs, target: match.runs + 1, battingTeamId: match.bowlingTeamId, bowlingTeamId: match.battingTeamId, runs: 0, wickets: 0, balls: 0, strikerId: null, nonStrikerId: null, bowlerId: null, awaitingBowler: false, status: "Super Over break" }).where(eq(matches.id, match.id)).returning();
        return Response.json({ match: updated, needsPlayers: true });
      }
      const reference = match.innings === 4 ? (match.superOverFirstRuns ?? 0) : (match.firstInningsRuns ?? 0);
      if (match.runs === reference && match.innings === 2) return Response.json({ tie: true, match });
      const battingName = match.battingTeamId === match.teamAId ? "Team A" : "Team B";
      const result = match.runs > reference ? `${battingName} won` : `${battingName === "Team A" ? "Team B" : "Team A"} won`;
      const [updated] = await db.update(matches).set({ status: "Completed", result }).where(eq(matches.id, match.id)).returning();
      return Response.json({ match: updated });
    }

    if (body.action === "undo") {
      const [last] = await db.select().from(deliveries).where(eq(deliveries.matchId, match.id)).orderBy(desc(deliveries.sequence)).limit(1);
      if (!last) return Response.json({ error: "There is no delivery to undo" }, { status: 400 });
      const chargedRuns = last.extraType === "Bye" || last.extraType === "Leg bye" ? 0 : last.runsBatter + last.extraRuns;
      await db.batch([
        db.update(matches).set({
          runs: sql`GREATEST(0, ${matches.runs} - ${last.runsBatter + last.extraRuns})`,
          wickets: sql`GREATEST(0, ${matches.wickets} - ${last.playerOutId ? 1 : 0})`,
          balls: sql`GREATEST(0, ${matches.balls} - ${last.legalBall ? 1 : 0})`,
          strikerId: last.strikerBefore,
          nonStrikerId: last.nonStrikerBefore,
        }).where(eq(matches.id, match.id)),
        db.update(players).set({
          runs: sql`GREATEST(0, ${players.runs} - ${last.runsBatter})`,
          ballsFaced: sql`GREATEST(0, ${players.ballsFaced} - ${last.extraType === "Wide" ? 0 : 1})`,
          fours: sql`GREATEST(0, ${players.fours} - ${last.runsBatter === 4 ? 1 : 0})`,
          sixes: sql`GREATEST(0, ${players.sixes} - ${last.runsBatter === 6 ? 1 : 0})`,
        }).where(eq(players.id, last.strikerBefore ?? 0)),
        db.update(players).set({
          ballsBowled: sql`GREATEST(0, ${players.ballsBowled} - ${last.legalBall ? 1 : 0})`,
          runsConceded: sql`GREATEST(0, ${players.runsConceded} - ${chargedRuns})`,
          wickets: sql`GREATEST(0, ${players.wickets} - ${last.wicketCredit ? 1 : 0})`,
        }).where(eq(players.id, last.bowlerId ?? 0)),
        db.delete(deliveries).where(and(eq(deliveries.id, last.id), eq(deliveries.matchId, match.id))),
      ]);
      return Response.json({ ok: true });
    }

    if (!["Live", "Super Over"].includes(match.status) || !match.strikerId || !match.nonStrikerId || !match.bowlerId) return Response.json({ error: "Start the innings before recording a ball" }, { status: 400 });
    if (match.awaitingBowler) return Response.json({ error: "Select the next bowler before starting the new over" }, { status: 409 });

    const runsBatter = Math.max(0, Math.min(6, Number(body.runsBatter) || 0));
    const extraRuns = Math.max(0, Number(body.extraRuns) || 0);
    const extraType = body.extraType || null;
    const wicketType = body.wicketType || null;
    const legalBall = extraType !== "Wide" && extraType !== "No ball";
    const wicketCredit = Boolean(wicketType && creditedWickets.has(wicketType));
    const totalRuns = runsBatter + extraRuns;
    const nextBalls = match.balls + (legalBall ? 1 : 0);
    let nextStriker = match.strikerId;
    let nextNonStriker = match.nonStrikerId;
    const rotationRuns = extraType === "Wide" ? Math.max(0, extraRuns - 1) : extraType === "No ball" ? runsBatter + Math.max(0, extraRuns - 1) : totalRuns;
    if (rotationRuns % 2 === 1) [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
    if (legalBall && nextBalls % 6 === 0) [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
    const playerOutId = wicketType ? Number(body.playerOutId) || match.strikerId : null;
    if (wicketType && body.nextBatterId) {
      const remaining = [match.strikerId, match.nonStrikerId, Number(body.nextBatterId)].filter((id) => id !== playerOutId);
      const requestedStriker = Number(body.strikerAfterId);
      nextStriker = remaining.includes(requestedStriker) ? requestedStriker : Number(body.nextBatterId);
      nextNonStriker = remaining.find((id) => id !== nextStriker) ?? Number(body.nextBatterId);
    }

    const chargedRuns = extraType === "Bye" || extraType === "Leg bye" ? 0 : totalRuns;
    const [latest] = await db.select({ sequence: deliveries.sequence }).from(deliveries).where(eq(deliveries.matchId, match.id)).orderBy(desc(deliveries.sequence)).limit(1);

    await db.batch([
      db.insert(deliveries).values({
        matchId: match.id,
        sequence: (latest?.sequence ?? 0) + 1,
        strikerBefore: match.strikerId,
        nonStrikerBefore: match.nonStrikerId,
        bowlerId: match.bowlerId,
        runsBatter,
        extraType,
        extraRuns,
        legalBall,
        wicketType,
        playerOutId,
        wicketCredit,
      }),
      db.update(matches).set({
        runs: sql`${matches.runs} + ${totalRuns}`,
        wickets: sql`${matches.wickets} + ${wicketType ? 1 : 0}`,
        balls: sql`${matches.balls} + ${legalBall ? 1 : 0}`,
        strikerId: nextStriker,
        nonStrikerId: nextNonStriker,
        awaitingBowler: (match.innings ?? 1) < 3 && legalBall && nextBalls % 6 === 0,
      }).where(eq(matches.id, match.id)),
      db.update(players).set({
        runs: sql`${players.runs} + ${runsBatter}`,
        ballsFaced: sql`${players.ballsFaced} + ${extraType === "Wide" ? 0 : 1}`,
        fours: sql`${players.fours} + ${runsBatter === 4 ? 1 : 0}`,
        sixes: sql`${players.sixes} + ${runsBatter === 6 ? 1 : 0}`,
        highest: sql`GREATEST(${players.highest}, ${players.runs} + ${runsBatter})`,
      }).where(eq(players.id, match.strikerId)),
      db.update(players).set({
        ballsBowled: sql`${players.ballsBowled} + ${legalBall ? 1 : 0}`,
        runsConceded: sql`${players.runsConceded} + ${chargedRuns}`,
        wickets: sql`${players.wickets} + ${wicketCredit ? 1 : 0}`,
      }).where(eq(players.id, match.bowlerId)),
    ]);
    const [updated] = await db.select().from(matches).where(eq(matches.id, match.id)).limit(1);
    return Response.json({ ok: true, match: updated, overComplete: (match.innings ?? 1) < 3 && legalBall && nextBalls % 6 === 0, superOverComplete: (match.innings ?? 1) >= 3 && legalBall && nextBalls >= 6 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update score";
    return Response.json({ error: message }, { status: 500 });
  }
}

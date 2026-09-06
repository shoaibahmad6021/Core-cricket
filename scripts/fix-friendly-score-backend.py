from pathlib import Path

p = Path('app/api/score/route.ts')
s = p.read_text()

old_auth = '''    if (!match.tournamentId) return Response.json({ error: "Scoring must be started from a tournament" }, { status: 403 });
    const officials = await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId, match.tournamentId));
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);
    const [handoff] = body.handoffToken ? await db.select().from(scoringHandoffs).where(and(eq(scoringHandoffs.token, body.handoffToken), eq(scoringHandoffs.matchId, match.id), eq(scoringHandoffs.active, true))).limit(1) : [];
    const email = user.email.trim().toLowerCase(); const name = (user.fullName || user.displayName).trim().toLowerCase();
    const creator = tournament && (tournament.createdByEmail.trim().toLowerCase() === email || tournament.createdByName.trim().toLowerCase() === name);
    if (!handoff && !creator && !isCoreCricketAdmin(user) && !officials.some((scorer) => scorer.email.trim().toLowerCase() === email || scorer.name.trim().toLowerCase() === name)) return Response.json({ error: "Only the tournament creator, an official scorer or an authorized handoff device can update the score" }, { status: 403 });
'''
new_auth = '''    const [handoff] = body.handoffToken ? await db.select().from(scoringHandoffs).where(and(eq(scoringHandoffs.token, body.handoffToken), eq(scoringHandoffs.matchId, match.id), eq(scoringHandoffs.active, true))).limit(1) : [];
    const email = user.email.trim().toLowerCase(); const name = (user.fullName || user.displayName).trim().toLowerCase();
    if (!match.tournamentId) {
      const teamManagers = await db.select().from(players).where(sql`${players.teamId} IN (${match.teamAId}, ${match.teamBId})`);
      const friendlyAuthorized = isCoreCricketAdmin(user) || teamManagers.some((player) => player.name.trim().toLowerCase() === name && ["captain", "team admin"].includes((player.memberRole ?? "").trim().toLowerCase()));
      if (!handoff && !friendlyAuthorized) return Response.json({ error: "Only an administrator, team captain, team admin or authorized handoff device can score a friendly match" }, { status: 403 });
    } else {
      const officials = await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId, match.tournamentId));
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);
      const creator = tournament && (tournament.createdByEmail.trim().toLowerCase() === email || tournament.createdByName.trim().toLowerCase() === name);
      if (!handoff && !creator && !isCoreCricketAdmin(user) && !officials.some((scorer) => scorer.email.trim().toLowerCase() === email || scorer.name.trim().toLowerCase() === name)) return Response.json({ error: "Only the tournament creator, an official scorer or an authorized handoff device can update the score" }, { status: 403 });
    }
'''
if old_auth not in s:
    raise SystemExit('authorization marker not found')
s = s.replace(old_auth, new_auth, 1)

old_start = '''    if (body.action === "start") {
      if (!match.tossWinnerTeamId || !match.tossDecision) return Response.json({ error: "Complete the toss and batting decision before scoring" }, { status: 409 });
      const selected = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
      if (selected.filter((item) => item.teamId === match.teamAId).length !== 11 || selected.filter((item) => item.teamId === match.teamBId).length !== 11) return Response.json({ error: "Select the playing XI for both teams before scoring" }, { status: 409 });
      if (!body.strikerId || !body.nonStrikerId || !body.bowlerId) return Response.json({ error: "Select two batters and a bowler" }, { status: 400 });
      const eligible = new Set(selected.map((item) => item.playerId));
      if (![body.strikerId, body.nonStrikerId, body.bowlerId].every((id) => eligible.has(Number(id)))) return Response.json({ error: "Opening players must be selected in the playing XI" }, { status: 400 });
      if (body.strikerId === body.nonStrikerId) return Response.json({ error: "Select two different opening batters" }, { status: 400 });
'''
new_start = '''    if (body.action === "start") {
      if (!body.strikerId || !body.nonStrikerId || !body.bowlerId) return Response.json({ error: "Select two batters and a bowler" }, { status: 400 });
      if (body.strikerId === body.nonStrikerId) return Response.json({ error: "Select two different opening batters" }, { status: 400 });
      if (!match.tournamentId) {
        const openingPlayers = await db.select().from(players).where(sql`${players.id} IN (${Number(body.strikerId)}, ${Number(body.nonStrikerId)}, ${Number(body.bowlerId)})`);
        const strikerPlayer = openingPlayers.find((player) => player.id === Number(body.strikerId));
        const nonStrikerPlayer = openingPlayers.find((player) => player.id === Number(body.nonStrikerId));
        const bowlerPlayer = openingPlayers.find((player) => player.id === Number(body.bowlerId));
        if (!strikerPlayer || !nonStrikerPlayer || !bowlerPlayer) return Response.json({ error: "Select valid opening players" }, { status: 400 });
        if (strikerPlayer.teamId !== match.battingTeamId || nonStrikerPlayer.teamId !== match.battingTeamId) return Response.json({ error: "Both opening batters must belong to the batting team" }, { status: 400 });
        if (bowlerPlayer.teamId !== match.bowlingTeamId) return Response.json({ error: "The opening bowler must belong to the bowling team" }, { status: 400 });
      } else {
        if (!match.tossWinnerTeamId || !match.tossDecision) return Response.json({ error: "Complete the toss and batting decision before scoring" }, { status: 409 });
        const selected = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));
        if (selected.filter((item) => item.teamId === match.teamAId).length !== 11 || selected.filter((item) => item.teamId === match.teamBId).length !== 11) return Response.json({ error: "Select the playing XI for both teams before scoring" }, { status: 409 });
        const eligible = new Set(selected.map((item) => item.playerId));
        if (![body.strikerId, body.nonStrikerId, body.bowlerId].every((id) => eligible.has(Number(id)))) return Response.json({ error: "Opening players must be selected in the playing XI" }, { status: 400 });
      }
'''
if old_start not in s:
    raise SystemExit('start marker not found')
s = s.replace(old_start, new_start, 1)
p.write_text(s)
print('friendly backend patched')

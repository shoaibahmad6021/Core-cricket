from pathlib import Path

# 1) Frontend: route friendly matches through Playing XI -> toss -> decision -> openers.
p = Path('components/core-cricket-app.tsx')
s = p.read_text()

s = s.replace(
'  const [pendingStartMatchId, setPendingStartMatchId] = useState<number | null>(null);',
'  const [pendingStartMatchId, setPendingStartMatchId] = useState<number | null>(null);\n  const [friendlySetupMatchId, setFriendlySetupMatchId] = useState<number | null>(null);',
1)

old = '''      {view === "score" && <Scoring readOnly={!canScoreActiveMatch} canStartMatch={canStartActiveMatch} data={data} match={activeMatch} tournament={activeTournament} battingTeam={battingTeam} bowlingTeam={bowlingTeam} striker={striker} nonStriker={nonStriker} bowler={bowler} transferLink={transferLink} transferQr={transferQr} onTransfer={createScoringTransfer} onStartMatch={() => { if (!activeMatch) return; if (!activeMatch.tournamentId) { setModal("innings"); setNotice("Friendly match selected — choose the opening batters and bowler to start."); return; } setPendingStartMatchId(activeMatch.id); setSelectedTournamentId(activeMatch.tournamentId); setTournamentHubOpen(true); go("manage"); }} onStartSetup={() => setModal("innings")} onScore={score} onUndo={undo} onWicket={() => setModal("wicket")} onEndInnings={() => { setModal("tie"); return Promise.resolve(); }} />}'''
new = '''      {view === "score" && (friendlySetupMatchId && activeMatch?.id === friendlySetupMatchId ? <MatchSetup data={data} match={activeMatch} officialScorer={canScoreActiveMatch} canManageTeam={canManageTeam} canManageBoth={!userPreview && user.isAdmin} onBack={() => setFriendlySetupMatchId(null)} onRefresh={loadData} onStartScoring={() => { setFriendlySetupMatchId(null); setSelectedMatchId(activeMatch.id); }} /> : <Scoring readOnly={!canScoreActiveMatch} canStartMatch={canStartActiveMatch} data={data} match={activeMatch} tournament={activeTournament} battingTeam={battingTeam} bowlingTeam={bowlingTeam} striker={striker} nonStriker={nonStriker} bowler={bowler} transferLink={transferLink} transferQr={transferQr} onTransfer={createScoringTransfer} onStartMatch={() => { if (!activeMatch) return; if (!activeMatch.tournamentId) { setFriendlySetupMatchId(activeMatch.id); setNotice("Friendly match setup — select the available playing squad, then run the toss."); return; } setPendingStartMatchId(activeMatch.id); setSelectedTournamentId(activeMatch.tournamentId); setTournamentHubOpen(true); go("manage"); }} onStartSetup={() => setModal("innings")} onScore={score} onUndo={undo} onWicket={() => setModal("wicket")} onEndInnings={() => { setModal("tie"); return Promise.resolve(); }} />)}'''
if old not in s:
    raise SystemExit('score render marker not found')
s = s.replace(old, new, 1)

old = '''  const teamIds = [match.teamAId, match.teamBId];
  const counts = (teamId: number) => (data.matchPlayers ?? []).filter((item) => item.matchId === match.id && item.teamId === teamId).length;
  const firstIncomplete = teamIds.find((id) => counts(id) !== 11) ?? match.teamAId;'''
new = '''  const teamIds = [match.teamAId, match.teamBId];
  const friendly = !match.tournamentId;
  const requiredCount = (teamId: number) => friendly ? Math.min(11, data.players.filter((player) => player.teamId === teamId).length) : 11;
  const counts = (teamId: number) => (data.matchPlayers ?? []).filter((item) => item.matchId === match.id && item.teamId === teamId).length;
  const firstIncomplete = teamIds.find((id) => counts(id) !== requiredCount(id)) ?? match.teamAId;'''
if old not in s:
    raise SystemExit('MatchSetup header marker not found')
s = s.replace(old, new, 1)

s = s.replace(
'  const canEdit = canManageBoth || canManageTeam(activeTeamId); const bothReady = teamIds.every((id) => counts(id) === 11);',
'  const canEdit = canManageBoth || canManageTeam(activeTeamId); const bothReady = teamIds.every((id) => requiredCount(id) > 0 && counts(id) === requiredCount(id));',
1)

old = '''    <div className="lineup-progress">{teamIds.map((id, index) => <button key={id} disabled={id === match.teamBId && counts(match.teamAId) !== 11} className={activeTeamId === id ? "active" : ""} onClick={() => openTeam(id)}><span>{counts(id) === 11 ? "✓" : index + 1}</span><b>{getTeam(data, id)?.name}</b><small>{counts(id)}/11 selected</small></button>)}</div>
    <section className="card lineup-card"><CardTitle eyebrow={counts(activeTeamId) === 11 ? "PLAYING XI SAVED" : "SELECT FROM SQUAD"} title={`${team?.name} playing XI`} /><p>Choose exactly 11 players from this team’s registered squad. Players outside the squad cannot be added.</p>{canEdit ? <><div className="lineup-grid">{squad.map((player) => { const checked = selected.includes(player.id); return <button key={player.id} className={checked ? "selected" : ""} onClick={() => setSelected((current) => checked ? current.filter((id) => id !== player.id) : current.length < 11 ? [...current, player.id] : current)}><Avatar player={player} /><span><b>{player.name}</b><small>{player.role}</small></span><i>{checked ? "✓" : "+"}</i></button>; })}</div><div className="lineup-footer"><b>{selected.length}/11 players selected</b><button className="primary-button" disabled={selected.length !== 11 || saving} onClick={() => void saveXI()}>{saving ? "Saving…" : `Save ${team?.shortName} playing XI`}</button></div></> : <div className="readonly-note">Only this team’s captain or team administrator, or the tournament creator, can select this playing XI.</div>}</section>'''
new = '''    <div className="lineup-progress">{teamIds.map((id, index) => { const required=requiredCount(id); return <button key={id} disabled={id === match.teamBId && counts(match.teamAId) !== requiredCount(match.teamAId)} className={activeTeamId === id ? "active" : ""} onClick={() => openTeam(id)}><span>{required > 0 && counts(id) === required ? "✓" : index + 1}</span><b>{getTeam(data, id)?.name}</b><small>{counts(id)}/{required} selected</small></button>; })}</div>
    <section className="card lineup-card"><CardTitle eyebrow={counts(activeTeamId) === requiredCount(activeTeamId) && requiredCount(activeTeamId)>0 ? "PLAYING SQUAD SAVED" : "SELECT FROM SQUAD"} title={`${team?.name} ${friendly ? "playing squad" : "playing XI"}`} /><p>{friendly && requiredCount(activeTeamId) < 11 ? `This team has ${requiredCount(activeTeamId)} registered player${requiredCount(activeTeamId)===1?"":"s"}. Select all available players to continue.` : "Choose exactly 11 players from this team’s registered squad. Players outside the squad cannot be added."}</p>{canEdit ? <><div className="lineup-grid">{squad.map((player) => { const checked = selected.includes(player.id); const max=requiredCount(activeTeamId); return <button key={player.id} className={checked ? "selected" : ""} onClick={() => setSelected((current) => checked ? current.filter((id) => id !== player.id) : current.length < max ? [...current, player.id] : current)}><Avatar player={player} /><span><b>{player.name}</b><small>{player.role}</small></span><i>{checked ? "✓" : "+"}</i></button>; })}</div><div className="lineup-footer"><b>{selected.length}/{requiredCount(activeTeamId)} players selected</b><button className="primary-button" disabled={requiredCount(activeTeamId) < 1 || selected.length !== requiredCount(activeTeamId) || saving} onClick={() => void saveXI()}>{saving ? "Saving…" : `Save ${team?.shortName} ${friendly ? "squad" : "playing XI"}`}</button></div></> : <div className="readonly-note">Only this team’s captain or team administrator, or the tournament creator, can select this lineup.</div>}</section>'''
if old not in s:
    raise SystemExit('MatchSetup lineup block marker not found')
s = s.replace(old, new, 1)

old = '''function MatchSetupFinal({data,match,officialScorer,onRefresh,onStartScoring}:{data:Data;match:Match;officialScorer:boolean;onRefresh:()=>Promise<void>;onStartScoring:()=>void}) {
  const [flipping,setFlipping]=useState(false); const [error,setError]=useState(""); const scorers=(data.tournamentScorers??[]).filter((item)=>item.tournamentId===match.tournamentId); const xi=new Set((data.matchPlayers??[]).filter((item)=>item.matchId===match.id).map((item)=>item.playerId)); const batters=data.players.filter((p)=>p.teamId===match.battingTeamId&&xi.has(p.id)); const bowlers=data.players.filter((p)=>p.teamId===match.bowlingTeamId&&xi.has(p.id));'''
new = '''function MatchSetupFinal({data,match,officialScorer,onRefresh,onStartScoring}:{data:Data;match:Match;officialScorer:boolean;onRefresh:()=>Promise<void>;onStartScoring:()=>void}) {
  const [flipping,setFlipping]=useState(false); const [error,setError]=useState(""); const friendly=!match.tournamentId; const scorers=(data.tournamentScorers??[]).filter((item)=>item.tournamentId===match.tournamentId); const xi=new Set((data.matchPlayers??[]).filter((item)=>item.matchId===match.id).map((item)=>item.playerId)); const batters=data.players.filter((p)=>p.teamId===match.battingTeamId&&xi.has(p.id)); const bowlers=data.players.filter((p)=>p.teamId===match.bowlingTeamId&&xi.has(p.id));'''
if old not in s:
    raise SystemExit('MatchSetupFinal header marker not found')
s=s.replace(old,new,1)

s=s.replace('  function toss(){if(!scorers.length)return;', '  function toss(){if(!friendly&&!scorers.length)return;', 1)

old = '''  return <div className="match-final">{error&&<div className="setup-error">{error}</div>}{!match.tossWinnerTeamId&&<section className="card toss-card"><div className={flipping?"coin flipping":"coin"}><b>CORE</b><span>CRICKET</span></div><h2>Automated toss</h2><p>{scorers.length?"Both playing XIs are ready. Run the random coin toss.":"Add at least one official scorer before the match can start."}</p><button className="primary-button" disabled={!scorers.length||flipping} onClick={toss}>{flipping?"Tossing…":"Start automated toss"}</button></section>}'''
new = '''  return <div className="match-final">{error&&<div className="setup-error">{error}</div>}{!match.tossWinnerTeamId&&<section className="card toss-card"><div className={flipping?"coin flipping":"coin"}><b>CORE</b><span>CRICKET</span></div><h2>Random toss</h2><p>{friendly?"Both friendly-match squads are ready. Run the random toss, then let the winning team choose bat or bowl.":scorers.length?"Both playing XIs are ready. Run the random coin toss.":"Add at least one official scorer before the match can start."}</p><button className="primary-button" disabled={(!friendly&&!scorers.length)||flipping} onClick={toss}>{flipping?"Tossing…":"Start random toss"}</button></section>}'''
if old not in s:
    raise SystemExit('toss card marker not found')
s=s.replace(old,new,1)

s=s.replace('{officialScorer?<button className="primary-button full">Start scoring →</button>:<div className="readonly-note">An assigned official scorer must sign in to start scoring.</div>}', '{(officialScorer||friendly)?<button className="primary-button full">Start scoring →</button>:<div className="readonly-note">An assigned official scorer must sign in to start scoring.</div>}', 1)

p.write_text(s)

# 2) Friendly lineup API: exact 11 for tournament, all available up to 11 for friendly.
p = Path('app/api/lineup/route.ts')
s = p.read_text()
s = s.replace('    if (!matchId || !teamId || playerIds.length !== 11) return Response.json({ error: "Select exactly 11 players" }, { status: 400 });', '    if (!matchId || !teamId) return Response.json({ error: "Match and team are required" }, { status: 400 });', 1)
old = '''    const [tournament] = match.tournamentId ? await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1) : [];
    if (!(await canSelectTeam(user, teamId, tournament))) return Response.json({ error: "Only the team captain, team admin or tournament creator can select this XI" }, { status: 403 });
    const squad = await db.select({ id: players.id }).from(players).where(and(eq(players.teamId, teamId), inArray(players.id, playerIds)));
    if (squad.length !== 11) return Response.json({ error: "Every selected player must belong to this team's squad" }, { status: 400 });'''
new = '''    const [tournament] = match.tournamentId ? await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1) : [];
    if (!(await canSelectTeam(user, teamId, tournament))) return Response.json({ error: "Only the team captain, team admin or tournament creator can select this lineup" }, { status: 403 });
    const fullSquad = await db.select({ id: players.id }).from(players).where(eq(players.teamId, teamId));
    const required = match.tournamentId ? 11 : Math.min(11, fullSquad.length);
    if (required < 1) return Response.json({ error: "Add at least one player to this team before starting the match" }, { status: 400 });
    if (playerIds.length !== required) return Response.json({ error: match.tournamentId ? "Select exactly 11 players" : `Select all ${required} available player${required === 1 ? "" : "s"}` }, { status: 400 });
    const squad = await db.select({ id: players.id }).from(players).where(and(eq(players.teamId, teamId), inArray(players.id, playerIds)));
    if (squad.length !== required) return Response.json({ error: "Every selected player must belong to this team's squad" }, { status: 400 });'''
if old not in s:
    raise SystemExit('lineup API marker not found')
s=s.replace(old,new,1)
p.write_text(s)

# 3) Match setup API: allow friendly random toss and flexible lineups; no tournament scorer required.
p = Path('app/api/match-setup/route.ts')
s = p.read_text()
s=s.replace('    if (!match || !match.tournamentId) return Response.json({ error: "Tournament match not found" }, { status: 404 });\n    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);', '    if (!match) return Response.json({ error: "Match not found" }, { status: 404 });\n    const [tournament] = match.tournamentId ? await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1) : [];',1)
s=s.replace('    const lineups = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));\n    if (lineups.filter((row) => row.teamId === match.teamAId).length !== 11 || lineups.filter((row) => row.teamId === match.teamBId).length !== 11) return Response.json({ error: "Confirm both playing XIs first" }, { status: 409 });\n    const scorers = await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId, match.tournamentId));\n    if (scorers.length < 1) return Response.json({ error: "Add at least one official scorer before the toss" }, { status: 409 });', '    const lineups = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id));\n    const roster = await db.select().from(players);\n    const requiredA = match.tournamentId ? 11 : Math.min(11, roster.filter((p) => p.teamId === match.teamAId).length);\n    const requiredB = match.tournamentId ? 11 : Math.min(11, roster.filter((p) => p.teamId === match.teamBId).length);\n    if (requiredA < 1 || requiredB < 1 || lineups.filter((row) => row.teamId === match.teamAId).length !== requiredA || lineups.filter((row) => row.teamId === match.teamBId).length !== requiredB) return Response.json({ error: match.tournamentId ? "Confirm both playing XIs first" : "Confirm both friendly-match squads first" }, { status: 409 });\n    const scorers = match.tournamentId ? await db.select().from(tournamentScorers).where(eq(tournamentScorers.tournamentId, match.tournamentId)) : [];\n    if (match.tournamentId && scorers.length < 1) return Response.json({ error: "Add at least one official scorer before the toss" }, { status: 409 });',1)
s=s.replace('async function canSetUp(user: ChatGPTUser, teamAId: number, teamBId: number, tournament: typeof tournaments.$inferSelect) {', 'async function canSetUp(user: ChatGPTUser, teamAId: number, teamBId: number, tournament?: typeof tournaments.$inferSelect) {',1)
s=s.replace('  if (tournament.createdByEmail.toLowerCase() === email || tournament.createdByName.toLowerCase() === name) return true;', '  if (tournament && (tournament.createdByEmail.toLowerCase() === email || tournament.createdByName.toLowerCase() === name)) return true;',1)
p.write_text(s)

print('Friendly full setup patch applied')

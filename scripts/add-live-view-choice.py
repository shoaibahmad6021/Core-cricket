from pathlib import Path

path = Path('components/core-cricket-app.tsx')
text = path.read_text()

old = '''function Dashboard({ user, data, match, tournament, battingTeam, bowlingTeam, onNavigate, onInstall, onAddTeam, userPreview, onOpenMatch }: { user: CoreCricketUser; data: Data; match?: Match; tournament?: Tournament; battingTeam?: Team; bowlingTeam?: Team; onNavigate: (view: View) => void; onInstall: () => void; onAddTeam: () => void; userPreview: boolean; onOpenMatch: (id: number) => void }) {\n  const completedMatchIds'''
new = '''function Dashboard({ user, data, match, tournament, battingTeam, bowlingTeam, onNavigate, onInstall, onAddTeam, userPreview, onOpenMatch }: { user: CoreCricketUser; data: Data; match?: Match; tournament?: Tournament; battingTeam?: Team; bowlingTeam?: Team; onNavigate: (view: View) => void; onInstall: () => void; onAddTeam: () => void; userPreview: boolean; onOpenMatch: (id: number) => void }) {\n  const [watchMatchId, setWatchMatchId] = useState<number | null>(null);\n  const completedMatchIds'''
if old not in text:
    raise SystemExit('Dashboard state anchor not found')
text = text.replace(old, new, 1)

old = '  const liveMatches = data.matches.filter((item) => item.status === "Live" || item.status === "Super Over");\n  const firstName'
new = '  const liveMatches = data.matches.filter((item) => item.status === "Live" || item.status === "Super Over");\n  const watchMatch = liveMatches.find((item) => item.id === watchMatchId);\n  const firstName'
if old not in text:
    raise SystemExit('liveMatches anchor not found')
text = text.replace(old, new, 1)

old = '<div className="hero-footer"><span>Live match scorecard</span><button onClick={() => onNavigate("manage")}>Open tournament <b>→</b></button></div>'
new = '<div className="hero-footer"><span>Live match scorecard</span><button onClick={() => match && setWatchMatchId(match.id)}>Watch live match <b>→</b></button></div>'
if old not in text:
    raise SystemExit('hero footer anchor not found')
text = text.replace(old, new, 1)

old = '''    <section className="card live-snapshots"><CardTitle eyebrow="LIVE AROUND YOU" title="All live matches" />{liveMatches.map((item) => <button className="live-snapshot" key={item.id} onClick={() => onOpenMatch(item.id)}><span><i />{data.tournaments.find((entry) => entry.id === item.tournamentId)?.name ?? "Friendly"}</span><b>{getTeam(data, item.battingTeamId)?.shortName} {item.runs}/{item.wickets}</b><small>{overs(item.balls)} overs · {getTeam(data, item.teamAId)?.shortName} vs {getTeam(data, item.teamBId)?.shortName}</small><em>View detailed score →</em></button>)}{liveMatches.length === 0 && <Empty text="No matches are live right now." />}</section>'''
new = '''    <section className="card live-snapshots"><CardTitle eyebrow="LIVE AROUND YOU" title="All live matches" />{liveMatches.map((item) => <button className="live-snapshot" key={item.id} onClick={() => setWatchMatchId(item.id)}><span><i />{data.tournaments.find((entry) => entry.id === item.tournamentId)?.name ?? "Friendly"}</span><b>{getTeam(data, item.battingTeamId)?.shortName} {item.runs}/{item.wickets}</b><small>{overs(item.balls)} overs · {getTeam(data, item.teamAId)?.shortName} vs {getTeam(data, item.teamBId)?.shortName}</small><em>Choose how to watch →</em></button>)}{liveMatches.length === 0 && <Empty text="No matches are live right now." />}</section>\n    {watchMatch && <div className="modal-backdrop"><section className="card" style={{maxWidth:520,width:"calc(100% - 32px)",padding:24,position:"relative"}} role="dialog" aria-modal="true" aria-label="Watch live match"><button className="modal-close" onClick={() => setWatchMatchId(null)}>×</button><CardTitle eyebrow="LIVE MATCH" title={`${getTeam(data, watchMatch.teamAId)?.shortName} vs ${getTeam(data, watchMatch.teamBId)?.shortName}`} /><p style={{margin:"8px 0 20px"}}>Choose how you want to follow this match.</p><div style={{display:"grid",gap:12}}><button className="primary-button full" onClick={() => { const id = watchMatch.id; setWatchMatchId(null); onOpenMatch(id); }}>Ball-by-ball score →</button><button className="secondary-button full" disabled={!watchMatch.streaming} onClick={() => { if (watchMatch.streaming) window.location.href = `/watch?matchId=${watchMatch.id}`; }}>{watchMatch.streaming ? "Watch live broadcast →" : "Live broadcast not active yet"}</button></div><small style={{display:"block",marginTop:14,opacity:.72}}>Ball-by-ball scoring is always available while the match is live. Live broadcast appears when an authorized broadcaster starts the camera.</small></section></div>}'''
if old not in text:
    raise SystemExit('live snapshot anchor not found')
text = text.replace(old, new, 1)

path.write_text(text)
print('patched live view chooser')

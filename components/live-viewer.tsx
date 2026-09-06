"use client";

import { useEffect, useState } from "react";

type LivePlayer = { id: number; name: string };
type LiveDelivery = { id: number; sequence: number; runsBatter: number; extraType: string | null; extraRuns: number; legalBall: boolean; wicketType: string | null };
type LiveData = {
  active: boolean;
  match: { id: number; runs: number; wickets: number; balls: number; teamAId: number; teamBId: number; battingTeamId: number; strikerId: number | null; nonStrikerId: number | null; bowlerId: number | null; venue: string };
  tournament?: { name: string };
  teams: { id: number; name: string; shortName: string; logoUrl?: string | null }[];
  players: LivePlayer[];
  deliveries: LiveDelivery[];
  error?: string;
};

function overs(balls: number) { return `${Math.floor(balls / 6)}.${balls % 6}`; }
function ballLabel(d: LiveDelivery) {
  if (d.wicketType) return "W";
  if (d.extraType === "Wide") return `${d.extraRuns || 1}Wd`;
  if (d.extraType === "No ball") return `${d.runsBatter + d.extraRuns}Nb`;
  if (d.extraType) return `${d.runsBatter + d.extraRuns}${d.extraType.slice(0, 1)}`;
  return String(d.runsBatter);
}

export function LiveViewer() {
  const [data, setData] = useState<LiveData | null>(null);
  const [frameUrl, setFrameUrl] = useState("");
  const [hasFrame, setHasFrame] = useState(false);
  const token = typeof window === "undefined" ? "" : new URLSearchParams(location.search).get("token") ?? "";

  useEffect(() => {
    const load = () => void fetch(`/api/live?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then((r) => r.json()).then(setData);
    load();
    const scoreTimer = setInterval(load, 2000);
    const frameTimer = setInterval(() => setFrameUrl(`/api/live/frame?token=${encodeURIComponent(token)}&v=${Date.now()}`), 700);
    const initialFrameTimer = setTimeout(() => setFrameUrl(`/api/live/frame?token=${encodeURIComponent(token)}&v=${Date.now()}`), 0);
    return () => { clearTimeout(initialFrameTimer); clearInterval(scoreTimer); clearInterval(frameTimer); };
  }, [token]);

  if (!data) return <main className="viewer-page"><p>Connecting to Core Cricket Live…</p></main>;
  if (data.error) return <main className="viewer-page"><h1>Live stream unavailable</h1><p>{data.error}</p></main>;

  const batting = data.teams.find((team) => team.id === data.match.battingTeamId);
  const other = data.teams.find((team) => team.id !== data.match.battingTeamId);
  const striker = data.players.find((player) => player.id === data.match.strikerId);
  const nonStriker = data.players.find((player) => player.id === data.match.nonStrikerId);
  const bowler = data.players.find((player) => player.id === data.match.bowlerId);
  let legalSeen = 0;
  let overStart = data.deliveries.length;
  for (let index = data.deliveries.length - 1; index >= 0; index -= 1) {
    if (data.deliveries[index].legalBall) legalSeen += 1;
    overStart = index;
    if (legalSeen >= 6) break;
  }
  const recent = data.deliveries.slice(overStart);

  return <main className="viewer-page">
    <header><b>CORE CRICKET</b><span><i /> {data.active ? "LIVE" : "ENDED"}</span></header>
    <section className="viewer-video">
      {frameUrl && <img className="live-camera-frame" src={frameUrl} alt="Live cricket camera" onLoad={() => setHasFrame(true)} />}
      {!hasFrame && <div className="camera-waiting"><div className="camera-icon">▣</div><h2>Connecting to live camera…</h2><p>Keep this page open. Video begins when the broadcaster&apos;s first camera frame arrives.</p></div>}
      <div className="viewer-score" style={{gridTemplateColumns:"auto minmax(0,1fr) auto",gap:10,padding:12,alignItems:"center"}}>
        <div style={{display:"grid",gap:2,minWidth:76}}>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:".08em"}}>{batting?.shortName ?? "BAT"}</span>
          <strong style={{fontSize:24,lineHeight:1}}>{data.match.runs}/{data.match.wickets}</strong>
          <b style={{fontSize:9,color:"#b7f34b"}}>{overs(data.match.balls)} OV</b>
        </div>
        <div style={{display:"grid",gap:4,minWidth:0}}>
          <div style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr)",gap:6}}><span style={{fontSize:7,color:"#91a79a",fontWeight:900}}>BAT</span><b style={{fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{striker?.name ?? "Striker"} *</b></div>
          <div style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr)",gap:6}}><span style={{fontSize:7,color:"#91a79a",fontWeight:900}}>NON</span><b style={{fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nonStriker?.name ?? "Non-striker"}</b></div>
          <div style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr)",gap:6}}><span style={{fontSize:7,color:"#91a79a",fontWeight:900}}>BOWL</span><b style={{fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bowler?.name ?? "Bowler"}</b></div>
        </div>
        <div style={{display:"grid",gap:5,justifyItems:"end"}}>
          <span style={{fontSize:7,color:"#91a79a",fontWeight:900}}>THIS OVER</span>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:150}}>{recent.length ? recent.map((d) => <i key={d.id} style={{width:23,height:23,borderRadius:"50%",display:"grid",placeItems:"center",background:d.wicketType?"#8c2e2e":d.runsBatter>=4?"#476b1c":"#26382c",fontSize:8,fontStyle:"normal",fontWeight:900}}>{ballLabel(d)}</i>) : <small>—</small>}</div>
          <em style={{fontSize:7,color:"#aac0af",fontStyle:"normal",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data.tournament?.name ?? `vs ${other?.shortName ?? ""}`}</em>
        </div>
      </div>
    </section>
    <footer>{data.match.venue} · Camera and score refresh automatically</footer>
  </main>;
}

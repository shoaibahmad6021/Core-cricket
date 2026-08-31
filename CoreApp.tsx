"use client";
import {useEffect,useMemo,useState} from "react";
import {AppState,Match,Player,Role,Team,Tournament} from "../lib/types";
import {autoMatchMvp,bestPerformances,runRate,standings,tournamentMvp} from "../lib/cricket";

const uid=()=>Math.random().toString(36).slice(2,10);
const empty:AppState={users:[],teams:[],players:[],tournaments:[],matches:[]};
const seed:AppState={
 users:[{id:"u1",phone:"6470000000",name:"Site Admin",role:"site_admin",password:"corecricket"}],currentUserId:"u1",
 teams:[
  {id:"t1",name:"GTA Falcons",shortName:"GTF",city:"Milton",color:"#7ddc53"},
  {id:"t2",name:"GTA Sparrows",shortName:"GTS",city:"Brampton",color:"#ffd166"},
  {id:"t3",name:"TSG",shortName:"TSG",city:"Mississauga",color:"#69b7ff"}
 ],
 players:[
  {id:"p1",name:"A. Khan",teamId:"t1",role:"batter",battingStyle:"right",runs:184,balls:132,dismissals:4,fours:21,sixes:9,wickets:0,ballsBowled:0,runsConceded:0,matches:5},
  {id:"p2",name:"M. Ali",teamId:"t1",role:"bowler",battingStyle:"right",runs:41,balls:38,dismissals:2,fours:3,sixes:1,wickets:11,ballsBowled:108,runsConceded:122,matches:5},
  {id:"p3",name:"S. Singh",teamId:"t2",role:"all_rounder",battingStyle:"left",runs:129,balls:105,dismissals:4,fours:12,sixes:5,wickets:7,ballsBowled:84,runsConceded:95,matches:5}
 ],
 tournaments:[{id:"tr1",name:"Core Cricket Cup",format:"T10",venue:"Milton",startDate:"2026-09-01",creatorUserId:"u1",groups:[{id:"g1",name:"Elite Group",teamIds:["t1","t2","t3"]}]}],
 matches:[]
};

const canBroadcast=(r?:Role)=>!!r&&["site_admin","tournament_creator","team_admin","captain","scorer"].includes(r);

export default function CoreApp(){
 const [state,setState]=useState<AppState>(empty); const [ready,setReady]=useState(false); const [tab,setTab]=useState("home"); const [dark,setDark]=useState(true);
 useEffect(()=>{const raw=localStorage.getItem("core-cricket-recovered-v1"); setState(raw?JSON.parse(raw):seed); setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem("core-cricket-recovered-v1",JSON.stringify(state))},[state,ready]);
 const user=state.users.find(u=>u.id===state.currentUserId);
 const best=useMemo(()=>bestPerformances(state),[state]);
 if(!ready)return <main className="center">Loading Core Cricket…</main>;
 if(!user)return <Login state={state} setState={setState}/>;
 return <div className={dark?"app dark":"app"}>
  <header><div className="brand"><img src="/icon.svg"/><div><b>CORE CRICKET</b><small>Where Cricket Lives</small></div></div><div className="head-actions"><button onClick={()=>setDark(v=>!v)}>{dark?"Light":"Dark"}</button><button onClick={()=>setState(s=>({...s,currentUserId:undefined}))}>Sign out</button></div></header>
  <main>
   {tab==="home"&&<Home state={state} best={best}/>} 
   {tab==="teams"&&<Teams state={state} setState={setState}/>} 
   {tab==="tournaments"&&<Tournaments state={state} setState={setState}/>} 
   {tab==="matches"&&<Matches state={state} setState={setState}/>} 
   {tab==="players"&&<Players state={state} setState={setState}/>} 
   {tab==="live"&&<Live role={user.role}/>} 
  </main>
  <nav>{[["home","Home"],["teams","Teams"],["tournaments","Tournaments"],["matches","Matches"],["players","Players"],["live","Live"]].map(([k,l])=><button className={tab===k?"active":""} onClick={()=>setTab(k)} key={k}>{l}</button>)}</nav>
 </div>
}

function Login({state,setState}:{state:AppState,setState:(x:AppState|((s:AppState)=>AppState))=>void}){
 const [newMode,setNew]=useState(false); const [phone,setPhone]=useState(""); const [password,setPass]=useState(""); const [name,setName]=useState(""); const [msg,setMsg]=useState("");
 const submit=()=>{if(newMode){if(!phone||password.length<8||!name){setMsg("Enter name, phone and an 8+ character password.");return;} const u={id:uid(),phone,name,password,role:"viewer" as Role};setState(s=>({...s,users:[...s.users,u],currentUserId:u.id}));}else{const u=state.users.find(u=>u.phone===phone&&u.password===password);if(!u){setMsg("Phone number or password is incorrect.");return;}setState(s=>({...s,currentUserId:u.id}))}};
 return <main className="login"><section className="card login-card"><img src="/icon.svg"/><span>CORE CRICKET</span><h1>{newMode?"Create an account":"Welcome back"}</h1>{newMode&&<input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/>}<input placeholder="Phone number" value={phone} onChange={e=>setPhone(e.target.value)}/><input type="password" placeholder="Password" value={password} onChange={e=>setPass(e.target.value)}/>{msg&&<p className="warn">{msg}</p>}<button className="primary" onClick={submit}>{newMode?"Create account":"Sign in"}</button><button onClick={()=>{setNew(!newMode);setMsg("")}}>{newMode?"Already have an account? Sign in":"First time? Create an account"}</button><small>Demo admin: 6470000000 / corecricket</small></section></main>
}

function Home({state,best}:{state:AppState,best:Player[]}){
 const live=state.matches.filter(m=>m.status==="live");
 return <><section className="hero"><div><span className="eyebrow">CORE CRICKET</span><h1>Score every ball.<br/>Own every stat.</h1><p>Teams, tournaments, live scoring, standings, MVPs and streaming in one installable cricket workspace.</p></div><div className="hero-score"><b>{live.length?`${live.length} LIVE MATCH${live.length>1?"ES":""}`:"NO LIVE MATCH"}</b><small>{state.matches.filter(m=>m.status==="completed").length} completed matches</small></div></section>
 <section><div className="section-title"><h2>Best performances</h2><span>Overall app performance</span></div><div className="grid three">{best.map((p,i)=><article className="card" key={p.id}><span className="rank">#{i+1}</span><h3>{p.name}</h3><p>{state.teams.find(t=>t.id===p.teamId)?.name}</p><div className="metrics"><b>{p.runs}<small>runs</small></b><b>{p.wickets}<small>wkts</small></b><b>{p.matches}<small>matches</small></b></div></article>)}</div></section>
 <section><div className="section-title"><h2>Quick overview</h2></div><div className="grid four">{[["Teams",state.teams.length],["Players",state.players.length],["Tournaments",state.tournaments.length],["Matches",state.matches.length]].map(([a,b])=><div className="stat card" key={String(a)}><b>{b}</b><span>{a}</span></div>)}</div></section></>
}

function Teams({state,setState}:{state:AppState,setState:any}){
 const [name,setName]=useState(""); const [short,setShort]=useState(""); const [city,setCity]=useState("");
 const add=()=>{if(!name)return;setState((s:AppState)=>({...s,teams:[...s.teams,{id:uid(),name,shortName:short||name.slice(0,3).toUpperCase(),city,color:"#8bdc65"}]}));setName("");setShort("");setCity("")};
 const del=(id:string)=>setState((s:AppState)=>({...s,teams:s.teams.filter(t=>t.id!==id),players:s.players.filter(p=>p.teamId!==id)}));
 return <section><div className="section-title"><h2>Teams</h2><span>Create and manage squads</span></div><div className="form-row"><input placeholder="Team name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Short name" value={short} onChange={e=>setShort(e.target.value)}/><input placeholder="City" value={city} onChange={e=>setCity(e.target.value)}/><button className="primary" onClick={add}>Add team</button></div><div className="grid three">{state.teams.map(t=><article className="card" key={t.id}><div className="team-dot" style={{background:t.color}}/><h3>{t.name}</h3><p>{t.shortName} · {t.city||"No city"}</p><b>{state.players.filter(p=>p.teamId===t.id).length} players</b><button className="danger" onClick={()=>del(t.id)}>Remove team</button></article>)}</div></section>
}

function Players({state,setState}:{state:AppState,setState:any}){
 const [name,setName]=useState("");const [teamId,setTeam]=useState(state.teams[0]?.id||"");const [role,setRole]=useState("batter");
 const add=()=>{if(!name||!teamId)return;const p:Player={id:uid(),name,teamId,role:role as any,battingStyle:"right",runs:0,balls:0,dismissals:0,fours:0,sixes:0,wickets:0,ballsBowled:0,runsConceded:0,matches:0};setState((s:AppState)=>({...s,players:[...s.players,p]}));setName("")};
 return <section><div className="section-title"><h2>Players</h2><span>Batting and bowling records stay separate</span></div><div className="form-row"><input placeholder="Player name" value={name} onChange={e=>setName(e.target.value)}/><select value={teamId} onChange={e=>setTeam(e.target.value)}>{state.teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><select value={role} onChange={e=>setRole(e.target.value)}><option value="batter">Batter</option><option value="bowler">Bowler</option><option value="all_rounder">All-rounder</option><option value="wicketkeeper">Wicketkeeper</option></select><button className="primary" onClick={add}>Add player</button></div><div className="grid three">{state.players.map(p=><article className="card" key={p.id}><h3>{p.name}</h3><p>{state.teams.find(t=>t.id===p.teamId)?.name} · {p.role.replace("_"," ")}</p><div className="metrics"><b>{p.runs}<small>runs</small></b><b>{p.wickets}<small>wickets</small></b><b>{p.balls?((p.runs*100/p.balls).toFixed(1)):"—"}<small>SR</small></b></div></article>)}</div></section>
}

function Tournaments({state,setState}:{state:AppState,setState:any}){
 const [name,setName]=useState(""); const [format,setFormat]=useState("T10"); const [venue,setVenue]=useState("");
 const add=()=>{if(!name)return;const t:Tournament={id:uid(),name,format,venue,startDate:new Date().toISOString().slice(0,10),creatorUserId:state.currentUserId!,groups:[]};setState((s:AppState)=>({...s,tournaments:[...s.tournaments,t]}));setName("")};
 return <section><div className="section-title"><h2>Tournaments</h2><span>Groups, standings and leaders</span></div><div className="form-row"><input placeholder="Tournament name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Format" value={format} onChange={e=>setFormat(e.target.value)}/><input placeholder="Venue" value={venue} onChange={e=>setVenue(e.target.value)}/><button className="primary" onClick={add}>Create tournament</button></div>{state.tournaments.map(t=><TournamentCard key={t.id} t={t} state={state} setState={setState}/>)}</section>
}

function TournamentCard({t,state,setState}:{t:Tournament,state:AppState,setState:any}){
 const [gname,setG]=useState(""); const [sel,setSel]=useState(state.teams[0]?.id||"");
 const addGroup=()=>{if(!gname)return;setState((s:AppState)=>({...s,tournaments:s.tournaments.map(x=>x.id===t.id?{...x,groups:[...x.groups,{id:uid(),name:gname,teamIds:[]}]}:x)}));setG("")};
 const addTeam=(gid:string)=>setState((s:AppState)=>({...s,tournaments:s.tournaments.map(x=>x.id===t.id?{...x,groups:x.groups.map(g=>g.id===gid&&!g.teamIds.includes(sel)?{...g,teamIds:[...g.teamIds,sel]}:g)}:x)}));
 const tmvp=tournamentMvp(state,t);
 return <article className="card tournament"><div className="section-title"><div><h3>{t.name}</h3><p>{t.format} · {t.venue}</p></div><div className="mvp"><small>Tournament MVP</small><b>{tmvp?.name||"Not enough results"}</b><select value={t.mvpOverridePlayerId||""} onChange={e=>setState((s:AppState)=>({...s,tournaments:s.tournaments.map(x=>x.id===t.id?{...x,mvpOverridePlayerId:e.target.value||undefined}:x)}))}><option value="">Automatic MVP</option>{state.players.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></div></div><div className="form-row compact"><input placeholder="New group / tier name" value={gname} onChange={e=>setG(e.target.value)}/><button onClick={addGroup}>Add group</button></div>{t.groups.map(g=>{const rows=standings(state,t.id,g.id);return <div className="group" key={g.id}><div className="group-head"><h4>{g.name}</h4><div><select value={sel} onChange={e=>setSel(e.target.value)}>{state.teams.map(tm=><option value={tm.id} key={tm.id}>{tm.name}</option>)}</select><button onClick={()=>addTeam(g.id)}>Add team</button></div></div><div className="table"><div className="tr th"><span>#</span><span>Team</span><span>P</span><span>W</span><span>L</span><span>Pts</span><span>NRR</span></div>{rows.map((r,i)=><div className="tr" key={r.teamId}><span>{i+1}</span><b>{state.teams.find(tm=>tm.id===r.teamId)?.shortName}</b><span>{r.played}</span><span>{r.won}</span><span>{r.lost}</span><b>{r.points}</b><span>{r.nrr.toFixed(3)}</span></div>)}</div></div>})}</article>
}

function Matches({state,setState}:{state:AppState,setState:any}){
 const [ta,setA]=useState(state.teams[0]?.id||""); const [tb,setB]=useState(state.teams[1]?.id||""); const [tr,setTr]=useState(state.tournaments[0]?.id||""); const [gr,setGr]=useState(state.tournaments[0]?.groups[0]?.id||"");
 const make=()=>{if(!ta||!tb||ta===tb)return;const m:Match={id:uid(),tournamentId:tr||undefined,groupId:gr||undefined,teamAId:ta,teamBId:tb,overs:10,venue:"",status:"scheduled",innings:[],deliveries:[],scorerUserIds:[state.currentUserId!]};setState((s:AppState)=>({...s,matches:[...s.matches,m]}))};
 return <section><div className="section-title"><h2>Matches</h2><span>Create, score and complete fixtures</span></div><div className="form-row"><select value={ta} onChange={e=>setA(e.target.value)}>{state.teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><select value={tb} onChange={e=>setB(e.target.value)}>{state.teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><select value={tr} onChange={e=>{setTr(e.target.value);setGr(state.tournaments.find(t=>t.id===e.target.value)?.groups[0]?.id||"")}}><option value="">Friendly</option>{state.tournaments.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><select value={gr} onChange={e=>setGr(e.target.value)}><option value="">No group</option>{state.tournaments.find(t=>t.id===tr)?.groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select><button className="primary" onClick={make}>Create match</button></div><div className="grid two">{state.matches.map(m=><MatchCard key={m.id} m={m} state={state} setState={setState}/>)}</div></section>
}

function MatchCard({m,state,setState}:{m:Match,state:AppState,setState:any}){
 const [batter,setBatter]=useState(state.players.find(p=>p.teamId===m.teamAId)?.id||""); const [bowler,setBowler]=useState(state.players.find(p=>p.teamId===m.teamBId)?.id||"");
 const teamA=state.teams.find(t=>t.id===m.teamAId),teamB=state.teams.find(t=>t.id===m.teamBId); const inn=m.innings[0]; const auto=autoMatchMvp(state,m); const chosen=state.players.find(p=>p.id===m.mvpOverridePlayerId)||auto?.p;
 const start=()=>setState((s:AppState)=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"live",innings:[{teamId:m.teamAId,runs:0,wickets:0,legalBalls:0}]}:x)}));
 const ball=(runs:number,extraType?:"WD"|"NB",wicket=false)=>setState((s:AppState)=>({...s,matches:s.matches.map(x=>{if(x.id!==m.id)return x;const legal=!extraType;const ex=extraType?1:0;const ni=x.innings.map((i,idx)=>idx===0?{...i,runs:i.runs+runs+ex,wickets:i.wickets+(wicket?1:0),legalBalls:i.legalBalls+(legal?1:0)}:i);return {...x,innings:ni,deliveries:[...x.deliveries,{id:uid(),runsBat:runs,extras:ex,extraType,legal,wicket,batterId:batter,bowlerId:bowler}]}})}));
 const undo=()=>setState((s:AppState)=>({...s,matches:s.matches.map(x=>{if(x.id!==m.id||!x.deliveries.length)return x;const d=x.deliveries[x.deliveries.length-1];const ni=x.innings.map((i,idx)=>idx===0?{...i,runs:Math.max(0,i.runs-d.runsBat-d.extras),wickets:Math.max(0,i.wickets-(d.wicket?1:0)),legalBalls:Math.max(0,i.legalBalls-(d.legal?1:0))}:i);return {...x,innings:ni,deliveries:x.deliveries.slice(0,-1)}})}));
 const complete=(winner:string)=>setState((s:AppState)=>{const match=s.matches.find(x=>x.id===m.id)!;const nextPlayers=s.players.map(p=>{let np={...p};const ds=match.deliveries;const bat=ds.filter(d=>d.batterId===p.id),bowl=ds.filter(d=>d.bowlerId===p.id);if(bat.length||bowl.length)np.matches+=1;bat.forEach(d=>{np.runs+=d.runsBat;if(d.legal)np.balls++;if(d.runsBat===4)np.fours++;if(d.runsBat===6)np.sixes++;});bowl.forEach(d=>{if(d.legal)np.ballsBowled++;if(d.extraType!=="B"&&d.extraType!=="LB")np.runsConceded+=d.runsBat+d.extras;if(d.wicket)np.wickets++;});return np});return {...s,players:nextPlayers,matches:s.matches.map(x=>x.id===m.id?{...x,status:"completed",winnerTeamId:winner}:x)}});
 return <article className="card match"><div className="match-head"><div><b>{teamA?.shortName}</b><span> vs </span><b>{teamB?.shortName}</b></div><span className={`pill ${m.status}`}>{m.status}</span></div>{inn&&<div className="score"><b>{inn.runs}/{inn.wickets}</b><span>{Math.floor(inn.legalBalls/6)}.{inn.legalBalls%6} ov · RR {runRate(inn.runs,inn.legalBalls).toFixed(2)}</span></div>}{m.status==="scheduled"&&<button className="primary" onClick={start}>Start scoring</button>}{m.status==="live"&&<><div className="form-row compact"><select value={batter} onChange={e=>setBatter(e.target.value)}>{state.players.filter(p=>p.teamId===m.teamAId).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><select value={bowler} onChange={e=>setBowler(e.target.value)}>{state.players.filter(p=>p.teamId===m.teamBId).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></div><div className="scorer">{[0,1,2,3,4,6].map(r=><button onClick={()=>ball(r)} key={r}>{r}</button>)}<button onClick={()=>ball(0,"WD")}>WD</button><button onClick={()=>ball(0,"NB")}>NB</button><button onClick={()=>ball(0,undefined,true)}>W</button><button onClick={undo}>Undo</button></div><div className="winner"><button onClick={()=>complete(m.teamAId)}>{teamA?.shortName} won</button><button onClick={()=>complete(m.teamBId)}>{teamB?.shortName} won</button></div></>}{m.status==="completed"&&<div className="mvp-box"><small>Match MVP</small><b>{chosen?.name||"No MVP"}</b><p>{m.mvpOverridePlayerId?"Tournament creator selection":auto?.reason||"Not enough performance data"}</p><select value={m.mvpOverridePlayerId||""} onChange={e=>setState((s:AppState)=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,mvpOverridePlayerId:e.target.value||undefined}:x)}))}><option value="">Automatic MVP</option>{state.players.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></div>}</article>
}

function Live({role}:{role:Role}){
 const [on,setOn]=useState(false);return <section><div className="section-title"><h2>Live Studio</h2><span>No paid plan required for authorized roles</span></div><article className="card live-card">{canBroadcast(role)?<><div className="camera"><span>{on?"LIVE CAMERA PREVIEW":"Camera preview"}</span></div><h3>Broadcast access enabled</h3><p>Site admins, tournament creators, team admins/captains and assigned scorers can use Go Live without a subscription gate.</p><button className="primary" onClick={()=>setOn(v=>!v)}>{on?"End live test":"Go Live"}</button><small>Production public video still requires a WebRTC/RTMP relay and stream distribution service.</small></>:<><h3>Viewer access</h3><p>Your role can watch shared streams but cannot start a broadcast.</p></>}</article></section>
}

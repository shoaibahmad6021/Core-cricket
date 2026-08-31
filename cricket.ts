import {AppState, Match, Player, Tournament} from "./types";

export const oversText=(balls:number)=>`${Math.floor(balls/6)}.${balls%6}`;
export const runRate=(runs:number,balls:number)=> balls ? runs/(balls/6) : 0;

export function standings(state:AppState,tournamentId:string,groupId:string){
  const t=state.tournaments.find(x=>x.id===tournamentId); const g=t?.groups.find(x=>x.id===groupId); if(!g) return [];
  return g.teamIds.map(teamId=>{
    let played=0,won=0,lost=0,points=0,rf=0,bf=0,ra=0,ba=0;
    state.matches.filter(m=>m.status==="completed"&&m.tournamentId===tournamentId&&m.groupId===groupId&&(m.teamAId===teamId||m.teamBId===teamId)).forEach(m=>{
      played++; if(m.winnerTeamId===teamId){won++;points+=2;} else if(m.winnerTeamId){lost++;}
      m.innings.forEach(i=>{ if(i.teamId===teamId){rf+=i.runs;bf+=i.legalBalls;} else {ra+=i.runs;ba+=i.legalBalls;} });
    });
    const nrr=(bf?rf/(bf/6):0)-(ba?ra/(ba/6):0);
    return {teamId,played,won,lost,points,nrr};
  }).sort((a,b)=>b.points-a.points||b.nrr-a.nrr);
}

export function playerMatchScore(p:Player,m:Match){
  const ds=m.deliveries.filter(d=>d.batterId===p.id||d.bowlerId===p.id);
  let runs=0,balls=0,fours=0,sixes=0,wkts=0,bb=0,rc=0;
  ds.forEach(d=>{
    if(d.batterId===p.id){runs+=d.runsBat;if(d.legal)balls++;if(d.runsBat===4)fours++;if(d.runsBat===6)sixes++;}
    if(d.bowlerId===p.id){if(d.legal)bb++; if(d.extraType!=="B"&&d.extraType!=="LB")rc+=d.runsBat+d.extras; if(d.wicket)wkts++;}
  });
  const sr=balls?runs*100/balls:0; const econ=bb?rc/(bb/6):0;
  const score=runs + fours*2 + sixes*3 + wkts*24 + (balls>=8&&sr>140?8:0) + (bb>=6&&econ<6?8:0);
  const reason=wkts>=3&&wkts*24>runs?`${wkts} wickets for ${rc} runs in ${oversText(bb)} overs`:`${runs} runs from ${balls} balls${balls?`, SR ${sr.toFixed(1)}`:""}${wkts?` and ${wkts} wicket${wkts>1?"s":""}`:""}`;
  return {score,reason,runs,balls,wkts,rc,bb};
}
export function autoMatchMvp(state:AppState,m:Match){
  return state.players.map(p=>({p,...playerMatchScore(p,m)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0];
}
export function tournamentMvp(state:AppState,t:Tournament){
  if(t.mvpOverridePlayerId) return state.players.find(p=>p.id===t.mvpOverridePlayerId);
  const totals=new Map<string,number>();
  state.matches.filter(m=>m.status==="completed"&&m.tournamentId===t.id).forEach(m=>state.players.forEach(p=>totals.set(p.id,(totals.get(p.id)||0)+playerMatchScore(p,m).score)));
  const id=[...totals.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]; return state.players.find(p=>p.id===id);
}
export function bestPerformances(state:AppState){
  return [...state.players].sort((a,b)=>((b.runs)+(b.wickets*25))-((a.runs)+(a.wickets*25))).slice(0,6);
}

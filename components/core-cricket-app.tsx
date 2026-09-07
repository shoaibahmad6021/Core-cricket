"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CoreCricketUser } from "@/app/admin-auth";
import QRCode from "qrcode";

type Team = { id: number; name: string; shortName: string; city: string; color: string; logoUrl?: string | null; captainName?: string; inviteCode?: string };
type Player = { id: number; teamId: number | null; name: string; initials: string; role: string; memberRole?: string; email?: string; phone?: string; photoUrl?: string | null; profileBio?: string; battingStyle: string; bowlingStyle: string; matches: number; innings: number; runs: number; ballsFaced: number; fours: number; sixes: number; highest: number; notOuts: number; wickets: number; ballsBowled: number; runsConceded: number; catches: number };
type Tournament = { id: number; name: string; format: string; status: string; startDate: string; venue: string; teamsCount: number; tournamentAdminsCanScore?: boolean; logoUrl?: string | null; createdByEmail?: string; createdByName?: string };
type TournamentSponsor = { id: number; tournamentId: number; name: string; logoUrl: string | null };
type TournamentScorer = { id: number; tournamentId: number; playerId?: number | null; name: string; email: string; phone?: string };
type Match = { id: number; tournamentId: number | null; teamAId: number; teamBId: number; battingTeamId: number; bowlingTeamId: number; strikerId: number | null; nonStrikerId: number | null; bowlerId: number | null; overs: number; runs: number; wickets: number; balls: number; target: number | null; status: string; venue: string; umpireOne?: string; umpireTwo?: string; streaming: boolean; innings?: number; firstInningsRuns?: number | null; firstInningsWickets?: number | null; firstInningsBalls?: number | null; firstInningsBattingTeamId?: number | null; winnerTeamId?: number | null; result?: string | null; tieResolution?: string | null; tossResult?: string | null; tossWinnerTeamId?: number | null; tossDecision?: string | null };
type Delivery = { id: number; matchId: number; sequence: number; strikerBefore?: number | null; bowlerId?: number | null; runsBatter: number; extraType: string | null; extraRuns: number; legalBall: boolean; wicketType: string | null };
type TournamentTeam = { id: number; tournamentId: number; teamId: number };
type MatchPlayer = { id: number; matchId: number; teamId: number; playerId: number };
type TournamentGroup = { id: number; tournamentId: number; name: string; sortOrder: number };
type TournamentGroupTeam = { id: number; tournamentId: number; groupId: number; teamId: number };
type MatchMvpOverride = { id: number; matchId: number; playerId: number };
type TournamentMvpOverride = { id: number; tournamentId: number; playerId: number };
type Data = { teams: Team[]; players: Player[]; tournaments: Tournament[]; tournamentTeams?: TournamentTeam[]; tournamentGroups?: TournamentGroup[]; tournamentGroupTeams?: TournamentGroupTeam[]; tournamentSponsors?: TournamentSponsor[]; tournamentScorers?: TournamentScorer[]; matches: Match[]; matchPlayers?: MatchPlayer[]; matchMvpOverrides?: MatchMvpOverride[]; tournamentMvpOverrides?: TournamentMvpOverride[]; deliveries: Delivery[] };
type View = "home" | "score" | "manage" | "players" | "live" | "help";
type Theme = "light" | "dark";
type ModalType = "team" | "player" | "tournament" | "tournamentTeam" | "match" | "wicket" | "bowler" | "innings" | "tie" | "extra" | "upgrade";
type MediaKind = "player" | "team" | "tournament" | "sponsor";

const emptyData: Data = { teams: [], players: [], tournaments: [], matches: [], deliveries: [] };

const nav: { id: View; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" }, { id: "manage", label: "Cricket", icon: "▦" }, { id: "players", label: "Players", icon: "◎" }, { id: "live", label: "Live", icon: "●" },
];
function overs(balls: number) { return `${Math.floor(balls / 6)}.${balls % 6}`; }
function average(player: Player) { return (player.runs / Math.max(1, player.innings - player.notOuts)).toFixed(1); }
function strikeRate(player: Player) { return player.ballsFaced ? ((player.runs / player.ballsFaced) * 100).toFixed(1) : "0.0"; }
function economy(player: Player) { return player.ballsBowled ? (player.runsConceded / (player.ballsBowled / 6)).toFixed(2) : "—"; }
function getTeam(data: Data, id: number) { return data.teams.find((team) => team.id === id); }
function getPlayer(data: Data, id: number | null) { return data.players.find((player) => player.id === id); }


type MvpMetric = { player: Player; runs: number; balls: number; wickets: number; ballsBowled: number; runsConceded: number; score: number; reason: string };
function matchMvpMetrics(data: Data, matchId: number): MvpMetric[] {
  const ds = data.deliveries.filter((d) => d.matchId === matchId);
  return data.players.map((player) => {
    const bat = ds.filter((d) => d.strikerBefore === player.id);
    const bowl = ds.filter((d) => d.bowlerId === player.id);
    const runs = bat.reduce((sum, d) => sum + d.runsBatter, 0);
    const balls = bat.filter((d) => d.extraType !== "Wide").length;
    const wickets = bowl.filter((d) => d.wicketType && d.wicketType !== "Run out").length;
    const ballsBowled = bowl.filter((d) => d.legalBall).length;
    const runsConceded = bowl.reduce((sum, d) => sum + ((d.extraType === "Bye" || d.extraType === "Leg bye") ? 0 : d.runsBatter + d.extraRuns), 0);
    const sr = balls ? (runs / balls) * 100 : 0;
    const econ = ballsBowled ? runsConceded / (ballsBowled / 6) : 0;
    const score = runs + wickets * 25 + (runs >= 30 ? Math.min(12, sr / 15) : 0) + (wickets >= 2 && econ > 0 ? Math.max(0, 8 - econ) : 0);
    const parts = [];
    if (runs || balls) parts.push(`${runs} runs from ${balls} balls${balls ? ` (SR ${sr.toFixed(1)})` : ""}`);
    if (wickets || ballsBowled) parts.push(`${wickets} wicket${wickets === 1 ? "" : "s"}, ${runsConceded} conceded in ${overs(ballsBowled)} overs${ballsBowled ? ` (econ ${econ.toFixed(2)})` : ""}`);
    return { player, runs, balls, wickets, ballsBowled, runsConceded, score, reason: parts.join(" · ") || "No recorded contribution" };
  }).filter((m) => m.runs > 0 || m.wickets > 0 || m.balls > 0 || m.ballsBowled > 0).sort((a,b) => b.score-a.score);
}
function automaticMatchMvp(data: Data, matchId: number) { return matchMvpMetrics(data, matchId)[0]; }
function automaticTournamentMvp(data: Data, tournamentId: number) {
  const ids = new Set(data.matches.filter((m) => m.tournamentId === tournamentId && m.status === "Completed").map((m) => m.id));
  const totals = new Map<number, { runs:number; balls:number; wickets:number; ballsBowled:number; conceded:number; matches:Set<number> }>();
  data.deliveries.filter((d) => ids.has(d.matchId)).forEach((d) => {
    if (d.strikerBefore) { const x=totals.get(d.strikerBefore)??{runs:0,balls:0,wickets:0,ballsBowled:0,conceded:0,matches:new Set<number>()}; x.runs+=d.runsBatter; if(d.extraType!=="Wide")x.balls++; x.matches.add(d.matchId); totals.set(d.strikerBefore,x); }
    if (d.bowlerId) { const x=totals.get(d.bowlerId)??{runs:0,balls:0,wickets:0,ballsBowled:0,conceded:0,matches:new Set<number>()}; if(d.wicketType&&d.wicketType!=="Run out")x.wickets++; if(d.legalBall)x.ballsBowled++; x.conceded+=(d.extraType==="Bye"||d.extraType==="Leg bye")?0:d.runsBatter+d.extraRuns; x.matches.add(d.matchId); totals.set(d.bowlerId,x); }
  });
  return [...totals.entries()].map(([playerId,x]) => ({ player:getPlayer(data,playerId)!, ...x, score:x.runs+x.wickets*25 })).filter(x=>x.player).sort((a,b)=>b.score-a.score)[0];
}
function winnerId(match: Match) {
  if (match.winnerTeamId) return match.winnerTeamId;
  if ((match.result ?? "").startsWith("Team A won")) return match.teamAId;
  if ((match.result ?? "").startsWith("Team B won")) return match.teamBId;
  return null;
}
function standingsForGroup(data: Data, tournamentId: number, teamIds: number[]) {
  const rows = new Map(teamIds.map((id) => [id,{teamId:id,played:0,won:0,lost:0,points:0,forRuns:0,forBalls:0,againstRuns:0,againstBalls:0}]));
  data.matches.filter(m=>m.tournamentId===tournamentId&&m.status==="Completed"&&rows.has(m.teamAId)&&rows.has(m.teamBId)).forEach((m)=>{
    const a=rows.get(m.teamAId)!, b=rows.get(m.teamBId)!; a.played++; b.played++;
    const winner=winnerId(m);
    if (winner===m.teamAId){a.won++;a.points+=2;b.lost++;} else if(winner===m.teamBId){b.won++;b.points+=2;a.lost++;} else if(m.tieResolution==="Shared points"){a.points+=1;b.points+=1;}
    const firstTeam=m.firstInningsBattingTeamId??m.teamAId;
    const secondTeam=firstTeam===m.teamAId?m.teamBId:m.teamAId;
    const firstRuns=m.firstInningsRuns??0, firstBalls=m.firstInningsBalls??m.overs*6;
    const secondRuns=m.runs??0, secondBalls=Math.max(1,m.balls??m.overs*6);
    const f=rows.get(firstTeam), s=rows.get(secondTeam);
    if(f&&s){f.forRuns+=firstRuns;f.forBalls+=Math.max(1,firstBalls);f.againstRuns+=secondRuns;f.againstBalls+=secondBalls;s.forRuns+=secondRuns;s.forBalls+=secondBalls;s.againstRuns+=firstRuns;s.againstBalls+=Math.max(1,firstBalls);}
  });
  return [...rows.values()].map(r=>({...r,nrr:(r.forBalls?r.forRuns/(r.forBalls/6):0)-(r.againstBalls?r.againstRuns/(r.againstBalls/6):0)})).sort((a,b)=>b.points-a.points||b.nrr-a.nrr||b.won-a.won);
}

export function CoreCricketApp({ user }: { user: CoreCricketUser }) {
  const [view, setView] = useState<View>("home");
  const [theme, setTheme] = useState<Theme>("light");
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<ModalType | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [tournamentHubOpen, setTournamentHubOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [pendingStartMatchId, setPendingStartMatchId] = useState<number | null>(null);
  const [friendlySetupMatchId, setFriendlySetupMatchId] = useState<number | null>(null);
  const [userPreview, setUserPreview] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(1);
  const [playerProfileOpen, setPlayerProfileOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"teams" | "tournaments" | "matches">("teams");
  const [playerTeamId, setPlayerTeamId] = useState<number | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [watchLink, setWatchLink] = useState("");
  const [installEvent, setInstallEvent] = useState<(Event & { prompt?: () => Promise<void> }) | null>(null);
  const [installGuide, setInstallGuide] = useState(false);
  const [scoreHandoffToken, setScoreHandoffToken] = useState("");
  const [handoffMatchId, setHandoffMatchId] = useState<number | null>(null);
  const [transferLink, setTransferLink] = useState("");
  const [transferQr, setTransferQr] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const frameTimer = useRef<number | null>(null);
  const frameUploading = useRef(false);
  const liveCredentials = useRef<{ token: string; publishKey: string } | null>(null);
  const navigationHistory = useRef<View[]>([]);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (!response.ok) throw new Error("Data service unavailable");
      const next = await response.json() as Data;
      setData(next);
    } catch { setData(emptyData); setNotice("Unable to load cricket records. Please try again."); }
    finally { setLoading(false); }
  }, []);

  // Initial remote data hydration for this client-only dashboard.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("core-cricket-theme");
    if (savedTheme !== "dark" && savedTheme !== "light") return;
    const frame = window.requestAnimationFrame(() => setTheme(savedTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("core-cricket-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  useEffect(() => { const token=new URLSearchParams(window.location.search).get("score_handoff")??"";if(!token)return;void fetch(`/api/score-handoff?token=${encodeURIComponent(token)}`).then(async(response)=>{const body=await response.json()as{matchId?:number;error?:string};if(!response.ok||!body.matchId)throw new Error(body.error||"Invalid scoring transfer");setScoreHandoffToken(token);setHandoffMatchId(body.matchId);setSelectedMatchId(body.matchId);setView("score");setNotice("Scoring control transferred to this phone.");}).catch((error)=>setNotice(error instanceof Error?error.message:"Unable to open scoring transfer")); }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as Event & { prompt?: () => Promise<void> }); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);
  useEffect(() => () => { cameraStream.current?.getTracks().forEach((track) => track.stop()); if (frameTimer.current) window.clearInterval(frameTimer.current); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 10000);
    try {
      const AudioContextClass = window.AudioContext;
      const audio = new AudioContextClass();
      const gain = audio.createGain(); gain.gain.setValueAtTime(0.0001, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.08); gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.25); gain.connect(audio.destination);
      [392, 523.25, 659.25].forEach((frequency, index) => { const oscillator = audio.createOscillator(); oscillator.type = "sine"; oscillator.frequency.value = frequency; oscillator.connect(gain); oscillator.start(audio.currentTime + index * 0.18); oscillator.stop(audio.currentTime + 1.25); });
      void audio.resume().catch(() => undefined); window.setTimeout(() => void audio.close(), 1500);
    } catch { /* Mobile browsers may require a user gesture before playing sound. */ }
    return () => window.clearTimeout(timer);
  }, []);

  const activeMatch = useMemo(() => data.matches.find((match) => match.id === selectedMatchId) ?? data.matches.find((match) => match.status === "Live" || match.status === "Super Over") ?? data.matches[0], [data.matches, selectedMatchId]);
  const activeTournament = data.tournaments.find((item) => item.id === activeMatch?.tournamentId);
  const battingTeam = activeMatch ? getTeam(data, activeMatch.battingTeamId) : undefined;
  const bowlingTeam = activeMatch ? getTeam(data, activeMatch.bowlingTeamId) : undefined;
  const striker = activeMatch ? getPlayer(data, activeMatch.strikerId) : undefined;
  const nonStriker = activeMatch ? getPlayer(data, activeMatch.nonStrikerId) : undefined;
  const bowler = activeMatch ? getPlayer(data, activeMatch.bowlerId) : undefined;
  const viewOnly = userPreview || !user.isAdmin;
  const canScoreTournament = (tournamentId: number | null) => !userPreview && Boolean(tournamentId && (user.isAdmin || data.tournaments.some((item)=>item.id===tournamentId&&((item.createdByEmail??"").toLowerCase()===user.email.toLowerCase()||(item.createdByName??"").toLowerCase()===user.displayName.toLowerCase())) || (data.tournamentScorers ?? []).some((scorer) => scorer.tournamentId === tournamentId && (scorer.email.trim().toLowerCase() === user.email.trim().toLowerCase() || scorer.name.trim().toLowerCase() === user.displayName.trim().toLowerCase()))));
  const canScoreActiveMatch = canScoreTournament(activeMatch?.tournamentId ?? null) || (!userPreview && Boolean(activeMatch && !activeMatch.tournamentId && (user.isAdmin || data.players.some((player) => [activeMatch.teamAId, activeMatch.teamBId].includes(player.teamId ?? 0) && player.name.trim().toLowerCase() === user.displayName.trim().toLowerCase() && ["captain", "team admin"].includes((player.memberRole ?? "").toLowerCase()))))) || (!userPreview && handoffMatchId === activeMatch?.id);
  const canManageTeam = (teamId: number) => !userPreview && (user.isAdmin || data.players.some((player) => player.teamId === teamId && player.name.trim().toLowerCase() === user.displayName.trim().toLowerCase() && ["captain", "team admin"].includes((player.memberRole ?? "").toLowerCase())));
  const canStartActiveMatch = !userPreview && Boolean(activeMatch && (user.isAdmin || canManageTeam(activeMatch.teamAId) || canManageTeam(activeMatch.teamBId) || (activeMatch.tournamentId && data.tournaments.some((item) => item.id === activeMatch.tournamentId && (((item.createdByEmail ?? "").toLowerCase() === user.email.toLowerCase()) || ((item.createdByName ?? "").toLowerCase() === user.displayName.toLowerCase()))))));
  const canBroadcastActiveMatch = !userPreview && Boolean(activeMatch && (canScoreActiveMatch || canManageTeam(activeMatch.teamAId) || canManageTeam(activeMatch.teamBId)));
  const canControlSponsorOverlay = !userPreview && Boolean(activeMatch?.tournamentId && (user.isAdmin || data.tournaments.some((item) => item.id === activeMatch.tournamentId && ((item.createdByEmail ?? "").toLowerCase() === user.email.toLowerCase() || (item.createdByName ?? "").toLowerCase() === user.displayName.toLowerCase()))));
  const canEditPlayerPhoto = (player: Player) => !userPreview && (user.isAdmin || (player.email && player.email.trim().toLowerCase() === user.email.trim().toLowerCase()) || player.name.trim().toLowerCase() === user.displayName.trim().toLowerCase());

  async function apiPost(path: string, payload: Record<string, unknown>) {
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(path === "/api/score" && scoreHandoffToken ? { ...payload, handoffToken: scoreHandoffToken } : payload) });
    const body = await response.json() as { error?: string; item?: { id: number }; match?: Match; overComplete?: boolean; superOverComplete?: boolean; needsPlayers?: boolean; tie?: boolean };
    if (!response.ok) throw new Error(body.error || "Request failed");
    return body;
  }
  async function score(payload: Record<string, unknown>) {
    if (!activeMatch) return;
    setLoading(true);
    try { const result = await apiPost("/api/score", { action: "delivery", matchId: activeMatch.id, ...payload }); await loadData(); if (result.superOverComplete) await endInnings(); else if (result.overComplete) { setModal("bowler"); setNotice("Over complete — select the next bowler."); } }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to record delivery"); setLoading(false); }
  }
  async function undo() {
    if (!activeMatch) return;
    setLoading(true);
    try { await apiPost("/api/score", { action: "undo", matchId: activeMatch.id }); await loadData(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to undo"); setLoading(false); }
  }
  async function changeBowler(bowlerId: number) {
    if (!activeMatch) return;
    setLoading(true);
    try { await apiPost("/api/score", { action: "changeBowler", matchId: activeMatch.id, bowlerId }); setModal(null); setNotice("Next bowler selected. New over ready."); await loadData(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to change bowler"); setLoading(false); }
  }
  async function endInnings() {
    if (!activeMatch) return;
    setLoading(true);
    try { const result = await apiPost("/api/score", { action: "endInnings", matchId: activeMatch.id }); await loadData(); if (result.tie) { setModal("tie"); setNotice("Scores are level — choose the tie resolution."); } else if (result.needsPlayers) { setModal("innings"); setNotice("Innings ended. Select the opening players."); } else setNotice(result.match?.result || "Innings completed."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to end innings"); setLoading(false); }
  }
  async function startInnings(strikerId: number, nonStrikerId: number, bowlerId: number) {
    if (!activeMatch) return;
    setLoading(true);
    try { await apiPost("/api/score", { action: "start", matchId: activeMatch.id, strikerId, nonStrikerId, bowlerId }); setModal(null); setNotice("New innings started."); await loadData(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to start innings"); setLoading(false); }
  }
  async function resolveTie(tieResolution: "superOver" | "sharedPoints" | "walkoverA" | "walkoverB" | "endInnings") {
    if (!activeMatch) return;
    if (tieResolution === "endInnings") { setModal(null); await endInnings(); return; }
    setLoading(true);
    try { const result = await apiPost("/api/score", { action: "resolveTie", matchId: activeMatch.id, tieResolution }); await loadData(); if (result.needsPlayers) setModal("innings"); else { setModal(null); setNotice(result.match?.result || "Tie resolved."); } }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to resolve tie"); setLoading(false); }
  }
  async function uploadMedia(kind: MediaKind, id: number, file?: File, name?: string) {
    setLoading(true);
    try {
      if (file) await saveImage(kind, id, file, name);
      else {
        const response = await fetch("/api/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }) });
        const body = await response.json() as { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to remove image");
      }
      setNotice(file ? "Image uploaded successfully." : "Image removed.");
      await loadData();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update image"); setLoading(false); }
  }
  async function saveImage(kind: MediaKind, id: number, file: File, name?: string) {
    const form = new FormData(); form.set("kind", kind); form.set("id", String(id)); form.set("file", file); if (name) form.set("name", name);
    const response = await fetch("/api/media", { method: "POST", body: form });
    const body = await response.json() as { error?: string };
    if (!response.ok) throw new Error(body.error || "Unable to save image");
  }
  async function submitEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const image = form.get("image"); form.delete("image"); const fields = Object.fromEntries(form); setLoading(true);
    try {
      const result = await apiPost("/api/entities", { type: modal, ...fields });
      if (image instanceof File && image.size && result.item?.id && (modal === "player" || modal === "team" || modal === "tournament")) await saveImage(modal, result.item.id, image);
      const savedType = modal;
      setModal(null); setNotice(image instanceof File && image.size ? "Saved with picture successfully." : "Saved successfully."); await loadData();
      if (savedType === "team") { setManageTab("teams"); go("manage"); }
      if (savedType === "player") setPlayerTeamId(null);
      if (savedType === "match" && result.item?.id) {
        setSelectedMatchId(result.item.id);
        setManageTab("matches");
        const tournamentId = Number(fields.tournamentId) || null;
        if (tournamentId) { setSelectedTournamentId(tournamentId); setTournamentHubOpen(true); }
        go("manage");
        setNotice("Match created. Tap Start Match and select an official scorer.");
      }
    }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save"); setLoading(false); }
  }
  async function addTeamPlayer(teamId: number, playerId: number) { setLoading(true); try { await apiPost("/api/entities", { type: "teamPlayer", teamId, playerId }); setNotice("Player added to the team."); await loadData(); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to add player"); setLoading(false); } }
  async function addNewTeamPlayer(teamId: number, fields: Record<string, unknown>, image?: File) { setLoading(true); try { const result = await apiPost("/api/entities", { type: "player", teamId, ...fields }); if (image?.size && result.item?.id) await saveImage("player", result.item.id, image); setNotice(image?.size ? "New player and picture saved." : "New player added to the team."); await loadData(); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to add player"); setLoading(false); } }
  async function removeTeam(team: Team) {
    const confirmed = window.confirm(`Remove ${team.name}?\n\nThe team will be removed from tournaments. Player profiles and records will be kept. Teams already used in a match cannot be removed.`);
    if (!confirmed) return;
    setLoading(true);
    try {
      const response = await fetch("/api/entities", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "team", id: team.id }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to remove team");
      setNotice(`${team.name} removed. Player profiles and records were kept.`);
      await loadData();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to remove team"); setLoading(false); }
  }
  async function enableCamera() {
    try {
      cameraStream.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: true });
      cameraStream.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true); setNotice("Camera ready. Keep the phone steady in landscape mode.");
    } catch { setNotice("Camera access was not allowed. Check your browser permissions and try again."); }
  }
  function beginFrameRelay(token: string, publishKey: string) {
    if (frameTimer.current) window.clearInterval(frameTimer.current); const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360; const context = canvas.getContext("2d");
    const sendFrame = () => { const video = videoRef.current; if (!video || !context || !video.videoWidth || frameUploading.current) return; frameUploading.current = true; context.drawImage(video, 0, 0, canvas.width, canvas.height); canvas.toBlob((blob) => { if (!blob) { frameUploading.current = false; return; } const form = new FormData(); form.set("token", token); form.set("publishKey", publishKey); form.set("frame", blob, "live.jpg"); void fetch("/api/live/frame", { method: "PUT", body: form }).finally(() => { frameUploading.current = false; }); }, "image/jpeg", .72); };
    sendFrame(); frameTimer.current = window.setInterval(sendFrame, 700);
  }
  async function startLive() { if (!activeMatch) return; if (!canBroadcastActiveMatch) { setNotice("Live broadcast is available to admins, team captains/admins, tournament creators and assigned scorers."); return; } if (!cameraOn) await enableCamera(); try { const result = await apiPost("/api/live", { matchId: activeMatch.id, handoffToken: scoreHandoffToken || undefined }) as { token?: string; publishKey?: string }; if (!result.token || !result.publishKey) throw new Error("Unable to create secure watch link"); liveCredentials.current = { token: result.token, publishKey: result.publishKey }; beginFrameRelay(result.token, result.publishKey); setWatchLink(`${window.location.origin}/watch?token=${result.token}`); setBroadcasting(true); setNotice("Camera relay is live. Share the viewer link from Live Studio."); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to go live"); } }
  async function stopLive() { if (frameTimer.current) window.clearInterval(frameTimer.current); frameTimer.current = null; const credentials = liveCredentials.current; liveCredentials.current = null; setBroadcasting(false); if (credentials) await fetch("/api/live", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(credentials) }); setNotice("Live camera broadcast stopped."); }
  async function showSponsorOverlay() { if (!activeMatch) return; try { const response = await fetch("/api/live", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchId: activeMatch.id }) }); const body = await response.json() as { sponsor?: { name?: string }; error?: string }; if (!response.ok) throw new Error(body.error || "Unable to show sponsor"); setNotice(`${body.sponsor?.name || "Sponsor"} is now on the live broadcast for 8 seconds.`); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to show sponsor"); } }
  async function createScoringTransfer(){if(!activeMatch)return;try{const result=await apiPost("/api/score-handoff",{matchId:activeMatch.id})as{token?:string};if(!result.token)throw new Error("Unable to create transfer link");const link=`${window.location.origin}/?score_handoff=${result.token}`;setTransferLink(link);setTransferQr(await QRCode.toDataURL(link,{width:220,margin:1,color:{dark:"#14281c",light:"#ffffff"}}));setNotice("Scoring transfer link and QR code are ready.");}catch(error){setNotice(error instanceof Error?error.message:"Unable to transfer scoring");}}
  async function installApp() {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone) { setNotice("Core Cricket is already installed on this device."); return; }
    if (installEvent?.prompt) await installEvent.prompt();
    else setInstallGuide(true);
  }
  function go(next: View) {
    if (next !== view) navigationHistory.current.push(view);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goBack() {
    if (view === "players" && playerProfileOpen) { setPlayerProfileOpen(false); return; }
    if (view === "manage" && tournamentHubOpen) { setTournamentHubOpen(false); return; }
    setView(navigationHistory.current.pop() ?? "home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const showBack = view !== "home" || playerProfileOpen || tournamentHubOpen;

  return <div className="app-shell" data-theme={theme}>{showSplash && <div className="startup-splash cinematic-launch cinematic-v2"><div className="launch-lights" aria-hidden="true"><i /><i /><i /><i /></div><div className="impact-zone" aria-hidden="true"><span className="pitch-strip" /><span className="crater" /><span className="pitch-cracks">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--crack": index } as React.CSSProperties} />)}</span><span className="smoke-plumes">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--smoke": index } as React.CSSProperties} />)}</span>{Array.from({ length: 44 }, (_, index) => <i key={index} style={{ "--piece": index } as React.CSSProperties} />)}</div><div className="splash-logo cinematic-logo"><img src="/core-cricket-crest.webp" alt="Core Cricket — Where Cricket Lives" /></div><div className="gta-corner-badge"><img src="/gta-falcons-splash.jpeg" alt="GTA Falcons Cricket Team" /><i aria-hidden="true" /></div><small>WHERE CRICKET LIVES</small><span className="creator-credit">CREATED BY SHOAIB</span><div className="impact-flash" aria-hidden="true" /></div>}
    <aside className="sidebar">
      <button className="brand" onClick={() => go("home")} aria-label="Core Cricket home"><span className="brand-mark">C</span><span>CORE<br /><b>CRICKET</b></span></button>
      <nav aria-label="Primary navigation">{nav.map((item) => <button key={item.id} className={view === item.id ? "nav-active" : ""} onClick={() => go(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="admin-status"><i>✓</i><div><b>{viewOnly ? "Regular user" : "Administrator"}</b><span>{viewOnly ? "View-only access" : "Auto-login active"}</span></div></div><button onClick={() => go("help")}><span>?</span>Help centre</button><button onClick={installApp}><span>↓</span>Install app</button>{!viewOnly && <div className="plan-card"><span>LIVE ACCESS</span><strong>Broadcasting included</strong><button onClick={() => go("live")}>Open Live Studio</button></div>}</div>
    </aside>
    <main className="main"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">C</span><b>CORE CRICKET</b></div><label className="search"><span>⌕</span><input aria-label="Search" placeholder="Search teams, players, matches…" /></label><div className="header-actions"><div className="theme-switch" role="group" aria-label="Appearance"><button className={theme === "light" ? "active" : ""} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><span>☀</span>Regular</button><button className={theme === "dark" ? "active" : ""} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><span>☾</span>Dark</button></div>{user.isAdmin && <button className="view-switch" onClick={() => { setUserPreview((value) => !value); go("home"); }}>{userPreview ? "Return to admin" : "View as user"}</button>}<button className="icon-button" aria-label="Notifications">♧<i /></button><div className="profile-chip" aria-label={`${user.displayName}, ${viewOnly ? "Regular user" : user.role}`}><span>{user.initials}</span><b>{user.displayName}</b><small>{viewOnly ? "Regular user" : user.role}</small></div></div></header>
      {viewOnly && <div className="user-view-banner"><b>View-only access</b><span>All tabs are available. Only site administrators or the captain/team administrator of a team can make changes.</span></div>}
      {showBack && <div className="page-back-row"><button onClick={goBack} aria-label="Go back one page"><span>←</span> Back</button></div>}
      {view === "home" && <Dashboard user={user} data={data} match={activeMatch} tournament={activeTournament} battingTeam={battingTeam} bowlingTeam={bowlingTeam} onNavigate={go} onInstall={installApp} onAddTeam={() => setModal("team")} userPreview={viewOnly} onOpenMatch={(id) => { setSelectedMatchId(id); go("score"); }} />}
      {view === "score" && (friendlySetupMatchId && activeMatch?.id === friendlySetupMatchId ? <MatchSetup data={data} match={activeMatch} officialScorer={canScoreActiveMatch} canManageTeam={canManageTeam} canManageBoth={!userPreview && user.isAdmin} onBack={() => setFriendlySetupMatchId(null)} onRefresh={loadData} onStartScoring={() => { setFriendlySetupMatchId(null); setSelectedMatchId(activeMatch.id); }} /> : <Scoring readOnly={!canScoreActiveMatch} canStartMatch={canStartActiveMatch} data={data} match={activeMatch} tournament={activeTournament} battingTeam={battingTeam} bowlingTeam={bowlingTeam} striker={striker} nonStriker={nonStriker} bowler={bowler} transferLink={transferLink} transferQr={transferQr} onTransfer={createScoringTransfer} onStartMatch={() => { if (!activeMatch) return; if (!activeMatch.tournamentId) { setFriendlySetupMatchId(activeMatch.id); setNotice("Friendly match setup — select the available playing squad, then run the toss."); return; } setPendingStartMatchId(activeMatch.id); setSelectedTournamentId(activeMatch.tournamentId); setTournamentHubOpen(true); go("manage"); }} onStartSetup={() => setModal("innings")} onScore={score} onUndo={undo} onWicket={() => setModal("wicket")} onEndInnings={() => { setModal("tie"); return Promise.resolve(); }} />)}
      {view === "manage" && (tournamentHubOpen && selectedTournamentId ? <TournamentHub data={data} tournamentId={selectedTournamentId} user={user} siteAdmin={!viewOnly} officialScorer={canScoreTournament(selectedTournamentId)} initialStartMatchId={pendingStartMatchId} onInitialStartConsumed={() => setPendingStartMatchId(null)} canManageTeam={canManageTeam} onBack={() => setTournamentHubOpen(false)} onRefresh={loadData} onUpload={uploadMedia} onAdd={(type) => setModal(type)} onOpenMatch={(id) => { setSelectedMatchId(id); go("score"); }} onAssignPlayer={addTeamPlayer} onAddPlayer={addNewTeamPlayer} /> : <Manage readOnly={viewOnly} data={data} tab={manageTab} canManageTeam={canManageTeam} onAssignPlayer={addTeamPlayer} onAddPlayer={addNewTeamPlayer} onAddPlayerToTeam={(teamId) => { setPlayerTeamId(teamId); setModal("player"); }} onRemoveTeam={removeTeam} onTab={setManageTab} onUpload={uploadMedia} onAdd={(type, tournamentId) => { setSelectedTournamentId(tournamentId ?? null); setModal(type); }} onOpenTournament={(id) => { setSelectedTournamentId(id); setTournamentHubOpen(true); }} onOpenMatch={(id) => { setSelectedMatchId(id); go("score"); }} />)}
      {view === "players" && <Players readOnly={viewOnly} canEditPhoto={canEditPlayerPhoto} data={data} selectedId={selectedPlayerId} profileOpen={playerProfileOpen} onSelect={(id) => { setSelectedPlayerId(id); setPlayerProfileOpen(true); }} onBack={() => setPlayerProfileOpen(false)} onUpload={uploadMedia} onAdd={() => { setPlayerTeamId(null); setModal("player"); }} />}
      {view === "live" && <LiveStudio authorized={canBroadcastActiveMatch} canScore={canScoreActiveMatch} canControlSponsors={canControlSponsorOverlay} sponsorCount={(data.tournamentSponsors ?? []).filter((item) => item.tournamentId === activeMatch?.tournamentId).length} match={activeMatch} battingTeam={battingTeam} bowlingTeam={bowlingTeam} videoRef={videoRef} cameraOn={cameraOn} broadcasting={broadcasting} watchLink={watchLink} onCamera={enableCamera} onScoreDevice={() => go("score")} onBroadcast={() => broadcasting ? void stopLive() : void startLive()} onSponsor={() => void showSponsorOverlay()} />}
      {view === "help" && <Help onInstall={installApp} onNavigate={go} />}
    </main>
    <nav className={`mobile-nav${!viewOnly && view === "home" ? " has-team-action" : ""}`} aria-label="Mobile navigation">{nav.map((item) => <button key={item.id} className={view === item.id ? "nav-active" : ""} onClick={() => go(item.id)}><span>{item.icon}</span>{item.label}</button>)}{!viewOnly && view === "home" && <button className="mobile-add-team" onClick={() => setModal("team")}><span>＋</span>Add Team</button>}</nav>
    {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {loading && <div className="loading-line" aria-label="Loading" />}
    {modal && <Modal type={modal} data={data} match={activeMatch} selectedTournamentId={selectedTournamentId} selectedTeamId={playerTeamId} onClose={() => { setModal(null); setPlayerTeamId(null); }} onSubmit={submitEntity} onWicket={async (payload) => { setModal(null); await score(payload); }} onBowler={changeBowler} onStartInnings={startInnings} onResolveTie={resolveTie} onUnlock={() => { setModal(null); }} />}
    {installGuide && <InstallGuide onClose={() => setInstallGuide(false)} />}
  </div>;
}

function InstallGuide({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop"><section className="install-guide" role="dialog" aria-modal="true" aria-labelledby="install-title"><button className="modal-close" onClick={onClose}>×</button><div className="install-app-icon"><img src="/core-cricket-app-icon-192.png" alt="Core Cricket app icon" /></div><span>INSTALLABLE APP</span><h2 id="install-title">Install Core Cricket on iPhone</h2><p>Use Safari for the iOS installation. It will open from your Home Screen in full-screen app mode.</p><ol><li><b>1</b><div>Open this page in <strong>Safari</strong></div></li><li><b>2</b><div>Tap the <strong>Share</strong> button <em>□↑</em></div></li><li><b>3</b><div>Scroll down and choose <strong>Add to Home Screen</strong></div></li><li><b>4</b><div>Tap <strong>Add</strong> to install Core Cricket</div></li></ol><div className="install-note"><b>Android</b><span>Open the browser menu and choose Install app.</span></div><button className="primary-button full" onClick={onClose}>Got it</button></section></div>;
}

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="section-head"><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</div>; }

function Dashboard({ user, data, match, tournament, battingTeam, bowlingTeam, onNavigate, onInstall, onAddTeam, userPreview, onOpenMatch }: { user: CoreCricketUser; data: Data; match?: Match; tournament?: Tournament; battingTeam?: Team; bowlingTeam?: Team; onNavigate: (view: View) => void; onInstall: () => void; onAddTeam: () => void; userPreview: boolean; onOpenMatch: (id: number) => void }) {
  const [watchMatchId, setWatchMatchId] = useState<number | null>(null);
  const completedMatchIds = new Set(data.matches.filter((item) => item.status === "Completed").map((item) => item.id));
  const completedDeliveries = data.deliveries.filter((delivery) => completedMatchIds.has(delivery.matchId));
  const battingResults = new Map<number, { runs: number; matches: Set<number> }>();
  const bowlingResults = new Map<number, { wickets: number; matches: Set<number> }>();
  completedDeliveries.forEach((delivery) => {
    if (delivery.strikerBefore) {
      const result = battingResults.get(delivery.strikerBefore) ?? { runs: 0, matches: new Set<number>() };
      result.runs += delivery.runsBatter; result.matches.add(delivery.matchId); battingResults.set(delivery.strikerBefore, result);
    }
    if (delivery.bowlerId) {
      const result = bowlingResults.get(delivery.bowlerId) ?? { wickets: 0, matches: new Set<number>() };
      if (delivery.wicketType && delivery.wicketType !== "Run out") result.wickets += 1;
      result.matches.add(delivery.matchId); bowlingResults.set(delivery.bowlerId, result);
    }
  });
  const topBatters = data.players.map((player) => ({ player, result: battingResults.get(player.id) })).filter((item) => (item.result?.runs ?? 0) > 0).sort((a, b) => (b.result?.runs ?? 0) - (a.result?.runs ?? 0)).slice(0, 3);
  const topBowlers = data.players.map((player) => ({ player, result: bowlingResults.get(player.id) })).filter((item) => (item.result?.wickets ?? 0) > 0).sort((a, b) => (b.result?.wickets ?? 0) - (a.result?.wickets ?? 0)).slice(0, 3);
  const liveMatches = data.matches.filter((item) => item.status === "Live" || item.status === "Super Over");
  const watchMatch = liveMatches.find((item) => item.id === watchMatchId);
  const firstName = user.displayName.split(/\s+/)[0] || "Admin";
  return <div className="page dashboard-page"><SectionHead eyebrow={userPreview ? "USER HOME" : "ADMIN DASHBOARD"} title={`Good morning, ${firstName}.`} action={<div className="dashboard-actions"><span className="admin-pill">{userPreview ? "Viewing as regular user" : "✓ Admin access active"}</span><button className="secondary-button install-button" onClick={onInstall}>↓ Install Core Cricket</button></div>} /><div className="dashboard-grid">
    <section className="score-hero">{match && ["Live","Super Over"].includes(match.status) ? <><div className="live-label"><i /> LIVE NOW <span>{tournament?.name ?? "Friendly match"}</span></div><div className="matchup"><TeamBadge team={battingTeam} /><div><small>{battingTeam?.shortName}</small><strong>{match.runs}<em>/{match.wickets}</em></strong><span>{overs(match.balls)} OVERS</span></div><div className="versus">VS</div><TeamBadge team={bowlingTeam} /><div className="bowling-name"><small>{bowlingTeam?.shortName}</small><strong>Bowling</strong><span>{match.venue}</span></div></div><div className="match-progress"><span style={{ width: `${Math.min(100, (match.balls / (match.overs * 6)) * 100)}%` }} /></div><div className="hero-footer"><span>Live match scorecard</span><button onClick={() => match && setWatchMatchId(match.id)}>Watch live match <b>→</b></button></div></> : <div className="no-live-match"><span>○</span><h2>No live match or game</h2><p>Live scores will appear here when an official tournament scorer starts a match.</p></div>}</section>
    <section className="quick-actions card"><CardTitle eyebrow={userPreview ? "USER ACCESS" : "QUICK ACTIONS"} title={userPreview ? "Follow your cricket" : "Run your cricket"} /><div className="action-grid">{userPreview ? <><button onClick={() => onNavigate("players")}><i className="action-icon coral">◎</i><b>Player records</b><span>Batting and bowling</span></button><button onClick={() => onNavigate("manage")}><i className="action-icon blue">▦</i><b>Tournaments</b><span>Teams and scorecards</span></button><button><i className="action-icon lime">♧</i><b>My profile</b><span>Name, photo and bio</span></button><button><i className="action-icon purple">🔒</i><b>Protected stats</b><span>Scorers update records</span></button></> : <><button onClick={() => onNavigate("manage")}><i className="action-icon lime">▦</i><b>Open tournaments</b><span>Official scoring starts there</span></button><button onClick={() => onNavigate("manage")}><i className="action-icon blue">＋</i><b>Create match</b><span>Teams, toss & squad</span></button><button onClick={() => onNavigate("players")}><i className="action-icon coral">◎</i><b>Add player</b><span>Build your roster</span></button><button onClick={() => onNavigate("live")}><i className="action-icon purple">●</i><b>Go live</b><span>Camera + score overlay</span></button></>}</div></section>
    <section className="card live-snapshots"><CardTitle eyebrow="LIVE AROUND YOU" title="All live matches" />{liveMatches.map((item) => <button className="live-snapshot" key={item.id} onClick={() => setWatchMatchId(item.id)}><span><i />{data.tournaments.find((entry) => entry.id === item.tournamentId)?.name ?? "Friendly"}</span><b>{getTeam(data, item.battingTeamId)?.shortName} {item.runs}/{item.wickets}</b><small>{overs(item.balls)} overs · {getTeam(data, item.teamAId)?.shortName} vs {getTeam(data, item.teamBId)?.shortName}</small><em>Choose how to watch →</em></button>)}{liveMatches.length === 0 && <Empty text="No matches are live right now." />}</section>
    {watchMatch && <div className="modal-backdrop"><section className="card" style={{maxWidth:520,width:"calc(100% - 32px)",padding:24,position:"relative"}} role="dialog" aria-modal="true" aria-label="Watch live match"><button className="modal-close" onClick={() => setWatchMatchId(null)}>×</button><CardTitle eyebrow="LIVE MATCH" title={`${getTeam(data, watchMatch.teamAId)?.shortName} vs ${getTeam(data, watchMatch.teamBId)?.shortName}`} /><p style={{margin:"8px 0 20px"}}>Choose how you want to follow this match.</p><div style={{display:"grid",gap:12}}><button className="primary-button full" onClick={() => { const id = watchMatch.id; setWatchMatchId(null); onOpenMatch(id); }}>Ball-by-ball score →</button><button className="secondary-button full" disabled={!watchMatch.streaming} onClick={() => { if (watchMatch.streaming) window.location.href = `/watch?matchId=${watchMatch.id}`; }}>{watchMatch.streaming ? "Watch live broadcast →" : "Live broadcast not active yet"}</button></div><small style={{display:"block",marginTop:14,opacity:.72}}>Ball-by-ball scoring is always available while the match is live. Live broadcast appears when an authorized broadcaster starts the camera.</small></section></div>}
    <section className="card upcoming"><CardTitle eyebrow="NEXT UP" title="Upcoming matches" action={<button onClick={() => onNavigate("manage")}>View all</button>} />{data.matches.filter((item) => !["Live", "Super Over", "Completed"].includes(item.status)).map((item) => <div className="match-row" key={item.id}><div className="date-block"><b>24</b><span>AUG</span></div><div><b>{getTeam(data, item.teamAId)?.shortName} <i>vs</i> {getTeam(data, item.teamBId)?.shortName}</b><span>{item.venue} · {item.overs} overs</span></div><button aria-label="Open match" onClick={() => onOpenMatch(item.id)}>›</button></div>)}</section>
    <section className="card leaders"><CardTitle eyebrow="BEST PERFORMANCES" title="Overall app leaders" action={<button onClick={() => onNavigate("players")}>Full stats</button>} /><div className="leader-group"><h3>Top run scorers</h3>{topBatters.map(({ player, result }, index) => <button className="leader-row" key={player.id} onClick={() => onNavigate("players")}><span className="rank">0{index + 1}</span><Avatar player={player} /><div><b>{player.name}</b><span>{getTeam(data, player.teamId ?? 0)?.shortName} · {result?.matches.size ?? 0} completed match{result?.matches.size === 1 ? "" : "es"}</span></div><strong>{result?.runs ?? 0}<small> RUNS</small></strong></button>)}{topBatters.length === 0 && <Empty text="Top scorers appear after a completed match." />}</div><div className="leader-group bowler-leaders"><h3>Top bowlers</h3>{topBowlers.map(({ player, result }, index) => <button className="leader-row" key={player.id} onClick={() => onNavigate("players")}><span className="rank">0{index + 1}</span><Avatar player={player} /><div><b>{player.name}</b><span>{getTeam(data, player.teamId ?? 0)?.shortName} · {result?.matches.size ?? 0} completed match{result?.matches.size === 1 ? "" : "es"}</span></div><strong>{result?.wickets ?? 0}<small> WICKETS</small></strong></button>)}{topBowlers.length === 0 && <Empty text="Top bowlers appear after taking wickets in a completed match." />}</div></section>
    <section className="season-card"><span>YOUR 2026 SEASON</span><h2>Every ball builds the story.</h2><div><div><strong>{data.matches.length}</strong><span>MATCHES</span></div><div><strong>{data.teams.length}</strong><span>TEAMS</span></div><div><strong>{data.players.length}</strong><span>PLAYERS</span></div></div><button onClick={() => onNavigate("players")}>Explore season stats →</button></section>
  </div>{!userPreview && <section className="home-team-action"><div><span>BUILD YOUR CLUB</span><h2>Add a new cricket team</h2><p>Create the team first, then use its Add Player tab to build the squad.</p></div><button onClick={onAddTeam}><b>＋</b> Add Team</button></section>}</div>;
}

function Scoring({ readOnly, canStartMatch, data, match, tournament, battingTeam, bowlingTeam, striker, nonStriker, bowler, transferLink, transferQr, onTransfer, onStartMatch, onStartSetup, onScore, onUndo, onWicket, onEndInnings }: { readOnly: boolean; canStartMatch: boolean; data: Data; match?: Match; tournament?: Tournament; battingTeam?: Team; bowlingTeam?: Team; striker?: Player; nonStriker?: Player; bowler?: Player; transferLink: string; transferQr: string; onTransfer: () => Promise<void>; onStartMatch: () => void; onStartSetup: () => void; onScore: (payload: Record<string, unknown>) => void; onUndo: () => void; onWicket: () => void; onEndInnings: () => Promise<void> }) {
  const [extraType, setExtraType] = useState<string | null>(null);
  const [extraRuns, setExtraRuns] = useState(1);
  const [batRuns, setBatRuns] = useState(0);
  if (!match) return <div className="page"><Empty text="Create a match to start scoring." /></div>;
  if (match.status === "Upcoming") { const friendly = !match.tournamentId; return <div className="page"><SectionHead eyebrow={friendly ? "FRIENDLY MATCH" : (tournament?.name ?? "TOURNAMENT MATCH")} title={`${battingTeam?.shortName} vs ${bowlingTeam?.shortName}`} /><section className="no-live-page"><span>＋</span><h2>Match has not started</h2><p>{canStartMatch ? (friendly ? "This match is set as Friendly. Start it directly by choosing the opening batters and bowler." : "Choose Start Match to confirm an official scorer, Playing XI and toss before live scoring begins.") : "The live scorecard will appear after an authorized organizer or team admin starts the match."}</p>{canStartMatch && <button className="primary-button" onClick={onStartMatch}>{friendly ? "Start Friendly Match" : "Start Match"}</button>}</section></div>; }
  const innings = data.deliveries.filter((delivery) => delivery.matchId === match.id).sort((a, b) => a.sequence - b.sequence);
  const legalNeeded = match.balls % 6 || Math.min(6, match.balls);
  let legalSeen = 0; let currentOverStart = innings.length;
  for (let index = innings.length - 1; index >= 0; index -= 1) { if (innings[index].legalBall) legalSeen += 1; currentOverStart = index; if (legalSeen >= legalNeeded) break; }
  const recent = legalNeeded ? innings.slice(currentOverStart) : [];
  const batterFigures = (player?: Player) => { const balls = innings.filter((delivery) => delivery.strikerBefore === player?.id && delivery.extraType !== "Wide"); const runs = balls.reduce((sum, delivery) => sum + delivery.runsBatter, 0); return { runs, balls: balls.length, strikeRate: balls.length ? ((runs / balls.length) * 100).toFixed(1) : "0.0" }; };
  const bowlingFigures = (player?: Player) => { const spells = innings.filter((delivery) => delivery.bowlerId === player?.id); const legal = spells.filter((delivery) => delivery.legalBall).length; const conceded = spells.reduce((sum, delivery) => sum + ((delivery.extraType === "Bye" || delivery.extraType === "Leg bye") ? 0 : delivery.runsBatter + delivery.extraRuns), 0); const wickets = spells.filter((delivery) => delivery.wicketType && delivery.wicketType !== "Run out").length; return { overs: overs(legal), conceded, wickets, economy: legal ? (conceded / (legal / 6)).toFixed(2) : "0.00" }; };
  const strikerNow = batterFigures(striker); const nonStrikerNow = batterFigures(nonStriker); const bowlerNow = bowlingFigures(bowler);
  return <div className="page scorer-page"><SectionHead eyebrow={tournament?.name ?? "LIVE SCORER"} title={`${battingTeam?.shortName} vs ${bowlingTeam?.shortName}`} action={<div className="live-pill"><i /> LIVE</div>} /><div className="scorer-layout">
    <section className="scoreboard-panel"><div className="scoreboard-top"><div><span>{battingTeam?.name}</span><strong>{match.runs}<em>/{match.wickets}</em></strong></div><div><span>OVERS</span><strong>{overs(match.balls)}<em>/{match.overs}</em></strong></div><div><span>RUN RATE</span><strong>{match.balls ? ((match.runs * 6) / match.balls).toFixed(2) : "0.00"}</strong></div></div><div className="live-figures"><LiveBatter player={striker} label="STRIKER" figures={strikerNow} /><LiveBatter player={nonStriker} label="NON-STRIKER" figures={nonStrikerNow} /><LiveBowler player={bowler} figures={bowlerNow} /></div><div className="over-strip"><span>THIS OVER</span><div>{recent.length ? recent.map((delivery) => <i key={delivery.id} className={delivery.wicketType ? "wicket" : delivery.runsBatter >= 4 ? "boundary" : ""}>{delivery.wicketType ? "W" : delivery.extraType ? delivery.extraType.slice(0, 2) : delivery.runsBatter}</i>) : <small>No balls recorded</small>}</div></div></section>
    {readOnly ? <section className="scoring-pad card readonly-panel"><span>VIEW-ONLY SCORECARD</span><h2>Live scoring controls are locked</h2><p>You can follow every delivery, current batter, bowler and match figures. Only an authorized scorer can update the score.</p></section> : <section className="scoring-pad card"><div className="pad-title"><div><span>RECORD DELIVERY</span><h2>Runs off the bat</h2></div><button onClick={onUndo}>↶ Undo</button></div><div className="run-grid">{[0, 1, 2, 3, 4, 6].map((run) => <button key={run} className={run >= 4 ? "boundary-button" : ""} onClick={() => onScore({ runsBatter: run })}>{run}<span>{run === 0 ? "DOT" : run === 4 ? "FOUR" : run === 6 ? "SIX" : "RUNS"}</span></button>)}</div><button className="wicket-button" onClick={onWicket}>W <span>WICKET</span></button><div style={{marginTop:16}}><span style={{display:"block",fontSize:11,fontWeight:900,letterSpacing:".12em",marginBottom:8}}>EXTRAS</span><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{["Wide","No ball","Bye","Leg bye","Penalty"].map((type)=><button key={type} className={extraType===type?"secondary-button active":"secondary-button"} onClick={()=>{setExtraType(type);setBatRuns(0);setExtraRuns(type==="Penalty"?5:1);}}>{type}</button>)}</div></div>{extraType && <div className="extras-panel" style={{marginTop:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><b>{extraType}</b><button type="button" onClick={()=>setExtraType(null)} aria-label="Close extra">×</button></div><div className="field-row">{extraType === "No ball" && <Field label="Runs off bat"><select value={batRuns} onChange={(event) => setBatRuns(Number(event.target.value))}>{[0,1,2,3,4,5,6].map((run) => <option key={run}>{run}</option>)}</select></Field>}<Field label={extraType === "Wide" ? "Wide runs" : extraType === "No ball" ? "No-ball extra runs" : `${extraType} runs`}><select value={extraRuns} onChange={(event) => setExtraRuns(Number(event.target.value))}>{(extraType === "Penalty" ? Array.from({ length: 20 }, (_, index) => index + 1) : [1,2,3,4,5,6,7]).map((run) => <option key={run}>{run}</option>)}</select></Field></div>{extraType === "Wide" && <p className="form-help">Include the automatic wide run in this total.</p>}{extraType === "No ball" && <p className="form-help">No-ball extras are added separately from any runs scored off the bat.</p>}<button className="primary-button full" onClick={() => { onScore({ extraType, extraRuns, runsBatter: extraType === "No ball" ? batRuns : 0 }); setExtraType(null); }}>Add {extraType}</button></div>}</section>}
    <aside className="score-side">{!readOnly && <div className="card scoring-transfer"><span>TRANSFER LIVE SCORING</span><h3>Continue on another phone</h3><p>Create a secure link or QR code for the next scorer.</p><button className="secondary-button" onClick={() => void onTransfer()}>{transferLink ? "Create new transfer" : "Generate transfer"}</button>{transferLink && <><input readOnly value={transferLink} aria-label="Scoring transfer link" />{transferQr && <img src={transferQr} alt="Scoring transfer QR code" />}<a href={`https://wa.me/?text=${encodeURIComponent(`Take over live scoring on Core Cricket: ${transferLink}`)}`} target="_blank" rel="noreferrer">Share through WhatsApp</a></>}</div>}<div className="card innings-card"><span>INNINGS {match.innings ?? 1} {readOnly ? "STATUS" : "CONTROL"}</span><h3>{Math.max(0, match.overs * 6 - match.balls)} legal balls remaining</h3><p className="umpire-line">Umpires: {match.umpireOne || "Not assigned"} · {match.umpireTwo || "Not assigned"}</p><div className="mini-progress"><i style={{ width: `${(match.balls / (match.overs * 6)) * 100}%` }} /></div>{!readOnly && <button onClick={() => void onEndInnings()}>End innings early</button>}</div><div className="card scorer-note"><span>{readOnly ? "VIEWER ACCESS" : "SCORER TIP"}</span><p>{readOnly ? "This scorecard updates as the authorized scorer records each ball." : <>Tap <b>Undo</b> to reverse the most recent delivery and restore player statistics.</>}</p></div></aside>
  </div></div>;
}

function Manage({ readOnly, data, tab, canManageTeam, onAssignPlayer, onAddPlayer, onAddPlayerToTeam, onRemoveTeam, onTab, onAdd, onUpload, onOpenTournament, onOpenMatch }: { readOnly: boolean; data: Data; tab: "teams" | "tournaments" | "matches"; canManageTeam: (teamId: number) => boolean; onAssignPlayer: (teamId: number, playerId: number) => Promise<void>; onAddPlayer: (teamId: number, fields: Record<string, unknown>) => Promise<void>; onAddPlayerToTeam: (teamId: number) => void; onRemoveTeam: (team: Team) => Promise<void>; onTab: (tab: "teams" | "tournaments" | "matches") => void; onAdd: (type: ModalType, tournamentId?: number) => void; onUpload: (kind: MediaKind, id: number, file?: File, name?: string) => Promise<void>; onOpenTournament: (id: number) => void; onOpenMatch: (id: number) => void }) {
  const [openTeamId, setOpenTeamId] = useState<number | null>(null);
  return <div className="page">
    <SectionHead eyebrow={readOnly ? "CRICKET DIRECTORY" : "MY CRICKET"} title={readOnly ? "Teams, tournaments and matches" : "Manage your game"} action={!readOnly && <button className="primary-button" onClick={() => onAdd(tab === "teams" ? "team" : tab === "tournaments" ? "tournament" : "match")}>+ Add {tab === "teams" ? "team" : tab === "tournaments" ? "tournament" : "match"}</button>} />
    <div className="tabs">{(["teams", "tournaments", "matches"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => onTab(item)}>{item}</button>)}</div>
    <div className="entity-grid">
      {tab === "teams" && data.teams.map((team) => <article className="entity-card team-manage-card" key={team.id}><TeamBadge team={team} /><div><span>{team.city} · TEAM</span><button className="tournament-name" onClick={() => setOpenTeamId(team.id)}>{team.name}</button><p>{data.players.filter((player) => player.teamId === team.id).length}/16 players · Click to view roster</p>{canManageTeam(team.id) && <><button className="team-add-player" onClick={() => onAddPlayerToTeam(team.id)}>＋ Add player to {team.shortName}</button><MediaUpload label="Change team logo" hasImage={Boolean(team.logoUrl)} onUpload={(file) => onUpload("team", team.id, file)} onRemove={() => onUpload("team", team.id)} /><button className="remove-team-button" onClick={() => void onRemoveTeam(team)}>Remove duplicate team</button></>}</div></article>)}
      {tab === "tournaments" && data.tournaments.map((item) => <article className="entity-card tournament-entity" key={item.id}><TournamentLogo tournament={item} /><div><span>{item.status} · {item.format}</span><button className="tournament-name" onClick={() => onOpenTournament(item.id)}>{item.name}</button><p>{item.startDate} · {item.venue} · {item.teamsCount} teams</p><small>Open tournament, teams, players and matches</small></div>{!readOnly && <button onClick={() => onAdd("tournamentTeam", item.id)} aria-label={`Add team to ${item.name}`}>+</button>}</article>)}
      {tab === "matches" && data.matches.map((item) => <article className="entity-card match-entity" key={item.id}><div className={`status-dot ${item.status.toLowerCase().replaceAll(" ", "-")}`}><i /></div><div><span>{item.status} · {item.overs} overs</span><h3>{getTeam(data, item.teamAId)?.shortName} vs {getTeam(data, item.teamBId)?.shortName}</h3><p>{item.result ?? `${item.venue}${["Live", "Super Over"].includes(item.status) ? ` · ${item.runs}/${item.wickets}` : ""}`}</p></div><button onClick={() => onOpenMatch(item.id)}>›</button></article>)}
    </div>{openTeamId && <TeamRoster data={data} teamId={openTeamId} canManage={canManageTeam(openTeamId)} onClose={() => setOpenTeamId(null)} onAssign={onAssignPlayer} onAddNew={onAddPlayer} />}
  </div>;
}

function TournamentHub({ data, tournamentId, user, siteAdmin, officialScorer, initialStartMatchId, onInitialStartConsumed, canManageTeam, onBack, onRefresh, onUpload, onAdd, onOpenMatch, onAssignPlayer, onAddPlayer }: { data: Data; tournamentId: number; user: CoreCricketUser; siteAdmin: boolean; officialScorer: boolean; initialStartMatchId?: number | null; onInitialStartConsumed: () => void; canManageTeam: (teamId: number) => boolean; onBack: () => void; onRefresh: () => Promise<void>; onUpload: (kind: MediaKind, id: number, file?: File, name?: string) => Promise<void>; onAdd: (type: ModalType) => void; onOpenMatch: (id: number) => void; onAssignPlayer: (teamId: number, playerId: number) => Promise<void>; onAddPlayer: (teamId: number, fields: Record<string, unknown>) => Promise<void> }) {
  const [openTeamId, setOpenTeamId] = useState<number | null>(null);
  const [setupMatchId, setSetupMatchId] = useState<number | null>(null);
  const [startMatchId, setStartMatchId] = useState<number | null>(null);
  const [startScorerId, setStartScorerId] = useState<number | null>(null);
  const [newGroup, setNewGroup] = useState("");
  useEffect(() => { if (initialStartMatchId) { setStartScorerId(null); setStartMatchId(initialStartMatchId); onInitialStartConsumed(); } }, [initialStartMatchId, onInitialStartConsumed]);
  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const teamIds = (data.tournamentTeams ?? []).filter((item) => item.tournamentId === tournamentId).map((item) => item.teamId);
  const tournamentTeams = data.teams.filter((team) => teamIds.includes(team.id));
  const tournamentMatches = data.matches.filter((match) => match.tournamentId === tournamentId);
  const sponsors = (data.tournamentSponsors ?? []).filter((item) => item.tournamentId === tournamentId);
  const scorers = (data.tournamentScorers ?? []).filter((item) => item.tournamentId === tournamentId);
  const groups = (data.tournamentGroups ?? []).filter((g) => g.tournamentId === tournamentId);
  const groupTeams = (data.tournamentGroupTeams ?? []).filter((g) => g.tournamentId === tournamentId);
  const isCreator = !siteAdmin && Boolean((tournament?.createdByEmail && tournament.createdByEmail.toLowerCase() === user.email.toLowerCase()) || (tournament?.createdByName && tournament.createdByName.toLowerCase() === user.displayName.toLowerCase()));
  const canManageTournament = siteAdmin || isCreator;
  if (!tournament) return <div className="page"><Empty text="Tournament not found." /></div>;

  async function saveControl(payload: Record<string, unknown>) {
    const response = await fetch("/api/entities", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
    const body = await response.json() as { error?:string };
    if (!response.ok) throw new Error(body.error || "Unable to update tournament");
    await onRefresh();
  }
  async function addGroup() {
    const name=newGroup.trim(); if(!name)return;
    try { await saveControl({type:"tournamentGroup",tournamentId,name}); setNewGroup(""); }
    catch(e){window.alert(e instanceof Error?e.message:"Unable to add group");}
  }
  async function assignGroup(teamId:number, groupId:number) {
    try { await saveControl({type:"tournamentGroupTeam",tournamentId,teamId,groupId}); }
    catch(e){window.alert(e instanceof Error?e.message:"Unable to assign group");}
  }
  async function setMatchMvp(matchId:number, playerId:number) {
    try { await saveControl({type:"matchMvp",tournamentId,matchId,playerId}); }
    catch(e){window.alert(e instanceof Error?e.message:"Unable to save match MVP");}
  }
  async function setTournamentMvp(playerId:number) {
    try { await saveControl({type:"tournamentMvp",tournamentId,playerId}); }
    catch(e){window.alert(e instanceof Error?e.message:"Unable to save tournament MVP");}
  }

  const startMatch = tournamentMatches.find((match) => match.id === startMatchId);
  if (startMatch) {
    const selectedScorer = scorers.find((scorer) => scorer.id === startScorerId);
    return <div className="page match-setup"><div className="profile-subtabs"><button onClick={() => { setStartMatchId(null); setStartScorerId(null); }}>← Matches</button><button className="active">Start Match</button></div><SectionHead eyebrow={`${startMatch.overs} OVERS · OFFICIAL SCORER`} title={`${getTeam(data, startMatch.teamAId)?.shortName} vs ${getTeam(data, startMatch.teamBId)?.shortName}`} /><section className="card lineup-card"><CardTitle eyebrow="STEP 1" title="Choose the scorer who will start this match" /><p>An official tournament scorer must be selected before Playing XI, toss and live scoring can begin.</p><Field label="Official scorer"><select value={startScorerId ?? ""} onChange={(e) => setStartScorerId(Number(e.target.value))} required><option value="" disabled>Select official scorer</option>{scorers.map((scorer) => <option key={scorer.id} value={scorer.id}>{scorer.name}{scorer.phone ? ` · ${scorer.phone}` : scorer.email ? ` · ${scorer.email}` : ""}</option>)}</select></Field>{selectedScorer && <div className="official-scorer-banner"><b>✓ {selectedScorer.name}</b><span>Selected to start and score this match.</span></div>}<div className="lineup-footer"><b>{selectedScorer ? "Scorer confirmed" : "Select a scorer to continue"}</b><button className="primary-button" disabled={!selectedScorer} onClick={() => { setSetupMatchId(startMatch.id); setStartMatchId(null); }}>Continue to Playing XI →</button></div></section></div>;
  }

  const setupMatch = tournamentMatches.find((match) => match.id === setupMatchId);
  if (setupMatch) return <MatchSetup data={data} match={setupMatch} officialScorer={officialScorer} canManageTeam={canManageTeam} canManageBoth={canManageTournament} onBack={() => setSetupMatchId(null)} onRefresh={onRefresh} onStartScoring={() => onOpenMatch(setupMatch.id)} />;

  const tournamentAutoMvp=automaticTournamentMvp(data,tournamentId);
  const tournamentOverride=(data.tournamentMvpOverrides??[]).find(x=>x.tournamentId===tournamentId);
  const tournamentMvp=tournamentOverride?getPlayer(data,tournamentOverride.playerId):tournamentAutoMvp?.player;
  const eligibleTournamentPlayers=data.players.filter(p=>teamIds.includes(p.teamId??0));

  return <div className="page tournament-hub"><div className="profile-subtabs"><button onClick={onBack}>Tournaments</button><button className="active">{tournament.name}</button></div><SectionHead eyebrow={`${tournament.status} · ${tournament.format}`} title={tournament.name} action={<button className="return-button" onClick={onBack}>← Return to tournaments</button>} />
    <section className="tournament-banner"><TournamentLogo tournament={tournament} /><div><b>{tournament.venue}</b><span>{tournament.startDate} · {tournamentTeams.length} teams · {tournamentMatches.length} matches</span>{canManageTournament && <MediaUpload label="Change tournament logo" hasImage={Boolean(tournament.logoUrl)} onUpload={(file) => onUpload("tournament", tournament.id, file)} onRemove={() => onUpload("tournament", tournament.id)} />}</div></section>

    <section className="card tournament-groups-panel"><CardTitle eyebrow="GROUPS / TIERS" title="Tournament groups and automated standings" action={canManageTournament && <div className="group-create"><input value={newGroup} onChange={(e)=>setNewGroup(e.target.value)} placeholder="Elite Group, Super Group..." /><button onClick={()=>void addGroup()}>+ Add group</button></div>} />
      {groups.length===0 && <Empty text="A Main Group is created automatically for new tournaments. Add a group to classify tournament tiers." />}
      <div className="group-standings-grid">{groups.map(group=>{
        const ids=groupTeams.filter(x=>x.groupId===group.id).map(x=>x.teamId);
        const rows=standingsForGroup(data,tournamentId,ids);
        return <article className="standings-card" key={group.id}><div className="standings-head"><div><span>GROUP / TIER</span><h3>{group.name}</h3></div><small>Win 2 pts · Loss 0 pts · Tie 1 each</small></div>
          <div className="standings-table"><div className="standings-row headings"><span>#</span><span>Team</span><span>P</span><span>W</span><span>L</span><span>Pts</span><span>NRR</span></div>{rows.map((row,index)=><div className="standings-row" key={row.teamId}><span>{index+1}</span><b>{getTeam(data,row.teamId)?.shortName}</b><span>{row.played}</span><span>{row.won}</span><span>{row.lost}</span><strong>{row.points}</strong><span>{row.nrr>=0?"+":""}{row.nrr.toFixed(3)}</span></div>)}{rows.length===0&&<Empty text="Assign teams to this group to create its points table." />}</div>
        </article>})}</div>
      {canManageTournament && tournamentTeams.length>0 && groups.length>0 && <div className="group-assignments"><h3>Assign teams to groups</h3>{tournamentTeams.map(team=>{const current=groupTeams.find(x=>x.teamId===team.id)?.groupId??"";return <label key={team.id}><span>{team.name}</span><select value={current} onChange={(e)=>void assignGroup(team.id,Number(e.target.value))}><option value="" disabled>Select group</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>})}</div>}
    </section>

    <section className="card tournament-mvp-panel"><CardTitle eyebrow="TOURNAMENT MVP" title="Best overall tournament performer" />{tournamentMvp?<div className="mvp-feature"><Avatar player={tournamentMvp} large /><div><span>{tournamentOverride?"CREATOR SELECTED":"AUTOMATIC MVP"}</span><h3>{tournamentMvp.name}</h3><p>{tournamentAutoMvp&&tournamentAutoMvp.player.id===tournamentMvp.id?`${tournamentAutoMvp.runs} runs · ${tournamentAutoMvp.wickets} wickets · ${tournamentAutoMvp.matches.size} completed matches`:"Selected by tournament creator"}</p></div>{canManageTournament&&<select value={tournamentMvp.id} onChange={(e)=>void setTournamentMvp(Number(e.target.value))}>{eligibleTournamentPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>:<Empty text="Tournament MVP appears after completed match performances are recorded." />}</section>

    <div className="tournament-sections"><section className="card sponsor-panel"><CardTitle eyebrow="TOURNAMENT PARTNERS" title="Sponsor logos" />{canManageTournament && <SponsorUpload onUpload={(file, name) => onUpload("sponsor", tournament.id, file, name)} />}<div className="sponsor-grid">{sponsors.map((sponsor) => <div key={sponsor.id}>{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt={`${sponsor.name} logo`} /> : <span>◇</span>}<b>{sponsor.name}</b>{canManageTournament && <button onClick={() => void onUpload("sponsor", sponsor.id)}>Remove</button>}</div>)}{sponsors.length === 0 && <Empty text="No sponsor logos have been added." />}</div></section>
      <section className="card"><CardTitle eyebrow="TOURNAMENT TEAMS" title="Registered teams" action={canManageTournament && <button onClick={() => onAdd("tournamentTeam")}>+ Add team</button>} /><div className="hub-team-grid">{tournamentTeams.map((team) => <button key={team.id} onClick={() => setOpenTeamId(team.id)}><TeamBadge team={team} /><b>{team.name}</b><span>{data.players.filter((player) => player.teamId === team.id).length}/16 players · View players →</span></button>)}{tournamentTeams.length === 0 && <Empty text="No teams have joined this tournament." />}</div></section>
      <ScorerAssignment data={data} tournamentId={tournamentId} scorers={scorers} canManage={canManageTournament} onRefresh={onRefresh} />
      <section className="card hub-matches"><CardTitle eyebrow="TOURNAMENT ONLY" title="Matches, scoring and MVP" action={canManageTournament && <button onClick={() => onAdd("match")}>+ Create match</button>} />{officialScorer && <div className="official-scorer-banner"><b>✓ Official scorer access</b><span>Complete both playing XIs before scoring starts.</span></div>}{tournamentMatches.map((match) => { const canSetup = canManageTournament || canManageTeam(match.teamAId) || canManageTeam(match.teamBId); const auto=automaticMatchMvp(data,match.id); const override=(data.matchMvpOverrides??[]).find(x=>x.matchId===match.id); const chosen=override?getPlayer(data,override.playerId):auto?.player; const metrics=chosen?matchMvpMetrics(data,match.id).find(x=>x.player.id===chosen.id):undefined; const eligible=data.players.filter(p=>[match.teamAId,match.teamBId].includes(p.teamId??0)); return <div className="hub-match-with-mvp" key={match.id}><button className="hub-match-main" onClick={() => { if (match.status === "Upcoming" && canSetup) { if (!scorers.length) { window.alert("Assign at least one official tournament scorer before starting this match."); return; } setStartScorerId(null); setStartMatchId(match.id); return; } onOpenMatch(match.id); }}><span>{match.status}</span><b>{getTeam(data, match.teamAId)?.shortName} vs {getTeam(data, match.teamBId)?.shortName}</b><small>{match.result ?? `${match.runs}/${match.wickets} · ${overs(match.balls)} overs`}</small><em>{match.status === "Upcoming" ? (canSetup ? "Start Match · choose scorer →" : "Lineups pending →") : (officialScorer ? "Open scoring →" : "View scorecard →")}</em></button>{match.status==="Completed"&&<div className="match-mvp-strip"><div><span>{override?"SELECTED MATCH MVP":"AUTOMATIC MATCH MVP"}</span><b>{chosen?.name??"Pending"}</b><small>{metrics?.reason??"Performance metrics will appear after deliveries are recorded."}</small></div>{canManageTournament&&eligible.length>0&&<select value={chosen?.id??""} onChange={(e)=>void setMatchMvp(match.id,Number(e.target.value))}><option value="" disabled>Select MVP</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>}</div>; })}{tournamentMatches.length === 0 && <Empty text="No tournament matches yet." />}</section>
    </div>{openTeamId && <TeamRoster data={data} teamId={openTeamId} canManage={canManageTeam(openTeamId)} onClose={() => setOpenTeamId(null)} onAssign={onAssignPlayer} onAddNew={onAddPlayer} />}
  </div>;
}

function MatchSetup({ data, match, officialScorer, canManageTeam, canManageBoth, onBack, onRefresh, onStartScoring }: { data: Data; match: Match; officialScorer: boolean; canManageTeam: (teamId: number) => boolean; canManageBoth: boolean; onBack: () => void; onRefresh: () => Promise<void>; onStartScoring: () => void }) {
  const teamIds = [match.teamAId, match.teamBId];
  const friendly = !match.tournamentId;
  const requiredCount = (teamId: number) => friendly ? Math.min(11, data.players.filter((player) => player.teamId === teamId).length) : 11;
  const counts = (teamId: number) => (data.matchPlayers ?? []).filter((item) => item.matchId === match.id && item.teamId === teamId).length;
  const firstIncomplete = teamIds.find((id) => counts(id) !== requiredCount(id)) ?? match.teamAId;
  const [activeTeamId, setActiveTeamId] = useState(firstIncomplete);
  const saved = (data.matchPlayers ?? []).filter((item) => item.matchId === match.id && item.teamId === activeTeamId).map((item) => item.playerId);
  const [selected, setSelected] = useState<number[]>(saved);
  const [saving, setSaving] = useState(false);
  const team = getTeam(data, activeTeamId); const squad = data.players.filter((player) => player.teamId === activeTeamId);
  const canEdit = canManageBoth || canManageTeam(activeTeamId); const bothReady = teamIds.every((id) => requiredCount(id) > 0 && counts(id) === requiredCount(id));
  function openTeam(teamId: number) { setActiveTeamId(teamId); setSelected((data.matchPlayers ?? []).filter((item) => item.matchId === match.id && item.teamId === teamId).map((item) => item.playerId)); }
  async function saveXI() {
    setSaving(true);
    try { const response = await fetch("/api/lineup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchId: match.id, teamId: activeTeamId, playerIds: selected }) }); const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error || "Unable to save playing XI"); await onRefresh(); const other = teamIds.find((id) => id !== activeTeamId)!; openTeam(other); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to save playing XI"); } finally { setSaving(false); }
  }
  return <div className="page match-setup"><div className="profile-subtabs"><button onClick={onBack}>← Matches</button><button className="active">Start match</button></div><SectionHead eyebrow={`${match.overs} OVERS · PLAYING XI`} title={`${getTeam(data, match.teamAId)?.shortName} vs ${getTeam(data, match.teamBId)?.shortName}`} />
    <div className="lineup-progress">{teamIds.map((id, index) => { const required=requiredCount(id); return <button key={id} disabled={id === match.teamBId && counts(match.teamAId) !== requiredCount(match.teamAId)} className={activeTeamId === id ? "active" : ""} onClick={() => openTeam(id)}><span>{required > 0 && counts(id) === required ? "✓" : index + 1}</span><b>{getTeam(data, id)?.name}</b><small>{counts(id)}/{required} selected</small></button>; })}</div>
    <section className="card lineup-card"><CardTitle eyebrow={counts(activeTeamId) === requiredCount(activeTeamId) && requiredCount(activeTeamId)>0 ? "PLAYING SQUAD SAVED" : "SELECT FROM SQUAD"} title={`${team?.name} ${friendly ? "playing squad" : "playing XI"}`} /><p>{friendly && requiredCount(activeTeamId) < 11 ? `This team has ${requiredCount(activeTeamId)} registered player${requiredCount(activeTeamId)===1?"":"s"}. Select all available players to continue.` : "Choose exactly 11 players from this team’s registered squad. Players outside the squad cannot be added."}</p>{canEdit ? <><div className="lineup-grid">{squad.map((player) => { const checked = selected.includes(player.id); const max=requiredCount(activeTeamId); return <button key={player.id} className={checked ? "selected" : ""} onClick={() => setSelected((current) => checked ? current.filter((id) => id !== player.id) : current.length < max ? [...current, player.id] : current)}><Avatar player={player} /><span><b>{player.name}</b><small>{player.role}</small></span><i>{checked ? "✓" : "+"}</i></button>; })}</div><div className="lineup-footer"><b>{selected.length}/{requiredCount(activeTeamId)} players selected</b><button className="primary-button" disabled={requiredCount(activeTeamId) < 1 || selected.length !== requiredCount(activeTeamId) || saving} onClick={() => void saveXI()}>{saving ? "Saving…" : `Save ${team?.shortName} ${friendly ? "squad" : "playing XI"}`}</button></div></> : <div className="readonly-note">Only this team’s captain or team administrator, or the tournament creator, can select this lineup.</div>}</section>
    {bothReady && <MatchSetupFinal data={data} match={match} officialScorer={officialScorer} onRefresh={onRefresh} onStartScoring={onStartScoring} />}
  </div>;
}

function MatchSetupFinal({data,match,officialScorer,onRefresh,onStartScoring}:{data:Data;match:Match;officialScorer:boolean;onRefresh:()=>Promise<void>;onStartScoring:()=>void}) {
  const [flipping,setFlipping]=useState(false); const [error,setError]=useState(""); const friendly=!match.tournamentId; const scorers=(data.tournamentScorers??[]).filter((item)=>item.tournamentId===match.tournamentId); const xi=new Set((data.matchPlayers??[]).filter((item)=>item.matchId===match.id).map((item)=>item.playerId)); const batters=data.players.filter((p)=>p.teamId===match.battingTeamId&&xi.has(p.id)); const bowlers=data.players.filter((p)=>p.teamId===match.bowlingTeamId&&xi.has(p.id));
  async function setup(payload:Record<string,unknown>){const response=await fetch("/api/match-setup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({matchId:match.id,...payload})});const body=await response.json()as{error?:string};if(!response.ok)throw new Error(body.error||"Unable to continue match setup");await onRefresh();}
  function toss(){if(!friendly&&!scorers.length)return;setFlipping(true);setError("");window.setTimeout(()=>void setup({action:"toss"}).catch((e)=>setError(e instanceof Error?e.message:"Toss failed")).finally(()=>setFlipping(false)),1500);}
  async function start(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=Object.fromEntries(new FormData(event.currentTarget));if(f.strikerId===f.nonStrikerId){setError("Select two different opening batters.");return;}const response=await fetch("/api/score",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"start",matchId:match.id,strikerId:Number(f.strikerId),nonStrikerId:Number(f.nonStrikerId),bowlerId:Number(f.bowlerId)})});const body=await response.json()as{error?:string};if(!response.ok){setError(body.error||"Unable to start scoring");return;}await onRefresh();onStartScoring();}
  return <div className="match-final">{error&&<div className="setup-error">{error}</div>}{!match.tossWinnerTeamId&&<section className="card toss-card"><div className={flipping?"coin flipping":"coin"}><b>CORE</b><span>CRICKET</span></div><h2>Random toss</h2><p>{friendly?"Both friendly-match squads are ready. Run the random toss, then let the winning team choose bat or bowl.":scorers.length?"Both playing XIs are ready. Run the random coin toss.":"Add at least one official scorer before the match can start."}</p><button className="primary-button" disabled={(!friendly&&!scorers.length)||flipping} onClick={toss}>{flipping?"Tossing…":"Start random toss"}</button></section>}{match.tossWinnerTeamId&&!match.tossDecision&&<section className="card toss-result"><span>{match.tossResult}</span><h2>{getTeam(data,match.tossWinnerTeamId)?.name} won the toss</h2><p>Select what the winning team wants to do first.</p><div><button onClick={()=>void setup({action:"decision",decision:"Bat"})}>Bat first</button><button onClick={()=>void setup({action:"decision",decision:"Bowl"})}>Bowl first</button></div></section>}{match.tossDecision&&<form className="card opener-form" onSubmit={(e)=>void start(e)}><CardTitle eyebrow="OPENING PLAYERS" title="Ready to start scoring" /><p>{getTeam(data,match.tossWinnerTeamId??0)?.name} won the toss and chose to {match.tossDecision.toLowerCase()} first.</p><div className="field-row"><Field label="Striker"><select name="strikerId" required defaultValue=""><option value="" disabled>Select batter</option>{batters.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Non-striker"><select name="nonStrikerId" required defaultValue=""><option value="" disabled>Select batter</option>{batters.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div><Field label="First-over bowler"><select name="bowlerId" required defaultValue=""><option value="" disabled>Select bowler</option>{bowlers.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>{(officialScorer||friendly)?<button className="primary-button full">Start scoring →</button>:<div className="readonly-note">An assigned official scorer must sign in to start scoring.</div>}</form>}</div>;
}

function ScorerAssignment({ data, tournamentId, scorers, canManage, onRefresh }: { data: Data; tournamentId: number; scorers: TournamentScorer[]; canManage: boolean; onRefresh: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = data.players.filter((player) => normalized && (player.name.toLowerCase().includes(normalized) || (player.phone ?? "").includes(query.trim()) || (player.email ?? "").toLowerCase().includes(normalized)));
  async function add(payload: Record<string, unknown>) { const response = await fetch("/api/entities", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "tournamentScorer", tournamentId, ...payload }) }); const body = await response.json() as { error?: string }; if (!response.ok) { window.alert(body.error || "Unable to add scorer"); return; } setQuery(""); await onRefresh(); }
  return <section className="card scorer-assignment"><CardTitle eyebrow="GLOBAL PLAYER CATALOGUE" title="Tournament scorers" /><div>{scorers.map((scorer) => <span key={scorer.id}><b>{scorer.name}</b><small>{scorer.phone || scorer.email || "Manually added scorer"}</small></span>)}</div>{canManage && <><label className="scorer-search">⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Start typing a player name, phone or email" /></label>{results.slice(0, 8).map((player) => <button className="scorer-result" key={player.id} onClick={() => void add({ playerId: player.id })}><Avatar player={player} /><span><b>{player.name}</b><small>{player.phone || player.email || "Core Cricket profile"}</small></span><em>+ Select</em></button>)}{normalized && results.length === 0 && <p className="form-help">No catalogue match. Add this scorer manually below.</p>}<form onSubmit={(event) => { event.preventDefault(); void add(Object.fromEntries(new FormData(event.currentTarget))); event.currentTarget.reset(); }}><input name="name" required placeholder="Scorer name" /><input name="phone" type="tel" placeholder="Phone (optional)" /><button>Add manually</button></form></>}<small>Search the global catalogue or enter a name manually. At least one official scorer is required before a match can start.</small></section>;
}

function TeamRoster({ data, teamId, canManage, onClose, onAssign, onAddNew }: { data: Data; teamId: number; canManage: boolean; onClose: () => void; onAssign: (teamId: number, playerId: number) => Promise<void>; onAddNew: (teamId: number, fields: Record<string, unknown>, image?: File) => Promise<void> }) {
  const team = getTeam(data, teamId); const roster = data.players.filter((player) => player.teamId === teamId); const available = data.players.filter((player) => !player.teamId);
  const [tab, setTab] = useState<"roster" | "search" | "invite" | "new">("roster"); const [query, setQuery] = useState(""); const [qr, setQr] = useState(""); const [profileId, setProfileId] = useState<number | null>(null); const full = roster.length >= 16;
  const code = team?.inviteCode === "CORE-TEAM" ? `CORE-TEAM-${team.id}` : team?.inviteCode; const joinUrl = typeof window === "undefined" ? "" : `${window.location.origin}/join?code=${encodeURIComponent(code ?? "")}`;
  useEffect(() => { if (joinUrl) void QRCode.toDataURL(joinUrl, { width: 260, margin: 1, color: { dark: "#14281c", light: "#ffffff" } }).then(setQr); }, [joinUrl]);
  if (!team) return null;
  const profile = roster.find((player) => player.id === profileId);
  return <div className="roster-overlay"><section className="team-roster"><button className="modal-close" onClick={onClose}>×</button><div className="roster-head"><TeamBadge team={team} /><div><span>TOURNAMENT TEAM</span><h2>{team.name}</h2><p>{roster.length}/16 players · Captain: {team.captainName} · {canManage ? "Management access" : "View only"}</p></div></div>{profile ? <div className="roster-profile"><button onClick={() => setProfileId(null)}>← Return to team players</button><div><Avatar player={profile} large /><span><small>{profile.role}</small><h3>{profile.name}</h3><p>{profile.battingStyle} · {profile.bowlingStyle}</p></span></div><div className="stat-grid"><Stat label="Matches" value={profile.matches} /><Stat label="Runs" value={profile.runs} accent /><Stat label="Average" value={average(profile)} /><Stat label="Strike rate" value={strikeRate(profile)} /><Stat label="Wickets" value={profile.wickets} accent /><Stat label="Economy" value={economy(profile)} /></div><p className="readonly-note">Player records are view-only and are updated through authorized match scoring.</p></div> : <><div className="roster-tabs">{(["roster", ...(canManage ? ["search","new","invite"] : [])] as ("roster" | "search" | "invite" | "new")[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "roster" ? "Players" : item === "new" ? "Add new" : item === "invite" ? "Invite / QR" : "Search app"}</button>)}</div>
    {tab === "roster" && <div className="roster-list">{roster.map((player, index) => <button key={player.id} onClick={() => setProfileId(player.id)}><span>{String(index + 1).padStart(2,"0")}</span><Avatar player={player} /><div><b>{player.name}</b><small>{player.role} · {player.battingStyle}</small></div><em>View profile →</em></button>)}{roster.length === 0 && <Empty text="No players added yet." />}</div>}
    {tab === "search" && <div className="roster-search"><label>⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search global catalogue by name, phone or email" /></label>{available.filter((player) => player.name.toLowerCase().includes(query.toLowerCase()) || (player.phone ?? "").includes(query) || (player.email ?? "").toLowerCase().includes(query.toLowerCase())).map((player) => <div key={player.id}><Avatar player={player} /><span><b>{player.name}</b><small>{player.role} · {player.phone || player.email || "Unassigned profile"}</small></span><button disabled={full} onClick={() => void onAssign(team.id, player.id)}>{full ? "Roster full" : "+ Add"}</button></div>)}{available.length === 0 && <Empty text="No unassigned player profiles found. Send an invite or add a new player." />}</div>}
    {tab === "new" && <form className="roster-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const image = form.get("image"); form.delete("image"); void onAddNew(team.id, Object.fromEntries(form), image instanceof File ? image : undefined); event.currentTarget.reset(); }}><p>Team captains and team admins can add a player directly. Maximum roster size is 16.</p><Field label="Player name"><input name="name" required placeholder="Full name" /></Field><div className="field-row"><Field label="Role"><select name="role"><option>All-rounder</option><option>Batter</option><option>Fast bowler</option><option>Spin bowler</option><option>Wicketkeeper</option></select></Field><Field label="Team access"><select name="memberRole"><option>Player</option><option>Captain</option><option>Team admin</option></select></Field></div><Field label="Player picture (optional)"><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></Field><small className="form-help">Choose a picture from this device. It will save automatically with the player profile.</small><button className="primary-button full" type="submit" disabled={full}>{full ? "Roster is full" : "Add player to team"}</button></form>}
    {tab === "invite" && <div className="invite-panel">{qr && <img src={qr} alt={`Unique QR invitation for ${team.name}`} />}<div><span>UNIQUE TEAM INVITATION</span><h3>Invite a player to {team.name}</h3><p>Scanning the QR code or opening the link takes the player to Core Cricket to create a profile. The completed profile is added directly to this team.</p><input readOnly value={joinUrl} aria-label="Team invitation link" /><div><button onClick={() => void navigator.clipboard.writeText(joinUrl)}>Copy link</button><a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Join ${team.name} on Core Cricket: ${joinUrl}`)}`}>Send by WhatsApp</a></div><small>Every team receives its own QR code and invitation link.</small></div></div>}</>}
  </section></div>;
}

function SponsorUpload({ onUpload }: { onUpload: (file: File, name: string) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null); const [name, setName] = useState("");
  return <div className="sponsor-upload"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sponsor name" aria-label="Sponsor name" /><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(file, name.trim() || "Sponsor"); event.currentTarget.value = ""; }} /><button className="upload-button" onClick={() => inputRef.current?.click()}>↑ Add sponsor logo</button></div>;
}

function Players({ readOnly, canEditPhoto, data, selectedId, profileOpen, onSelect, onBack, onUpload, onAdd }: { readOnly: boolean; canEditPhoto: (player: Player) => boolean; data: Data; selectedId: number; profileOpen: boolean; onSelect: (id: number) => void; onBack: () => void; onUpload: (kind: MediaKind, id: number, file?: File, name?: string) => Promise<void>; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const selected = data.players.find((player) => player.id === selectedId) ?? data.players[0];
  const catalogue = data.players.filter((player) => !query.trim() || player.name.toLowerCase().includes(query.trim().toLowerCase()) || (player.phone ?? "").includes(query.trim()) || (player.email ?? "").toLowerCase().includes(query.trim().toLowerCase()));
  if (profileOpen && selected) return <div className="page player-profile-page"><div className="profile-subtabs"><button onClick={onBack}>Players</button><button className="active">{selected.name} profile</button></div><SectionHead eyebrow="PLAYER PROFILE" title={selected.name} action={<button className="return-button" onClick={onBack}>← Return to players</button>} /><section className="profile-panel"><div className="profile-hero"><Avatar player={selected} large /><div><span>{getTeam(data, selected.teamId ?? 0)?.name}</span><h2>{selected.name}</h2><p>{selected.role} · {selected.battingStyle}</p></div><div className="form-badge">RECORD <b>🔒</b></div></div>{canEditPhoto(selected) && <PhotoControls player={selected} onUpload={onUpload} />}<div className="stat-section"><StatHeading eyebrow="BATTING" title="Batter record" /><div className="stat-grid"><Stat label="Matches" value={selected.matches} /><Stat label="Runs" value={selected.runs} accent /><Stat label="Average" value={average(selected)} /><Stat label="Strike rate" value={strikeRate(selected)} /><Stat label="Highest" value={selected.highest} /><Stat label="4s / 6s" value={`${selected.fours} / ${selected.sixes}`} /></div></div><div className="stat-section"><StatHeading eyebrow="BOWLING" title="Bowler record" /><div className="stat-grid"><Stat label="Overs" value={overs(selected.ballsBowled)} /><Stat label="Wickets" value={selected.wickets} accent /><Stat label="Economy" value={economy(selected)} /><Stat label="Runs conceded" value={selected.runsConceded} /><Stat label="Best" value={selected.wickets ? "4/18" : "—"} /><Stat label="Catches" value={selected.catches} /></div></div></section></div>;
  return <div className="page"><SectionHead eyebrow="GLOBAL PLAYER CATALOGUE" title="Find a player profile" action={!readOnly && <button className="primary-button" onClick={onAdd}>+ Add player</button>} /><section className="card player-directory"><label className="filter-input">⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Start typing a name, phone or email" aria-label="Search global player catalogue" /></label><div className="player-card-grid">{catalogue.map((player) => <button key={player.id} onClick={() => onSelect(player.id)}><Avatar player={player} /><div><b>{player.name}</b><span>{getTeam(data, player.teamId ?? 0)?.shortName ?? "Unassigned"} · {player.role}</span></div><strong>Select profile →</strong></button>)}</div>{catalogue.length === 0 && <Empty text="No matching profile. An administrator can add this player to the catalogue." />}</section></div>;
}

function PhotoControls({ player, onUpload }: { player: Player; onUpload: (kind: MediaKind, id: number, file?: File, name?: string) => Promise<void> }) {
  return <div className="photo-controls"><div><b>Profile picture</b><span>Select a picture directly from your phone or computer. Player statistics remain protected.</span></div><MediaUpload label="Save picture" hasImage={Boolean(player.photoUrl)} onUpload={(file) => onUpload("player", player.id, file)} onRemove={() => onUpload("player", player.id)} /></div>;
}

function MediaUpload({ label, hasImage, onUpload, onRemove }: { label: string; hasImage: boolean; onUpload: (file: File) => Promise<void>; onRemove: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="media-upload"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(file); event.currentTarget.value = ""; }} /><button className="upload-button" onClick={() => inputRef.current?.click()}>↑ {label}</button>{hasImage && <button className="remove-button" onClick={() => void onRemove()}>Remove</button>}</div>;
}

function LiveStudio({ authorized, canScore, canControlSponsors, sponsorCount, match, battingTeam, bowlingTeam, videoRef, cameraOn, broadcasting, watchLink, onCamera, onScoreDevice, onBroadcast, onSponsor }: { authorized: boolean; canScore: boolean; canControlSponsors: boolean; sponsorCount: number; match?: Match; battingTeam?: Team; bowlingTeam?: Team; videoRef: React.RefObject<HTMLVideoElement | null>; cameraOn: boolean; broadcasting: boolean; watchLink: string; onCamera: () => void; onScoreDevice: () => void; onBroadcast: () => void; onSponsor: () => void }) {
  if (!match || !["Live", "Super Over"].includes(match.status)) return <div className="page"><SectionHead eyebrow="LIVE MATCH VIEW" title="Go Live" /><div className="no-live-page"><span>○</span><h2>No live match or game</h2><p>Start a match from its tournament when an official scorer is ready.</p></div></div>;
  if (!authorized) return <div className="page"><SectionHead eyebrow="LIVE ACCESS" title="Go Live" /><section className="pro-paywall"><div className="camera-icon">▣</div><h2>Live broadcast is role-based</h2><p>Go Live is included for site administrators, tournament creators, official scorers, team captains and team administrators. Regular viewers can watch shared live links without a paid plan.</p></section></div>;
  return <div className="page"><SectionHead eyebrow="AUTHORIZED LIVE TOOLS" title="Live Studio" action={<div className="plan-status">{broadcasting ? "LIVE NOW" : "ACCESS INCLUDED"}</div>} /><div className="studio-layout"><section className="camera-stage"><video ref={videoRef} playsInline muted /><div className={cameraOn ? "camera-empty hidden" : "camera-empty"}><div className="camera-icon">▣</div><h2>Broadcast from this phone</h2><p>Keep this device on the camera. A scorer can update the match from another phone.</p><button className="primary-button" onClick={onCamera}>Enable camera</button></div>{cameraOn && <div className="stream-overlay"><div><b>{battingTeam?.shortName}</b><strong>{match?.runs}/{match?.wickets}</strong><span>{overs(match?.balls ?? 0)} ov</span></div><i>vs</i><b>{bowlingTeam?.shortName}</b><em>CORE CRICKET</em></div>}{broadcasting && <div className="broadcast-badge"><i /> LIVE</div>}</section><aside className="studio-controls"><div className="card"><span>CAMERA</span><h3>{cameraOn ? "Camera ready" : "Connect your phone"}</h3><button className="secondary-button" onClick={onCamera}>{cameraOn ? "Restart camera" : "Test camera"}</button></div><div className="card"><span>LIVE SCORE</span><h3>{battingTeam?.shortName} {match?.runs}/{match?.wickets}</h3><p>Use a second phone, or score from this same device.</p>{canScore ? <button className="secondary-button" onClick={onScoreDevice}>Open scoring on this device</button> : <small>You can broadcast this match; only an official scorer or tournament creator can change the score.</small>}</div>{canControlSponsors && <div className="card sponsor-control-card"><span>SPONSOR OVERLAY</span><h3>Manual sponsor graphic</h3><p>{sponsorCount ? `${sponsorCount} sponsor${sponsorCount === 1 ? "" : "s"} ready. Each press shows the next sponsor for 8 seconds.` : "Add sponsor logos in the tournament first."}</p><button className="secondary-button" disabled={!broadcasting || sponsorCount === 0} onClick={onSponsor}>Show Sponsor</button><small>{!broadcasting ? "Start the live broadcast first." : sponsorCount === 0 ? "No tournament sponsors available." : "Press again for the next sponsor."}</small></div>}<div className="card broadcast-card"><span>LIVE BROADCAST</span><h3>{broadcasting ? "Your match is live" : "Create a public watch link"}</h3><button className={broadcasting ? "stop-button" : "primary-button"} onClick={onBroadcast}>{broadcasting ? "Stop live" : "Go live"}</button>{watchLink && <div className="watch-share"><input readOnly value={watchLink} /><button onClick={() => void navigator.clipboard.writeText(watchLink)}>Copy link</button><a href={`https://wa.me/?text=${encodeURIComponent(`Watch this match live on Core Cricket: ${watchLink}`)}`} target="_blank" rel="noreferrer">WhatsApp</a></div>}</div></aside></div></div>;
}

function Help({ onInstall, onNavigate }: { onInstall: () => void; onNavigate: (view: View) => void }) {
  const topics = [["01", "Create your cricket records", "Add teams first, then players, tournaments and matches from My Cricket."], ["02", "Start a match", "Choose the playing teams, number of overs, venue, toss and opening players."], ["03", "Score every delivery", "Use 0–6, extras and wicket. Undo reverses the last ball and its player stats."], ["04", "Review player performance", "Batting and bowling records are kept separately on every player profile."], ["05", "Use Live Studio", "Admins, tournament creators, official scorers and team captains/admins can broadcast without a paid plan."], ["06", "Install on your phone", "Android uses Install app. On iPhone, choose Share then Add to Home Screen."]];
  return <div className="page"><SectionHead eyebrow="HELP CENTRE" title="Learn Core Cricket" action={<button className="secondary-button" onClick={onInstall}>↓ Install app</button>} /><div className="help-intro"><div><span>QUICK START</span><h2>From toss to final scorecard</h2><p>Create a tournament, assign official scorers, then open a match inside that tournament to begin scoring.</p><button className="primary-button" onClick={() => onNavigate("manage")}>Open tournaments</button></div><div className="pitch-mark"><i /><i /><i /></div></div><div className="help-grid">{topics.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div><section className="storage-plan"><span>STORAGE PLANNING</span><h2>Recommended starting capacity</h2><div><article><b>5–15 MB</b><small>Installed app cache per device</small></article><article><b>5 GB</b><small>Recommended starting cloud storage without saved video</small></article><article><b>100 GB</b><small>Recommended when match video recording is enabled</small></article></div><p>Scores and player records are small—thousands of deliveries usually remain under a few megabytes. Photos typically use 0.5–5 MB each. Recorded or relayed video is the main cost at approximately 0.5–1.5 GB per hour, depending on quality.</p></section><div className="support-note"><b>Capacity note</b><p>Start with 5 GB for records, logos and player photos. Add expandable video storage when production broadcasting and recording are connected.</p></div></div>;
}

function Modal({ type, data, match, selectedTournamentId, selectedTeamId, onClose, onSubmit, onWicket, onBowler, onStartInnings, onResolveTie, onUnlock }: { type: ModalType; data: Data; match?: Match; selectedTournamentId: number | null; selectedTeamId: number | null; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onWicket: (payload: Record<string, unknown>) => void; onBowler: (bowlerId: number) => Promise<void>; onStartInnings: (strikerId: number, nonStrikerId: number, bowlerId: number) => Promise<void>; onResolveTie: (resolution: "superOver" | "sharedPoints" | "walkoverA" | "walkoverB" | "endInnings") => Promise<void>; onUnlock: () => void }) {
  const selectedPlayerIds = new Set((data.matchPlayers ?? []).filter((item) => item.matchId === match?.id).map((item) => item.playerId));
  const inPlayingXI = (player: Player) => selectedPlayerIds.size === 0 || selectedPlayerIds.has(player.id);
  const battingPlayers = data.players.filter((player) => player.teamId === match?.battingTeamId && inPlayingXI(player) && player.id !== match?.strikerId && player.id !== match?.nonStrikerId);
  const currentBatters = data.players.filter((player) => player.id === match?.strikerId || player.id === match?.nonStrikerId);
  const nextBattingOptions = [...currentBatters, ...battingPlayers];
  const bowlingPlayers = data.players.filter((player) => player.teamId === match?.bowlingTeamId && inPlayingXI(player) && player.id !== match?.bowlerId);
  const titles = { team: "Add a team", player: "Add a player", tournament: "Create tournament", tournamentTeam: "Add team to tournament", match: "Create match", wicket: "Record wicket", bowler: "Select next bowler", innings: "Start next innings", tie: "Match tied", extra: "Record extras", upgrade: "Core Cricket Creator" };
  if (type === "innings") return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose}>×</button><span>CORE CRICKET</span><h2>Start {match?.status?.includes("Super Over") ? "Super Over" : "next innings"}</h2><form onSubmit={(event) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); void onStartInnings(Number(fields.strikerId), Number(fields.nonStrikerId), Number(fields.bowlerId)); }}><div className="field-row"><Field label="Striker"><select name="strikerId" required defaultValue=""><option value="" disabled>Select batter</option>{battingPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></Field><Field label="Non-striker"><select name="nonStrikerId" required defaultValue=""><option value="" disabled>Select batter</option>{battingPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></Field></div><Field label="Opening bowler"><select name="bowlerId" required defaultValue=""><option value="" disabled>Select bowler</option>{bowlingPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></Field><button className="primary-button full" type="submit">Start scoring</button></form></div></div>;
  if (type === "tie") return <div className="modal-backdrop"><div className="modal tie-modal innings-options-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose}>×</button><span>MATCH CONTROL</span><h2>End innings and result</h2><p>Select the correct action for this innings or match.</p><div className="tie-options"><button onClick={() => void onResolveTie("endInnings")}><b>End innings</b><span>Close the innings early and continue or calculate the result</span></button><button onClick={() => void onResolveTie("superOver")}><b>Super Over</b><span>One over of six legal balls per team</span></button><button onClick={() => void onResolveTie("sharedPoints")}><b>One point each</b><span>Complete the tied match and award equal points</span></button><button onClick={() => void onResolveTie("walkoverA")}><b>{getTeam(data, match?.teamAId ?? 0)?.name ?? "Team A"} walkover</b><span>Award this team the match without further play</span></button><button onClick={() => void onResolveTie("walkoverB")}><b>{getTeam(data, match?.teamBId ?? 0)?.name ?? "Team B"} walkover</b><span>Award this team the match without further play</span></button></div></div></div>;
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><span>CORE CRICKET</span><h2 id="modal-title">{titles[type]}</h2>
    {type === "upgrade" ? <div className="upgrade-content"><div className="price"><strong>$6.99</strong><span>/ month</span></div><div className="price annual"><strong>$50</strong><span>/ year · save $33.88</span></div><ul><li>Phone camera broadcast</li><li>Public viewer link for any mobile device</li><li>Live score overlay</li><li>Separate-phone scoring</li></ul><div className="prototype-callout">Testing mode: activating Pro does not charge you yet.</div><button className="primary-button full" onClick={onUnlock}>Activate Pro test</button></div> : type === "bowler" ? <form onSubmit={(event) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); void onBowler(Number(fields.bowlerId)); }}><p className="form-help">Six legal balls completed. Choose a different bowler from the bowling team for the next over.</p><Field label="Next bowler"><select name="bowlerId" required defaultValue=""><option value="" disabled>Select bowler</option>{bowlingPlayers.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.bowlingStyle}</option>)}</select></Field><button className="primary-button full" type="submit">Start next over</button></form> : type === "wicket" ? <form onSubmit={(event) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); onWicket({ runsBatter: 0, wicketType: fields.wicketType, playerOutId: Number(fields.playerOutId) || null, nextBatterId: Number(fields.nextBatterId) || null, strikerAfterId: Number(fields.strikerAfterId) || null }); }}><Field label="Dismissal"><select name="wicketType" defaultValue="Bowled">{["Bowled", "Caught", "LBW", "Run out", "Stumped", "Hit wicket"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Player out"><select name="playerOutId" required defaultValue={match?.strikerId ?? ""}>{currentBatters.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></Field><Field label="Next batter"><select name="nextBatterId" required defaultValue=""><option value="" disabled>Select player</option>{battingPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></Field><Field label="Who will be on striker end?"><select name="strikerAfterId" required defaultValue=""><option value="" disabled>Select striker</option>{nextBattingOptions.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></Field><button className="wicket-button full" type="submit">Confirm wicket</button></form> : type === "extra" ? <form onSubmit={(event) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); onWicket({ runsBatter: Number(fields.runsBatter) || 0, extraType: fields.extraType, extraRuns: Number(fields.extraRuns) || 0 }); }}><Field label="Extra type"><select name="extraType"><option>Wide</option><option>No ball</option><option>Bye</option><option>Leg bye</option><option>Penalty</option></select></Field><div className="field-row"><Field label="Runs off bat"><select name="runsBatter">{[0,1,2,3,4,5,6].map((run) => <option key={run} value={run}>{run}</option>)}</select></Field><Field label="Total extra runs"><select name="extraRuns" defaultValue="1">{[0,1,2,3,4,5,6,7].map((run) => <option key={run} value={run}>{run}</option>)}</select></Field></div><p className="form-help">For a wide plus running, choose Wide and enter the total wides, including the automatic one run.</p><button className="primary-button full" type="submit">Add extras</button></form> : <form onSubmit={onSubmit}>
      {type === "team" && <><Field label="Team name"><input name="name" placeholder="e.g. GTA Falcons" required /></Field><div className="field-row"><Field label="Short name"><input name="shortName" placeholder="GTF" maxLength={4} /></Field><Field label="City"><input name="city" placeholder="Milton" /></Field></div><Field label="Captain name (becomes team admin)"><input name="captainName" placeholder="Captain full name" required /></Field><Field label="Team logo or picture (optional)"><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></Field><p className="form-help">Browse this device. The logo saves automatically when the team is created.</p></>}
      {type === "player" && <><Field label="Player name"><input name="name" placeholder="Full name" required /></Field><Field label="Team"><select name="teamId" required defaultValue={selectedTeamId ?? ""}><option value="" disabled>Select team</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field><div className="field-row"><Field label="Cricket role"><select name="role"><option>All-rounder</option><option>Batter</option><option>Fast bowler</option><option>Spin bowler</option><option>Wicketkeeper</option></select></Field><Field label="Team access"><select name="memberRole"><option>Player</option><option>Captain</option><option>Team admin</option></select></Field></div><Field label="Profile picture (optional)"><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></Field><p className="form-help">Browse this phone or device. The picture saves automatically with the profile.</p><Field label="Player profile"><input name="profileBio" placeholder="Playing history or short bio" /></Field></>}
      {type === "tournament" && <><Field label="Tournament name"><input name="name" placeholder="Ontario Summer League" required /></Field><div className="field-row"><Field label="Overs per innings"><select name="format" defaultValue="20">{Array.from({ length: 20 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} over{value === 1 ? "" : "s"}</option>)}</select></Field><Field label="Start date"><input name="startDate" type="date" required /></Field></div><Field label="Venue"><input name="venue" placeholder="Milton Community Park" required /></Field><Field label="Tournament logo or picture (optional)"><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></Field><p className="form-help">Choose an image from this device. It saves automatically with the tournament.</p><Field label="Who can start scoring?"><select name="tournamentAdminsCanScore" defaultValue="true"><option value="true">All tournament admins and site admins</option><option value="false">Site admins only</option></select></Field></>}
      {type === "tournamentTeam" && <><input type="hidden" name="tournamentId" value={selectedTournamentId ?? ""} /><Field label="Team"><select name="teamId" required defaultValue=""><option value="" disabled>Select team</option>{data.teams.filter((team) => !(data.tournamentTeams ?? []).some((entry) => entry.tournamentId === selectedTournamentId && entry.teamId === team.id)).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field></>}
      {type === "match" && <><div className="field-row"><Field label="Team A"><select name="teamAId" required defaultValue=""><option value="" disabled>Select team</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field><Field label="Team B"><select name="teamBId" required defaultValue=""><option value="" disabled>Select team</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field></div><div className="field-row"><Field label="Overs"><select name="overs" defaultValue="20">{Array.from({ length: 20 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} over{value === 1 ? "" : "s"}</option>)}</select></Field><Field label="Tournament"><select name="tournamentId" defaultValue={selectedTournamentId ?? ""}><option value="">Friendly</option>{data.tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div><Field label="Venue"><input name="venue" placeholder="Community Ground" /></Field><div className="umpire-fields"><Field label="Umpire 1"><input name="umpireOne" placeholder="First umpire name" /></Field><Field label="Umpire 2"><input name="umpireTwo" placeholder="Second umpire name" /></Field></div></>}
      <button className="primary-button full" type="submit">Save {type}</button>
    </form>}
  </div></div>;
}

function LiveBatter({ player, label, figures }: { player?: Player; label: string; figures: { runs: number; balls: number; strikeRate: string } }) { return <div className="live-player-row"><Avatar player={player} /><div><span>{label}</span><b>{player?.name ?? "Select batter"}</b><small>{player?.battingStyle ?? "Batting"}</small></div><div className="figure-grid"><strong>{figures.runs}<small>RUNS</small></strong><strong>{figures.balls}<small>BALLS</small></strong><strong>{figures.strikeRate}<small>STRIKE RATE</small></strong></div></div>; }
function LiveBowler({ player, figures }: { player?: Player; figures: { overs: string; conceded: number; wickets: number; economy: string } }) { return <div className="live-player-row bowler-row"><Avatar player={player} /><div><span>CURRENT BOWLER</span><b>{player?.name ?? "Select bowler"}</b><small>{player?.bowlingStyle ?? "Bowling"}</small></div><div className="figure-grid bowling"><strong>{figures.overs}<small>OVERS</small></strong><strong>{figures.wickets}/{figures.conceded}<small>FIGURES</small></strong><strong>{figures.economy}<small>ECONOMY</small></strong></div></div>; }
function CardTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="card-title"><div><span>{eyebrow}</span><h2>{title}</h2></div>{action}</div>; }
function StatHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="stat-heading"><span>{eyebrow}</span><h3>{title}</h3></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) { return <div className={accent ? "stat accent" : "stat"}><span>{label}</span><strong>{value}</strong></div>; }
function Avatar({ player, large }: { player?: Player; large?: boolean }) { return <span className={large ? "avatar large" : "avatar"}>{player?.photoUrl ? <img src={player.photoUrl} alt="" /> : player?.initials ?? "?"}</span>; }
function TeamBadge({ team }: { team?: Team }) { return <span className="team-badge" style={{ "--team-color": team?.color ?? "#b7f34b" } as React.CSSProperties}>{team?.logoUrl ? <img src={team.logoUrl} alt="" /> : <i>{team?.shortName?.slice(0, 1) ?? "C"}</i>}</span>; }
function TournamentLogo({ tournament }: { tournament?: Tournament }) { return <span className="tournament-logo">{tournament?.logoUrl ? <img src={tournament.logoUrl} alt={`${tournament.name} logo`} /> : <i>◇</i>}</span>; }
function Empty({ text }: { text: string }) { return <div className="empty"><span>◇</span><p>{text}</p></div>; }

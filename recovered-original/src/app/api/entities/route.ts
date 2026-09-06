import { getDb } from "@/db";
import { del } from "@vercel/blob";
import { matchPlayers, matches, players, teams, tournamentScorers, tournamentTeams, tournaments } from "@/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { isCoreCricketAdmin } from "@/app/admin-auth";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function inviteCode(shortName: string) {
  return `${shortName.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4) || "CORE"}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = String(body.type ?? "");
    const db = getDb();
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const teamIdForAction = Number(body.teamId) || 0;
    const teamManager = teamIdForAction ? await canManageTeam(user, teamIdForAction) : false;
    const tournamentIdForAction = Number(body.tournamentId) || 0;
    const tournamentManager = tournamentIdForAction ? await canManageTournament(user, tournamentIdForAction) : false;
    if (!isCoreCricketAdmin(user) && !(["player", "teamPlayer"].includes(type) && teamManager) && !(type === "tournamentScorer" && tournamentManager)) return Response.json({ error: "Captain, tournament creator or administrator access is required" }, { status: 403 });

    if (type === "team") {
      const name = String(body.name ?? "").trim();
      if (!name) return Response.json({ error: "Team name is required" }, { status: 400 });
      const [created] = await db.insert(teams).values({
        name,
        shortName: String(body.shortName ?? initials(name)).trim().toUpperCase().slice(0, 4),
        city: String(body.city ?? "Ontario").trim(),
        color: String(body.color ?? "#b7f34b"),
        logoUrl: String(body.logoUrl ?? "").trim() || null,
        captainName: String(body.captainName ?? "Team captain").trim(),
        inviteCode: inviteCode(String(body.shortName ?? initials(name))),
      }).returning();
      return Response.json({ item: created }, { status: 201 });
    }

    if (type === "player") {
      const name = String(body.name ?? "").trim();
      if (!name) return Response.json({ error: "Player name is required" }, { status: 400 });
      const teamId = Number(body.teamId) || null;
      if (teamId) {
        const [count] = await db.select({ value: sql<number>`count(*)` }).from(players).where(eq(players.teamId, teamId));
        if ((count?.value ?? 0) >= 16) return Response.json({ error: "This team already has the maximum 16 players" }, { status: 409 });
      }
      const [created] = await db.insert(players).values({
        name,
        initials: initials(name),
        teamId,
        role: String(body.role ?? "All-rounder"),
        memberRole: String(body.memberRole ?? "Player"),
        email: String(body.email ?? "").trim().toLowerCase(),
        phone: String(body.phone ?? "").replace(/[^0-9+]/g, ""),
        photoUrl: String(body.photoUrl ?? "").trim() || null,
        profileBio: String(body.profileBio ?? "").trim(),
        battingStyle: String(body.battingStyle ?? "Right hand"),
        bowlingStyle: String(body.bowlingStyle ?? "Right-arm medium"),
      }).returning();
      return Response.json({ item: created }, { status: 201 });
    }

    if (type === "teamPlayer") {
      const teamId = Number(body.teamId); const playerId = Number(body.playerId);
      if (!teamId || !playerId) return Response.json({ error: "Choose a player" }, { status: 400 });
      const [count] = await db.select({ value: sql<number>`count(*)` }).from(players).where(eq(players.teamId, teamId));
      if ((count?.value ?? 0) >= 16) return Response.json({ error: "This team already has the maximum 16 players" }, { status: 409 });
      const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
      if (!player) return Response.json({ error: "Player not found" }, { status: 404 });
      if (player.teamId && player.teamId !== teamId) return Response.json({ error: "This player already belongs to another team" }, { status: 409 });
      const [updated] = await db.update(players).set({ teamId }).where(eq(players.id, playerId)).returning();
      return Response.json({ item: updated });
    }

    if (type === "playerPhoto") {
      const playerId = Number(body.playerId);
      if (!playerId) return Response.json({ error: "Player is required" }, { status: 400 });
      const [updated] = await db.update(players).set({ photoUrl: String(body.photoUrl ?? "").trim() || null }).where(eq(players.id, playerId)).returning();
      if (!updated) return Response.json({ error: "Player not found" }, { status: 404 });
      return Response.json({ item: updated });
    }

    if (type === "tournament") {
      const name = String(body.name ?? "").trim();
      if (!name) return Response.json({ error: "Tournament name is required" }, { status: 400 });
      const tournamentOvers = Math.max(1, Math.min(20, Number.parseInt(String(body.format ?? "20"), 10) || 20));
      const [created] = await db.insert(tournaments).values({
        name,
        format: `${tournamentOvers} over${tournamentOvers === 1 ? "" : "s"}`,
        status: "Upcoming",
        startDate: String(body.startDate ?? new Date().toISOString().slice(0, 10)),
        venue: String(body.venue ?? "Ontario"),
        teamsCount: Number(body.teamsCount) || 0,
        tournamentAdminsCanScore: String(body.tournamentAdminsCanScore ?? "true") !== "false",
        createdByEmail: user.email.trim().toLowerCase(),
        createdByName: (user.fullName || user.displayName).trim(),
      }).returning();
      return Response.json({ item: created }, { status: 201 });
    }

    if (type === "tournamentTeam") {
      const tournamentId = Number(body.tournamentId);
      const teamId = Number(body.teamId);
      if (!tournamentId || !teamId) return Response.json({ error: "Choose a tournament and team" }, { status: 400 });
      const [existing] = await db.select().from(tournamentTeams).where(and(eq(tournamentTeams.tournamentId, tournamentId), eq(tournamentTeams.teamId, teamId))).limit(1);
      if (existing) return Response.json({ error: "This team is already in the tournament" }, { status: 409 });
      const [created] = await db.insert(tournamentTeams).values({ tournamentId, teamId }).returning();
      await db.update(tournaments).set({ teamsCount: sql`${tournaments.teamsCount} + 1` }).where(eq(tournaments.id, tournamentId));
      return Response.json({ item: created }, { status: 201 });
    }

    if (type === "tournamentScorer") {
      const tournamentId = Number(body.tournamentId); const playerId = Number(body.playerId) || null;
      const [profile] = playerId ? await db.select().from(players).where(eq(players.id, playerId)).limit(1) : [];
      const name = String(profile?.name ?? body.name ?? "").trim(); const phone = String(profile?.phone ?? body.phone ?? "").replace(/[^0-9+]/g, ""); const email = String(profile?.email ?? body.email ?? "").trim().toLowerCase();
      if (!tournamentId || !name) return Response.json({ error: "Choose an app profile or enter the scorer's name" }, { status: 400 });
      const [created] = await db.insert(tournamentScorers).values({ tournamentId, playerId, name, email, phone }).returning();
      return Response.json({ item: created }, { status: 201 });
    }

    if (type === "match") {
      const teamAId = Number(body.teamAId);
      const teamBId = Number(body.teamBId);
      if (!teamAId || !teamBId || teamAId === teamBId) return Response.json({ error: "Choose two different teams" }, { status: 400 });
      const [created] = await db.insert(matches).values({
        teamAId,
        teamBId,
        battingTeamId: teamAId,
        bowlingTeamId: teamBId,
        tournamentId: Number(body.tournamentId) || null,
        overs: Math.max(1, Math.min(20, Number(body.overs) || 20)),
        status: "Upcoming",
        venue: String(body.venue ?? "Community Ground"),
        umpireOne: String(body.umpireOne ?? "").trim(),
        umpireTwo: String(body.umpireTwo ?? "").trim(),
      }).returning();
      return Response.json({ item: created }, { status: 201 });
    }

    return Response.json({ error: "Unsupported record type" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save record";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (String(body.type ?? "") !== "team") return Response.json({ error: "Unsupported record type" }, { status: 400 });

    const teamId = Number(body.id);
    if (!teamId) return Response.json({ error: "Choose a team to remove" }, { status: 400 });

    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
    if (!(await canManageTeam(user, teamId))) return Response.json({ error: "Only this team's captain, team admin, or site administrator can remove it" }, { status: 403 });

    const db = getDb();
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return Response.json({ error: "Team not found" }, { status: 404 });

    const [linkedMatch] = await db.select({ id: matches.id }).from(matches).where(or(
      eq(matches.teamAId, teamId),
      eq(matches.teamBId, teamId),
      eq(matches.battingTeamId, teamId),
      eq(matches.bowlingTeamId, teamId),
      eq(matches.tossWinnerTeamId, teamId),
    )).limit(1);
    if (linkedMatch) return Response.json({ error: "This team is already used in a match and cannot be removed. Only unused or duplicate teams can be removed." }, { status: 409 });

    const tournamentLinks = await db.select().from(tournamentTeams).where(eq(tournamentTeams.teamId, teamId));
    await db.delete(matchPlayers).where(eq(matchPlayers.teamId, teamId));
    await db.delete(tournamentTeams).where(eq(tournamentTeams.teamId, teamId));
    await db.update(players).set({ teamId: null }).where(eq(players.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));

    for (const tournamentId of new Set(tournamentLinks.map((link) => link.tournamentId))) {
      await db.update(tournaments).set({ teamsCount: sql`GREATEST(${tournaments.teamsCount} - 1, 0)` }).where(eq(tournaments.id, tournamentId));
    }

    if (team.logoUrl?.includes(".blob.vercel-storage.com")) await del(team.logoUrl).catch(() => undefined);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove team";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function canManageTeam(user: ChatGPTUser, teamId: number) {
  if (isCoreCricketAdmin(user)) return true;
  const name = (user.fullName || user.displayName).trim().toLowerCase();
  const rows = await getDb().select().from(players).where(eq(players.teamId, teamId));
  return rows.some((player) => player.name.trim().toLowerCase() === name && ["captain", "team admin"].includes((player.memberRole || "").toLowerCase()));
}

async function canManageTournament(user: ChatGPTUser, tournamentId: number) {
  if (isCoreCricketAdmin(user)) return true;
  const [tournament] = await getDb().select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) return false;
  const email = user.email.trim().toLowerCase(); const name = (user.fullName || user.displayName).trim().toLowerCase();
  return (tournament.createdByEmail && tournament.createdByEmail.trim().toLowerCase() === email) || tournament.createdByName.trim().toLowerCase() === name;
}

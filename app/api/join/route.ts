import { put } from "@vercel/blob";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { players, teams } from "@/db/schema";

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function findTeam(code: string) {
  const db = getDb();
  const legacy = /^CORE-TEAM-(\d+)$/.exec(code);
  if (legacy) return (await db.select().from(teams).where(eq(teams.id, Number(legacy[1]))).limit(1))[0];
  return (await db.select().from(teams).where(eq(teams.inviteCode, code)).limit(1))[0];
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const team = await findTeam(code);
  if (!team) return Response.json({ error: "This team invitation is invalid" }, { status: 404 });
  const db = getDb(); const [count] = await db.select({ value: sql<number>`count(*)` }).from(players).where(eq(players.teamId, team.id));
  return Response.json({ team: { id: team.id, name: team.name, shortName: team.shortName, logoUrl: team.logoUrl }, playerCount: count?.value ?? 0, spaces: Math.max(0, 16 - (count?.value ?? 0)) });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const value = (key: string) => String(form.get(key) ?? "");
  const file = form.get("image");
  const team = await findTeam(value("code")); const name = value("name").trim();
  if (!team) return Response.json({ error: "This team invitation is invalid" }, { status: 404 });
  if (!name) return Response.json({ error: "Enter your full name" }, { status: 400 });
  if (file instanceof File && file.size && (!allowedImageTypes.has(file.type) || file.size > 5 * 1024 * 1024)) return Response.json({ error: "Use a JPG, PNG, WebP or GIF image up to 5 MB" }, { status: 400 });
  const db = getDb(); const [count] = await db.select({ value: sql<number>`count(*)` }).from(players).where(eq(players.teamId, team.id));
  if ((count?.value ?? 0) >= 16) return Response.json({ error: "This team roster is already full" }, { status: 409 });
  const [duplicate] = await db.select().from(players).where(and(eq(players.teamId, team.id), eq(players.name, name))).limit(1);
  if (duplicate) return Response.json({ error: "A player with this name is already on the team" }, { status: 409 });
  const [created] = await db.insert(players).values({ teamId: team.id, name, initials: initials(name), role: value("role") || "All-rounder", memberRole: "Player", battingStyle: value("battingStyle") || "Right hand", bowlingStyle: value("bowlingStyle") || "Right-arm medium", profileBio: value("profileBio").trim() }).returning();
  let player = created;
  if (file instanceof File && file.size) {
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    let blob: Awaited<ReturnType<typeof put>>;
    try {
      blob = await put(`players/${created.id}/${crypto.randomUUID()}.${extension}`, file, { access: "public", contentType: file.type });
    } catch (error) {
      console.error("[api/join] blob upload failed", { error: error instanceof Error ? error.name : "UnknownError" });
      await db.delete(players).where(eq(players.id, created.id));
      return Response.json({ error: "Photo storage is not connected to Core Cricket. Please connect Vercel Blob and try again." }, { status: 503 });
    }
    const [updated] = await db.update(players).set({ photoUrl: blob.url }).where(eq(players.id, created.id)).returning();
    player = updated;
  }
  return Response.json({ player, team: { name: team.name } }, { status: 201 });
}

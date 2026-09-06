import { del, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { isCoreCricketAdmin } from "@/app/admin-auth";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { players, teams, tournamentSponsors, tournaments } from "@/db/schema";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url?.startsWith("https://")) return new Response("Not found", { status: 404 });
  return Response.redirect(url, 307);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const id = Number(form.get("id"));
  if (!(file instanceof File) || !id || !["player", "team", "tournament", "sponsor"].includes(kind)) return Response.json({ error: "Choose a valid image" }, { status: 400 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
  if (!(await canEditMedia(user, kind, id))) return Response.json({ error: "You do not have permission to change this image" }, { status: 403 });
  if (!allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) return Response.json({ error: "Use a JPG, PNG, WebP or GIF image up to 5 MB" }, { status: 400 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  let blob: Awaited<ReturnType<typeof put>>;
  try {
    // Current Vercel projects authenticate Blob with the deployment's OIDC
    // identity. Older projects continue to use BLOB_READ_WRITE_TOKEN; the SDK
    // supports both, so do not reject a valid OIDC connection here.
    blob = await put(`${kind}s/${id}/${crypto.randomUUID()}.${extension}`, file, { access: "public", contentType: file.type });
  } catch (error) {
    console.error("[api/media] blob upload failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Photo storage is not connected to Core Cricket. Please connect Vercel Blob and try again." }, { status: 503 });
  }
  const url = blob.url;
  const db = getDb();
  if (kind === "player") await db.update(players).set({ photoUrl: url }).where(eq(players.id, id));
  else if (kind === "team") await db.update(teams).set({ logoUrl: url }).where(eq(teams.id, id));
  else if (kind === "tournament") await db.update(tournaments).set({ logoUrl: url }).where(eq(tournaments.id, id));
  else await db.insert(tournamentSponsors).values({ tournamentId: id, name: String(form.get("name") ?? "Sponsor").trim() || "Sponsor", logoUrl: url });
  return Response.json({ url });
}

export async function DELETE(request: Request) {
  const body = await request.json() as { kind?: string; id?: number };
  const db = getDb();
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required" }, { status: 401 });
  const permissionKind = String(body.kind ?? ""); let permissionId = Number(body.id);
  if (permissionKind === "sponsor" && permissionId) {
    const [sponsor] = await db.select().from(tournamentSponsors).where(eq(tournamentSponsors.id, permissionId)).limit(1);
    permissionId = sponsor?.tournamentId ?? 0;
  }
  if (!permissionId || !(await canEditMedia(user, permissionKind, permissionId))) return Response.json({ error: "You do not have permission to change this image" }, { status: 403 });
  let oldUrl: string | null | undefined;
  if (body.kind === "player" && body.id) { const [item] = await db.select().from(players).where(eq(players.id, body.id)).limit(1); oldUrl = item?.photoUrl; await db.update(players).set({ photoUrl: null }).where(eq(players.id, body.id)); }
  else if (body.kind === "team" && body.id) { const [item] = await db.select().from(teams).where(eq(teams.id, body.id)).limit(1); oldUrl = item?.logoUrl; await db.update(teams).set({ logoUrl: null }).where(eq(teams.id, body.id)); }
  else if (body.kind === "tournament" && body.id) { const [item] = await db.select().from(tournaments).where(eq(tournaments.id, body.id)).limit(1); oldUrl = item?.logoUrl; await db.update(tournaments).set({ logoUrl: null }).where(eq(tournaments.id, body.id)); }
  else if (body.kind === "sponsor" && body.id) { const [item] = await db.select().from(tournamentSponsors).where(eq(tournamentSponsors.id, body.id)).limit(1); oldUrl = item?.logoUrl; await db.delete(tournamentSponsors).where(eq(tournamentSponsors.id, body.id)); }
  else return Response.json({ error: "Invalid media target" }, { status: 400 });
  if (oldUrl?.includes(".blob.vercel-storage.com")) await del(oldUrl).catch(() => undefined);
  return Response.json({ ok: true });
}

async function canEditMedia(user: ChatGPTUser, kind: string, id: number) {
  if (isCoreCricketAdmin(user)) return true;
  const db = getDb(); const email = user.email.trim().toLowerCase(); const name = (user.fullName || user.displayName).trim().toLowerCase();
  if (kind === "player") {
    const [player] = await db.select().from(players).where(eq(players.id, id)).limit(1);
    return Boolean(player && ((player.email && player.email.trim().toLowerCase() === email) || player.name.trim().toLowerCase() === name));
  }
  if (kind === "team") {
    const roster = await db.select().from(players).where(eq(players.teamId, id));
    return roster.some((player) => player.name.trim().toLowerCase() === name && ["captain", "team admin"].includes((player.memberRole || "").toLowerCase()));
  }
  if (kind === "tournament" || kind === "sponsor") {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    return Boolean(tournament && ((tournament.createdByEmail && tournament.createdByEmail.trim().toLowerCase() === email) || tournament.createdByName.trim().toLowerCase() === name));
  }
  return false;
}

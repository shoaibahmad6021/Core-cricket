import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { liveSessions } from "@/db/schema";

export async function PUT(request: Request) {
  const form = await request.formData(); const token = String(form.get("token") ?? ""); const publishKey = String(form.get("publishKey") ?? ""); const frame = form.get("frame");
  const [session] = token ? await getDb().select().from(liveSessions).where(eq(liveSessions.token, token)).limit(1) : [];
  if (!session || !session.active || !publishKey || session.publishKey !== publishKey) return Response.json({ error: "Broadcast is not authorized" }, { status: 403 });
  if (!(frame instanceof File) || !["image/jpeg", "image/webp"].includes(frame.type) || frame.size > 700 * 1024) return Response.json({ error: "Invalid camera frame" }, { status: 400 });
  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(`live/${token}/latest.jpg`, frame, { access: "public", contentType: frame.type, addRandomSuffix: false, allowOverwrite: true });
  } catch (error) {
    console.error("[api/live/frame] blob upload failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Live storage is not connected" }, { status: 503 });
  }
  await getDb().update(liveSessions).set({ frameUrl: blob.url }).where(eq(liveSessions.id, session.id));
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const [session] = token ? await getDb().select().from(liveSessions).where(eq(liveSessions.token, token)).limit(1) : [];
  if (!session || !session.active) return new Response("Stream ended", { status: 404 });
  if (!session.frameUrl) return new Response("Waiting for camera", { status: 404 });
  const response = await fetch(session.frameUrl, { cache: "no-store" });
  if (!response.ok || !response.body) return new Response("Waiting for camera", { status: 404 });
  return new Response(response.body, { headers: { "content-type": response.headers.get("content-type") || "image/jpeg", "cache-control": "no-store, max-age=0", "access-control-allow-origin": "*" } });
}

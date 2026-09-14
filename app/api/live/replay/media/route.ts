import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { liveReplayCache } from "@/db/live-replay-cache-schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const sequence = Number(url.searchParams.get("sequence") ?? 0);
  if (!token) return new Response("Not found", { status: 404 });

  const db = getDb();
  const [item] = await db.select().from(liveReplayCache).where(eq(liveReplayCache.token, token)).limit(1);
  if (!item || (sequence && item.sequence !== sequence)) return new Response("Replay unavailable", { status: 404 });

  const bytes = Buffer.from(item.dataBase64, "base64");
  return new Response(bytes, {
    headers: {
      "content-type": item.contentType || "video/webm",
      "content-length": String(bytes.length),
      "cache-control": "no-store, max-age=0",
      "accept-ranges": "none",
    },
  });
}

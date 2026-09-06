import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

function classifyDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "").toUpperCase()
    : "";
  if (message.includes("database connection is not configured") || message.includes("database_url is not configured")) return "database_url_missing";
  if (message.includes("expected pattern") || message.includes("invalid url") || message.includes("connection string") || message.includes("fetch failed")) return "database_url_invalid";
  if (code === "28P01" || message.includes("authentication failed") || message.includes("password authentication failed")) return "database_credentials_invalid";
  if (code === "3D000" || message.includes("database") && message.includes("does not exist")) return "database_name_invalid";
  if (code === "42P01" || message.includes("relation") && message.includes("does not exist") || message.includes("undefined_table")) return "tables_missing";
  if (code === "57P03" || message.includes("endpoint is disabled") || message.includes("endpoint is suspended")) return "database_suspended";
  return "database_unreachable";
}

export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    try {
      await db.execute(sql`select 1 from app_users limit 1`);
    } catch (error) {
      const database = classifyDatabaseError(error);
      if (database !== "tables_missing") throw error;
      console.error("[api/health] database schema missing", { database });
      return Response.json({ ok: false, database }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    return Response.json({ ok: true, database: "ready" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const database = classifyDatabaseError(error);
    console.error("[api/health] database check failed", { database });
    return Response.json({ ok: false, database }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { createSession, hashPassword, normalizePhone } from "@/app/chatgpt-auth";

const SITE_ADMIN_PHONE = "6477796021";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; phone?: string; email?: string; password?: string };
    const displayName = String(body.name ?? "").trim();
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");
    if (displayName.length < 2) return Response.json({ error: "Enter your full name" }, { status: 400 });
    if (phone.length !== 10) return Response.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Password must contain at least 8 characters" }, { status: 400 });
    const [existing] = await getDb().select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.phone, phone)).limit(1);
    if (existing) return Response.json({ error: "This phone number already has a Core Cricket profile" }, { status: 409 });
    const [created] = await getDb().insert(appUsers).values({ displayName, phone, email: String(body.email ?? "").trim().toLowerCase(), passwordHash: await hashPassword(password), isSiteAdmin: phone === SITE_ADMIN_PHONE }).returning({ id: appUsers.id });
    await createSession(created.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/register] failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Core Cricket database is not available. Please contact the app administrator." }, { status: 503 });
  }
}

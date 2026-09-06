import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { createSession, normalizePhone, verifyPassword } from "@/app/chatgpt-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { phone?: string; password?: string };
    const phone = normalizePhone(String(body.phone ?? ""));
    const [user] = phone ? await getDb().select().from(appUsers).where(eq(appUsers.phone, phone)).limit(1) : [];
    if (!user || !(await verifyPassword(String(body.password ?? ""), user.passwordHash))) return Response.json({ error: "Phone number or password is incorrect" }, { status: 401 });
    await createSession(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/login] failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Core Cricket database is not available. Please contact the app administrator." }, { status: 503 });
  }
}

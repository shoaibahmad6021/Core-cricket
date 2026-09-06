import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { appSessions, appUsers } from "@/db/schema";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "core_cricket_session";
const SESSION_DAYS = 30;

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  userId: string | null;
  phone: string;
  isSiteAdmin: boolean;
};

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await getDb().insert(appSessions).values({ tokenHash: tokenHash(token), userId, expiresAt: expiresAt.toISOString() });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(appSessions).where(eq(appSessions.tokenHash, tokenHash(token)));
  cookieStore.delete(SESSION_COOKIE);
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb().select({ user: appUsers }).from(appSessions).innerJoin(appUsers, eq(appSessions.userId, appUsers.id)).where(and(eq(appSessions.tokenHash, tokenHash(token)), gt(appSessions.expiresAt, new Date().toISOString()))).limit(1);
  if (!row) return null;
  return { displayName: row.user.displayName, email: row.user.email || `${row.user.phone}@corecricket.app`, fullName: row.user.displayName, userId: String(row.user.id), phone: row.user.phone, isSiteAdmin: row.user.isSiteAdmin };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

export function chatGPTSignInPath(returnTo: string) { return `/login?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`; }
export function chatGPTSignOutPath(returnTo = "/") { return `/api/auth/logout?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`; }

function safeRelativeReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try { const url = new URL(value, "https://app.local"); return url.origin === "https://app.local" ? `${url.pathname}${url.search}${url.hash}` : "/"; }
  catch { return "/"; }
}

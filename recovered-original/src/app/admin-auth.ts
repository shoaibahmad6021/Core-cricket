import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";

const ADMIN_EMAILS = new Set([
  "shoaib.ahmad81@yahoo.com",
  "shoaib.ahmad6021@gmail.com",
]);

export type CoreCricketUser = {
  displayName: string;
  email: string;
  initials: string;
  role: "Administrator" | "Viewer";
  isAdmin: boolean;
};

export function isCoreCricketAdmin(user: ChatGPTUser | null): boolean {
  return Boolean(
    user &&
      (user.isSiteAdmin ||
        ADMIN_EMAILS.has(user.email.trim().toLowerCase())),
  );
}

export function toCoreCricketUser(user: ChatGPTUser): CoreCricketUser {
  const isAdmin = isCoreCricketAdmin(user);
  const displayName = user.fullName?.trim() || (isAdmin ? "Shoaib Ahmad" : user.displayName);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return {
    displayName,
    email: user.email,
    initials: initials || "CC",
    role: isAdmin ? "Administrator" : "Viewer",
    isAdmin,
  };
}

export async function requireAdminApi(): Promise<Response | null> {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "Sign in is required" }, { status: 401 });
  }
  if (!isCoreCricketAdmin(user)) {
    return Response.json({ error: "Administrator access is required" }, { status: 403 });
  }
  return null;
}

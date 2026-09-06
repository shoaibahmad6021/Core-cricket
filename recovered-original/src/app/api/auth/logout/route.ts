import { clearSession } from "@/app/chatgpt-auth";

export async function GET(request: Request) {
  await clearSession();
  const returnTo = new URL(request.url).searchParams.get("return_to");
  const safe = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/login";
  return Response.redirect(new URL(safe, request.url));
}

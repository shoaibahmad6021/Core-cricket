import { CoreCricketApp } from "@/components/core-cricket-app";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { toCoreCricketUser } from "@/app/admin-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (process.env.NODE_ENV === "development") {
    return <CoreCricketApp user={{ displayName: "Shoaib Ahmad", email: "shoaib.ahmad6021@gmail.com", initials: "SA", role: "Administrator", isAdmin: true }} />;
  }
  const authenticatedUser = await requireChatGPTUser("/");
  return <CoreCricketApp user={toCoreCricketUser(authenticatedUser)} />;
}

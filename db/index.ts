import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabaseUrl() {
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL,
  ].filter((value): value is string => Boolean(value?.trim()));

  const databaseUrl = candidates.find((value) => /^postgres(?:ql)?:\/\//i.test(value.trim()));
  if (databaseUrl) return databaseUrl.trim();
  if (candidates.length) throw new Error("Database connection string is invalid.");
  throw new Error("Database connection is not configured in Vercel.");
}

export function getDb() {
  if (database) return database;
  const databaseUrl = getDatabaseUrl();
  database = drizzle(neon(databaseUrl), { schema });
  return database;
}

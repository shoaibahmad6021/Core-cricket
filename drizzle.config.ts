import { defineConfig } from "drizzle-kit";

const candidates = [
  process.env.POSTGRES_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.NEON_DATABASE_URL,
  process.env.DATABASE_URL,
].filter((value): value is string => Boolean(value?.trim()));

const databaseUrl = candidates.find((value) => /^postgres(?:ql)?:\/\//i.test(value.trim()));

if (!databaseUrl) {
  throw new Error(candidates.length
    ? "A database variable exists, but it is not a valid PostgreSQL connection URL."
    : "No PostgreSQL connection URL is configured.");
}

export default defineConfig({
  out: "./drizzle-postgres",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});

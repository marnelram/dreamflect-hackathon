import { betterAuth } from "better-auth";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set in .env.local");
}

/**
 * Better Auth instance for Dreamflect.
 *
 * Email + password only — no social, no magic links for v1. Better Auth
 * provisions four tables (user / session / account / verification) via its
 * CLI generator; the session+account tables back this instance and our own
 * `dream_sessions` table FK's into `user.id`.
 *
 * Uses node-postgres `Pool` against the Neon TCP endpoint. The auth route
 * runs on Node (better-auth needs Node, not edge).
 */
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;

import { neon, neonConfig } from "@neondatabase/serverless";

// Cache the SQL function across HMR reloads in dev — avoids "too many connections"
// from Next.js's dev-server module re-evaluation.
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

/** Tagged-template SQL client. Use as `await sql\`select * from foo where id = ${id}\`` — values are parameterized. */
export const sql = neon(process.env.DATABASE_URL);

// ─── Domain types ──────────────────────────────────────────────────

import type {
  ArchetypeSpec,
  GapFillSpec,
  InterpretSpec,
  ProbeSpec,
  TakeawaySpec,
} from "@/lib/types";

export type DreamSessionRow = {
  id: string;
  user_id: string;
  kind: "morning" | "evening";
  parent_session_id: string | null;
  dream_text: string;
  gap_fill: GapFillSpec | null;
  archetype: ArchetypeSpec | null;
  probe: ProbeSpec | null;
  interpret: InterpretSpec | null;
  takeaway: TakeawaySpec | null;
  resonance: string | null;
  image_b64: string | null;
  image_status: "pending" | "ready" | "failed" | null;
  created_at: string;
};

export type SaveSessionInput = {
  userId: string;
  kind: "morning" | "evening";
  parentSessionId?: string | null;
  dreamText: string;
  gapFill?: GapFillSpec | null;
  archetype?: ArchetypeSpec | null;
  probe?: ProbeSpec | null;
  interpret?: InterpretSpec | null;
  takeaway?: TakeawaySpec | null;
  resonance?: string | null;
};

/** Insert a completed session. Returns the new row's id. */
export async function saveSession(input: SaveSessionInput): Promise<string> {
  const rows = (await sql`
    INSERT INTO dream_sessions (
      user_id, kind, parent_session_id, dream_text,
      gap_fill, archetype, probe, interpret, takeaway, resonance,
      image_status
    ) VALUES (
      ${input.userId}, ${input.kind}, ${input.parentSessionId ?? null}, ${input.dreamText},
      ${input.gapFill as unknown as string ?? null}::jsonb,
      ${input.archetype as unknown as string ?? null}::jsonb,
      ${input.probe as unknown as string ?? null}::jsonb,
      ${input.interpret as unknown as string ?? null}::jsonb,
      ${input.takeaway as unknown as string ?? null}::jsonb,
      ${input.resonance ?? null},
      'pending'
    )
    RETURNING id
  `) as { id: string }[];
  return rows[0].id;
}

/** Most recent N morning sessions for this user, newest first. Used for prior-dream context. */
export async function getPriorSessions(userId: string, limit = 5): Promise<DreamSessionRow[]> {
  const rows = (await sql`
    SELECT * FROM dream_sessions
    WHERE user_id = ${userId} AND kind = 'morning'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as DreamSessionRow[];
  return rows;
}

/** All sessions for the history page, newest first. */
export async function getAllSessions(userId: string, limit = 50): Promise<DreamSessionRow[]> {
  const rows = (await sql`
    SELECT * FROM dream_sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as DreamSessionRow[];
  return rows;
}

/** Latest morning session — used by the evening reflection to reference the morning's takeaway. */
export async function getLatestMorning(userId: string): Promise<DreamSessionRow | null> {
  const rows = (await sql`
    SELECT * FROM dream_sessions
    WHERE user_id = ${userId} AND kind = 'morning'
    ORDER BY created_at DESC
    LIMIT 1
  `) as DreamSessionRow[];
  return rows[0] ?? null;
}

/** Single session by id. Used by share-image routes — public read is OK because UUIDs are unguessable. */
export async function getSessionById(id: string): Promise<DreamSessionRow | null> {
  const rows = (await sql`
    SELECT * FROM dream_sessions
    WHERE id = ${id}
    LIMIT 1
  `) as DreamSessionRow[];
  return rows[0] ?? null;
}

/** Update the image fields after gpt-image-1 returns. */
export async function setSessionImage(
  id: string,
  imageB64: string | null,
  status: "ready" | "failed"
): Promise<void> {
  await sql`
    UPDATE dream_sessions
    SET image_b64 = ${imageB64}, image_status = ${status}
    WHERE id = ${id}
  `;
}

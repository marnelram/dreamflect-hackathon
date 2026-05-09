import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * Serve the raw AI dream image (no typography overlay) for the in-screen
 * takeaway preview. Distinct from /api/takeaway-og/* — those bake the
 * question text on top for share/wallpaper use; this one is the bare
 * gpt-image-1 PNG that fades into the takeaway card.
 *
 * Returns 202 while still generating, 404 if the row is missing or failed.
 * Public read is OK because UUIDs are unguessable (same convention as the
 * OG share routes), which avoids touching Better Auth from this edge route.
 */
export const runtime = "edge";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  image_b64: string | null;
  image_status: "pending" | "ready" | "failed" | null;
};

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const sql = neon(process.env.DATABASE_URL!);
  const rows = (await sql`
    SELECT image_b64, image_status
    FROM dream_sessions
    WHERE id = ${id}
    LIMIT 1
  `) as Row[];
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (row.image_status === "failed") {
    return NextResponse.json({ error: "failed" }, { status: 410 });
  }
  if (row.image_status !== "ready" || !row.image_b64) {
    // 202 = accepted/processing — the client polls /status separately.
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }
  const bytes = Uint8Array.from(atob(row.image_b64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

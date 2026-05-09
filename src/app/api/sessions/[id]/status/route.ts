import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionById } from "@/lib/db";

/**
 * Lightweight polling endpoint for the share-image generation.
 * Returns just `{ status: 'pending' | 'ready' | 'failed' | null }` — never the
 * b64 payload (the OG routes serve the actual image).
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await getSessionById(id);
  if (!row || row.user_id !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ status: row.image_status });
};

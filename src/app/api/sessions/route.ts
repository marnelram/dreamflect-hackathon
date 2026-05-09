import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { saveSession } from "@/lib/db";
import { generateAndStoreDreamImage } from "@/lib/dream-image";

const SaveSchema = z.object({
  kind: z.enum(["morning", "evening"]),
  parent_session_id: z.string().uuid().nullable().optional(),
  dream_text: z.string().min(1).max(20_000),
  gap_fill: z.unknown().nullable().optional(),
  archetype: z.unknown().nullable().optional(),
  probe: z.unknown().nullable().optional(),
  interpret: z.unknown().nullable().optional(),
  takeaway: z.unknown().nullable().optional(),
  resonance: z.string().nullable().optional(),
});

/**
 * Persist a completed dream session. Auth-required (middleware enforces).
 *
 * Side effect: kicks off a non-blocking GPT Image generation for the takeaway —
 * by the time the user clicks "share", the image is usually ready.
 */
export const POST = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const id = await saveSession({
    userId,
    kind: parsed.data.kind,
    parentSessionId: parsed.data.parent_session_id ?? null,
    dreamText: parsed.data.dream_text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapFill: (parsed.data.gap_fill ?? null) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    archetype: (parsed.data.archetype ?? null) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    probe: (parsed.data.probe ?? null) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interpret: (parsed.data.interpret ?? null) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    takeaway: (parsed.data.takeaway ?? null) as any,
    resonance: parsed.data.resonance ?? null,
  });

  // Fire-and-forget image generation. The route returns immediately; the
  // image lands in the dream_sessions row when gpt-image-1 returns.
  // Errors are logged inside the helper and stored as image_status='failed'.
  void generateAndStoreDreamImage(id, {
    archetype: (parsed.data.archetype ?? null) as { name?: string; description?: string } | null,
    takeaway: (parsed.data.takeaway ?? null) as { question?: string; evening_line?: string } | null,
  });

  return NextResponse.json({ id });
};

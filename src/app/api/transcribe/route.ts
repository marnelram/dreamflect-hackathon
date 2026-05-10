import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs"; // multipart parsing — needs Node, not edge

const MAX_BYTES = 25 * 1024 * 1024; // Whisper API limit

/**
 * Whisper transcription endpoint. Accepts multipart/form-data with an `audio`
 * field (the Blob from useAudioRecorder). Returns { text }.
 *
 * Public — anonymous users run the full dream ritual end-to-end. The save
 * gate at /api/sessions is what requires an account.
 */
export const POST = async (req: NextRequest) => {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      { error: "voice transcription is unavailable (OPENAI_API_KEY not set)" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing audio field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "audio too long (>25MB)" }, { status: 413 });
  }

  console.info("[transcribe] received", {
    size: file.size,
    type: file.type,
    name: file.name,
  });

  try {
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });
    return NextResponse.json({ text: result.text });
  } catch (err) {
    console.error("[transcribe] failed", err);
    // Echo the real reason so the client can show it instead of a generic message.
    const message =
      err instanceof Error ? err.message : "transcription failed";
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? ((err as { status: number }).status)
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
};

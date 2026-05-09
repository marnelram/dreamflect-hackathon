import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

// 1170×2532 is iPhone 14 Pro lock-screen — bumped to 2632 for safe-area headroom.
const W = 1170;
const H = 2632;

const FONT_URL =
  "https://fonts.gstatic.com/s/fraunces/v40/6NUq8FuMKwSp4OvIfg6kSTalcQQzz9Wg7v6XUzpFDRgTxNZ4.woff";

let cachedFont: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer | null> {
  if (cachedFont) return cachedFont;
  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) return null;
    cachedFont = await res.arrayBuffer();
    return cachedFont;
  } catch {
    return null;
  }
}

type Row = {
  takeaway: { question?: string; evening_line?: string } | null;
  image_b64: string | null;
  image_status: string | null;
};

// UUIDv4 with hyphens. Used to distinguish a real session id from the
// "inline" sentinel (which routes to query-param mode for unsaved sessions).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadSession(id: string): Promise<Row | null> {
  if (!UUID_RE.test(id)) return null;
  const sql = neon(process.env.DATABASE_URL!);
  const rows = (await sql`
    SELECT takeaway, image_b64, image_status
    FROM dream_sessions
    WHERE id = ${id}
    LIMIT 1
  `) as Row[];
  return rows[0] ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const inlineQ = url.searchParams.get("q");

  // Two modes:
  //   /portrait/<uuid>          → load the saved session (with AI image when ready)
  //   /portrait/inline?q=...    → render typography-only over a gradient (no DB hit)
  // The inline path keeps wallpaper working even if the session save failed.
  const row =
    id === "inline"
      ? null
      : await loadSession(id);

  if (!row && !inlineQ) {
    return new Response("not found", { status: 404 });
  }

  const question =
    row?.takeaway?.question ??
    inlineQ ??
    "where am I outmatched, but not actually stuck?";

  const fontData = await loadFont();
  const hasImage = row?.image_status === "ready" && row.image_b64;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f1320",
          color: "#eae5d5",
          position: "relative",
        }}
      >
        {hasImage ? (
          // GPT Image background — full-bleed.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${row.image_b64}`}
            alt=""
            width={W}
            height={H}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          // Fallback: cream/dusk gradient when image isn't ready.
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#0f1320",
              backgroundImage:
                "radial-gradient(circle at 30% 25%, rgba(226,122,74,0.25), transparent 55%), radial-gradient(circle at 70% 75%, rgba(140,176,255,0.25), transparent 55%)",
            }}
          />
        )}

        {/* Soft overlay so text always reads */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to bottom, rgba(15,19,32,0.55) 0%, rgba(15,19,32,0.15) 35%, rgba(15,19,32,0.0) 60%, rgba(15,19,32,0.5) 100%)",
          }}
        />

        {/* Question text — upper third, italic serif */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            padding: "260px 100px 0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontSize: 110,
              lineHeight: 1.1,
              letterSpacing: -2,
              color: "#eae5d5",
              margin: 0,
              textShadow: "0 4px 24px rgba(15,19,32,0.6)",
            }}
          >
            {question}
          </p>
        </div>

        {/* Bottom wordmark */}
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "rgba(234,229,213,0.55)",
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          dreamflect
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fontData
        ? [{ name: "Fraunces", data: fontData, style: "italic", weight: 400 }]
        : undefined,
    }
  );
}

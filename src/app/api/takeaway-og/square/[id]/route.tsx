import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

// Instagram feed square — 1:1 at the platform's exact recommended pixel size.
// Posts at 1080×1080 don't get rescaled by Instagram's CDN.
const W = 1080;
const H = 1080;

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
  archetype: { name?: string } | null;
  created_at: string;
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
    SELECT takeaway, archetype, created_at, image_b64, image_status
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
  const inlineArchetype = url.searchParams.get("archetype");

  // Two modes:
  //   /square/<uuid>           → load the saved session (AI image when ready)
  //   /square/inline?q=...     → typography-only over a gradient (no DB hit)
  // The inline path keeps share working even if the session save failed.
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
  const archetypeName = row?.archetype?.name ?? inlineArchetype ?? "";
  const dateLabel = new Date(row?.created_at ?? Date.now())
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toLowerCase();

  const subtitle = archetypeName
    ? `${archetypeName} · ${dateLabel}`
    : dateLabel;

  const fontData = await loadFont();
  const hasImage = row?.image_status === "ready" && row.image_b64;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          backgroundColor: "#0f1320",
          color: "#eae5d5",
          position: "relative",
        }}
      >
        {hasImage ? (
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
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#0f1320",
              backgroundImage:
                "radial-gradient(circle at 30% 25%, rgba(226,122,74,0.28), transparent 55%), radial-gradient(circle at 70% 75%, rgba(140,176,255,0.28), transparent 55%)",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to bottom, rgba(15,19,32,0.4) 0%, rgba(15,19,32,0.1) 40%, rgba(15,19,32,0.6) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: W,
            padding: "90px 100px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "rgba(234,229,213,0.65)",
              margin: 0,
              marginBottom: 36,
            }}
          >
            dreamflect
          </p>
          <p
            style={{
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontSize: 68,
              lineHeight: 1.12,
              letterSpacing: -1.4,
              color: "#eae5d5",
              margin: 0,
              textShadow: "0 4px 18px rgba(15,19,32,0.7)",
            }}
          >
            {question}
          </p>
          {subtitle && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 20,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "rgba(234,229,213,0.55)",
                marginTop: 44,
              }}
            >
              {subtitle}
            </p>
          )}
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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllSessions } from "@/lib/db";
import { journalFilename, sessionsToMarkdown } from "@/lib/journal-export";

/**
 * Download the signed-in user's dreams as a single Markdown journal.
 * Auth-required (middleware enforces `/api/sessions/*`; we re-check here for
 * the user id). Returns an attachment so a plain `<a download>` triggers a
 * file save without any client JS.
 */
export const GET = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Match the history page's window — newest 50 sessions.
  const rows = await getAllSessions(userId, 50);
  const markdown = sessionsToMarkdown(rows);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${journalFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
};

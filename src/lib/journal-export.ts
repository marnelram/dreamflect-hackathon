import type { DreamSessionRow } from "@/lib/db";

/**
 * Render a user's saved dream sessions as a single Markdown journal.
 *
 * This is the "Export / journal compilation" feature from the design-doc's
 * Future Exploration list: it lets someone walk away with their dreams in a
 * portable, human-readable file rather than locking them inside the app.
 *
 * Sessions are expected newest-first (as `getAllSessions` returns them); we
 * emit them oldest-first so the journal reads chronologically.
 */
export function sessionsToMarkdown(rows: DreamSessionRow[]): string {
  const ordered = [...rows].reverse();

  const lines: string[] = [];
  lines.push("# Dreamflect — dream journal");
  lines.push("");
  lines.push(
    `_Exported ${formatDate(new Date().toISOString())} · ${ordered.length} ${
      ordered.length === 1 ? "dream" : "dreams"
    }._`
  );
  lines.push("");

  if (ordered.length === 0) {
    lines.push("No dreams yet. Your first reflection will appear here.");
    lines.push("");
    return lines.join("\n");
  }

  for (const row of ordered) {
    lines.push("---");
    lines.push("");

    const heading = formatDate(row.created_at);
    const kindLabel = row.kind === "evening" ? " · evening reflection" : "";
    lines.push(`## ${heading}${kindLabel}`);
    lines.push("");

    if (row.archetype?.name) {
      const tag = row.archetype.secondary_tag ? ` (${row.archetype.secondary_tag})` : "";
      lines.push(`**Archetype:** ${row.archetype.name}${tag}`);
      lines.push("");
    }

    lines.push("> " + row.dream_text.trim().split("\n").join("\n> "));
    lines.push("");

    if (row.probe?.question) {
      lines.push(`**Probe.** ${row.probe.question}`);
      lines.push("");
    }

    if (row.interpret?.quote) {
      lines.push(`**Frame.** ${row.interpret.quote}`);
      lines.push("");
    }

    if (row.takeaway?.question) {
      lines.push(`**Question to carry.** ${row.takeaway.question}`);
      lines.push("");
    }

    if (row.takeaway?.evening_line) {
      lines.push(`**Evening line.** ${row.takeaway.evening_line}`);
      lines.push("");
    }

    if (row.resonance) {
      lines.push(`**Resonance.** ${row.resonance}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/** A filesystem-safe filename for the exported journal, dated to today. */
export function journalFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `dreamflect-journal-${stamp}.md`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

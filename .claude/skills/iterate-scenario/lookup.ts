/**
 * Parses clinicalBackground markdown into searchable sections by heading.
 * Used by student personas to simulate the "book popup" lookup in-scenario.
 */

export interface Section {
  heading: string;
  level: number;
  path: string[];
  body: string;
}

export function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  const stack: { heading: string; level: number }[] = [];
  let current: Section | null = null;

  const flush = () => {
    if (current) {
      current.body = current.body.trim();
      sections.push(current);
    }
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match) {
      flush();
      const level = match[1].length;
      const heading = match[2].trim();
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ heading, level });
      current = {
        heading,
        level,
        path: stack.map((s) => s.heading),
        body: "",
      };
    } else if (current) {
      current.body += line + "\n";
    } else {
      current = { heading: "_preamble", level: 0, path: [], body: line + "\n" };
    }
  }
  flush();
  return sections.filter((s) => s.body.length > 0 || s.heading !== "_preamble");
}

/**
 * Scores a section against a query using keyword overlap.
 * Heading matches weigh higher than body matches.
 */
function score(section: Section, tokens: string[]): number {
  const hay = (
    section.heading.toLowerCase() +
    " " +
    section.path.join(" ").toLowerCase() +
    " " +
    section.body.toLowerCase()
  );
  const headingHay = (section.heading + " " + section.path.join(" ")).toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (headingHay.includes(t)) s += 5;
    const matches = hay.split(t).length - 1;
    s += matches;
  }
  return s;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "what",
  "when",
  "where",
  "how",
  "why",
  "which",
  "are",
  "can",
  "should",
  "would",
  "about",
  "into",
]);

export interface LookupResult {
  query: string;
  hit: boolean;
  section?: { heading: string; path: string[]; body: string };
  score: number;
}

export function lookup(query: string, sections: Section[]): LookupResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { query, hit: false, score: 0 };
  let best: { section: Section; score: number } | null = null;
  for (const section of sections) {
    const s = score(section, tokens);
    if (!best || s > best.score) best = { section, score: s };
  }
  if (!best || best.score < 2) return { query, hit: false, score: best?.score ?? 0 };
  return {
    query,
    hit: true,
    score: best.score,
    section: {
      heading: best.section.heading,
      path: best.section.path,
      body: best.section.body.slice(0, 1200),
    },
  };
}

/**
 * Detectors for scenario bugs. Single-layer design:
 *  - Regex/heuristic pre-filters surface candidates with full surrounding
 *    context. Candidates are emitted as-is into the manifest.
 *
 * Judgment (confirming vs rejecting) happens in Claude after the run, by
 * reading the manifest directly. The harness no longer runs an LLM
 * adjudicator stage — that work is now Claude's job.
 *
 * A per-scenario allowlist.json can suppress confirmed false positives.
 */

import crypto from "crypto";

export type Tier = "critical" | "advisory";

export interface Candidate {
  detectorId: string;
  tier: Tier;
  rule: string;
  turnIndex: number;
  snippet: string;
  fullTurn: string;
  prior: string;
  personaId: string;
  trialIndex: number;
  meta?: Record<string, unknown>;
}

export interface Finding extends Candidate {
  /**
   * Always "raw" now — Claude reads the manifest and decides confirmed/rejected.
   * The "skipped" state is reserved for allowlisted patterns.
   */
  adjudicated: "raw" | "skipped";
  adjudicationReason?: string;
  patternHash: string;
}

export interface Allowlist {
  entries: { detectorId: string; patternHash: string; reason?: string }[];
}

export function emptyAllowlist(): Allowlist {
  return { entries: [] };
}

export function patternHash(detectorId: string, snippet: string): string {
  return crypto
    .createHash("sha1")
    .update(detectorId + "::" + snippet.trim().toLowerCase())
    .digest("hex")
    .slice(0, 12);
}

function isAllowlisted(cand: Candidate, allowlist: Allowlist): boolean {
  const h = patternHash(cand.detectorId, cand.snippet);
  return allowlist.entries.some(
    (e) => e.detectorId === cand.detectorId && e.patternHash === h,
  );
}

// ─── Regex / heuristic pre-filters ─────────────────────────────────────────

export interface TurnInput {
  personaId: string;
  trialIndex: number;
  turnIndex: number;
  role: "assistant" | "user";
  text: string;
  priorAssistantText: string;
  startingMessageLength: number;
}

/**
 * Patient speaks in third person about themselves (e.g. "said the mother")
 * when the patient IS a parent describing their child, which is valid —
 * Claude filters those cases when reading the manifest.
 */
function detectMultiSpeaker(t: TurnInput): Candidate | null {
  if (t.role !== "assistant") return null;
  const rx =
    /\b(said|told|mentioned|asked|replied)\s+(the|my)\s+(mother|father|mom|dad|doctor|nurse|pharmacist|husband|wife)\b/i;
  const m = t.text.match(rx);
  if (!m) return null;
  return {
    detectorId: "multi-speaker",
    tier: "critical",
    rule: "Patient turn contains third-party speech attribution suggesting multiple speakers are narrated.",
    turnIndex: t.turnIndex,
    snippet: m[0],
    fullTurn: t.text,
    prior: t.priorAssistantText,
    personaId: t.personaId,
    trialIndex: t.trialIndex,
  };
}

/**
 * Patient SAYS a lab-grade decimal temperature reading aloud (e.g. "it read
 * 101.2°F"). Realistic parents usually say "about 101" or "feels hot." If the
 * precision appears in a *stage direction* (e.g. "*shows the thermometer
 * reading 101.2°F*"), that's fine — the student can see the thermometer.
 *
 * Detector only checks text inside double-quoted dialogue chunks, so stage
 * directions are excluded.
 */
function detectClinicalPrecisionTell(t: TurnInput): Candidate | null {
  if (t.role !== "assistant") return null;
  // Extract dialogue chunks (text inside double quotes), then strip any
  // *stage direction* segments that may be nested inside (e.g. "speech...
  // *checks the thermometer reading — 100.8°F* ...more speech"). What's left
  // is what the patient actually SAID aloud.
  const dialogueChunks = (t.text.match(/"[^"]+"/g) || [])
    .map((chunk) => chunk.replace(/\*[^*]*\*/g, " "))
    .join(" ");
  if (!dialogueChunks) return null;
  const rx = /\b\d{2,3}\.\d\s?°?\s?[FC]\b/;
  const m = dialogueChunks.match(rx);
  if (!m) return null;
  return {
    detectorId: "clinical-precision-tell",
    tier: "critical",
    rule: "Patient said a lab-grade decimal temperature reading aloud in dialogue (e.g. 101.2°F). Real patients usually say 'about 101' or 'feels hot' — clinical precision belongs in stage directions (e.g. *shows the thermometer reading 101.2°F*), not in spoken dialogue.",
    turnIndex: t.turnIndex,
    snippet: m[0],
    fullTurn: t.text,
    prior: t.priorAssistantText,
    personaId: t.personaId,
    trialIndex: t.trialIndex,
  };
}

/**
 * Patient over-shares on turn 1 — so long it could displace student agency.
 * Flags if starting-message length is exceeded by a large factor.
 */
function detectTurn1Overshare(
  t: TurnInput,
  assistantTurnCount: number,
): Candidate | null {
  if (t.role !== "assistant") return null;
  if (assistantTurnCount !== 1) return null;
  if (t.text.length < t.startingMessageLength * 1.75) return null;
  return {
    detectorId: "turn-1-overshare",
    tier: "critical",
    rule: "Patient's first reply is substantially longer than the scenario's startingMessage, suggesting the patient is over-sharing before the student has asked questions.",
    turnIndex: t.turnIndex,
    snippet: t.text.slice(0, 240),
    fullTurn: t.text,
    prior: t.priorAssistantText,
    personaId: t.personaId,
    trialIndex: t.trialIndex,
    meta: { turnLen: t.text.length, startLen: t.startingMessageLength },
  };
}

/**
 * Patient asks more than one question in a single turn — violates the
 * formatting prompt's "only ask ONE question at a time" rule.
 */
function detectMultipleQuestions(t: TurnInput): Candidate | null {
  if (t.role !== "assistant") return null;
  const qmarks = (t.text.match(/\?/g) || []).length;
  if (qmarks < 2) return null;
  return {
    detectorId: "multiple-questions",
    tier: "advisory",
    rule: "Patient asked more than one question in a single turn (formatting rule: one question at a time).",
    turnIndex: t.turnIndex,
    snippet: t.text.slice(0, 240),
    fullTurn: t.text,
    prior: t.priorAssistantText,
    personaId: t.personaId,
    trialIndex: t.trialIndex,
    meta: { questionMarks: qmarks },
  };
}

/**
 * Patient dialogue never uses italics (*action*) AND never uses quotes — the
 * formatting prompt asks for a show-don't-tell style. Evaluated across a
 * whole conversation, not per-turn.
 */
export function detectNoShowDontTell(
  personaId: string,
  trialIndex: number,
  assistantTurns: string[],
): Candidate | null {
  if (assistantTurns.length < 3) return null;
  const anyItalic = assistantTurns.some((t) => /\*[^*\n]{3,}\*/.test(t));
  const anyQuoted = assistantTurns.some((t) => /"[^"\n]{3,}"/.test(t));
  if (anyItalic || anyQuoted) return null;
  return {
    detectorId: "no-show-dont-tell",
    tier: "advisory",
    rule: "Patient's conversation has no italicized actions and no quoted dialogue across multiple turns — formatting prompt expects show-don't-tell with *actions* and \"dialogue\".",
    turnIndex: -1,
    snippet: assistantTurns.slice(0, 2).join("\n\n").slice(0, 400),
    fullTurn: assistantTurns.join("\n\n").slice(0, 1200),
    prior: "",
    personaId,
    trialIndex,
  };
}

export function runLayer1PerTurn(turn: TurnInput, assistantTurnCount: number): Candidate[] {
  const cands: Candidate[] = [];
  const push = (c: Candidate | null) => c && cands.push(c);
  push(detectMultiSpeaker(turn));
  push(detectClinicalPrecisionTell(turn));
  push(detectTurn1Overshare(turn, assistantTurnCount));
  push(detectMultipleQuestions(turn));
  return cands;
}

// ─── Candidate → Finding pipeline (no LLM) ─────────────────────────────────

/**
 * Converts raw candidates into findings without an LLM adjudication step.
 * Allowlisted patterns get marked "skipped"; everything else flows through
 * as "raw" for Claude to judge from the manifest.
 */
export function candidatesToFindings(
  cands: Candidate[],
  allowlist: Allowlist,
): Finding[] {
  return cands.map((cand) => {
    const h = patternHash(cand.detectorId, cand.snippet);
    if (isAllowlisted(cand, allowlist)) {
      return {
        ...cand,
        adjudicated: "skipped" as const,
        adjudicationReason: "allowlisted",
        patternHash: h,
      };
    }
    return {
      ...cand,
      adjudicated: "raw" as const,
      patternHash: h,
    };
  });
}

// ─── Task firing summary ────────────────────────────────────────────────────

export interface TaskFiringEvent {
  taskId: string;
  taskTitle: string;
  criteria: string;
  /** Turn at which the auto-checker first said "completed" (null = never). */
  firstFiredTurnIndex: number | null;
  /** Student turn text at that point (for at-a-glance scanning). */
  firstFiredStudentTurn: string | null;
  reasonAtFiring: string | null;
  /** Total turns in this trial that the auto-checker evaluated. */
  totalEvaluations: number;
  /** Convenience: did the task fire by end of trial? */
  firedByEnd: boolean;
}

/**
 * Reduces the per-turn-per-task taskLog into one event per task per trial:
 * "did this task fire, and if so when?". Claude reads this and the transcript
 * to spot under-fires (task should have completed but didn't) and over-fires
 * (task fired off a turn that doesn't actually meet the criteria).
 */
export function summarizeTaskFiring(
  taskLog: {
    turnIndex: number;
    taskId: string;
    taskTitle: string;
    completed: boolean;
    reason: string;
    studentTurn: string;
    criteria: string;
  }[],
): TaskFiringEvent[] {
  const byTask = new Map<string, typeof taskLog>();
  for (const entry of taskLog) {
    if (!byTask.has(entry.taskId)) byTask.set(entry.taskId, []);
    byTask.get(entry.taskId)!.push(entry);
  }

  const events: TaskFiringEvent[] = [];
  for (const [taskId, entries] of byTask) {
    entries.sort((a, b) => a.turnIndex - b.turnIndex);
    const fired = entries.find((e) => e.completed);
    const last = entries[entries.length - 1];
    events.push({
      taskId,
      taskTitle: last.taskTitle,
      criteria: last.criteria,
      firstFiredTurnIndex: fired ? fired.turnIndex : null,
      firstFiredStudentTurn: fired ? fired.studentTurn : null,
      reasonAtFiring: fired ? fired.reason : null,
      totalEvaluations: entries.length,
      firedByEnd: entries.some((e) => e.completed),
    });
  }
  return events;
}

// ─── Aggregation ───────────────────────────────────────────────────────────

/**
 * Aggregates N trials of findings into deduplicated bugs. Within the same
 * (persona, detectorId, patternHash), trial hits are counted together so
 * Claude can see how reliably a candidate fires.
 *
 * No threshold filtering — all candidates flow through. Claude decides what
 * to act on by reading the manifest.
 */
export interface AggregatedBug {
  detectorId: string;
  tier: Tier;
  personaId: string;
  rule: string;
  hitsAcrossTrials: number;
  totalTrials: number;
  example: { fullTurn: string; snippet: string; turnIndex: number };
  patternHash: string;
  meta?: Record<string, unknown>;
}

export function aggregateFindings(
  perTrialFindings: Finding[][],
): AggregatedBug[] {
  const bugs = new Map<string, AggregatedBug>();
  const totalTrials = perTrialFindings.length;

  for (const trial of perTrialFindings) {
    for (const f of trial) {
      if (f.adjudicated === "skipped") continue;
      const key = `${f.personaId}::${f.detectorId}::${f.patternHash}`;
      const existing = bugs.get(key);
      if (existing) {
        existing.hitsAcrossTrials += 1;
      } else {
        bugs.set(key, {
          detectorId: f.detectorId,
          tier: f.tier,
          personaId: f.personaId,
          rule: f.rule,
          patternHash: f.patternHash,
          hitsAcrossTrials: 1,
          totalTrials,
          example: { fullTurn: f.fullTurn, snippet: f.snippet, turnIndex: f.turnIndex },
          meta: f.meta,
        });
      }
    }
  }

  return Array.from(bugs.values());
}

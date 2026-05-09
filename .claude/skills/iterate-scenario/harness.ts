/**
 * harness.ts — runs one scenario × N student personas × M trials.
 * Captures patient responses, task-firing events, lookup queries, and the
 * full rubric evaluation. Emits manifest.json + transcripts + report.md for
 * Claude to judge after the run.
 *
 * Replicates the production pipeline by duplicating the small AI-SDK calls
 * from the live routes (chat, task-check, evaluation) so there's no Prisma
 * or auth overhead. Model strings are hardcoded to match production.
 *
 * Usage:
 *   npx tsx .claude/skills/iterate-scenario/harness.ts \
 *     --scenario scn_infant_triage_001 \
 *     --iteration 1 \
 *     [--mode quick|full]            // default: quick (1 trial); full = 3 trials
 *     [--personas allison,olivia,stanley,larry,sam]
 *     [--trials N]                    // overrides the mode default
 *     [--out-dir .claude/skills/iterate-scenario/reports]
 */

import { config as loadEnv } from "dotenv";
import path from "path";
// Load .env first (so .env.local overrides individual keys)
loadEnv();
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

import fs from "fs";
import { generateText, generateObject } from "ai";
import { groq } from "@ai-sdk/groq";
import { cerebras } from "@ai-sdk/cerebras";
import { createOpenAI } from "@ai-sdk/openai";

// Together AI client — same shape as the prod evaluation route. The dedicated
// `@ai-sdk/togetherai@2.x` ships LanguageModelV3 which doesn't type-match
// `ai@5.0.60`, so we use the OpenAI-compatible client. `.chat()` forces
// /v1/chat/completions (Together doesn't implement the Responses API).
const togetherai = createOpenAI({
  apiKey: process.env.TOGETHER_AI_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
});

import { testData } from "../../../src/lib/test-data/example-module";
import { TUTORIAL_SCENARIO } from "../../../src/lib/tutorial/scenario-data";
import { textFormattingPrompt } from "../../../src/lib/prompts/scenario";
import { evaluationSchema } from "../../../src/lib/validation/evaluation";

import { CostMeter } from "./cost-meter";
import { parseSections, lookup as lookupInSections } from "./lookup";
import type { LookupResult, Section } from "./lookup";
import { PERSONAS, ALL_PERSONA_IDS, type PersonaId, type Persona } from "./personas";
import {
  aggregateFindings,
  candidatesToFindings,
  detectNoShowDontTell,
  emptyAllowlist,
  runLayer1PerTurn,
  summarizeTaskFiring,
  type AggregatedBug,
  type Allowlist,
  type Candidate,
  type Finding,
  type TaskFiringEvent,
  type TurnInput,
} from "./detectors";

// ─── Types ────────────────────────────────────────────────────────────────

interface Turn {
  role: "assistant" | "user";
  text: string;
}

interface TaskLog {
  turnIndex: number;
  taskId: string;
  taskTitle: string;
  completed: boolean;
  reason: string;
  studentTurn: string;
  criteria: string;
}

interface LookupLog {
  turnIndex: number;
  query: string;
  hit: boolean;
  sectionHeading?: string;
  scoreValue: number;
}

interface TrialRecord {
  trialIndex: number;
  turns: Turn[];
  taskLog: TaskLog[];
  lookupLog: LookupLog[];
  stopReason: "done" | "max-turns" | "error";
  rubric?: unknown;
  taskFiring?: TaskFiringEvent[];
}

interface PersonaRecord {
  personaId: PersonaId;
  trials: TrialRecord[];
}

// ─── CLI parsing ──────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  scenarioId: string;
  iteration: number;
  personas: PersonaId[];
  trials: number;
  outDir: string;
  mode: "full" | "quick";
} {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  const scenarioId = get("--scenario");
  if (!scenarioId) {
    throw new Error("Missing required --scenario <id>");
  }
  const iteration = parseInt(get("--iteration") ?? "1", 10);
  const modeArg = (get("--mode") ?? "quick").toLowerCase();
  if (modeArg !== "full" && modeArg !== "quick") {
    throw new Error(`Invalid --mode: ${modeArg} (use 'full' or 'quick')`);
  }
  const mode = modeArg as "full" | "quick";
  const personasArg = get("--personas");
  const personas = personasArg
    ? (personasArg.split(",").map((s) => s.trim()) as PersonaId[])
    : ALL_PERSONA_IDS;
  for (const p of personas) {
    if (!(p in PERSONAS)) throw new Error(`Unknown persona: ${p}`);
  }
  // quick = 1 trial per persona, full = 3 trials per persona. Override with --trials.
  const defaultTrials = mode === "quick" ? "1" : "3";
  const trials = parseInt(get("--trials") ?? defaultTrials, 10);
  const outDir =
    get("--out-dir") ?? ".claude/skills/iterate-scenario/reports";
  return { scenarioId, iteration, personas, trials, outDir, mode };
}

// ─── Patient turn ─────────────────────────────────────────────────────────

const CHAT_MODEL = "llama-3.3-70b-versatile";
const TASK_CHECK_MODEL = "qwen/qwen3-32b";
const EVAL_SCORER_MODEL = "zai-glm-4.7";
const EVAL_FORMATTER_MODEL = "deepseek-ai/DeepSeek-V3.1";
const STUDENT_MODEL = "llama-3.3-70b-versatile";

function formatTimeMin(s: number): string {
  const m = Math.round(s / 60);
  return `${m} minute${m === 1 ? "" : "s"}`;
}

async function patientTurn(
  personaPrompt: string,
  seconds: number,
  timeLimitSeconds: number,
  messages: Turn[],
  meter: CostMeter,
): Promise<string> {
  const textPersonaPrompt =
    personaPrompt +
    `\n\n<Time constraints>
- You have been talking with this person for ~${formatTimeMin(seconds)}.
- Move the conversation along to keep it under ${formatTimeMin(timeLimitSeconds)}.` +
    textFormattingPrompt;

  const { text, usage } = await generateText({
    model: groq(CHAT_MODEL),
    temperature: 0.7,
    system: textPersonaPrompt,
    messages: messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    })),
  });
  meter.record(
    "patient",
    CHAT_MODEL,
    usage.inputTokens ?? 0,
    usage.outputTokens ?? 0,
  );
  return text.trim();
}

// ─── Student turn ─────────────────────────────────────────────────────────

async function studentTurn(
  persona: Persona,
  scenarioContext: string,
  tasks: { title: string; description: string; hint: string }[],
  messages: Turn[],
  meter: CostMeter,
): Promise<string> {
  const seesDescriptions = persona.seesTaskDescriptions !== false;
  const taskList = tasks
    .map((t, i) =>
      seesDescriptions
        ? `${i + 1}. ${t.title}${t.description ? ` — ${t.description}` : ""}`
        : `${i + 1}. ${t.title}`,
    )
    .join("\n");

  const system =
    persona.systemPrompt +
    `\n\n## Scenario context\n${scenarioContext.trim()}\n\n## Your task list (complete all of these)\n${taskList}`;

  const { text, usage } = await generateText({
    model: groq(STUDENT_MODEL),
    temperature: 0.7,
    system,
    messages: messages.map((m) => ({
      role: m.role === "assistant" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    })),
  });
  meter.record(
    "student",
    STUDENT_MODEL,
    usage.inputTokens ?? 0,
    usage.outputTokens ?? 0,
  );
  return text.trim();
}

// ─── Task check ────────────────────────────────────────────────────────────

async function taskCheck(
  task: { title: string; description?: string; acceptanceCriteria?: string },
  messages: Turn[],
  meter: CostMeter,
): Promise<{ completed: boolean; reason: string }> {
  let transcript = "";
  for (const msg of messages) {
    const role = msg.role === "assistant" ? "Patient" : "Student";
    transcript += `${role}: ${msg.text}\n\n`;
  }
  const criteria =
    task.acceptanceCriteria || task.description || task.title;
  const prompt = `A pharmacy student is talking to a patient. Did the student complete this task?

Task: ${task.title}
Criteria: ${criteria}

Transcript:
${transcript}

Read the criteria carefully. If it lists multiple required conditions joined by AND, every condition must be met. If a "DO NOT count" or "FAILS this task" condition is triggered anywhere in the transcript, answer NO. If the criteria says the parent must say specific information, check the parent's lines for that information.

Answer with ONLY "YES" or "NO" on the first line, then a brief ~100 character reason on the second line. Do not show your reasoning. /no_think`;

  const { text, usage } = await generateText({
    model: groq(TASK_CHECK_MODEL),
    prompt,
    temperature: 0.1,
    maxOutputTokens: 200,
  });
  meter.record(
    "task-check",
    TASK_CHECK_MODEL,
    usage.inputTokens ?? 0,
    usage.outputTokens ?? 0,
  );
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const lines = cleaned.split("\n").filter((l) => l.trim());
  const firstLine = lines[0]?.toUpperCase().trim() || "";
  const completed = firstLine.startsWith("YES");
  const reason =
    lines.slice(1).join(" ").trim().replace(/^(reason:|because)\s*/i, "") ||
    (completed ? "Task completed" : "Task not yet addressed");
  return { completed, reason };
}

// ─── Evaluation ────────────────────────────────────────────────────────────

async function evaluateConversation(
  evaluationPrompt: string,
  messages: Turn[],
  seconds: number,
  timeLimitSeconds: number,
  taskCompletionData: string | undefined,
  meter: CostMeter,
): Promise<unknown> {
  let history = "";
  for (const m of messages) {
    history += `${m.role}: ${m.text}\n\n`;
  }
  const scorerPrompt = `${evaluationPrompt}

# Time
- time spent by the user: ${formatTimeMin(seconds)}
- timeLimit: ${formatTimeMin(timeLimitSeconds)}

# Chat History
The entire chat history is given below:
${history}
${taskCompletionData ? `\n# Auto-Task Completion Data\n${taskCompletionData}\n` : ""}`;

  const scoreResult = await generateText({
    model: cerebras(EVAL_SCORER_MODEL),
    prompt: scorerPrompt,
  });
  meter.record(
    "eval-scorer",
    EVAL_SCORER_MODEL,
    scoreResult.usage.inputTokens ?? 0,
    scoreResult.usage.outputTokens ?? 0,
  );

  try {
    const formatResult = await generateObject({
      model: togetherai.chat(EVAL_FORMATTER_MODEL),
      schema: evaluationSchema,
      prompt: `# Instructions
Turn the rubric below into the correct JSON format. Preserve the rubric's wording for scoring, but rewrite each feedbackItem to comply with the schema:

- Produce EXACTLY one feedbackItem per scoring criterion in the rubric. The count of feedbackItems for a task MUST equal that task's totalPoints. If the rubric has 3 sub-bullets for a 3-pt task, emit 3 feedbackItems — never fewer, never more.
- Every feedbackItem MUST be ≤300 characters and ≤2 sentences.
- Every feedbackItem MUST contain a double-quoted excerpt. If the student earned the point, quote their exact words from the chat history. If they missed it, quote a short example of what they could have said instead.
- Produce exactly 3 summary bullets, each ≤200 characters.

Rubric text to convert:

${scoreResult.text}`,
      temperature: 0.2,
      maxOutputTokens: 2000,
    });
    meter.record(
      "eval-formatter",
      EVAL_FORMATTER_MODEL,
      formatResult.usage.inputTokens ?? 0,
      formatResult.usage.outputTokens ?? 0,
    );
    return formatResult.object;
  } catch (err) {
    return { error: `formatter failed: ${(err as Error).message}` };
  }
}

// ─── Conversation loop ─────────────────────────────────────────────────────

const LOOKUP_RX = /<lookup\s+query\s*=\s*"([^"]+)"\s*\/?>/i;
const DONE_RX = /<done\s*\/?>/i;

async function runTrial(
  scenario: {
    id: string;
    startingMessage: string;
    personaPrompt: string;
    scenarioContext: string;
    timeLimit: number | null;
    tasks: {
      id: string;
      title: string;
      description: string;
      hint: string;
      acceptanceCriteria: string;
    }[];
  },
  persona: Persona,
  sections: Section[],
  trialIndex: number,
  meter: CostMeter,
): Promise<TrialRecord> {
  const timeLimitSeconds = scenario.timeLimit ?? 600;
  const messages: Turn[] = [
    { role: "assistant", text: scenario.startingMessage },
  ];
  const taskLog: TaskLog[] = [];
  const lookupLog: LookupLog[] = [];
  let stopReason: TrialRecord["stopReason"] = "max-turns";
  const startTime = Date.now();
  let userTurnCount = 0;

  try {
    for (let turnNum = 0; turnNum < persona.maxTurns * 2; turnNum++) {
      // Student takes a turn
      let studentText = await studentTurn(
        persona,
        scenario.scenarioContext,
        scenario.tasks,
        messages,
        meter,
      );

      // Handle lookup — resolve in-place, replay student turn
      let lookupAttempts = 0;
      while (LOOKUP_RX.test(studentText) && lookupAttempts < 3) {
        lookupAttempts++;
        const m = studentText.match(LOOKUP_RX);
        const query = m?.[1] ?? "";
        const result: LookupResult = lookupInSections(query, sections);
        lookupLog.push({
          turnIndex: messages.length,
          query,
          hit: result.hit,
          sectionHeading: result.section?.heading,
          scoreValue: result.score,
        });
        const resultText = result.hit
          ? `[lookup hit — ${result.section!.path.concat(result.section!.heading).join(" / ")}]\n\n${result.section!.body}`
          : `[lookup miss — no relevant section found for "${query}"]`;
        // Append lookup result as a synthetic user-side note, re-query the student
        messages.push({ role: "assistant", text: `(lookup result) ${resultText.slice(0, 1800)}` });
        studentText = await studentTurn(
          persona,
          scenario.scenarioContext,
          scenario.tasks,
          messages,
          meter,
        );
        // Clean up the synthetic message so patient never sees it
        messages.pop();
      }

      if (DONE_RX.test(studentText)) {
        stopReason = "done";
        break;
      }

      messages.push({ role: "user", text: studentText });
      userTurnCount++;

      // Run task-check for each task
      for (const task of scenario.tasks) {
        const r = await taskCheck(task, messages, meter);
        taskLog.push({
          turnIndex: messages.length - 1,
          taskId: task.id,
          taskTitle: task.title,
          completed: r.completed,
          reason: r.reason,
          studentTurn: studentText,
          criteria: task.acceptanceCriteria || task.description || task.title,
        });
      }

      if (userTurnCount >= persona.maxTurns) {
        stopReason = "max-turns";
        break;
      }

      // Patient takes a turn
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      const patientText = await patientTurn(
        scenario.personaPrompt,
        elapsedSec,
        timeLimitSeconds,
        messages,
        meter,
      );
      messages.push({ role: "assistant", text: patientText });
    }
  } catch (err) {
    console.error(`  trial ${trialIndex} error:`, (err as Error).message);
    stopReason = "error";
  }

  return {
    trialIndex,
    turns: messages,
    taskLog,
    lookupLog,
    stopReason,
  };
}

// ─── Post-run detection ────────────────────────────────────────────────────

function turnInputsFromTrial(
  personaId: string,
  trialIndex: number,
  turns: Turn[],
  startingMessageLength: number,
): TurnInput[] {
  const inputs: TurnInput[] = [];
  let priorAssistant = "";
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    inputs.push({
      personaId,
      trialIndex,
      turnIndex: i,
      role: t.role,
      text: t.text,
      priorAssistantText: priorAssistant,
      startingMessageLength,
    });
    if (t.role === "assistant") priorAssistant = t.text;
  }
  return inputs;
}

function runDetectorsForTrial(
  trial: TrialRecord,
  personaId: string,
  allowlist: Allowlist,
  startingMessageLength: number,
): { findings: Finding[] } {
  const inputs = turnInputsFromTrial(
    personaId,
    trial.trialIndex,
    trial.turns,
    startingMessageLength,
  );
  const candidates: Candidate[] = [];
  let assistantTurnCount = 0;
  for (const inp of inputs) {
    if (inp.role === "assistant") assistantTurnCount++;
    candidates.push(...runLayer1PerTurn(inp, assistantTurnCount));
  }

  // Conversation-level detector
  const assistantTurns = trial.turns
    .filter((t) => t.role === "assistant")
    .map((t) => t.text);
  const convDetector = detectNoShowDontTell(
    personaId,
    trial.trialIndex,
    assistantTurns,
  );
  if (convDetector) candidates.push(convDetector);

  // No LLM adjudication — Claude reads the manifest and decides.
  const findings = candidatesToFindings(candidates, allowlist);
  return { findings };
}

// ─── Reporting ─────────────────────────────────────────────────────────────

interface Manifest {
  scenarioId: string;
  scenarioTitle: string;
  iteration: number;
  timestamp: string;
  mode: "full" | "quick";
  personas: PersonaId[];
  trialsPerPersona: number;
  cost: ReturnType<CostMeter["snapshot"]>;
  stopReasons: Record<string, number>;
  /**
   * Raw detector candidates aggregated across trials. No LLM judgment has been
   * applied — Claude reads this directly and decides which are real bugs.
   */
  bugs: {
    critical: AggregatedBug[];
    advisory: AggregatedBug[];
  };
  perPersona: {
    personaId: PersonaId;
    trials: {
      trialIndex: number;
      turnCount: number;
      stopReason: string;
      lookupCount: number;
      lookupHitRate: number;
      transcriptFile: string;
      taskFiring: TaskFiringEvent[];
    }[];
    /** Full rubric eval JSON, populated only on first persona's first trial. */
    rubric: unknown | null;
    rubricSnapshot: {
      overallScore: number | null;
      totalPossible: number | null;
    };
  }[];
}

function writeTranscript(
  outPath: string,
  personaId: string,
  trial: TrialRecord,
  rubric?: unknown,
): void {
  const lines: string[] = [];
  lines.push(`# Transcript — ${personaId} trial ${trial.trialIndex}`);
  lines.push(`Stop reason: ${trial.stopReason}`);
  lines.push("");
  for (let i = 0; i < trial.turns.length; i++) {
    const t = trial.turns[i];
    lines.push(`## ${i}: ${t.role === "assistant" ? "Patient" : "Student"}`);
    lines.push("");
    lines.push(t.text);
    lines.push("");
  }
  lines.push("## Task Firing Log");
  lines.push("");
  for (const l of trial.taskLog) {
    lines.push(
      `- turn ${l.turnIndex} · ${l.taskTitle} — **${l.completed ? "✓" : "✗"}** — ${l.reason}`,
    );
  }
  lines.push("");
  if (trial.lookupLog.length) {
    lines.push("## Lookup Log");
    lines.push("");
    for (const l of trial.lookupLog) {
      lines.push(
        `- turn ${l.turnIndex} · ${l.hit ? `✓ ${l.sectionHeading}` : "✗ no match"} · "${l.query}" (score ${l.scoreValue})`,
      );
    }
    lines.push("");
  }
  if (rubric) {
    lines.push("## Rubric (raw JSON)");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(rubric, null, 2));
    lines.push("```");
  }
  fs.writeFileSync(outPath, lines.join("\n"));
}

function writeReport(outPath: string, manifest: Manifest): void {
  const lines: string[] = [];
  lines.push(`# Iteration ${manifest.iteration} — ${manifest.scenarioTitle}`);
  lines.push("");
  lines.push(`Scenario ID: \`${manifest.scenarioId}\``);
  lines.push(`Timestamp: ${manifest.timestamp}`);
  lines.push(`Total cost: $${manifest.cost.total.toFixed(4)}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Mode: \`${manifest.mode}\``);
  lines.push(`- Critical detector candidates: **${manifest.bugs.critical.length}** (raw — Claude judges)`);
  lines.push(`- Advisory detector candidates: ${manifest.bugs.advisory.length}`);
  const totalTrials = manifest.perPersona.reduce(
    (a, p) => a + p.trials.length,
    0,
  );
  lines.push(`- Total trials: ${totalTrials}`);
  lines.push(
    `- Stop reasons: ${Object.entries(manifest.stopReasons)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
  );
  lines.push("");

  if (manifest.bugs.critical.length > 0) {
    lines.push("## Critical Detector Candidates (raw — Claude judges)");
    lines.push("");
    for (const bug of manifest.bugs.critical) {
      lines.push(
        `### [${bug.detectorId}] persona=${bug.personaId} (${bug.hitsAcrossTrials}/${bug.totalTrials} trials)`,
      );
      lines.push("");
      lines.push(`**Rule:** ${bug.rule}`);
      lines.push("");
      lines.push("```");
      lines.push(bug.example.fullTurn.slice(0, 600));
      lines.push("```");
      lines.push("");
    }
  }

  if (manifest.bugs.advisory.length > 0) {
    lines.push("## Advisory Detector Candidates");
    lines.push("");
    for (const bug of manifest.bugs.advisory) {
      lines.push(
        `- **${bug.detectorId}** (persona=${bug.personaId}, ${bug.hitsAcrossTrials}/${bug.totalTrials}): ${bug.rule}`,
      );
    }
    lines.push("");
  }

  lines.push("## Per-Persona Overview");
  lines.push("");
  for (const p of manifest.perPersona) {
    lines.push(`### ${p.personaId}`);
    lines.push(
      `- Rubric: ${p.rubricSnapshot.overallScore ?? "—"} / ${p.rubricSnapshot.totalPossible ?? "—"}`,
    );
    for (const t of p.trials) {
      lines.push(
        `- Trial ${t.trialIndex}: ${t.turnCount} turns, stop=${t.stopReason}, lookups=${t.lookupCount} (${Math.round(t.lookupHitRate * 100)}% hit) — see [${path.basename(t.transcriptFile)}](./${path.basename(t.transcriptFile)})`,
      );
    }
    lines.push("");
  }

  lines.push("## Cost Breakdown");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(manifest.cost.byStage, null, 2));
  lines.push("```");

  fs.writeFileSync(outPath, lines.join("\n"));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenario =
    args.scenarioId === TUTORIAL_SCENARIO.id
      ? TUTORIAL_SCENARIO
      : testData.scenarios.find((s) => s.id === args.scenarioId);
  if (!scenario) {
    console.error(`Scenario not found: ${args.scenarioId}`);
    console.error(
      `Available: ${[TUTORIAL_SCENARIO.id, ...testData.scenarios.map((s) => s.id)].join(", ")}`,
    );
    process.exit(1);
  }

  const meter = new CostMeter();
  const sections = parseSections(scenario.clinicalBackground || "");
  const allowlist: Allowlist = loadAllowlist(args.outDir, scenario.id);

  // Output dirs
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(
    args.outDir,
    `${scenario.id}-${runStamp}-iter${args.iteration}`,
  );
  fs.mkdirSync(path.join(runDir, "transcripts"), { recursive: true });

  console.log(`\n▸ ${scenario.id} (iteration ${args.iteration})`);
  console.log(`  mode: ${args.mode}`);
  console.log(`  personas: ${args.personas.join(", ")}`);
  console.log(`  trials per persona: ${args.trials}`);
  console.log(`  clinicalBackground sections: ${sections.length}`);
  console.log(`  rubric eval: first persona only (${args.personas[0]})`);
  console.log(`  output: ${runDir}\n`);

  const personaRecords: PersonaRecord[] = [];
  const perTrialFindings: Finding[][] = [];
  const stopReasons: Record<string, number> = {};

  for (const personaId of args.personas) {
    const persona = PERSONAS[personaId];
    console.log(`  ▸ persona: ${personaId}`);
    const trials: TrialRecord[] = [];
    for (let trialIdx = 0; trialIdx < args.trials; trialIdx++) {
      process.stdout.write(`    trial ${trialIdx}...`);
      const trial = await runTrial(
        scenario,
        persona,
        sections,
        trialIdx,
        meter,
      );
      stopReasons[trial.stopReason] =
        (stopReasons[trial.stopReason] ?? 0) + 1;
      console.log(
        ` ${trial.turns.length} turns (stop=${trial.stopReason}, $${meter.total().toFixed(3)} so far)`,
      );
      trial.taskFiring = summarizeTaskFiring(trial.taskLog);
      trials.push(trial);

      // Run regex detectors immediately for this trial. Claude judges later.
      const { findings } = runDetectorsForTrial(
        trial,
        personaId,
        allowlist,
        (scenario.startingMessage || "").length,
      );
      perTrialFindings.push(findings);
    }

    // Evaluate only the first persona's first trial. Eval is the most
    // expensive stage; per-persona variance in the rubric hasn't been a
    // useful signal in practice, so we sample one. Runs in BOTH modes —
    // rubric output is important enough to surface every run.
    const isFirstPersona = personaId === args.personas[0];
    const evalTrial = isFirstPersona ? trials[0] : undefined;
    if (evalTrial) {
      const taskCompletionData = trials[0].taskLog
        .filter((l) => l.completed)
        .map((l) => `- ${l.taskTitle}: ${l.reason}`)
        .join("\n");
      try {
        const rubric = await evaluateConversation(
          scenario.evaluationPrompt,
          evalTrial.turns,
          evalTrial.turns.length * 20,
          scenario.timeLimit ?? 600,
          taskCompletionData || undefined,
          meter,
        );
        evalTrial.rubric = rubric;
      } catch (err) {
        console.error(`    eval error:`, (err as Error).message);
      }
    }

    // Write transcripts now (so work isn't lost if a later persona throws)
    for (const t of trials) {
      const transcriptFile = path.join(
        runDir,
        "transcripts",
        `${personaId}-trial${t.trialIndex}.md`,
      );
      writeTranscript(transcriptFile, personaId, t, t.rubric);
    }

    personaRecords.push({ personaId, trials });
  }

  // Aggregate raw detector candidates. No threshold — Claude judges from here.
  const bugs = aggregateFindings(perTrialFindings);
  const critical = bugs.filter((b) => b.tier === "critical");
  const advisory = bugs.filter((b) => b.tier === "advisory");

  const manifest: Manifest = {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    iteration: args.iteration,
    timestamp: new Date().toISOString(),
    mode: args.mode,
    personas: args.personas,
    trialsPerPersona: args.trials,
    cost: meter.snapshot(),
    stopReasons,
    bugs: { critical, advisory },
    perPersona: personaRecords.map((pr) => {
      const firstRubric = pr.trials[0]?.rubric as
        | {
            overallScore?: number;
            totalPossibleScore?: number;
            sections?: { tasks?: { score?: number; totalPoints?: number }[] }[];
          }
        | undefined;
      // DeepSeek V3.1 (formatter) sometimes omits the optional overallScore/
      // totalPossibleScore fields. Fall back to summing per-task score and
      // totalPoints across sections so the snapshot stays useful.
      let snapScore = firstRubric?.overallScore ?? null;
      let snapTotal = firstRubric?.totalPossibleScore ?? null;
      if ((snapScore === null || snapTotal === null) && firstRubric?.sections) {
        let s = 0;
        let t = 0;
        for (const sec of firstRubric.sections) {
          for (const task of sec.tasks ?? []) {
            if (typeof task.score === "number") s += task.score;
            if (typeof task.totalPoints === "number") t += task.totalPoints;
          }
        }
        if (snapScore === null) snapScore = s;
        if (snapTotal === null) snapTotal = t;
      }
      return {
        personaId: pr.personaId,
        trials: pr.trials.map((t) => ({
          trialIndex: t.trialIndex,
          turnCount: t.turns.length,
          stopReason: t.stopReason,
          lookupCount: t.lookupLog.length,
          lookupHitRate: t.lookupLog.length
            ? t.lookupLog.filter((l) => l.hit).length / t.lookupLog.length
            : 0,
          transcriptFile: `transcripts/${pr.personaId}-trial${t.trialIndex}.md`,
          taskFiring: t.taskFiring ?? [],
        })),
        rubric: pr.trials[0]?.rubric ?? null,
        rubricSnapshot: {
          overallScore: snapScore,
          totalPossible: snapTotal,
        },
      };
    }),
  };

  fs.writeFileSync(
    path.join(runDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  writeReport(path.join(runDir, "report.md"), manifest);
  fs.writeFileSync(
    path.join(runDir, "allowlist.json"),
    JSON.stringify(allowlist, null, 2),
  );

  console.log("");
  console.log(`  ═══ ${scenario.id} iteration ${args.iteration} complete`);
  console.log(`  critical bugs: ${critical.length}`);
  console.log(`  advisory findings: ${advisory.length}`);
  console.log(`  total cost: $${meter.total().toFixed(4)}`);
  console.log(`  report: ${path.join(runDir, "report.md")}`);
  console.log(`  manifest: ${path.join(runDir, "manifest.json")}`);
}

function loadAllowlist(outDir: string, scenarioId: string): Allowlist {
  const p = path.join(outDir, `allowlist-${scenarioId}.json`);
  if (!fs.existsSync(p)) return emptyAllowlist();
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as Allowlist;
  } catch {
    return emptyAllowlist();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

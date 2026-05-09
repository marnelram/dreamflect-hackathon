/**
 * scorer-stress-test.ts
 *
 * Tests scorer model alternatives by holding the FORMATTER fixed
 * (qwen-3-235b-a22b-instruct-2507, mode auto, baseline schema, baseline prompt)
 * and varying the scorer.
 *
 * Each trial:
 *   1. Run candidate SCORER on the fixture (evaluationPrompt + universalRules + history)
 *   2. Run baseline FORMATTER on scorer output
 *   3. Record:
 *      - did the scorer respond at all
 *      - did the formatter produce schema-valid JSON
 *      - end-to-end cost + latency
 *      - sample of scorer rubric markdown for visual quality check
 *
 * Usage:
 *   npx tsx .claude/skills/iterate-scenario/scorer-stress-test.ts \
 *     [--trials 10] [--scenario scn_infant_triage_001] [--scorers BASE,A,B,C,D]
 */

import { config as loadEnv } from "dotenv";
import path from "path";
loadEnv();
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

import fs from "fs";
import { generateText, generateObject } from "ai";
import type { LanguageModel } from "ai";
import { cerebras } from "@ai-sdk/cerebras";
import { createOpenAI } from "@ai-sdk/openai";

// Together AI via OpenAI-compatible client (see eval-stress-test.ts for rationale).
const togetherai = createOpenAI({
  apiKey: process.env.TOGETHER_AI_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
});

import { evaluationSchema } from "../../../src/lib/validation/evaluation";
import { testData } from "../../../src/lib/test-data/example-module";

// ─── CLI ──────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    trials: parseInt(get("--trials") ?? "10", 10),
    scenarioId: get("--scenario") ?? "scn_infant_triage_001",
    scorersArg: get("--scorers"),
  };
}

// ─── Pricing ──────────────────────────────────────────────────────────────

const PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  // Cerebras
  "qwen-3-235b-a22b-instruct-2507": { inputPerM: 5.0, outputPerM: 15.0 },
  "gpt-oss-120b": { inputPerM: 0.25, outputPerM: 0.69 },
  "zai-glm-4.7": { inputPerM: 5.0, outputPerM: 15.0 },
  // Together AI
  "Qwen/Qwen3.6-Plus": { inputPerM: 0.5, outputPerM: 3.0 },
  "Qwen/Qwen3-Next-80B-A3B-Instruct": { inputPerM: 0.3, outputPerM: 0.9 },
  "deepseek-ai/DeepSeek-V3.1": { inputPerM: 0.27, outputPerM: 0.4 },
  "deepseek-ai/DeepSeek-V4-Pro": { inputPerM: 0.45, outputPerM: 0.9 },
};

function priceOf(modelId: string, inT: number, outT: number): number {
  const p = PRICING[modelId] ?? { inputPerM: 2, outputPerM: 6 };
  return (inT / 1_000_000) * p.inputPerM + (outT / 1_000_000) * p.outputPerM;
}

// ─── Fixture transcript ───────────────────────────────────────────────────

const FIXTURE_TRANSCRIPT: { role: "assistant" | "user"; text: string }[] = [
  { role: "assistant", text: '*Aisha cradles her sleeping baby and approaches the counter, looking exhausted.* "Hi… I\'m not sure what to do. My baby has a fever and I\'m really scared."' },
  { role: "user", text: "Of course, I'm here to help. Can you tell me how old your baby is, and how long she's had the fever?" },
  { role: "assistant", text: '"She\'s 10 weeks old. The fever started about three hours ago — she just felt so warm I checked her with the rectal thermometer."' },
  { role: "user", text: "Thank you. What temperature did the thermometer show?" },
  { role: "assistant", text: '*Aisha glances at the thermometer in her hand.* "It said 101.2 degrees Fahrenheit. Is that bad?"' },
  { role: "user", text: "I want to ask you a few quick questions about how she's been acting. Has she been feeding normally, and is she having any trouble breathing or is she unusually sleepy?" },
  { role: "assistant", text: '"She nursed maybe an hour ago but didn\'t take much. She\'s sleeping now but she\'s a bit more fussy than usual when she\'s awake. Her breathing seems okay to me."' },
  { role: "user", text: "Thank you for those details. Has she had any rash, vomiting, or diarrhea? And how many wet diapers has she had today?" },
  { role: "assistant", text: '"No rash. No vomiting. Maybe four wet diapers today, which I think is fewer than usual."' },
  { role: "user", text: "I want to be honest with you — at 10 weeks old, any fever of 100.4 degrees or higher is something we need to take very seriously. I'd like you to take Zara to the emergency room right now. The reason is that babies under 3 months can't fight infections the way older kids can, so doctors need to do a full evaluation to rule out a serious infection. This is precautionary, but it's important. Don't go to urgent care or wait to see your pediatrician — go directly to the ER." },
  { role: "assistant", text: '*Aisha\'s eyes well up.* "Okay. Okay, I\'ll go now. Thank you. I was hoping you\'d say it was something I could just give Tylenol for."' },
  { role: "user", text: "I understand the worry — and I know an ER visit is a lot. But this is the safest path for Zara. Please don't give any Tylenol or Motrin before the ER assesses her — they may need her temperature unchanged. Drive safely. You're doing the right thing." },
];

function transcriptToHistory(turns: typeof FIXTURE_TRANSCRIPT): string {
  let out = "";
  for (const t of turns) {
    const role = t.role === "assistant" ? "patient" : "student";
    out += `${role}: ${t.text}\n\n`;
  }
  return out;
}

const UNIVERSAL_RULES = `# Rules
- Quote the student's exact words verbatim when awarding a point.
- When the student missed a point, give a short example of what they could have said.
- Do NOT invent categories, sections, or tasks outside the rubric below.
- Score each task independently. 0 = not attempted, partial = partial credit, full = excellent.
`;

// ─── Scorer candidates ────────────────────────────────────────────────────

interface ScorerCandidate {
  id: string;
  label: string;
  modelId: string;
  model: LanguageModel;
}

const SCORERS: ScorerCandidate[] = [
  { id: "BASE", label: "zai-glm-4.7 (CURRENT)", modelId: "zai-glm-4.7", model: cerebras("zai-glm-4.7") },
  { id: "S1", label: "Qwen3.6-Plus (Together)", modelId: "Qwen/Qwen3.6-Plus", model: togetherai.chat("Qwen/Qwen3.6-Plus") },
  { id: "S2", label: "Qwen3-Next-80B (Together)", modelId: "Qwen/Qwen3-Next-80B-A3B-Instruct", model: togetherai.chat("Qwen/Qwen3-Next-80B-A3B-Instruct") },
  { id: "S3", label: "DeepSeek-V3.1 (Together)", modelId: "deepseek-ai/DeepSeek-V3.1", model: togetherai.chat("deepseek-ai/DeepSeek-V3.1") },
  { id: "S4", label: "DeepSeek-V4-Pro (Together)", modelId: "deepseek-ai/DeepSeek-V4-Pro", model: togetherai.chat("deepseek-ai/DeepSeek-V4-Pro") },
];

// ─── Formatter (held fixed) ───────────────────────────────────────────────

const FORMATTER_MODEL_ID = "qwen-3-235b-a22b-instruct-2507";
const FORMATTER_MODEL = cerebras(FORMATTER_MODEL_ID);

function formatterPrompt(scorerText: string): string {
  return `# Instructions
Turn the rubric below into the correct JSON format. Preserve the rubric's wording for scoring, but rewrite each feedbackItem to comply with the schema:

- Every feedbackItem MUST be ≤300 characters and ≤2 sentences.
- Every feedbackItem MUST contain a double-quoted excerpt. If the student earned the point, quote their exact words from the chat history. If they missed it, quote a short example of what they could have said instead.
- Produce at most 3 feedbackItems per task (match totalPoints when possible).
- Produce exactly 3 summary bullets, each ≤200 characters: (1) what went well, (2) what to work on, (3) recommendation.

Rubric text to convert:

${scorerText}`;
}

// ─── One trial ────────────────────────────────────────────────────────────

interface ScorerTrialResult {
  scorerId: string;
  trialIndex: number;
  // Scorer stage
  scorerOk: boolean;
  scorerLatencyMs: number;
  scorerInputTokens: number;
  scorerOutputTokens: number;
  scorerUsd: number;
  scorerText?: string;
  scorerError?: string;
  // Formatter stage (only attempted if scorerOk)
  formatterAttempted: boolean;
  formatterOk: boolean;
  formatterLatencyMs: number;
  formatterInputTokens: number;
  formatterOutputTokens: number;
  formatterUsd: number;
  formatterError?: string;
  // End-to-end
  e2eOk: boolean;
  totalUsd: number;
  totalLatencyMs: number;
  finalOutput?: unknown;
}

async function runScorerTrial(
  scorer: ScorerCandidate,
  evaluationPrompt: string,
  history: string,
  trialIndex: number,
): Promise<ScorerTrialResult> {
  const scorerPromptText = `${evaluationPrompt}

${UNIVERSAL_RULES}

# Time
- time spent by the user: 5 minutes
- timeLimit: 8 minutes

# Chat History
The entire chat history is given below:
${history}
`;

  // Stage 1: scorer
  const scorerStart = Date.now();
  let scorerText = "";
  let scorerOk = false;
  let scorerInputTokens = 0;
  let scorerOutputTokens = 0;
  let scorerError: string | undefined;
  try {
    const r = await generateText({
      model: scorer.model,
      prompt: scorerPromptText,
    });
    scorerText = r.text;
    scorerInputTokens = r.usage.inputTokens ?? 0;
    scorerOutputTokens = r.usage.outputTokens ?? 0;
    scorerOk = scorerText.trim().length > 100; // basic sanity threshold
    if (!scorerOk) scorerError = `scorer returned ${scorerText.length} chars`;
  } catch (err) {
    scorerError = ((err as Error).message ?? String(err)).slice(0, 300);
  }
  const scorerLatencyMs = Date.now() - scorerStart;
  const scorerUsd = priceOf(scorer.modelId, scorerInputTokens, scorerOutputTokens);

  if (!scorerOk) {
    return {
      scorerId: scorer.id,
      trialIndex,
      scorerOk: false,
      scorerLatencyMs,
      scorerInputTokens,
      scorerOutputTokens,
      scorerUsd,
      scorerError,
      formatterAttempted: false,
      formatterOk: false,
      formatterLatencyMs: 0,
      formatterInputTokens: 0,
      formatterOutputTokens: 0,
      formatterUsd: 0,
      e2eOk: false,
      totalUsd: scorerUsd,
      totalLatencyMs: scorerLatencyMs,
    };
  }

  // Stage 2: formatter (held fixed)
  const formatterStart = Date.now();
  let formatterOk = false;
  let formatterInputTokens = 0;
  let formatterOutputTokens = 0;
  let formatterError: string | undefined;
  let finalOutput: unknown;
  try {
    const r = await generateObject({
      model: FORMATTER_MODEL,
      schema: evaluationSchema,
      prompt: formatterPrompt(scorerText),
      temperature: 0.2,
      maxOutputTokens: 2500,
    });
    finalOutput = r.object;
    formatterInputTokens = r.usage.inputTokens ?? 0;
    formatterOutputTokens = r.usage.outputTokens ?? 0;
    formatterOk = true;
  } catch (err) {
    formatterError = ((err as Error).message ?? String(err)).slice(0, 300);
  }
  const formatterLatencyMs = Date.now() - formatterStart;
  const formatterUsd = priceOf(FORMATTER_MODEL_ID, formatterInputTokens, formatterOutputTokens);

  return {
    scorerId: scorer.id,
    trialIndex,
    scorerOk: true,
    scorerLatencyMs,
    scorerInputTokens,
    scorerOutputTokens,
    scorerUsd,
    scorerText,
    formatterAttempted: true,
    formatterOk,
    formatterLatencyMs,
    formatterInputTokens,
    formatterOutputTokens,
    formatterUsd,
    formatterError,
    e2eOk: formatterOk,
    totalUsd: scorerUsd + formatterUsd,
    totalLatencyMs: scorerLatencyMs + formatterLatencyMs,
    finalOutput,
  };
}

// ─── Reporting ────────────────────────────────────────────────────────────

interface ScorerSummary {
  id: string;
  label: string;
  modelId: string;
  trials: number;
  scorerOkRate: number;
  e2eOkRate: number;
  avgScorerUsd: number;
  avgFormatterUsd: number;
  avgTotalUsd: number;
  avgScorerLatencyMs: number;
  avgTotalLatencyMs: number;
  avgScorerOutputTokens: number;
  scorerSample?: string;
  formatterSample?: unknown;
}

function summarize(results: ScorerTrialResult[], scorers: ScorerCandidate[]): ScorerSummary[] {
  return scorers.map((s) => {
    const own = results.filter((r) => r.scorerId === s.id);
    const n = own.length;
    const scorerOkCount = own.filter((r) => r.scorerOk).length;
    const e2eOkCount = own.filter((r) => r.e2eOk).length;
    const successful = own.filter((r) => r.e2eOk);
    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
    const sample = own.find((r) => r.e2eOk);
    return {
      id: s.id,
      label: s.label,
      modelId: s.modelId,
      trials: n,
      scorerOkRate: n ? scorerOkCount / n : 0,
      e2eOkRate: n ? e2eOkCount / n : 0,
      avgScorerUsd: avg(successful.map((r) => r.scorerUsd)),
      avgFormatterUsd: avg(successful.map((r) => r.formatterUsd)),
      avgTotalUsd: avg(successful.map((r) => r.totalUsd)),
      avgScorerLatencyMs: avg(own.map((r) => r.scorerLatencyMs)),
      avgTotalLatencyMs: avg(own.map((r) => r.totalLatencyMs)),
      avgScorerOutputTokens: avg(successful.map((r) => r.scorerOutputTokens)),
      scorerSample: sample?.scorerText?.slice(0, 1500),
      formatterSample: sample?.finalOutput,
    };
  });
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function printTable(rows: ScorerSummary[]) {
  const cols = [
    pad("ID", 6),
    pad("Scorer", 30),
    pad("Scorer OK", 11),
    pad("E2E OK", 9),
    pad("Scorer $", 10),
    pad("Total $", 10),
    pad("Scorer ms", 11),
    pad("Total ms", 10),
  ].join(" | ");
  console.log(cols);
  console.log("-".repeat(cols.length + 4));
  for (const r of rows) {
    console.log(
      [
        pad(r.id, 6),
        pad(r.label, 30),
        pad(`${(r.scorerOkRate * 100).toFixed(0)}%`, 11),
        pad(`${(r.e2eOkRate * 100).toFixed(0)}%`, 9),
        pad(`$${r.avgScorerUsd.toFixed(4)}`, 10),
        pad(`$${r.avgTotalUsd.toFixed(4)}`, 10),
        pad(`${Math.round(r.avgScorerLatencyMs)}ms`, 11),
        pad(`${Math.round(r.avgTotalLatencyMs)}ms`, 10),
      ].join(" | "),
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const scenario = testData.scenarios.find((s) => s.id === args.scenarioId);
  if (!scenario) {
    console.error(`Scenario not found: ${args.scenarioId}`);
    process.exit(1);
  }

  const selectedIds = args.scorersArg
    ? new Set(args.scorersArg.split(",").map((s) => s.trim()))
    : null;
  const scorers = selectedIds ? SCORERS.filter((s) => selectedIds.has(s.id)) : SCORERS;

  const history = transcriptToHistory(FIXTURE_TRANSCRIPT);

  console.log(`▸ Scorer stress test`);
  console.log(`  scenario: ${scenario.id}`);
  console.log(`  formatter (fixed): ${FORMATTER_MODEL_ID}`);
  console.log(`  scorers: ${scorers.map((s) => s.id).join(", ")}`);
  console.log(`  trials per scorer: ${args.trials}\n`);

  const allResults: ScorerTrialResult[] = [];
  for (const s of scorers) {
    process.stdout.write(`▸ ${s.id}: ${s.label} (${s.modelId})\n`);
    for (let i = 0; i < args.trials; i++) {
      const r = await runScorerTrial(s, scenario.evaluationPrompt, history, i);
      allResults.push(r);
      const tag = r.e2eOk ? "✓" : r.scorerOk ? "△ formatter-fail" : "✗ scorer-fail";
      process.stdout.write(
        `  trial ${i}: ${tag} (scorer ${r.scorerLatencyMs}ms, total $${r.totalUsd.toFixed(4)})\n`,
      );
    }
  }

  console.log("\n═══ RESULTS ═══\n");
  const summaries = summarize(allResults, scorers);
  printTable(summaries);

  const totalCost = allResults.reduce((a, r) => a + r.totalUsd, 0);
  console.log(`\nLegend: ✓ = e2e success · △ = scorer ok but formatter failed · ✗ = scorer failed`);
  console.log(`Total sweep cost: $${totalCost.toFixed(4)}`);

  // Archive
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = path.join(
    ".claude",
    "skills",
    "iterate-scenario",
    "reports",
    `scorer-stress-${scenario.id}-${ts}.json`,
  );
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  fs.writeFileSync(
    archivePath,
    JSON.stringify(
      {
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        timestamp: ts,
        trialsPerScorer: args.trials,
        formatterModel: FORMATTER_MODEL_ID,
        totalCost,
        summaries,
        rawResults: allResults.map((r) => ({
          ...r,
          // strip large payloads from raw archive
          scorerText: undefined,
          finalOutput: undefined,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\nArchive: ${archivePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

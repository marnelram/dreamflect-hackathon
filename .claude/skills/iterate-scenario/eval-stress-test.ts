/**
 * eval-stress-test.ts
 *
 * One-off harness for stress-testing the rubric formatter step. Holds the
 * scorer markdown fixed (one call up front, cached to disk) and runs N trials
 * of M variants against it. Reports parse / schema-validation rates, cost,
 * and latency per variant.
 *
 * Variants under test:
 *   A — qwen-3-235b + current nested schema + inline constraints (BASELINE)
 *   B — qwen-3-235b + flat schema (one level deep)
 *   C — qwen-3-235b + nested schema + constraints stripped from describe()
 *   D — qwen-3-235b + tool-call mode
 *   E — llama-3.3-70b + current nested + inline (cheaper formatter)
 *   F — llama-3.3-70b + flat schema (cheap + flat)
 *   G — qwen-3-235b + JSON skeleton appended to prompt
 *
 * Usage:
 *   npx tsx .claude/skills/iterate-scenario/eval-stress-test.ts \
 *     [--trials 10] [--scenario scn_infant_triage_001] [--variants A,B,C,D,E,F,G]
 *
 *   # Force re-running the scorer (otherwise cached):
 *   npx tsx .claude/skills/iterate-scenario/eval-stress-test.ts --refresh-fixture
 */

import { config as loadEnv } from "dotenv";
import path from "path";
loadEnv();
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

import fs from "fs";
import { z } from "zod/v3";
import { generateText, generateObject, streamObject } from "ai";
import type { LanguageModel } from "ai";
import { groq } from "@ai-sdk/groq";
import { cerebras } from "@ai-sdk/cerebras";
import { createOpenAI } from "@ai-sdk/openai";

// Together AI is OpenAI-compatible. Using createOpenAI keeps us on the
// LanguageModelV2 protocol that this repo's `ai@5.0.60` targets — the
// dedicated `@ai-sdk/togetherai@2.x` package ships LanguageModelV3, which
// types incompatibly until we upgrade the core `ai` package.
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
  const has = (flag: string) => argv.includes(flag);
  return {
    trials: parseInt(get("--trials") ?? "10", 10),
    scenarioId: get("--scenario") ?? "scn_infant_triage_001",
    variantsArg: get("--variants"),
    refreshFixture: has("--refresh-fixture"),
  };
}

// ─── Pricing ──────────────────────────────────────────────────────────────

const PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  // Cerebras / Groq
  "llama-3.3-70b-versatile": { inputPerM: 0.59, outputPerM: 0.79 },
  "qwen-3-235b-a22b-instruct-2507": { inputPerM: 5.0, outputPerM: 15.0 },
  "qwen-3-235b-a22b-thinking-2507": { inputPerM: 5.0, outputPerM: 15.0 },
  "qwen-3-32b": { inputPerM: 0.4, outputPerM: 0.8 },
  "qwen/qwen3-32b": { inputPerM: 0.29, outputPerM: 0.59 },
  "gpt-oss-120b": { inputPerM: 0.25, outputPerM: 0.69 },
  "zai-glm-4.7": { inputPerM: 5.0, outputPerM: 15.0 },
  // Together AI (approximate, per Together pricing as of May 2026)
  "Qwen/Qwen3.6-Plus": { inputPerM: 0.5, outputPerM: 3.0 },
  "Qwen/Qwen3-Next-80B-A3B-Instruct": { inputPerM: 0.3, outputPerM: 0.9 },
  "deepseek-ai/DeepSeek-V3.1": { inputPerM: 0.27, outputPerM: 0.4 },
  "deepseek-ai/DeepSeek-V4-Pro": { inputPerM: 0.45, outputPerM: 0.9 },
};

function priceOf(modelId: string, inT: number, outT: number): number {
  const p = PRICING[modelId] ?? { inputPerM: 2, outputPerM: 6 };
  return (inT / 1_000_000) * p.inputPerM + (outT / 1_000_000) * p.outputPerM;
}

// ─── Fixture transcript (canned, deterministic) ───────────────────────────

const FIXTURE_TRANSCRIPT: { role: "assistant" | "user"; text: string }[] = [
  {
    role: "assistant",
    text: '*Aisha cradles her sleeping baby and approaches the counter, looking exhausted.* "Hi… I\'m not sure what to do. My baby has a fever and I\'m really scared."',
  },
  {
    role: "user",
    text: "Of course, I'm here to help. Can you tell me how old your baby is, and how long she's had the fever?",
  },
  {
    role: "assistant",
    text: '"She\'s 10 weeks old. The fever started about three hours ago — she just felt so warm I checked her with the rectal thermometer."',
  },
  {
    role: "user",
    text: "Thank you. What temperature did the thermometer show?",
  },
  {
    role: "assistant",
    text: '*Aisha glances at the thermometer in her hand.* "It said 101.2 degrees Fahrenheit. Is that bad?"',
  },
  {
    role: "user",
    text: "I want to ask you a few quick questions about how she's been acting. Has she been feeding normally, and is she having any trouble breathing or is she unusually sleepy?",
  },
  {
    role: "assistant",
    text: '"She nursed maybe an hour ago but didn\'t take much. She\'s sleeping now but she\'s a bit more fussy than usual when she\'s awake. Her breathing seems okay to me."',
  },
  {
    role: "user",
    text: "Thank you for those details. Has she had any rash, vomiting, or diarrhea? And how many wet diapers has she had today?",
  },
  {
    role: "assistant",
    text: '"No rash. No vomiting. Maybe four wet diapers today, which I think is fewer than usual."',
  },
  {
    role: "user",
    text: "I want to be honest with you — at 10 weeks old, any fever of 100.4 degrees or higher is something we need to take very seriously. I'd like you to take Zara to the emergency room right now. The reason is that babies under 3 months can't fight infections the way older kids can, so doctors need to do a full evaluation to rule out a serious infection. This is precautionary, but it's important. Don't go to urgent care or wait to see your pediatrician — go directly to the ER.",
  },
  {
    role: "assistant",
    text: '*Aisha\'s eyes well up.* "Okay. Okay, I\'ll go now. Thank you. I was hoping you\'d say it was something I could just give Tylenol for."',
  },
  {
    role: "user",
    text: "I understand the worry — and I know an ER visit is a lot. But this is the safest path for Zara. Please don't give any Tylenol or Motrin before the ER assesses her — they may need her temperature unchanged. Drive safely. You're doing the right thing.",
  },
];

function transcriptToHistory(turns: typeof FIXTURE_TRANSCRIPT): string {
  let out = "";
  for (const t of turns) {
    const role = t.role === "assistant" ? "patient" : "student";
    out += `${role}: ${t.text}\n\n`;
  }
  return out;
}

// ─── Universal rules block (to match prod) ────────────────────────────────

const UNIVERSAL_RULES = `# Rules
- Quote the student's exact words verbatim when awarding a point.
- When the student missed a point, give a short example of what they could have said.
- Do NOT invent categories, sections, or tasks outside the rubric below.
- Score each task independently. 0 = not attempted, partial = partial credit, full = excellent.
`;

// ─── Scorer (stage 1) — runs once, cached to disk ─────────────────────────

const SCORER_MODEL_ID = "zai-glm-4.7";

async function runScorer(
  evaluationPrompt: string,
  history: string,
  timeStr: string,
  timeLimitStr: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number; usd: number }> {
  const prompt = `${evaluationPrompt}

${UNIVERSAL_RULES}

# Time
- time spent by the user: ${timeStr}
- timeLimit: ${timeLimitStr}

# Chat History
The entire chat history is given below:
${history}
`;
  const result = await generateText({
    model: cerebras(SCORER_MODEL_ID),
    prompt,
  });
  const inputTokens = result.usage.inputTokens ?? 0;
  const outputTokens = result.usage.outputTokens ?? 0;
  return {
    text: result.text,
    inputTokens,
    outputTokens,
    usd: priceOf(SCORER_MODEL_ID, inputTokens, outputTokens),
  };
}

// ─── Schemas ──────────────────────────────────────────────────────────────

// Variant A baseline — re-export the prod schema
const SCHEMA_BASELINE = evaluationSchema;

// Variant B/F — flat schema, one level deep
const SCHEMA_FLAT = z.object({
  overallScore: z.number().optional(),
  totalPossibleScore: z.number().optional(),
  tasks: z
    .array(
      z.object({
        sectionTitle: z.string(),
        sectionDescription: z.string(),
        taskTitle: z.string(),
        score: z.number(),
        totalPoints: z.number(),
        feedbackItems: z
          .array(z.string().max(300))
          .max(3)
          .describe("≤3 short feedback items, each ≤300 chars with a quoted excerpt"),
      }),
    )
    .describe("Flat list of all rubric tasks, with section title duplicated per task"),
  summary: z.array(z.string().max(200)).max(3),
});

// Variant C — same nesting, but no rules baked into describe()
const SCHEMA_NO_INLINE = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      tasks: z.array(
        z.object({
          title: z.string(),
          score: z.number(),
          totalPoints: z.number(),
          feedbackItems: z.array(z.string()).max(3),
        }),
      ),
    }),
  ),
  overallScore: z.number().optional(),
  totalPossibleScore: z.number().optional(),
  summary: z.array(z.string()).max(3),
});

// ─── Prompts ──────────────────────────────────────────────────────────────

const PROMPT_DEFAULT = (scorerText: string) => `# Instructions
Turn the rubric below into the correct JSON format. Preserve the rubric's wording for scoring, but rewrite each feedbackItem to comply with the schema:

- Every feedbackItem MUST be ≤300 characters and ≤2 sentences.
- Every feedbackItem MUST contain a double-quoted excerpt. If the student earned the point, quote their exact words from the chat history. If they missed it, quote a short example of what they could have said instead.
- Produce at most 3 feedbackItems per task (match totalPoints when possible).
- Produce exactly 3 summary bullets, each ≤200 characters: (1) what went well, (2) what to work on, (3) recommendation.

Rubric text to convert:

${scorerText}`;

const PROMPT_FLAT = (scorerText: string) => `# Instructions
Turn the rubric below into a flat JSON list of tasks. The output schema has a single "tasks" array; each entry includes its parent section's title and description as fields, alongside the task's own title, score, totalPoints, and feedbackItems.

Rules:
- Every feedbackItem MUST be ≤300 characters and ≤2 sentences with a double-quoted excerpt.
- Produce at most 3 feedbackItems per task.
- Produce exactly 3 summary bullets, each ≤200 characters.

Rubric text to convert:

${scorerText}`;

const PROMPT_WITH_SKELETON = (scorerText: string) => `${PROMPT_DEFAULT(scorerText)}

# Expected JSON shape (template — fill with your actual content)
\`\`\`json
{
  "sections": [
    {
      "title": "Section Title",
      "description": "Short 3-7 word description",
      "tasks": [
        {
          "title": "Task title",
          "score": 0,
          "totalPoints": 1,
          "feedbackItems": ["Feedback with \\"quoted excerpt\\".", "Another feedback with \\"another quote\\"."]
        }
      ]
    }
  ],
  "overallScore": 0,
  "totalPossibleScore": 0,
  "summary": ["What went well — bullet 1.", "Work on — bullet 2.", "Recommendation — bullet 3."]
}
\`\`\`
`;

// ─── Variants ─────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  label: string;
  modelId: string;
  model: LanguageModel;
  schema: z.ZodTypeAny;
  prompt: (scorerText: string) => string;
  mode?: "auto" | "json" | "tool";
  /**
   * If true, this variant skips the scorer step. In main() we override its
   * `prompt` to receive the full scorer-style prompt (evaluationPrompt +
   * universalRules + history) instead of the cached scorer markdown.
   */
  singleStage?: boolean;
  /**
   * Use streamObject instead of generateObject. Required for some Together AI
   * models (Qwen3.6-Plus, DeepSeek V3.1+) that only support streaming.
   */
  useStreaming?: boolean;
}

const QWEN = "qwen-3-235b-a22b-instruct-2507";
const LLAMA = "llama-3.3-70b-versatile";

const VARIANTS: Variant[] = [
  {
    id: "A",
    label: "qwen-235b + nested + inline (BASELINE)",
    modelId: QWEN,
    model: cerebras(QWEN),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
  },
  {
    id: "B",
    label: "qwen-235b + flat schema",
    modelId: QWEN,
    model: cerebras(QWEN),
    schema: SCHEMA_FLAT,
    prompt: PROMPT_FLAT,
  },
  {
    id: "C",
    label: "qwen-235b + no inline constraints",
    modelId: QWEN,
    model: cerebras(QWEN),
    schema: SCHEMA_NO_INLINE,
    prompt: PROMPT_DEFAULT,
  },
  {
    id: "D",
    label: "qwen-235b + tool-call mode",
    modelId: QWEN,
    model: cerebras(QWEN),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
    mode: "tool",
  },
  {
    id: "E",
    label: "llama-70b + nested + tool-call mode",
    modelId: LLAMA,
    model: groq(LLAMA),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
    mode: "tool",
  },
  {
    id: "F",
    label: "llama-70b + flat + tool-call mode",
    modelId: LLAMA,
    model: groq(LLAMA),
    schema: SCHEMA_FLAT,
    prompt: PROMPT_FLAT,
    mode: "tool",
  },
  {
    id: "G",
    label: "qwen-235b + JSON skeleton in prompt",
    modelId: QWEN,
    model: cerebras(QWEN),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_WITH_SKELETON,
  },
  {
    id: "H",
    label: "glm-4.7 single-stage (scorer+formatter)",
    modelId: SCORER_MODEL_ID,
    model: cerebras(SCORER_MODEL_ID),
    schema: SCHEMA_BASELINE,
    // For single-stage, main() passes the full scorer-style prompt as the
    // input string, and we use it as-is (no formatter wrapper).
    prompt: (s) => s,
    singleStage: true,
  },
  {
    id: "I",
    label: "qwen-3-32b on Cerebras (formatter)",
    modelId: "qwen-3-32b",
    model: cerebras("qwen-3-32b"),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
  },
  {
    id: "J",
    label: "qwen-3-32b on Groq (formatter)",
    modelId: "qwen/qwen3-32b",
    model: groq("qwen/qwen3-32b"),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
  },
  {
    id: "K",
    label: "Qwen3.6-Plus on Together",
    modelId: "Qwen/Qwen3.6-Plus",
    model: togetherai.chat("Qwen/Qwen3.6-Plus"),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
    mode: "tool",
    useStreaming: true,
  },
  {
    id: "L",
    label: "Qwen3-Next-80B-A3B on Together",
    modelId: "Qwen/Qwen3-Next-80B-A3B-Instruct",
    model: togetherai.chat("Qwen/Qwen3-Next-80B-A3B-Instruct"),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
    useStreaming: true,
  },
  {
    id: "M",
    label: "DeepSeek-V3.1 on Together",
    modelId: "deepseek-ai/DeepSeek-V3.1",
    model: togetherai.chat("deepseek-ai/DeepSeek-V3.1"),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
    useStreaming: true,
  },
  {
    id: "N",
    label: "DeepSeek-V4-Pro on Together",
    modelId: "deepseek-ai/DeepSeek-V4-Pro",
    model: togetherai.chat("deepseek-ai/DeepSeek-V4-Pro"),
    schema: SCHEMA_BASELINE,
    prompt: PROMPT_DEFAULT,
    useStreaming: true,
  },
];

// ─── Trial runner ─────────────────────────────────────────────────────────

interface TrialResult {
  variantId: string;
  trialIndex: number;
  parsed: boolean;
  schemaValid: boolean;
  errorCategory?: "no-object" | "json-parse" | "schema-validation" | "other";
  errorMessage?: string;
  inputTokens: number;
  outputTokens: number;
  usd: number;
  latencyMs: number;
  output?: unknown;
}

function categorizeError(err: unknown): {
  category: TrialResult["errorCategory"];
  message: string;
} {
  const e = err as { name?: string; message?: string; cause?: unknown };
  const name = (e.name ?? "").toLowerCase();
  const msg = (e.message ?? String(err)).slice(0, 400);
  const lc = msg.toLowerCase();
  if (name.includes("noobjectgenerated") || lc.includes("no object generated")) {
    return { category: "no-object", message: msg };
  }
  if (name.includes("jsonparse") || lc.includes("json parse") || lc.includes("could not parse")) {
    return { category: "json-parse", message: msg };
  }
  if (
    name.includes("typevalidation") ||
    name.includes("aitypevalidation") ||
    lc.includes("schema") ||
    lc.includes("validation") ||
    lc.includes("invalid_type") ||
    lc.includes("zod")
  ) {
    return { category: "schema-validation", message: msg };
  }
  return { category: "other", message: msg };
}

async function runTrial(
  variant: Variant,
  scorerText: string,
  trialIndex: number,
): Promise<TrialResult> {
  const start = Date.now();
  try {
    let object: unknown;
    let inputTokens = 0;
    let outputTokens = 0;
    if (variant.useStreaming) {
      // Some Together AI models (Qwen3.6+, DeepSeek V3.1+) only support
      // streaming. streamObject's `.object` only resolves after the stream
      // is consumed — so we iterate partialObjectStream first.
      const stream = streamObject({
        model: variant.model,
        schema: variant.schema,
        prompt: variant.prompt(scorerText),
        mode: variant.mode ?? "auto",
        temperature: 0.2,
        maxOutputTokens: 2500,
      });
      // Drain the partial stream so the request actually fires and finishes.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _partial of stream.partialObjectStream) {
        // discard partials; we only care about the final object
      }
      object = await stream.object;
      const usage = await stream.usage;
      inputTokens = usage.inputTokens ?? 0;
      outputTokens = usage.outputTokens ?? 0;
    } else {
      const result = await generateObject({
        model: variant.model,
        schema: variant.schema,
        prompt: variant.prompt(scorerText),
        mode: variant.mode ?? "auto",
        temperature: 0.2,
        maxOutputTokens: 2500,
      });
      object = result.object;
      inputTokens = result.usage.inputTokens ?? 0;
      outputTokens = result.usage.outputTokens ?? 0;
    }
    const latencyMs = Date.now() - start;
    return {
      variantId: variant.id,
      trialIndex,
      parsed: true,
      schemaValid: true,
      inputTokens,
      outputTokens,
      usd: priceOf(variant.modelId, inputTokens, outputTokens),
      latencyMs,
      output: object,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const { category, message } = categorizeError(err);
    return {
      variantId: variant.id,
      trialIndex,
      parsed: category === "schema-validation", // schema error means JSON came back
      schemaValid: false,
      errorCategory: category,
      errorMessage: message,
      inputTokens: 0,
      outputTokens: 0,
      usd: 0,
      latencyMs,
    };
  }
}

// ─── Reporting ────────────────────────────────────────────────────────────

interface VariantSummary {
  id: string;
  label: string;
  modelId: string;
  trials: number;
  parseRate: number;
  schemaValidRate: number;
  avgUsd: number;
  avgLatencyMs: number;
  errorBreakdown: Record<string, number>;
  sample?: unknown;
}

function summarize(results: TrialResult[], variants: Variant[]): VariantSummary[] {
  return variants.map((v) => {
    const own = results.filter((r) => r.variantId === v.id);
    const parsed = own.filter((r) => r.parsed).length;
    const valid = own.filter((r) => r.schemaValid).length;
    const successCosts = own.filter((r) => r.schemaValid).map((r) => r.usd);
    const avgUsd =
      successCosts.length > 0
        ? successCosts.reduce((a, b) => a + b, 0) / successCosts.length
        : 0;
    const avgLatencyMs =
      own.length > 0
        ? own.reduce((a, b) => a + b.latencyMs, 0) / own.length
        : 0;
    const errorBreakdown: Record<string, number> = {};
    for (const r of own) {
      if (r.errorCategory) {
        errorBreakdown[r.errorCategory] = (errorBreakdown[r.errorCategory] ?? 0) + 1;
      }
    }
    const sample = own.find((r) => r.schemaValid && r.output)?.output;
    return {
      id: v.id,
      label: v.label,
      modelId: v.modelId,
      trials: own.length,
      parseRate: own.length ? parsed / own.length : 0,
      schemaValidRate: own.length ? valid / own.length : 0,
      avgUsd,
      avgLatencyMs,
      errorBreakdown,
      sample,
    };
  });
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function printTable(rows: VariantSummary[]) {
  const cols = [
    pad("ID", 4),
    pad("Variant", 42),
    pad("Parse", 8),
    pad("Schema", 8),
    pad("$/call", 10),
    pad("Latency", 10),
    "Errors",
  ].join(" | ");
  console.log(cols);
  console.log("-".repeat(cols.length + 4));
  for (const r of rows) {
    const errors =
      Object.keys(r.errorBreakdown).length === 0
        ? "—"
        : Object.entries(r.errorBreakdown)
            .map(([k, v]) => `${k}=${v}`)
            .join(",");
    console.log(
      [
        pad(r.id, 4),
        pad(r.label, 42),
        pad(`${(r.parseRate * 100).toFixed(0)}%`, 8),
        pad(`${(r.schemaValidRate * 100).toFixed(0)}%`, 8),
        pad(`$${r.avgUsd.toFixed(4)}`, 10),
        pad(`${Math.round(r.avgLatencyMs)}ms`, 10),
        errors,
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

  // Filter variants if requested
  const selectedIds = args.variantsArg
    ? new Set(args.variantsArg.split(",").map((s) => s.trim()))
    : null;
  const variants = selectedIds ? VARIANTS.filter((v) => selectedIds.has(v.id)) : VARIANTS;

  // Resolve scorer fixture
  const fixtureDir = path.join(
    ".claude",
    "skills",
    "iterate-scenario",
    "fixtures",
  );
  fs.mkdirSync(fixtureDir, { recursive: true });
  const fixturePath = path.join(fixtureDir, `scorer-${scenario.id}.md`);

  let scorerText: string;
  let scorerCost: { inputTokens: number; outputTokens: number; usd: number } = {
    inputTokens: 0,
    outputTokens: 0,
    usd: 0,
  };

  if (!args.refreshFixture && fs.existsSync(fixturePath)) {
    scorerText = fs.readFileSync(fixturePath, "utf8");
    console.log(`▸ Using cached scorer fixture: ${fixturePath}`);
    console.log(`  (${scorerText.length} chars)\n`);
  } else {
    console.log(`▸ Generating scorer markdown (one call to ${SCORER_MODEL_ID})…`);
    const history = transcriptToHistory(FIXTURE_TRANSCRIPT);
    const r = await runScorer(
      scenario.evaluationPrompt,
      history,
      "5 minutes",
      "8 minutes",
    );
    scorerText = r.text;
    scorerCost = {
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      usd: r.usd,
    };
    fs.writeFileSync(fixturePath, scorerText);
    console.log(
      `  Saved (${scorerText.length} chars, ${r.inputTokens}→${r.outputTokens} tokens, $${r.usd.toFixed(4)})\n`,
    );
  }

  // For single-stage variants, build the full scorer-style prompt. The
  // generateObject call replaces both stages.
  const singleStagePromptBody = `${scenario.evaluationPrompt}

${UNIVERSAL_RULES}

# Time
- time spent by the user: 5 minutes
- timeLimit: 8 minutes

# Chat History
The entire chat history is given below:
${transcriptToHistory(FIXTURE_TRANSCRIPT)}

# Output Instructions
Score the student's performance against the rubric above and return a JSON object matching the schema. Every feedbackItem must include a double-quoted excerpt (student's words if they earned the point, or an example of what they could have said if not). Produce at most 3 feedbackItems per task and exactly 3 summary bullets, each ≤200 characters: (1) what went well, (2) what to work on, (3) recommendation.`;

  // Run trials
  const allResults: TrialResult[] = [];
  for (const v of variants) {
    process.stdout.write(`▸ ${v.id}: ${v.label}\n`);
    // Single-stage variants get the full scorer-style prompt as their input;
    // formatter variants get the cached scorer markdown.
    const inputForVariant = v.singleStage ? singleStagePromptBody : scorerText;
    for (let i = 0; i < args.trials; i++) {
      const r = await runTrial(v, inputForVariant, i);
      allResults.push(r);
      const tag = r.schemaValid
        ? "✓"
        : r.parsed
        ? "△"
        : "✗";
      process.stdout.write(
        `  trial ${i}: ${tag} ${r.errorCategory ? `(${r.errorCategory})` : ""} ${r.latencyMs}ms\n`,
      );
    }
  }

  // Summarize
  console.log("\n═══ RESULTS ═══\n");
  const summaries = summarize(allResults, variants);
  printTable(summaries);

  const totalCost =
    scorerCost.usd +
    allResults.reduce((a, r) => a + r.usd, 0);

  console.log("\nLegend: ✓ = parsed + schema-valid · △ = parsed but schema-invalid · ✗ = no JSON / generation error");
  console.log(`\nTotal cost: $${totalCost.toFixed(4)} (scorer one-time: $${scorerCost.usd.toFixed(4)}, formatter trials: $${allResults.reduce((a, r) => a + r.usd, 0).toFixed(4)})`);
  console.log(`Trials per variant: ${args.trials}`);
  console.log(`Scenario: ${scenario.id} (${scenario.title})`);

  // Archive
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = path.join(
    ".claude",
    "skills",
    "iterate-scenario",
    "reports",
    `eval-stress-${scenario.id}-${ts}.json`,
  );
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  fs.writeFileSync(
    archivePath,
    JSON.stringify(
      {
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        timestamp: ts,
        trialsPerVariant: args.trials,
        scorerModel: SCORER_MODEL_ID,
        scorerFixtureChars: scorerText.length,
        scorerCost,
        totalCost,
        summaries,
        rawResults: allResults.map((r) => ({
          ...r,
          // strip large output payloads from raw archive to keep it small;
          // sample is preserved on the per-variant summary instead
          output: undefined,
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

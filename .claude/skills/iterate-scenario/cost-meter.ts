/**
 * Tracks cumulative token usage and estimated cost across all model calls
 * in a harness run. Prices below are approximate (as of Q1 2026) and may drift;
 * the goal is order-of-magnitude cost sanity, not billing accuracy.
 */

type Pricing = { inputPerM: number; outputPerM: number };

const PRICING: Record<string, Pricing> = {
  "llama-3.3-70b-versatile": { inputPerM: 0.59, outputPerM: 0.79 },
  "llama-3.1-8b-instant": { inputPerM: 0.05, outputPerM: 0.08 },
  "qwen/qwen3-32b": { inputPerM: 0.29, outputPerM: 0.59 },
  "deepseek-ai/DeepSeek-V3.1": { inputPerM: 0.27, outputPerM: 1.1 },
  "zai-glm-4.7": { inputPerM: 5.0, outputPerM: 15.0 },
};

const FALLBACK: Pricing = { inputPerM: 2.0, outputPerM: 6.0 };

type StageId =
  | "patient"
  | "student"
  | "task-check"
  | "eval-scorer"
  | "eval-formatter"
  | "adjudicator";

export interface CostEntry {
  stage: StageId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  usd: number;
}

export class CostMeter {
  private entries: CostEntry[] = [];

  record(
    stage: StageId,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): CostEntry {
    const key = Object.keys(PRICING).find((k) => model.includes(k));
    const p = key ? PRICING[key] : FALLBACK;
    const usd =
      (inputTokens / 1_000_000) * p.inputPerM +
      (outputTokens / 1_000_000) * p.outputPerM;
    const entry: CostEntry = { stage, model, inputTokens, outputTokens, usd };
    this.entries.push(entry);
    return entry;
  }

  total(): number {
    return this.entries.reduce((sum, e) => sum + e.usd, 0);
  }

  byStage(): Record<string, { usd: number; calls: number; tokens: number }> {
    const out: Record<string, { usd: number; calls: number; tokens: number }> = {};
    for (const e of this.entries) {
      if (!out[e.stage]) out[e.stage] = { usd: 0, calls: 0, tokens: 0 };
      out[e.stage].usd += e.usd;
      out[e.stage].calls += 1;
      out[e.stage].tokens += e.inputTokens + e.outputTokens;
    }
    return out;
  }

  snapshot() {
    return {
      total: Number(this.total().toFixed(4)),
      byStage: Object.fromEntries(
        Object.entries(this.byStage()).map(([k, v]) => [
          k,
          {
            usd: Number(v.usd.toFixed(4)),
            calls: v.calls,
            tokens: v.tokens,
          },
        ]),
      ),
    };
  }
}

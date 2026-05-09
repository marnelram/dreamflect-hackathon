---
name: iterate-scenario
description: Use when the user wants to iterate on, test, or fix bugs in LeetCare patient scenarios — including when they say "iterate on the scenarios", "test the scenarios", "fix scenario bugs", "check my scenario", "run the scenario harness", "auto-test this scenario", "find bugs in the scenario", "run the iteration skill", or similar phrases about quality-checking the scenario data in `src/lib/test-data/example-module.ts`. Drives the tsx harness in this skill folder, reads generated reports, proposes and applies edits to scenario fields (personaPrompt / tasks / acceptanceCriteria / clinicalBackground / startingMessage), and loops until bugs stop flagging. Not for running real users against live scenarios, not for the Scenario CRUD routes, and not for the workup system.
metadata:
  version: 0.1.0
---

# Iterate Scenario

You drive an automated iteration loop on LeetCare patient scenarios. The goal: find bugs the developer would otherwise catch only by manually clicking through the scenario, fix them by editing the scenario definition, and repeat until bugs stop flagging — then ping the developer.

## Step 0: Manual sanity pass (BEFORE the harness)

Before invoking the harness on a scenario for the first time in a session, do a brief manual playthrough as a "title-only naive student." This catches design flaws (redundant tasks, misleading hints, mismatches between starting message and task list) that LLM personas mask because they play along with anything.

For each scenario:

1. Read `startingMessage`, `tasks[].title` (titles ONLY — no descriptions or hints), and `clinicalBackground` headings.
2. Spend ~5 turns role-playing as a literal-minded student who acts only on what task titles say. Track: does any task feel redundant given the starting message? Does any title sound like one thing but mean another? Is the patient response system asking for info the patient just volunteered?
3. **Patient pacing check.** Read `personaPrompt`'s `<concerns>` block. Is there a concern (a question the patient wants to ask, like a comparison or recommendation question) that could surface BEFORE the student gathers the basic case data for Task 1? If yes, check whether `<concerns>` has a "wait for the pharmacist to ask their assessment questions first" rule. If not, flag it — the student will likely lose Task 1 not because they failed, but because the patient pre-empted them.
4. **Rubric structure check.** Read `evaluationPrompt`. The header should say `# Rubric (15 pts total)` for a standard 4-task scenario, with `## Task 1`–`## Task 4`, a `## Communication (3 pts)` section, and `## Summary`. The `rubric` field (in-scenario panel) should mirror this structure with generic-wording sub-bullets. Flag any drift.
5. Surface what you noticed in 3–5 bullets to the developer **before running the harness**, and ask whether to apply fixes first.

This pass is free (just your context, no API spend). It catches the highest-value pedagogical issues that the automated harness historically misses. Stanley's titles-only view partially covers this but a human-judgment pass is cheaper and stronger.

## What you're iterating on

Target file: `src/lib/test-data/example-module.ts`.

Each scenario in this file has: `scenarioContext`, `clinicalBackground`, `startingMessage`, `personaPrompt`, `evaluationPrompt`, and a `tasks[]` array (each task has `title`, `description`, `hint`, `acceptanceCriteria`).

The four current scenario IDs:

- `scn_infant_triage_001` — Triage Assessment
- `scn_product_selection_001` — Product Selection
- `scn_patient_counseling_001` — Patient Counseling
- `scn_infant_pain_001` — Complete Case

Plus the tutorial scenario (loaded from `src/lib/tutorial/scenario-data.ts`):

- `tutorial-scenario` — OTC Counseling: Constipation

Edit whatever fields are needed to fix a bug. Nothing is off-limits.

## The harness

The harness is a tsx script that replays the scenario end-to-end against synthetic student personas. Run it per scenario:

```bash
npx tsx .claude/skills/iterate-scenario/harness.ts \
  --scenario <scenarioId> \
  --iteration <N>
```

Flags:

- `--personas allison,olivia,stanley,larry,sam` (default: all 5)
- `--mode quick` (default) or `--mode full`
  - **quick** = 1 trial × all personas + rubric eval on first persona. Default. Use for normal iteration.
  - **full** = 3 trials × all personas + rubric eval on first persona. Use to confirm convergence with multi-trial signal.
- `--trials N` — overrides the mode default (1 for quick, 3 for full).

The personas:

- **Straight A Allison** (`allison`) — ceiling-test persona. Issues `<lookup>` before any age cutoff, threshold, contraindication, or referral decision. Holds her recommendation through 2-3 rounds of pushback on absolute rules. Answers "is 12/12 achievable on this scenario?" Rubric runs on her by default since she's first in the list.
- **Overconfident Olivia** (`olivia`) — realism baseline. Strong P3 student who relies on training intuition over the reference and can be talked into softening recommendations under gentle pushback. Mirrors what most strong students actually do at the counter.
- **Struggling Stanley** (`stanley`) — underprepared P1, **sees titles only** (no descriptions, hints, or criteria). Interprets titles literally; sometimes confuses drug names; rarely looks things up. Surfaces design flaws where the title alone is misleading AND where the patient persona doesn't gracefully handle student errors.
- **Lookup Larry** (`larry`) — leans on the drug reference. Issues `<lookup>` before every drug, dose, cutoff, or red-flag claim. Stress-tests `clinicalBackground` content gaps.
- **Skeptic Sam** (`sam`) — re-asks, probes for inconsistencies, revisits earlier answers. Stress-tests patient persona consistency.

The harness writes to `.claude/skills/iterate-scenario/reports/<scenarioId>-<timestamp>-iter<N>/`:

- `manifest.json` — raw detector candidates + per-persona task-firing summaries + full rubric eval JSON. **Read this first — Claude judges from it.**
- `report.md` — human-readable summary.
- `transcripts/<persona>-trial<k>.md` — full conversation, task firing log, lookup log, rubric (if first persona). Open when you need turn-by-turn context.
- `allowlist.json` — false-positive suppressions (reloaded on each run).

Harness requires `GROQ_API_KEY` and `CEREBRAS_API_KEY` in `.env` (already used by the app). `dotenv` auto-loads on start.

## Signals the harness captures

- **Patient response** — per turn, at temp 0.7, same prompt composition as `src/app/api/chat/route.ts`.
- **Task firing** — after each student turn, the task-check pipeline runs for every task. Per-task firing events (first-fired turn, student turn at firing, end-of-trial state) are summarized into `taskFiring[]` per trial. Claude reads this alongside the transcript to spot under-fires (criteria met but checker said no) and over-fires (checker said yes when it shouldn't).
- **Lookup activity** — students emit `<lookup query="..." />`; harness returns the top-matching section from `clinicalBackground`. A lookup miss on info a student needs signals a content gap.
- **Rubric** — full two-stage evaluation (zai-glm-4.7 scorer → qwen-3-235b-a22b-instruct-2507 JSON formatter). Runs in BOTH modes, on the first persona's first trial only. Full rubric JSON lands in `manifest.json` under `perPersona[0].rubric` — Claude reads it directly to spot feedback that's too long, missing quotes, etc.
- **Style / voice** — regex pre-filters flag candidate turns (multi-speaker, clinical-precision tells, turn-1 overshare, multiple questions per turn, no-show-don't-tell). Candidates land in `manifest.json` raw — there is **no LLM adjudicator stage**. Claude is the adjudicator now: read each candidate's `fullTurn` + `prior` + `rule` and decide.

Tier (`critical` vs `advisory`) is just a sort hint — Claude judges every candidate. With 3 trials in `--mode full`, the manifest reports `hitsAcrossTrials/totalTrials` so Claude can weigh signal strength (a candidate firing in 1/3 trials is probably temperature noise; 3/3 is real).

## Execution loop

For **each scenario** in `example-module.ts` (or `tutorial-scenario` from `src/lib/tutorial/scenario-data.ts`), run iterations 1..5 until a stop condition fires.

Use **`--mode quick`** for normal iteration (default; 1 trial × 4 personas + rubric). Use **`--mode full`** when you want multi-trial signal to confirm a fix has truly converged (3 trials × 4 personas + rubric).

1. **First iteration:** `npx tsx .claude/skills/iterate-scenario/harness.ts --scenario <id> --iteration 1`  (quick mode by default)
2. Read `manifest.json`:
   - `bugs.critical[]` and `bugs.advisory[]` — raw detector candidates. Judge each using `fullTurn`, `prior`, `rule`, and the persona's behavior. Reject false positives, accept real bugs.
   - `perPersona[].trials[].taskFiring[]` — did each task fire when it should have? Cross-reference with the transcript at the relevant `firstFiredTurnIndex`.
   - `perPersona[0].rubric` — read the rubric eval output directly. Look for feedback that's too long, missing quoted excerpts, or summary bullets exceeding 3.
3. If you judge no real bugs → scenario is clean; move on.
4. Otherwise, for each real bug, propose the smallest targeted edit to the scenario file that would resolve it. Apply with Edit. Do NOT rewrite sections wholesale; preserve intent.
5. **Subsequent iterations:** re-run with default (quick) to check if the edit fixed the bugs. When you believe it has, run `--mode full` once to confirm with multi-trial signal.

### Stop conditions (any one):

- Zero real bugs (after Claude's judgment of the manifest).
- Real-bug count fails to strictly decrease across 2 consecutive iterations.
- Iteration ≥ 5.
- A regression appears on 2 consecutive iterations (a previously-clean `(persona, detectorId, patternHash)` re-flags).

When you stop, move to the next scenario.

After all 4 scenarios are processed, read the 4 final reports together and write a cross-scenario summary to `reports/_cross-scenario-<timestamp>.md` flagging patterns that appear in multiple scenarios (e.g. rubric feedback always missing quotes; multiple personas over-sharing on turn 1).

## Edit heuristics — which field fixes which bug

| Detector                           | Likely fix target                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `multi-speaker`                    | `personaPrompt` — clarify there's one speaker, or how to attribute companion voices              |
| `clinical-precision-tell`          | `personaPrompt` — move clinical values into "things the patient only knows if asked" section     |
| `turn-1-overshare`                 | `personaPrompt` (split into "known at a glance" vs "only if asked") AND/OR trim `startingMessage` |
| `multiple-questions`               | `personaPrompt` — reinforce "one question at a time"                                             |
| `no-show-dont-tell`                | `personaPrompt` — reinforce italic-action / quoted-dialogue style                                |
| Patient pre-empts Task 1 (manual judgment from transcripts — patient asks their comparison/recommendation question before student has gathered basic case data) | `personaPrompt` `<concerns>` — add a "wait for the pharmacist to ask their assessment questions first" rule near the top, and reorder concerns so assessment-friendly ones come before comparison/recommendation ones. See "Patient pacing" in [scenario-authoring-guide.md](scenario-authoring-guide.md). |
| `task-under-fired`                 | `tasks[].acceptanceCriteria` — add or rewrite criteria to match realistic student phrasing       |
| `task-over-fired`                  | `tasks[].acceptanceCriteria` — tighten criteria to exclude the false-positive phrasing           |
| `rubric-feedback-too-long`         | `evaluationPrompt` — instruct shorter per-item feedback                                          |
| `rubric-feedback-missing-quote`    | `evaluationPrompt` — require a double-quoted excerpt per item                                    |
| `rubric-summary-too-long`          | `evaluationPrompt` — cap summary at 3 bullets                                                    |
| Rubric section split (one task heading rendering as multiple stacked single-bullet boxes in the eval panel — manual judgment from `perPersona[0].rubric`) | NOT a per-scenario fix. The formatter prompt in [src/app/api/(scenario)/evaluation/route.ts](../../../src/app/api/(scenario)/evaluation/route.ts) must enforce "each heading becomes ONE task object". Surface to the developer rather than rewriting the scenario. |
| Missing `## Communication` section in `evaluationPrompt` or `rubric` | Both fields — add a `## Communication (3 pts)` section per the template in [scenario-authoring-guide.md](scenario-authoring-guide.md) Step 5, and update the `# Rubric (X pts total)` header to 15. |
| `lookup` hit-rate low (advisory)   | `clinicalBackground` — add or clarify the missing section                                        |

## Pinning rules (do NOT break these)

- Do **not** modify `.claude/skills/iterate-scenario/detectors.ts`, `personas.ts`, `harness.ts`, `lookup.ts`, or `cost-meter.ts` during a run. If a detector looks wrong, either allowlist the specific pattern (append to `reports/allowlist-<scenarioId>.json`) or surface the issue in the cross-scenario summary for the developer.
- Do **not** touch `src/lib/validation/evaluation.ts` or the production routes under `src/app/api/(scenario)/` during iteration — those were prepared as prerequisites and are load-bearing.
- Do **not** run the harness in parallel for multiple scenarios. Sequential only. Each invocation covers one scenario × all personas × N trials (1 in quick, 3 in full).

## Reading manifest.json efficiently

`manifest.json` has everything you need at the top level:

- `bugs.critical[]` / `bugs.advisory[]` — raw detector candidates, deduplicated by `(persona, detectorId, patternHash)`. Each has `personaId`, `detectorId`, `rule`, `example.fullTurn`, `meta`, plus `hitsAcrossTrials/totalTrials` so you can weigh how reliably it fires (matters in full mode; in quick mode every candidate is 1/1).
- `perPersona[].trials[].taskFiring[]` — one entry per task per trial: `firstFiredTurnIndex`, `firstFiredStudentTurn`, `reasonAtFiring`, `firedByEnd`. Scan for tasks that never fired (under-fire candidate) or fired off a turn that doesn't actually meet the criteria (over-fire candidate).
- `perPersona[0].rubric` — full rubric eval JSON. Check feedback length (≤300 chars), quoted excerpts, summary bullet count (≤3).
- `perPersona[].trials[].transcriptFile` — only open for a trial if you need turn-by-turn context to confirm a candidate.
- `cost.total` and `cost.byStage` — situational awareness.

Do not load every transcript by default. They're large.

## When to stop and ping the developer

Ping (= print a final summary with the report paths) when:

- All 4 scenarios have converged (0 critical bugs), OR
- Any scenario has hit a stop condition other than "0 critical" (stalled, iteration cap, regressions).

The ping should include:

- Per-scenario final real-bug count (after Claude's judgment) and total iterations used.
- Total cost across all runs.
- The single biggest cross-scenario pattern (if any).
- Paths to `manifest.json` and `report.md` for each scenario so the developer can drill in.

Do NOT auto-commit edits. The developer reviews the diff of `example-module.ts` before committing.

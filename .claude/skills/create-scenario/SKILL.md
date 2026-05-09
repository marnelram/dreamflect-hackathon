---
name: create-scenario
description: Use when the user wants to draft ONE complete LeetCare patient scenario — including phrases like "draft a scenario about X", "fill in the next stub", "create a scenario where a parent asks about Tylenol dosing", "write a new scenario for the module", "draft the triage scenario", or similar requests about authoring a single scenario in detail (personaPrompt, tasks, clinicalBackground, evaluationPrompt, rubric). Pulls patient + teaching moment from an existing stub in `src/lib/test-data/example-module.ts` (or from user input), writes a complete `Scenario` object, runs one quick harness iteration, applies obvious fixes, and hands back to the user. Not for designing a whole module's curriculum (use `/create-module`) and not for converging bugs over multiple iterations (use `/iterate-scenario`).
metadata:
  version: 0.1.0
---

# Create Scenario

You draft ONE complete LeetCare patient scenario from a teaching moment + patient sketch. The deliverable: a full `Scenario` object written into `src/lib/test-data/example-module.ts` (replacing a stub or appending), validated, run through one quick harness iteration, with obvious bugs already fixed.

## What this skill is for

A scenario is a *writing decision* — how to make the patient believable, how to gate clinical info, how to score performance. The output is one fully-drafted Scenario object plus a one-iteration harness pass that catches the highest-confidence bugs.

After this skill runs, the user typically runs `/iterate-scenario` to converge the remaining bugs over more iterations.

If the user wants to design a whole module's curriculum (the sequence of teaching moments), they want `/create-module`. If they want to keep iterating bugs on an already-drafted scenario, they want `/iterate-scenario`. Stop and redirect in either case.

## The canonical authoring rules

This skill DEFERS to [scenario-authoring-guide.md](../iterate-scenario/scenario-authoring-guide.md) for every authoring decision (tone, structure, anti-patterns, healthy score ranges). Read that file before drafting any field. The phases below are the workflow; the guide is the substance.

The gold-standard reference scenario is captured in [reference-scenario.md](reference-scenario.md). When uncertain about field shape, copy the structure from there.

## Phases

### Phase 1 — File-state check

Read `src/lib/test-data/example-module.ts`. Decision tree:

| File state | Action |
|------------|--------|
| Has module + ≥1 stub scenarios (content fields contain `"[STUB —"`) | List stubs by `id` + `title`, ask which slot to fill (or accept a user reference like "the triage one"). Replace that scenario's slot. |
| Has module + all scenarios drafted (no `[STUB —` markers) | Ask: "All slots are drafted. Append a new scenario to this module, or replace an existing one?" |
| File missing, empty, or non-stub format | WARN: `"No module plan found. I recommend running /create-module first to scaffold the curriculum. Continue anyway? This will overwrite the file with a single-scenario module."` Wait for confirmation before proceeding. |

The marker for a stub is the literal substring `"[STUB — fill via /create-scenario]"` in any of the content fields. Empty `tasks: []` is also a strong signal but not definitive.

### Phase 2 — Inputs gather

For the chosen slot, pull from the stub:

- `title`
- `patientName`, `patientDob`, `patientGender`, `timeLimit`
- The teaching moment (often documented in the curriculum-plan table the user kept; if not in the stub, ask).
- The patient sketch (1-line demographic + presenting complaint).

Ask the user only for what's missing or ambiguous. Optionally ask:

> What's the one thing the student must catch? (The "test moment" — e.g. age-based ER cutoff, drug contraindication, dose limit. If you don't know yet, that's fine — we can refine.)

Don't ask more than 2-3 questions total. The authoring guide's Step 0 lists 4 questions to plan a scenario; you can answer most of them yourself from the stub.

### Phase 3 — Research

Use **WebSearch** for guideline pages (AAP, NICE, specialty society guidelines, Lexicomp summaries, FDA labels) and **PubMed MCP** (`mcp__claude_ai_PubMed__search_articles`) for primary literature on the teaching moment.

NOT Context7 (that's for dev docs).

Cap research at ~3-5 sources. The goal is grounding `clinicalBackground` claims (rates, thresholds, dosing, interactions) in current evidence — not writing a literature review. Note the URLs as you go; you'll cite them in the References section.

### Phase 4 — Draft in order

Mirror Steps 1-5 of the authoring guide. Draft these fields in this order:

1. **`scenarioContext`** — one paragraph: goal + time limit + scene-setting. See the reference scenario for the shape.
2. **`startingMessage`** — 1-3 sentences. `*stage direction*` + `"chief complaint + ONE question"`. Volunteer the chief complaint, gate everything else.
3. **`personaPrompt`** — 5-block structure: identity paragraph + `<background>` + `<hiddenInfo>` + `<personality>` + `<concerns>` + `<formatting>`. Lock all precise facts (numbers, methods, exact ages, exact symptoms) behind `<hiddenInfo>` with "only state when asked". If a single critical pivot defines the teaching moment, mark its concern as **directive** (`**CRITICAL: You MUST mention X by turn N**`). **If the patient has a question of their own (e.g. comparison, recommendation, "is this safe?") that could pre-empt the student's first task, add a "wait for the pharmacist to ask their assessment questions first" rule near the top of `<concerns>` and order the lower-priority concerns AFTER the assessment-friendly ones.** See "Patient pacing" in [scenario-authoring-guide.md](../iterate-scenario/scenario-authoring-guide.md).
4. **`tasks[]`** — 4 tasks. Each:
   - `title` ≤ 50 chars (action-oriented, reads cleanly in isolation; see [task-charlimit-checklist.md](task-charlimit-checklist.md)). **Names the action category, NOT the correct answer.** "Make a triage decision" ✓ — "Refer to the ER" ✗
   - `description` ≤ 200 chars (what to DO, no answer leak)
   - `hint` ≤ 200 chars (the actual clinical answer, gated behind a button)
   - `acceptanceCriteria` (clear AND/OR logic; lenient subset of rubric — fires on "good enough"). **Gates on the action being performed, NOT on getting the right answer.** A confidently-wrong student (e.g. recommends Tylenol for a 10-week-old) should still complete the task — the rubric grades correctness with quoted excerpts. See the "tasks check actions, the rubric grades correctness" principle in [scenario-authoring-guide.md](../iterate-scenario/scenario-authoring-guide.md).
5. **`clinicalBackground`** — informational tone, content-based headers (NOT task-labeled), prose-first, References section at the bottom citing the URLs from Phase 3, no em dashes, no second-person ("you'll want", "you can't"), no advisory phrasing, no communication-style coaching. Length target: ~50-80 lines of markdown for an 8-min scenario.
6. **`evaluationPrompt`** — markdown with `# Role`, `# Scenario`, `# Instructions`, `# Rubric (15 pts total)`, `## Task 1`–`## Task 4`, `## Communication (3 pts)`, `## Summary`. 4 tasks × 3 specific-keyword sub-bullets each + Communication × 3 sub-bullets. Each sub-bullet must be independently scoreable. Communication is graded implicitly — it does NOT correspond to an in-session task. See "The Communication section" in [scenario-authoring-guide.md](../iterate-scenario/scenario-authoring-guide.md) Step 5 for sub-bullet templates.
7. **`rubric`** — same structure as `evaluationPrompt` (4 tasks + Communication, 15 pts total), generic verbs only (no spoilers). The student sees this DURING the scenario via the "View Rubric" dialog. Communication section is included so the student knows they will be graded on it; they just do not see a checkbox for it during play.
8. **`voiceId`** — silently auto-pick from [voice-mapping.md](voice-mapping.md) based on patient demographics (gender, age range, accent cues from sketch).
9. **`patientInfo`** — markdown demographic block. `**Patient:**`, `**DOB:**`, `**Sex:**`, `**Allergies:**`, `**Medications:**`, `## History`, `## Today's Presenting Concern`. See reference scenario for shape.
10. **`patientName`, `patientDob`, `patientGender`, `timeLimit`** — preserve from stub unless the user explicitly changed them.

### Phase 5 — Pre-write validation

Before writing to the file, run these checks against the draft:

- **Char limits**: every `task.title` ≤ 50, every `description` and `hint` ≤ 200. Trim if over.
- **Em-dash scan**: search `clinicalBackground` for `—`. If any found, rewrite with commas, parentheses, or sentence breaks (HARD RULE per the authoring guide).
- **Second-person scan**: search `clinicalBackground` for "you'll", "you can't", "you should", "we'll", "we want". Rewrite passively or in third-person.
- **Eval point math**: `evaluationPrompt` should have `# Rubric (15 pts total)` for 4 tasks × 3 sub-bullets + Communication × 3 sub-bullets. Adjust if you wrote a non-standard number of tasks.
- **Communication section present**: both `evaluationPrompt` and `rubric` must include a `## Communication (3 pts)` section with three sub-bullets (open-ended questions / empathy / logical flow). Specific examples in the eval prompt, generic verbs in the rubric.
- **Patient pacing**: if the persona has any concern that could pre-empt Task 1 (a question they want to ask, like a comparison or recommendation), `<concerns>` must contain a "wait for the pharmacist to ask their assessment questions first" directive near the top.
- **Rubric/eval mirror**: `rubric` task titles must match `tasks[].title` 1:1 and `evaluationPrompt` `## Task N:` headings 1:1. The Communication section also appears in both fields.
- **`patientDob`**: must be `new Date("YYYY-MM-DD")`, not a string.
- **Stub markers gone**: no `"[STUB — "` substrings anywhere in the new scenario object.

### Phase 6 — Write

Edit `src/lib/test-data/example-module.ts`. Replace the chosen stub object (or append a new one) with the full draft. Insert the `// IMAGE PROMPT: ...` comment line directly above the scenario object's opening `{`. The image prompt should describe the patient at the pharmacy counter in 1-2 sentences (e.g. `// IMAGE PROMPT: Anxious 32-year-old Black mother in casual wear, holding a swaddled newborn, standing at a community pharmacy counter, photorealistic, soft daylight.`).

After writing, verify the file compiles by running:

```bash
npx tsc --noEmit
```

If type errors, fix them before continuing to the harness phase.

### Phase 7 — Auto-handoff to harness

Run one quick iteration of the iterate-scenario harness:

```bash
npx tsx .claude/skills/iterate-scenario/harness.ts --scenario <id> --iteration 1
```

`--mode quick` is the default (1 trial × 4 personas + rubric eval on first persona). Wait for the harness to complete. Cost: ~$0.20.

The harness writes to `.claude/skills/iterate-scenario/reports/<scenarioId>-<timestamp>-iter1/manifest.json`.

### Phase 8 — Read manifest, apply conservative fixes

Read the `manifest.json` produced. Apply fixes ONLY for `bugs.critical[]` candidates that have a clear edit-heuristic mapping per the table in [iterate-scenario/SKILL.md](../iterate-scenario/SKILL.md):

| Detector | Likely fix |
|----------|------------|
| `multi-speaker` | `personaPrompt` — clarify single speaker |
| `clinical-precision-tell` | `personaPrompt` — move into `<hiddenInfo>` |
| `turn-1-overshare` | `startingMessage` + `personaPrompt` |
| `multiple-questions` | `personaPrompt` — reinforce "one question at a time" |
| `no-show-don't-tell` | `personaPrompt` — reinforce italic-action style |
| `task-under-fired` | `tasks[].acceptanceCriteria` — broaden to match phrasing |
| `task-over-fired` | `tasks[].acceptanceCriteria` — tighten to exclude false positive |
| `rubric-feedback-too-long` | `evaluationPrompt` — instruct shorter feedback |
| `rubric-feedback-missing-quote` | `evaluationPrompt` — require quoted excerpt |

Skip:
- Advisory candidates (pass through unfixed).
- Critical candidates without a clear edit-heuristic mapping (pass through to user).
- Anything you're uncertain about — better to surface it than auto-fix.

Do NOT loop or run a second iteration. That's `/iterate-scenario`'s job.

### Phase 9 — Hand-back summary

Print a final summary:

```
Drafted [scenarioId]: [title]
  Voice: [voiceId] (auto-picked for [demographic blurb])

Iteration 1 complete:
  Critical bugs flagged: N
  Advisory bugs flagged: M
  Fixes applied: K (targeting: [detector list])
  Rubric snapshot: X/12

Run /iterate-scenario to continue iterating.
Report: .claude/skills/iterate-scenario/reports/<scenarioId>-<ts>-iter1/
```

## Tools used

- `Read` — file state, authoring guide, reference snapshot, voice mapping, Prisma schema, manifest.json
- `WebSearch` — guideline pages, FDA labels
- `mcp__claude_ai_PubMed__search_articles` — primary literature (load via ToolSearch on first call)
- `Edit` — target: `src/lib/test-data/example-module.ts` only
- `Bash` — `npx tsx ...harness.ts ...` invocation only

## Pinning rules

- Do NOT edit any file outside `src/lib/test-data/example-module.ts`. The skill's only write target is the staging file.
- Do NOT skip the file-state check. Replacing the wrong stub silently is the worst failure mode.
- Do NOT run more than one harness iteration. Convergence is `/iterate-scenario`'s job.
- Do NOT auto-fix advisory candidates or critical candidates without clear heuristic mappings. Surface them to the user instead.
- Do NOT load `voice_profile_marnel.md`. That's the user's personal blog voice, not scenario content. Scenario tone is governed by the authoring guide.
- Do NOT modify any file in `.claude/skills/iterate-scenario/` (harness.ts, detectors.ts, personas.ts, lookup.ts, cost-meter.ts, allowlist files).
- Do NOT auto-commit. The user reviews the diff before committing.

## After this skill

Typical next steps for the user:

1. Inspect the diff — confirm the draft reads cleanly and matches their intent.
2. Run `/iterate-scenario` to converge remaining bugs over more iterations.
3. Once converged, repeat `/create-scenario` for the next stub in the module.
4. When all scenarios in the module are drafted and converged, manually promote via `POST /api/import-module`.

---
name: create-module
description: Use when the user wants to scaffold a new LeetCare module (scenario pack) from a topic — including phrases like "create a new module on hypertension", "scaffold a pediatric pain module", "design a module for OTC cough", "draft a module curriculum", "plan a scenario pack about X", or similar requests about designing the *flow* of a module (the sequence of teaching moments) rather than drafting any one scenario in detail. Wipes `src/lib/test-data/example-module.ts` and writes a fresh `Module` skeleton with 4-6 stub scenarios. Does NOT draft full scenarios — that is `/create-scenario`. Not for editing live DB modules and not for promoting modules to production (use `POST /api/import-module`).
metadata:
  version: 0.1.0
---

# Create Module

You design a curriculum for a new LeetCare module from a topic. The deliverable: a fresh `Module + Scenario[]` skeleton in `src/lib/test-data/example-module.ts` with 4-6 stub scenarios, each carrying a teaching moment, patient sketch, and structural fields. You do NOT draft personaPrompt, clinicalBackground, tasks, or any other content — that's `/create-scenario`'s job, run separately for each stub.

## What this skill is for

A module is a *curriculum decision* — what teaching moments to cover and in what order. Once decided, it doesn't change. The output is a thin scaffold the user fills in scenario-by-scenario via `/create-scenario`.

If the user wants to draft an actual scenario (write `personaPrompt`, define tasks, write `clinicalBackground`), they want `/create-scenario`. Stop and redirect.

## Phases

### Phase 1 — Topic intake

Accept the topic and pharmacy setting. If either is missing, ask one consolidated question:

> What's the topic and which pharmacy setting (community / ambulatory care / hospital / infusion)?

The four valid settings are the `PharmacySetting` enum in [prisma/schema.prisma](../../../prisma/schema.prisma):

- `COMMUNITY` — retail dispensing, OTC counseling
- `AMBULATORY_CARE` — clinic-based, chronic disease management
- `HOSPITAL` — inpatient care, acute conditions
- `INFUSION` — specialty medications, infusion therapy

Then probe lightly to scope the module:
- Patient population (pediatric? geriatric? adult?)
- Difficulty range (intro / intermediate / advanced)
- Anything specific the user already wants covered

Don't ask more than 2-3 questions total. Move to research.

### Phase 2 — Curriculum research

Use **WebSearch** for guideline pages (AAP, NICE, specialty society guidelines, Lexicomp summaries, FDA labels) and **PubMed MCP** (`mcp__claude_ai_PubMed__search_articles`) for primary literature on the topic.

Goal: identify the 4-6 highest-value teaching moments at the pharmacy counter for this topic. Each teaching moment should be:

- **One specific clinical decision the pharmacist must get right** (e.g. "any rectal fever in <3 mo → ER", "don't use aspirin in pediatric viral illness", "lisinopril is contraindicated in pregnancy").
- **Patient-counter-shaped** — must be something a community/amb-care/hospital/infusion pharmacist can actually act on without ordering labs.
- **Distinct from the others in the module** — no overlap.

NOT Context7 (that's for dev docs, not clinical guidelines).

Cap research at ~5-8 sources total.

### Phase 3 — Plan presentation

Present the curriculum plan to the user as a markdown table BEFORE writing anything to disk:

```
Module: <title>
Topic ID: topic_<setting_short>_<topic_short>
Setting: <PharmacySetting>
Goal: <one-sentence learning objective for the whole module>

| # | Scenario title | Teaching moment | Patient sketch | timeLimit |
|---|----------------|-----------------|----------------|-----------|
| 1 | Triage Assessment | Recognize age-based ER cutoff | Aisha, 32yo mom + 10wo daughter, fever ~3hr | 480 |
| 2 | Product Selection | ... | ... | ... |
```

Hold for the user to confirm or revise. Iterate the table with them — don't write the file until they say go.

Conventions:
- 4-6 scenarios per module. Three is too thin; seven is fatigue.
- Order them pedagogically — intro/triage scenarios first, complex/multi-decision scenarios last.
- `timeLimit` in seconds. Typical values: 360 (6min) for short triage, 480 (8min) for standard, 600 (10min) for complex multi-decision cases.
- Patient sketches are 1-line: name, demographics, presenting complaint. The full personaPrompt comes later.

### Phase 4 — Confirm wipe

Before writing, explicitly confirm with the user:

> This will overwrite `src/lib/test-data/example-module.ts`, replacing the current module (`<current-module-id-or-empty>`) with the new one. Proceed?

This is a destructive action and gets explicit approval every time.

### Phase 5 — File write

Wipe `src/lib/test-data/example-module.ts` and write a fresh `testData` literal. The shape MUST match the existing file's typing:

```typescript
import { Module, Scenario, Task } from "@prisma/client";

export const testData: Module & {
  scenarios: (Scenario & { tasks: Task[] })[];
} = { /* ... */ };
```

Every required Prisma field on Module and Scenario MUST be populated. See [module-scaffold-template.md](module-scaffold-template.md) for the exact shape and field-by-field requirements.

For each stub scenario:
- Structural fields populated for real (`id`, `moduleId`, `creatorId: "admin"`, `order`, `title`, `voiceId: "Elizabeth"` (default — `/create-scenario` will pick a real one), `timeLimit`, `image: null`, `patientAvatar: null`, `createdAt: new Date()`, `updatedAt: new Date()`, `patientName`, `patientDob: new Date("YYYY-MM-DD")` computed from sketch age, `patientGender`).
- Content fields set to placeholder string `"[STUB — fill via /create-scenario]"` (satisfies Prisma NOT NULL on import; chat API will reject at runtime — stubs are not playable).
- `tasks: []` (empty array — easier to spot than placeholder tasks).
- `// IMAGE PROMPT: <one-line scene description>` comment line directly above the scenario object's opening `{`.

Topic ID convention: see [topic-id-conventions.md](topic-id-conventions.md). Format: `topic_<setting_short>_<topic_short>` (e.g. `topic_comm_otc_peds`, `topic_amb_diabetes`, `topic_hosp_anticoag`).

Module ID convention: `mod_<topic_short>_<seq>_001` (e.g. `mod_otc_peds_001`).

Scenario ID convention: `scn_<topic_short>_<seq>_NNN` numbered from 001 (e.g. `scn_otc_peds_001`, `scn_otc_peds_002`).

These IDs are committed at scaffold time and `/create-scenario` MUST preserve them when filling stubs.

### Phase 6 — Hand-off summary

Print a final summary:

```
Module scaffolded: <module-id>
  Topic: <topic-id> (<setting>)
  Stubs created: N
    - scn_<...>_001 — <title>
    - scn_<...>_002 — <title>
    - ...

Run /create-scenario for each stub to draft them.
Stubs are NOT playable — they will throw at the chat API until drafted.
```

## Required Prisma fields cheat-sheet

Cross-reference against [prisma/schema.prisma](../../../prisma/schema.prisma) when in doubt. Every required field MUST appear in the literal:

**Module**: `id`, `topicId`, `title`, `description`, `order`, `createdAt`, `updatedAt`.

**Scenario**: `id`, `moduleId`, `creatorId`, `title`, `order`, `image` (nullable, set null), `patientAvatar` (nullable, set null), `createdAt`, `updatedAt`, `scenarioContext`, `clinicalBackground`, `evaluationPrompt`, `rubric`, `startingMessage`, `patientInfo`, `personaPrompt`, `voiceId`, `timeLimit` (nullable Int but always set), `patientName`, `patientDob`, `patientGender`.

**Task** (use empty `tasks: []` for stubs, but for reference): `id`, `scenarioId`, `order`, `title`, `description`, `hint`, `acceptanceCriteria`.

`patientDob` MUST be `new Date("YYYY-MM-DD")` — a Date object, not a string. The import route at [src/app/api/import-module/route.ts](../../../src/app/api/import-module/route.ts) expects a Date.

## Tools used

- `WebSearch` — guideline pages, Lexicomp summaries, FDA labels
- `mcp__claude_ai_PubMed__search_articles` — primary literature (load via ToolSearch on first call)
- `Read` — Prisma schema, current `example-module.ts`, module-scaffold-template.md, topic-id-conventions.md
- `Write` — target: `src/lib/test-data/example-module.ts` only

## Pinning rules

- Do NOT touch any file outside `src/lib/test-data/example-module.ts`. The skill's only write target is the staging file.
- Do NOT skip the user-confirmation gate before wiping. Module wipe is destructive.
- Do NOT draft any scenario content (personaPrompt, clinicalBackground, tasks, evaluationPrompt, rubric). Those fields stay as `"[STUB — …]"` placeholders. Drafting them is `/create-scenario`'s job.
- Do NOT load `voice_profile_marnel.md`. That's the user's personal blog voice, not scenario content. Scenario tone is governed by [scenario-authoring-guide.md](../iterate-scenario/scenario-authoring-guide.md).

## After this skill

After scaffolding, the typical user flow is:

1. Run `/create-scenario` to fill the first stub.
2. The skill drafts → runs one quick harness iteration → applies obvious fixes → hands back.
3. User runs `/iterate-scenario` to converge that scenario.
4. Repeat 1-3 for each remaining stub.
5. When all scenarios are converged, the user manually promotes the module via `POST /api/import-module`.

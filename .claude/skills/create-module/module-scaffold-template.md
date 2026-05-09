# Module Scaffold Template

The exact TypeScript shape `/create-module` writes to `src/lib/test-data/example-module.ts`. Match this verbatim. Every required Prisma field must appear in the literal — the file is consumed by `tsx`, [src/app/api/import-module/route.ts](../../../src/app/api/import-module/route.ts), and `harness.ts` which all expect the full type.

## File header (always)

```typescript
/**
 * @fileoverview <Module title> - Exported Test Data
 */

import { Module, Scenario, Task } from "@prisma/client";
import { UIMessage } from "ai";

export const testData: Module & {
  scenarios: (Scenario & { tasks: Task[] })[];
} = {
```

The `UIMessage` import is unused by the module shape but `iterate-scenario`'s harness expects it — keep it.

## Module fields (required)

```typescript
  id: "mod_<topic_short>_<seq>_001",
  topicId: "topic_<setting_short>_<topic_short>",
  title: "<Module title>",
  description:
    "<One-paragraph module description — the curriculum thesis in plain prose>",
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  scenarios: [
    /* stub scenarios go here */
  ],
};
```

Field-by-field requirements:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | `mod_<topic_short>_<seq>_001` (e.g. `mod_otc_peds_001`). |
| `topicId` | String | See [topic-id-conventions.md](topic-id-conventions.md). |
| `title` | String | Reads cleanly as a curriculum unit (e.g. `"Pediatric Self-Care: Infant Fever"`). |
| `description` | String | One paragraph. The "what does this module teach" answer. |
| `order` | Int | `0` for a single-module staging file. |
| `createdAt`, `updatedAt` | Date | `new Date()`. The import route preserves these on first write and updates `updatedAt` on subsequent imports. |

## Stub Scenario template

```typescript
    // IMAGE PROMPT: <one-line scene description for an image generator — e.g. "Anxious 30s mother holding a swaddled newborn at a community pharmacy counter, holding a digital thermometer, dim warm light, photorealistic.">
    {
      id: "scn_<topic_short>_<seq>_NNN",
      moduleId: "mod_<topic_short>_<seq>_001",
      creatorId: "admin",
      title: "<Scenario title>",
      order: 0,
      image: null,
      patientAvatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      scenarioContext: "[STUB — fill via /create-scenario]",
      clinicalBackground: "[STUB — fill via /create-scenario]",
      tasks: [],
      evaluationPrompt: "[STUB — fill via /create-scenario]",
      startingMessage: "[STUB — fill via /create-scenario]",
      patientInfo: "[STUB — fill via /create-scenario]",
      personaPrompt: "[STUB — fill via /create-scenario]",
      rubric: "[STUB — fill via /create-scenario]",
      voiceId: "Elizabeth",
      timeLimit: 480,
      patientName: "<Patient first + last>",
      patientDob: new Date("YYYY-MM-DD"),
      patientGender: "<Female | Male | Non-binary>",
    },
```

Field-by-field requirements:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | `scn_<topic_short>_<seq>_NNN`. NNN is 3-digit zero-padded (`001`, `002`...). Committed at scaffold time; `/create-scenario` preserves it. |
| `moduleId` | String | Must exactly match parent module's `id`. |
| `creatorId` | String | Always `"admin"` for scaffolded scenarios. |
| `title` | String | Same title presented in the curriculum plan table. |
| `order` | Int | 0-indexed position in the `scenarios` array. |
| `image` | String? | `null` in stubs. The image prompt lives in the TS comment above the object. |
| `patientAvatar` | String? | `null` in stubs (no current populated values in the codebase). |
| `createdAt`, `updatedAt` | Date | `new Date()`. |
| `scenarioContext`, `clinicalBackground`, `evaluationPrompt`, `startingMessage`, `patientInfo`, `personaPrompt`, `rubric` | String | All `"[STUB — fill via /create-scenario]"`. The placeholder satisfies Prisma NOT NULL on import; `/create-scenario` overwrites with real content. |
| `tasks` | Task[] | Empty array `[]` — easier to detect "not drafted yet" than placeholder tasks. |
| `voiceId` | VoiceId enum | `"Elizabeth"` (the Prisma default). `/create-scenario` picks a real voice based on patient demographics. |
| `timeLimit` | Int? | Seconds. Match the curriculum plan table — `360` (6min), `480` (8min), `600` (10min). |
| `patientName` | String | First + last. For caregivers/parent scenarios, format as `"<Caregiver name> (<role>) / <Patient name>"` (e.g. `"Aisha Thompson (Mom) / Zara Thompson"`). |
| `patientDob` | Date | `new Date("YYYY-MM-DD")` — a real Date object, not a string. Compute backward from the patient sketch ("10-week-old" → today minus 70 days). |
| `patientGender` | String | `"Female"`, `"Male"`, or `"Non-binary"` typically. |

## Why placeholder strings instead of empty strings

Prisma's `@default("")` on `clinicalBackground` and `acceptanceCriteria` allows empty strings, but most content fields are NOT NULL and the chat API will reject empty strings at runtime. Using `"[STUB — fill via /create-scenario]"` makes:

- `npx tsc --noEmit` pass — the literal types check.
- `POST /api/import-module` succeed — placeholders satisfy NOT NULL.
- The chat API throw clearly if a stub is invoked — placeholder strings are visibly wrong, not silently empty.
- `/create-scenario`'s decision tree work — the string `"[STUB — "` is the marker it grep's for.

## Why `tasks: []` instead of placeholder tasks

Three reasons:

1. **Detectability.** An empty array is unambiguous: "no tasks defined yet." A placeholder `[{title: "[STUB]", ...}]` could leak through to the rubric panel if accidentally invoked.
2. **Fewer constraints.** Each Task has its own char limits (`title` ≤50, `description` ≤200, `hint` ≤200) — placeholder strings would have to satisfy them, and any change to limits breaks the template.
3. **Less code.** No template tasks to maintain in this file.

`/create-scenario` populates the array with real tasks during drafting.

## Worked example — complete file

```typescript
/**
 * @fileoverview Geriatric Polypharmacy - Exported Test Data
 */

import { Module, Scenario, Task } from "@prisma/client";
import { UIMessage } from "ai";

export const testData: Module & {
  scenarios: (Scenario & { tasks: Task[] })[];
} = {
  id: "mod_geri_polypharm_001",
  topicId: "topic_amb_geri_polypharm",
  title: "Geriatric Polypharmacy: Deprescribing at the Counter",
  description:
    "Identify high-risk medication combinations in older adults at the community pharmacy and intervene safely. Builds from anticholinergic burden recognition through deprescribing conversations with caregivers.",
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  scenarios: [
    // IMAGE PROMPT: 78-year-old woman in cardigan and reading glasses leaning on a community pharmacy counter, holding a paper bag of bottles, photorealistic, soft daylight.
    {
      id: "scn_geri_polypharm_001",
      moduleId: "mod_geri_polypharm_001",
      creatorId: "admin",
      title: "Anticholinergic Burden Recognition",
      order: 0,
      image: null,
      patientAvatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      scenarioContext: "[STUB — fill via /create-scenario]",
      clinicalBackground: "[STUB — fill via /create-scenario]",
      tasks: [],
      evaluationPrompt: "[STUB — fill via /create-scenario]",
      startingMessage: "[STUB — fill via /create-scenario]",
      patientInfo: "[STUB — fill via /create-scenario]",
      personaPrompt: "[STUB — fill via /create-scenario]",
      rubric: "[STUB — fill via /create-scenario]",
      voiceId: "Elizabeth",
      timeLimit: 480,
      patientName: "Margaret Doyle",
      patientDob: new Date("1947-03-12"),
      patientGender: "Female",
    },
    // ... additional stub scenarios ...
  ],
};
```

## Validation checklist before writing

- [ ] Module `id`, `topicId`, `title`, `description`, `order`, `createdAt`, `updatedAt` all set.
- [ ] N stub scenarios in `scenarios` array (4-6, matching the curriculum plan).
- [ ] Each stub has every required field listed above.
- [ ] All `moduleId` values match the parent module's `id` exactly.
- [ ] All scenario `id`s are unique within the module (different `NNN` suffixes).
- [ ] `order` increments 0, 1, 2, ... across the scenarios array.
- [ ] Each stub has an `// IMAGE PROMPT: ...` comment on the line directly above its `{`.
- [ ] All `patientDob` values are `new Date("YYYY-MM-DD")` — real Date objects, not strings.
- [ ] `voiceId: "Elizabeth"` on every stub (default — `/create-scenario` updates).
- [ ] `tasks: []` on every stub.
- [ ] `npx tsc --noEmit` passes after writing.

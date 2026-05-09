# Task Char Limit Checklist

Hard limits from [prisma/schema.prisma](../../../prisma/schema.prisma) on the `Task` model:

| Field | Max chars |
|-------|-----------|
| `title` | 50 |
| `description` | 200 |
| `hint` | 200 |

These are enforced at the Prisma layer — drafts that exceed will fail import. Trim during Phase 5 (pre-write validation) of `/create-scenario`.

## Counting

Count is by characters (not tokens, not words), including spaces and punctuation. Run `text.length` mentally — or for safety, write each task field on its own line and eyeball the length against the reference scenario's task fields (which all sit comfortably under the limits: titles 27-35, descriptions 68-106, hints 84-117).

## Common over-limit patterns and fixes

### `title` over 50 chars

| Pattern | Fix |
|---------|-----|
| Title that names the diagnosis or product (`"Recommend ibuprofen for teething-related fever in a 9-month-old"` — 64 chars) | Action verb + object only. Names of drugs and diagnoses belong in the hint, not the title. → `"Recommend appropriate product"` (28 chars) |
| Title that lists everything the student does (`"Ask about feeding, wet diapers, breathing, behavior, and rash"` — 60 chars) | Pick the action verb only. → `"Check for red flag symptoms"` (28 chars) |
| Title that describes the patient instead of the action (`"This 10-week-old infant has fever and needs assessment"` — 54 chars) | Title = what student does, not what patient has. → `"Assess fever in newborn"` (24 chars) |

### `description` over 200 chars

| Pattern | Fix |
|---------|-----|
| Description that names every right answer (`"Ask about feeding difficulties, lethargy, irritability, rashes, breathing problems, vomiting, diarrhea, bulging fontanelle, and other danger signs of meningitis or sepsis"` — 162 chars but leaks the answer) | Strip specifics. → `"Ask about danger signs that would indicate a more serious infection."` (69 chars) |
| Description with multiple clauses chained by "and" (`"Find out the baby's exact age in weeks, when the fever started, how high it is in degrees Fahrenheit, and how the temperature was measured (rectal, oral, axillary, or temporal)"` — 180 chars and leaks answers) | Compress. → `"Find out the baby's exact age, when the fever started, how high it is, and how it was measured."` (97 chars) |
| Description that explains the why (`"Decide on the appropriate level of care based on the patient's age and the severity of the fever, knowing that any fever in a baby under 3 months requires immediate ER referral"` — 175 chars) | Strip the why (it leaks the answer). → `"Decide on the appropriate level of care — OTC treatment, follow-up with a doctor, or emergency referral."` (109 chars) |

### `hint` over 200 chars

| Pattern | Fix |
|---------|-----|
| Multi-sentence hint with chained clauses (`"Any fever in a baby under 3 months old is a medical emergency requiring immediate ER referral, even if the baby looks well, because the rate of serious bacterial infection in this age group exceeds the sensitivity of clinical exam alone, which is why the AAP guideline calls for blood cultures regardless of clinical appearance."` — 326 chars) | Keep the load-bearing fact. The student already has `clinicalBackground` for the long version. → `"Any fever in a baby under 3 months old is a medical emergency requiring immediate ER referral."` (95 chars) |
| Hint that re-explains the description (`"You need to ask about red flags. Red flags include feeding changes, lethargy, irritability, rash, breathing trouble, vomiting, diarrhea, and signs of meningitis. Make sure to cover all of these to score full points on this task."` — 236 chars) | Hint should add new info (the rule, the threshold), not restate the action. → `"Newborns with fever can deteriorate quickly. Look for signs of sepsis or meningitis."` (84 chars) |

## description vs hint — the rule

The student sees the **description right next to the title** in the rubric panel from the moment the scenario starts. The **hint is gated behind a "Need a hint?" button** — they only see it if they explicitly ask.

So:
- `description` = what to DO (action only, no answer)
- `hint` = the actual clinical knowledge (the answer, gated)

If the description names the product, names the diagnosis, or hands the student a checklist of every right answer, you've leaked the case. The hint can keep the spoilers — that's what it's for.

This is described in detail in Step 3 of the [authoring guide](../iterate-scenario/scenario-authoring-guide.md). Cross-reference there for examples.

## Pre-write check (mental script)

For each task in the draft, before writing to the file:

1. Count `title` chars. If > 50, trim by dropping object specifics.
2. Count `description` chars. If > 200, strip clinical specifics that belong in the hint.
3. Count `hint` chars. If > 200, drop the explanation/why and keep the rule.
4. Re-read description: does it name the right answer? If yes, move that to the hint and rewrite the description as an action.
5. Re-read hint: does it just restate the description? If yes, replace with the actual clinical fact (the threshold, the rule, the contraindication).

If all 4 tasks pass these checks, the draft is ready to write.

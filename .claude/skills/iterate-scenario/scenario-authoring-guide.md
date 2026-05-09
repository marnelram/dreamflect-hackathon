# Authoring a LeetCare Scenario

End-to-end guide for writing a new patient scenario. Companion to [SKILL.md](SKILL.md), which covers the iteration loop. This guide covers what the **author** does before iteration starts.

Assumes the meta prompts (formatter, scorer, task-check) are in place and the harness is wired correctly.

---

## Step 0: Plan before you write (5 minutes)

Answer these out loud before opening the file:

1. **What's the clinical teaching moment?** One sentence. *"A pharmacist must recognize that any fever in a baby <3 months requires immediate ER referral, not OTC treatment."*
2. **Who is the patient?** Name, age, presenting complaint, why they're at the pharmacy.
3. **What 4-6 tasks does the student need to do, in conversation order?** Not the rubric — the *workflow*.
4. **What's the one thing the student must catch?** The test moment. (For Aisha/Zara: ER referral. For Elena/Leo: don't use baby aspirin.) Everything else is connective tissue.

If you can't answer #4 in one sentence, the scenario doesn't have a clear teaching point yet. Don't write it.

---

## Step 1: Write the starting message

The starting message is the first thing the student sees. It sets the trajectory of the entire conversation.

### Rules

- **Volunteer the chief complaint.** Why is this person at the pharmacy?
- **Gate everything else.** Age (often), exact temperature reading, measurement method, weight, specific symptoms — all of these should be earned through probing, not handed over for free.
- **Wrap dialogue in `"..."` quotes.** Stage directions in `*italics*`.
- **One question, not two.** Asking two questions on turn 1 violates the persona's own "one at a time" rules and trains the student to expect the patient to drive.
- **Keep it short.** 1-3 sentences of dialogue.

### Template

```
*[Brief stage direction — patient appearance, what they're holding, mood]*

"[Greeting + chief complaint + ONE question]"
```

### Worked example (good)

```
*Aisha Thompson approaches the pharmacy counter, cradling her tiny daughter Zara
against her chest. Her eyes are rimmed red with exhaustion and she fidgets with
a digital thermometer in her free hand.*

"Hi, I was wondering if I could speak with the pharmacist about my baby?"
```

The visible setup (worried mom, baby, thermometer) communicates urgency. The dialogue gives the student exactly one thread to pull.

### Anti-pattern (avoid)

```
"Hi, I just picked up this Children's Tylenol for my 5-month-old son Arjun. He
has a bit of a cold and a low-grade fever — 100.6 degrees on his forehead. My
husband is with him at home right now. I've never given him fever medicine
before. Can you walk me through how to give it to him? I want to make sure I'm
giving him the right amount and doing it safely."
```

Volunteers age, fever reading, method, product chosen, AND asks two questions. The rubric will then expect the student to *ask* about all of those — but they're already on the table. Result: rubric scores the student down for "not asking" what was already given.

---

## Step 2: Write the personaPrompt (the load-bearing field)

This is the field that controls 80% of how the conversation actually plays out. Five blocks, in order:

### Opening paragraph — identity

One paragraph. Who they are, why they're here, their general disposition. Plain prose, no tags.

```
You are Aisha Thompson, a 32-year-old Black teacher on maternity leave. You are
standing at a pharmacy counter with your 10-week-old daughter Zara. You are a
first-time parent, anxious, sleep-deprived, and worried about your newborn's
fever. You and your husband Marcus (at home) are financially conscious and want
to avoid an expensive ER visit if possible.
```

### `<background>` — what's safely volunteerable

Things the persona can mention naturally on any turn. **Stay vague.** Anything precise (numbers, methods, exact ages, exact symptoms) does NOT belong here.

```
<background>
- About 3 hours ago, Zara felt warm to the touch.
- Zara has been fussier than usual and feels warm, but is still feeding (though
  slightly less enthusiastically).
- You are exhausted from lack of sleep.
</background>
```

### `<hiddenInfo>` — what's gated until asked

The precise facts. Each bullet ends with "only state when asked." If the rubric tests whether the student *asked* about something, that something belongs here.

Open the block with a hard guard:

```
<hiddenInfo>
- The following facts are LOCKED in your memory. Only share each fact when the
  pharmacist asks a question that specifically targets it.
- Zara is exactly 10 weeks old (born 10 weeks ago) — only state her age when asked.
- You took Zara's temperature RECTALLY and it read 101.2°F — only state the
  reading when asked, and only mention HOW you took it if specifically asked
  about the method.
- Zara weighs approximately 10 pounds.
- ...
</hiddenInfo>
```

**Important: gate the method separately from the reading.** If the student asks "what was her temperature?", the patient should say the reading (paraphrased — see formatting block). They should NOT also volunteer "I took it rectally" unless the student asked about method specifically.

### `<personality>` — voice and behavior

How they talk, what their emotional baseline is. 3-5 bullets.

```
<personality>
- Anxious but trying to stay composed (teacher mindset — you ask clarifying questions).
- Polite, respectful, and desperately want reassurance.
- Mentions cost concerns once or twice ("we're trying to avoid an ER bill if we can").
- Scared this might be serious but hoping it's nothing.
</personality>
```

### `<concerns>` — motivations, ordered by importance

The patient's questions and worries during the conversation. **Two flavors:**

- **Passive concerns** — "You're worried about X" — may or may not surface in any given trial. Use for nice-to-have.
- **Directive concerns** — "**CRITICAL: You MUST mention X by turn N**" — reliably surfaces. Use when the entire teaching moment depends on this concern landing.

If your scenario has a single critical pivot (Aisha's age cutoff, Elena's baby aspirin, Mrs. Alvarez's oxycodone), make that concern directive.

#### Patient pacing — let the student drive the assessment

Some patients have a question of their own (e.g. "what's the difference between Tylenol and Motrin?") that, if surfaced too early, jumps the student past Task 1 (assessment) into Task 2 (comparison) before they have gathered the basic case data. The student then loses Task 1 points through no fault of their own — the patient pre-empted them.

Two patterns prevent this:

- **A "wait for the pharmacist to ask first" rule** at the top of `<concerns>`, ideally bolded as a directive. Example from the Product Selection scenario:
  ```
  - Express only ONE concern at a time. Wait for the pharmacist's explanation
    before raising the next one.
  - **Wait for the pharmacist to ask their assessment questions (Maya's age,
    the fever reading, fever duration) before volunteering the Tylenol vs
    Motrin comparison question. Do NOT pre-empt their flow on turn 1 or
    turn 2 — let them gather information first.**
  ```
- **Concern ordering** — list the lower-priority "comparison/recommendation" concerns AFTER the patient-info-yielding concerns ("can Maya take it safely at her age"), so the natural flow surfaces assessment-friendly questions first.

If your starting message gates everything correctly but the student still ends up answering the patient's question before getting to ask their own, the bug is in `<concerns>`, not in the tasks.

```
<concerns>
- Express only ONE concern at a time. Wait for the pharmacist's explanation
  before raising the next one.
- **CRITICAL: You MUST mention to the pharmacist that you have baby aspirin at
  home and ask whether you can give it to Leo. Surface this concern no later
  than the 4th student turn, OR whenever you start discussing what medicine to
  give him — whichever comes first.**
- You are a little tight on cash, and want to buy the most affordable option.
- ...
</concerns>
```

#### Aligning concerns with the rubric

For each rubric sub-bullet, ask: *will the patient's concerns naturally surface this?* If not, either:
- Add a concern that primes it (best for major sub-bullets)
- Accept the sub-bullet is for "above and beyond" students only (fine for minor depth points)

Common rubric sub-bullets that need a priming concern: APAP double-dosing, drug interactions, asking about home meds, asking how to read the syringe markings.

### `<formatting>` — dialogue style rules

Boilerplate, customize only the temperature reading. Paste this:

```
<formatting>
- Keep responses short — 1 to 2 sentences.
- Speak as [Patient] only. Do NOT roleplay as anyone else.
- Ask one question at a time.
- When stating [Patient]'s temperature aloud, paraphrase naturally ("around 101",
  "just over a hundred") OR describe glancing at the thermometer in a stage
  direction (e.g. *checks the thermometer reading — 101.2°F*). Do NOT speak
  the decimal precision (101.2°F) verbatim in dialogue.
- "Around" or "about" prefixes do NOT make decimal precision acceptable —
  "around 101.2°F" still violates the rule. Drop the decimal entirely in
  dialogue: say "around 101" or "just over a hundred", not "around 101.2".
- Only mention HOW you took the temperature (forehead / temporal / oral /
  rectal) if the pharmacist specifically asks about the method. If they ask
  "what was her temperature", answer the temperature only — do not also
  volunteer the method.
</formatting>
```

If your scenario has no thermometer, drop the temperature lines and add equivalent rules for whatever the precise data is (BP reading, glucose, etc.).

---

## Step 3: Define tasks

Each task has `title`, `description`, `hint`, `acceptanceCriteria`.

### The load-bearing principle: tasks check actions, the rubric grades correctness

This is the single rule that prevents the most common task-design bugs.

A task should fire when the student **performs the action** the task describes — not when they get the *right answer*. Quality of the answer is graded by the rubric, where you have rich feedback (sub-bullets, quoted excerpts, partial credit). When a task gates on getting the right answer, three bad things happen:

1. **The student gets stuck silently.** They made a decision (e.g. "give Tylenol"), they're committed, and they can't tell why the task isn't ticking off. Nothing in the UI tells them they're on the wrong path — they just see a checkbox that won't fill.
2. **The asymmetry is jarring.** Other tasks fire on the action (gathered info, asked red flags, held the line). One task that secretly requires the *correct* answer is an outlier the student can't predict.
3. **The pedagogy is worse.** A wrong-answer student needs *quoted excerpt + reasoning* feedback, not a checkbox that won't tick. The rubric does that job; the task's checkbox doesn't.

Worked example, the triage scenario:

| Field | ❌ Gates on correctness (the bug) | ✅ Gates on action |
|---|---|---|
| Task 3 acceptance criteria | "Student says 'ER' or 'emergency room' as THE recommended next step. Recommending Tylenol FAILS this task." | "Student commits to a specific triage path — ER, urgent care, pediatrician, OTC, or wait-and-see. Quality of the decision is graded by the rubric." |
| Task 4 acceptance criteria | "Student has *already recommended the ER* AND held that recommendation through pushback." | "Student held *some* committed path through pushback, gave a specific reason, acknowledged concern. Whether that path was clinically correct is graded by the rubric." |
| Rubric | unchanged — still scores 0 if the student didn't say ER | unchanged |

The rubric does the corrective feedback job ("You should have referred to the ER because Zara is under 3 months — risk of serious bacterial infection") with a quoted excerpt. The task checkbox just confirms a decision was made.

The same principle applies upstream:
- **Title** doesn't name the right answer. "Make appropriate triage decision" ✓ — "Refer the patient to the ER" ✗
- **Description** doesn't enumerate the right answer. "Decide on the appropriate level of care" ✓ — "Recognize this newborn needs ER care" ✗
- **Acceptance criteria** doesn't gate on the right answer. (See above.)
- **Hint** is where the answer lives. The hint is gated behind a button — if the student clicks "Need a hint?", they've earned the spoiler.
- **Rubric sub-bullets** use specific keywords because that's what the AI scorer needs. The student doesn't see this until evaluation.

When you draft a task, ask: *what action am I checking?* If the answer is "the right action," the task is wrong. The right action is "made a decision" / "asked about X" / "held the line" — actions a confidently-wrong student could still complete.

### Title rules

- Action-oriented (the verb is what the *student* does, not what the patient experiences). "Recommend appropriate product" ✓ — "Product needed" ✗
- Must read cleanly in isolation. Imagine a student who only sees titles and never hovers for descriptions (Stanley). The title alone should hint at what to do.
- 4-7 words. Concise.

### description vs hint — the answer goes in the hint

This is load-bearing. The student sees the **description right next to the title** in the rubric panel as soon as the scenario starts. The **hint is gated behind a "Need a hint?" button** — they only see it if they explicitly ask.

So:

- **Description = what to DO** (action, no answer)
- **Hint = the actual clinical knowledge** (the answer, gated)

If the description names the product, names the diagnosis, or hands the student a checklist of every right answer, you've leaked the case. They don't have to think — the panel told them.

| ❌ Description leaks the answer | ✅ Description describes the action |
|---|---|
| "Recommend ibuprofen for teething-related fever..." | "Make a specific product recommendation based on the patient's situation and explain your reasoning." |
| "Recognize that this newborn needs immediate emergency care and refer to ER." | "Decide on the appropriate level of care — OTC treatment, follow-up with a doctor, or emergency referral." |
| "Ask about feeding difficulties, lethargy, irritability, rashes, breathing problems, and other danger signs." | "Ask about danger signs that would indicate a more serious infection." |
| "Explain how to use the oral syringe correctly and why kitchen spoons should not be used." | "Walk the parent through proper administration of the liquid medication." |

The hint can keep the spoilers — that's its job. *"Any rectal temperature ≥100.4°F in a baby under 3 months requires ER evaluation"* is great hint content, terrible description content.

### acceptanceCriteria rules

These gate the auto-task-checker (small Llama 3.1 8B). Two important caveats:

1. **The task-checker is unreliable.** It hallucinates coverage — says ✓ for tasks the student didn't actually complete because it treats criteria text as evidence. Don't trust task-firing as ground truth; the rubric is the real signal.
2. **Acceptance criteria are intentionally LENIENT** — a subset of rubric sub-bullets. Tasks fire when the student covers the *minimum*; rubrics score the *full set*. This means a "task complete" student can still score 8/12 on rubric.

Write criteria knowing they'll be generous-interpreted. Use clear AND/OR logic:

```
"The student establishes Maya's age (9 months — important because ibuprofen is
only safe ≥6 months), the temperature reading (~100.8°F), and at least one
teething-specific symptom (drooling, chewing, swollen/red gums). Asking 'how
old is she?' alone is not sufficient — they need both age AND symptom context."
```

---

## Step 4: Write the clinical background (the student's reference panel)

The `clinicalBackground` field renders inside the book icon during the scenario. Think drug reference or clinical guideline. It is neutral information the student consults, not advice from a preceptor over their shoulder.

This field is the most often over-engineered. The temptation is directive voice ("you'll want to ask about X, Y, Z") because that is how textbooks address learners. Reference material inside a simulation has a different job, however. The student is supposed to internalize the knowledge and decide how to apply it, and advisory phrasing collapses that gap. If the panel says "before making a triage decision, you'll want age, reading and method", the student just enumerates the three things and passes the task without thinking. The fix is to write definitionally rather than instructionally.

### Tone: informational, not advisory

| ❌ Advisory (leaks the rubric) | ✅ Informational (states the fact) |
|---|---|
| "Before you make a call, you'll want age, reading and method" | "A complete fever assessment is built from age, reading and method" |
| "The rule we work from is simple: any fever ≥38°C goes to ER" | "The ER referral threshold is any rectal temperature ≥38°C" |
| "You don't need to recite every bullet" | "One open question per category is typically sufficient" |
| "You can't sort them out with a thermometer" | "The two cannot be distinguished by thermometer" |

The voice should sit closer to a Lexicomp monograph or UpToDate entry than to a preceptor coaching from over the student's shoulder. Stripping second person ("you", "your", "we") forces facts rather than coaching, and removes the most common form of rubric leakage.

### Structure: content-based headers, prose first, tables when warranted

Headers should describe the topic, not the assessment task: `## Establishing the fever`, not `## Task 1: Assess the fever`. Task-labeled headers turn the panel into a checklist and tell the student exactly what they are being graded on before they have read a single line of clinical content.

Default to flowing paragraphs. Tables earn their place when:

- The data is genuinely tabular (rate breakdowns by age group, drug comparisons)
- A categorized scan is more useful than prose (a red-flag screen organized by physiologic system)
- Prose would force awkward repetition

If a section reads naturally as prose, keep it prose.

### Scope: clinical knowledge, not communication coaching

`clinicalBackground` covers what a pharmacist would look up in a drug reference or clinical guideline. It does NOT cover communication style ("be firm but calm", "explain the why"). Communication is graded by the rubric, not handed to the student through the reference panel. Putting it in the panel doubles the spoiler problem. It both tells the student what to say and tells them they will be graded on saying it.

Cross-check placement against [CLAUDE.md](../../CLAUDE.md). Drug class, dosing, MOA, interactions, pricing, triage criteria and clinical guidelines all go in `clinicalBackground`. Patient demographics, allergies, current medications and history go in `patientInfo`.

### Verify against current evidence

Numbers in the panel (rates, thresholds, frequencies, dosing) should come from authoritative sources:

- AAP, NICE and specialty society guidelines for triage and clinical criteria
- Peer-reviewed primary sources for rate data, ideally from the last 5 years
- Current product references (Lexicomp, drug labels) for dosing and pricing

Include a `## References` section at the bottom with linked sources. Pharmacy practice updates fast, and stale figures undermine the scenario. Future authors also need to know where each figure came from when guidelines update.

### Length discipline

A working draft is usually 30 to 50% longer than its final form. Cut anything that:

- Describes hospital workflow not relevant at the pharmacy counter (LP procedure detail, admission criteria, IV antibiotic regimens). One sentence noting the workup happens is enough; drop the protocol.
- Repeats a clinical fact in multiple places
- Reads like a disease textbook chapter rather than a triage reference for *this case*

The Aisha/Zara reference landed at ~70 lines of markdown after compression from 130. That is the right scale for an 8-minute scenario.

### Anti-patterns

#### ❌ Task-labeled sections
Symptom: `## Task 1: Establishing the fever`. The header tells the student exactly what they are being graded on, and the section structure becomes a checklist they read sequentially.
Fix: content-based headers ("Establishing the fever", "The red-flag screen") that describe the topic, not the assessment.

#### ❌ Communication coaching in the reference
Symptom: a "Do / Don't" section on how to deliver the referral, with bullets like "be firm but calm", "explain the why".
Fix: cut entirely. Communication style is the rubric's job, not the reference panel's.

#### ❌ Em dashes throughout
Symptom: prose interrupted by em dashes as separators or asides.
Fix: commas, parentheses, sentence breaks. Em dashes are a HARD RULE no in the voice profile.

#### ❌ Second-person address
Symptom: "you'll want", "you can't", "before you make a call".
Fix: passive constructions or third-person ("the assessment includes", "the two cannot be distinguished", "triage decisions depend on").

#### ❌ Bolded noun phrases throughout
Symptom: half the noun phrases are bolded for "emphasis", which flattens the visual hierarchy and signals AI prose.
Fix: bold only genuine focal points (the threshold itself, the rule itself), never noun phrases inside explanations.

#### ❌ Empty clinicalBackground for a drug-specific scenario
Symptom: the case revolves around a specific drug (pediatric APAP dosing, baby aspirin) but the panel only has general fever info.
Fix: drug-specific content is the entire purpose of `clinicalBackground` for product-recommendation cases. Include class, indication, dosing, interactions and pricing.

---

## Step 5: Write the evaluation prompt (the rubric)

There are TWO rubric-related fields on a scenario, and they serve different purposes. Keep them aligned.

| Field | Audience | When seen | Purpose |
|---|---|---|---|
| `evaluationPrompt` | The AI scorer | Post-completion | Strict scoring with specific keywords |
| `rubric` | The student | DURING the scenario, in the rubric/grading panel | "What will I be graded on?" |

**Both must use the same task structure and total points.** If `evaluationPrompt` has 4 tasks × 3 pts (12 pts), `rubric` should also list 4 tasks × 3 pts (12 pts), with matching task titles. Drift between them — common in legacy scenarios — confuses the student about what they're actually being scored on.

**But they're written differently:**
- `evaluationPrompt` sub-bullets are SPECIFIC ("dark urine, jaundice, persistent fatigue") — needed for accurate AI scoring
- `rubric` sub-bullets are GENERIC ("Mentioned warning signs of toxicity") — same as the description-vs-hint rule: don't reveal the answer in something the student sees during the scenario

Example pair (Patient Counseling Task 4):

| `evaluationPrompt` (post-eval) | `rubric` (in-scenario panel) |
|---|---|
| Warned to check other product labels for acetaminophen / APAP (avoid double-dosing). | Warned about hidden sources of the same active ingredient |
| Explained when to call the doctor (fever >24 h, no response, signs of dehydration). | Explained when to seek medical attention |
| Mentioned warning signs of overdose / liver injury (dark urine, jaundice, persistent fatigue, vomiting). | Mentioned warning signs of toxicity |

The structure mirrors. The wording strips spoilers from the in-scenario panel.

### evaluationPrompt structure

```markdown
# Role
[One sentence — what kind of expert the AI is playing]

# Scenario
[Plain-text recap of the case — names, ages, the right answer]

# Instructions
- Score each task out of its listed points. Award 1 point per completed bullet
  (whole numbers only).
- Address the student directly in first person. Provide one feedback comment
  per bullet.
- Each "## Task N" section corresponds 1:1 to one of the student's in-session
  tasks. The "## Communication" section is graded implicitly across the whole
  conversation and is NOT tied to a specific in-session task.

# Rubric (X pts total)

## Task 1: [exact title from tasks array] (3 pts)
- [Sub-bullet 1 — specific, scoreable]
- [Sub-bullet 2]
- [Sub-bullet 3]

[etc. for all tasks]

## Communication (3 pts)
- Used open-ended questions during assessment (give one or two example phrasings
  that fit this scenario — e.g. "what symptoms have you noticed?",
  "how long has the fever been going?").
- Acknowledged the patient's concern or showed empathy at least once (give one
  or two scenario-appropriate examples — e.g. validating the worry, reassuring
  they did the right thing coming in).
- Followed a logical assessment flow — gathered information BEFORE making the
  recommendation, not the reverse.

## Summary
- What they did well.
- What needs improvement.
- One main goal for their next [scenario type].
```

### The Communication section — a 5th rubric section, NOT a 5th task

Total points = (4 tasks × 3 sub-bullets) + (Communication × 3 sub-bullets) = **15 pts** for a standard 4-task scenario.

Communication is graded by the rubric only. It does NOT appear in the in-session `tasks[]` array, so the student does not see a "Communication" checkbox during the conversation. It surfaces on the post-evaluation screen as a 5th section.

Why this design:

- A "Communication" task in `tasks[]` would gate on something the auto-task-checker can't reliably detect (open-ended questions, empathy, flow). The result would be a checkbox that ticks on noise.
- Style cues are inherent to every turn, not a discrete action. There is no single moment where "did you communicate well?" is yes/no.
- The student still sees the Communication section in the **`rubric` field** (the in-scenario "View Rubric" dialog), so they know they will be graded on it — they just don't see a checkbox for it.

Sub-bullets should be specific to the case in the `evaluationPrompt` (so the scorer has concrete examples) and generic in the `rubric` field (so the student does not see the answer):

| `evaluationPrompt` (post-eval, specific) | `rubric` (in-scenario, generic) |
|---|---|
| Used open-ended questions during assessment (e.g. "what symptoms has Maya been showing?", "how long has she had the fever?") rather than only closed yes/no questions. | Used open-ended questions during assessment |
| Acknowledged the parent's concern or showed empathy at least once (e.g. validating teething is rough, reassuring David he is doing the right thing). | Acknowledged the parent's concerns or showed empathy |
| Followed a logical assessment flow — gathered information BEFORE making the product recommendation, not the reverse. | Followed a logical assessment flow (gathered information before recommending) |

### Sub-bullet rules

- **Each sub-bullet must be independently scoreable.** The formatter (DeepSeek V3.1) emits exactly one feedbackItem per sub-bullet — that contract depends on each sub-bullet being a clear yes/no.
- **One heading = one task object in the JSON output.** Sub-bullets become feedbackItems on that task — never a separate task object each. The formatter prompt at [src/app/api/(scenario)/evaluation/route.ts](../../../src/app/api/(scenario)/evaluation/route.ts) enforces this, but if a scenario's rubric section ever renders as N stacked single-bullet boxes instead of one box with N bullets, the rule has drifted and the formatter prompt needs reinforcement.
- **Be specific.** Vague sub-bullets ("explain medication safety") get hallucinated coverage. Precise sub-bullets ("warned about checking other product labels for acetaminophen / APAP") get scored honestly.
- **Total points = (N tasks × 3 sub-bullets) + Communication × 3 = 3N + 3.** Standard 4-task scenario: `# Rubric (15 pts total)`. Three is the right number per heading — fewer leaves no granularity, more makes feedback overwhelming.

### Section title note

The rubric's `## Task N:` headings should match the scenario's task titles 1:1. The formatter uses these to build the JSON section structure.

---

## Step 6: Validate

Once the scenario is drafted, validate before merging.

### Pre-flight: manual sanity pass

Before running the harness, do this in your head:

1. Read the `tasks[].title` only. Imagine a student who has never read the descriptions or hints.
2. Read the `startingMessage`.
3. Ask: does any task feel redundant given what the patient just volunteered? Does any title sound like one thing but mean another?

If yes, fix before running.

### Run the harness

```bash
npx tsx .claude/skills/iterate-scenario/harness.ts --scenario <id> --iteration 1
```

Default mode is `quick`: 1 trial × 4 personas (Allison, Stanley, Larry, Sam) + full rubric eval. ~$0.20 per scenario.

### Read manifest.json and judge

For each candidate in `bugs.critical`:
- Pull `example.fullTurn` and the `rule`
- Decide: real bug, or false positive?
- For real bugs, pick the smallest edit that resolves it (see [SKILL.md](SKILL.md) edit heuristics)

For the rubric:
- `perPersona[0].rubric` is the full eval JSON
- Check the score and the missed sub-bullets — is the gap student-LLM behavior or scenario design?

### Healthy scoring ranges

| Score | Read |
|---|---|
| 90-100% | Probably overshare bug — the patient is handing the student answers |
| 75-90% | Strong scenario, working as designed |
| 60-75% | Realistic for a competent-but-not-exceptional student LLM. Often the ceiling. |
| <60% | Likely a probe-required gap — concerns aren't surfacing rubric items |

### Stop conditions

Move on when:
- Zero critical detector candidates after Claude's judgment
- Rubric structure matches the eval prompt's stated total
- Score is in the healthy range above
- No regressions across 2 consecutive iterations

---

## Anti-patterns to preempt

The bugs that come up over and over:

### ❌ Patient overshare on turn 1
Symptom: starting message volunteers age, exact temp, method, all symptoms.
Fix: gate every precise fact to `<hiddenInfo>`. Starting message stays at chief complaint.

### ❌ Decimal precision in dialogue
Symptom: persona says `"it was 101.2°F"`.
Fix: paraphrase ("around 101") OR put precision in a stage direction. The `<formatting>` boilerplate handles this.

### ❌ "Around X°F" hybrid
Symptom: persona half-complies — "around 101.2°F" with the decimal still in dialogue.
Fix: the explicit "around prefixes don't make decimal precision acceptable" rule in `<formatting>` is what catches this.

### ❌ Method volunteered with reading
Symptom: persona says "I took her temperature rectally and it was 101°F" when student only asked the reading.
Fix: separate gate for method in `<hiddenInfo>`, plus the explicit rule in `<formatting>`.

### ❌ Critical concern as passive
Symptom: the central teaching moment doesn't surface reliably across personas. Score plummets.
Fix: convert that one concern to a directive (CRITICAL: MUST mention by turn N).

### ❌ Patient pre-empts the student's first task
Symptom: the patient asks their own question (e.g. "what's the difference between Tylenol and Motrin?") on turn 1 or turn 2, before the student has gathered the basic case data. The student loses Task 1 not because they failed, but because they got dragged forward.
Fix: add a "wait for the pharmacist to ask their assessment questions before volunteering [the comparison/recommendation question]" rule near the top of `<concerns>`, ideally bolded as a directive. Reorder concerns so the assessment-friendly ones (age, safety) come before the comparison/recommendation ones. See "Patient pacing" in Step 2.

### ❌ Rubric section split into multiple boxes
Symptom: in the post-evaluation panel, one task heading like "## Task 1: Assess the baby's age and fever (3 pts)" renders as three stacked boxes (each with one bullet and "1 out of 1") instead of a single box with three bullets and "3 out of 3".
Fix: this is a formatter bug, not a per-scenario fix. The formatter prompt in [src/app/api/(scenario)/evaluation/route.ts](../../../src/app/api/(scenario)/evaluation/route.ts) must enforce "each heading becomes ONE task object in the JSON output". Surface it to the developer rather than rewriting the scenario.

### ❌ Acceptance criteria broader than rubric
Symptom: tasks fire ✓ but student missed several rubric sub-bullets.
This is intentional design. Acceptance criteria = "good enough"; rubric = "excellent." Be aware of the gap, don't try to close it.

### ❌ Trusting the auto-task-checker
The Llama 3.1 8B model hallucinates coverage. It will say ✓ for tasks the student didn't complete, because it reads the criteria text and assumes the student covered it. Verify against the rubric, not the task-firing log.

### ❌ Vague rubric sub-bullets
Symptom: rubric scores generously / inconsistently across runs.
Fix: rewrite sub-bullets to be specific keywords. "Mentioned warning signs of overdose / liver injury (dark urine, jaundice, persistent fatigue, vomiting)" scores honestly. "Explained safety concerns" gets hallucinated coverage.

### ❌ Task description leaks the answer
Symptom: a student opens the scenario, glances at the rubric panel, and sees the description tell them exactly what to recommend / what diagnosis to make / what list of items to ask about. No reasoning required.
Fix: descriptions describe the *action* ("Make a product recommendation and explain your reasoning"). Hints carry the *answer* ("Ibuprofen is preferred for teething because of anti-inflammatory action and longer duration"). The hint is gated behind a button click — that's where spoilers belong.

### ❌ Acceptance criteria gates on the right answer
Symptom: the task won't fire unless the student says the *clinically correct* thing. A confidently-wrong student (e.g. recommends Tylenol for a 10-week-old) sees the checkbox stay empty with no explanation. They feel stuck without knowing why.
Fix: criteria fires on the *action* (committed to a triage path / made a recommendation / held a line). Whether the action was correct is the rubric's job — the rubric has quoted excerpts and sub-bullet granularity, which is the right shape for "you got this wrong, here's why." Tasks just confirm an action happened. See the load-bearing principle in Step 3.

### ❌ Task title telegraphs the right answer
Symptom: the title reads "Refer to the ER" or "Recommend ibuprofen" instead of "Make a triage decision" or "Make a product recommendation". The student doesn't have to think — the panel told them.
Fix: titles describe the *action category*, not the specific correct answer. The student earns the answer through clinical reasoning, not by reading the rubric panel.

### ❌ `rubric` field drifted from `evaluationPrompt`
Symptom: the in-scenario rubric panel shows different categories or different point totals than what the AI actually scores. Common in legacy scenarios where someone updated the eval prompt but forgot the display rubric.
Fix: keep both fields in sync. Same task titles, same point distribution, same total. The wording differs (specific keywords in eval prompt, generic verbs in displayed rubric), but the structure mirrors 1:1.

---

## Final checklist

Before you ship the scenario:

- [ ] Starting message: ≤3 sentences, one question, gates all precise data
- [ ] `<background>` has no numbers, no methods, no exact ages
- [ ] Every precise fact in `<hiddenInfo>` ends with "only state when asked"
- [ ] Method (rectal/oral/temporal/forehead) gated separately from reading
- [ ] `<formatting>` block included with the temperature paraphrase rules
- [ ] `<concerns>` ordered, with the critical one as a directive (if applicable)
- [ ] `<concerns>` contains a "wait for the pharmacist to ask their assessment questions first" rule if the patient has questions (e.g. comparison, recommendation) that could pre-empt the student's first task
- [ ] All task titles read cleanly in isolation
- [ ] No task title, description, or acceptance criteria gates on the *correct* answer — tasks fire on the action, the rubric grades correctness
- [ ] No task description names the product, diagnosis, or right answer (those live in the hint)
- [ ] Acceptance criteria use clear AND/OR logic
- [ ] `clinicalBackground` reads informationally (no "you'll want", no second-person address, no advisory phrasing)
- [ ] Headers in `clinicalBackground` are content-based, not task-labeled
- [ ] No communication "Do / Don't" sections in `clinicalBackground` (that is the rubric's job)
- [ ] Tables in `clinicalBackground` used only when data is genuinely tabular
- [ ] No em dashes anywhere in `clinicalBackground`
- [ ] `clinicalBackground` cites current guidelines or peer-reviewed sources in a References section
- [ ] If the scenario involves a specific drug, `clinicalBackground` covers class, dosing and interactions
- [ ] Evaluation prompt has `# Rubric (X pts total)` header matching (N tasks × 3) + Communication × 3 — i.e. `# Rubric (15 pts total)` for the standard 4-task scenario
- [ ] Each `evaluationPrompt` sub-bullet has specific keywords (not vague phrases)
- [ ] `## Task N` section titles in `evaluationPrompt` match task titles 1:1
- [ ] `evaluationPrompt` contains a `## Communication (3 pts)` section with case-specific examples of open-ended phrasing and empathy
- [ ] `rubric` field (in-scenario panel) mirrors `evaluationPrompt`'s task structure and point total, including a `## Communication` section — sub-bullets use generic verbs, no spoilers
- [ ] Manual sanity pass done
- [ ] Harness run hits 0 critical, score in 70-85% range

When in doubt, copy the structure from `scn_infant_triage_001` (after iter 3) — it's the cleanest reference scenario.

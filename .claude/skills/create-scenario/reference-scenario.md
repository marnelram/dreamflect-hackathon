# Reference Scenario — `scn_infant_triage_001`

This is the gold-standard reference snapshot, captured from `src/lib/test-data/example-module.ts` after the iterate-scenario loop converged it. Use it as the structural template when drafting any new scenario.

**Frozen at first capture**. If the live scenario in `example-module.ts` drifts (gets edited by `/iterate-scenario` later), this file does NOT auto-update. To refresh, re-copy the live scenario object into the code block below. The structural shape rarely changes; refreshing is only necessary when the authoring guide adds a new field or a new convention emerges.

When in doubt while drafting, copy the structure from here. The wording will be different (your scenario, your patient, your teaching moment), but the field shape, the block ordering inside `personaPrompt`, the markdown structure of `clinicalBackground`, the headers in `evaluationPrompt` — those mirror exactly.

## Why this scenario

- 4 tasks, each with title (≤50), description (≤200), hint (≤200), acceptanceCriteria (lenient AND/OR logic).
- `clinicalBackground` is informational (no second-person, no advisory phrasing, no em dashes), with a References section citing AAP and CHOP guidelines.
- `evaluationPrompt` is `# Rubric (12 pts total)` — 4 tasks × 3 specific-keyword sub-bullets each.
- `rubric` mirrors `evaluationPrompt`'s structure with generic verbs (no spoilers shown to students during the scenario).
- `personaPrompt` uses the 5-block structure (identity / `<background>` / `<hiddenInfo>` / `<personality>` / `<concerns>` / `<formatting>`) with method-vs-reading gated separately.
- `startingMessage` is one stage direction + one chief-complaint question, gating all precise data.

## Full scenario object

```typescript
    {
      id: "scn_infant_triage_001",
      moduleId: "mod_otc_peds_001",
      creatorId: "admin",
      title: "Triage Assessment",
      order: 0,
      image: "/testing/OTCFever.png",
      patientAvatar: null,
      createdAt: new Date("2024-05-20T09:00:00Z"),
      updatedAt: new Date("2024-05-20T09:00:00Z"),
      scenarioContext: `
**Goal:** Assess a newborn with fever and determine appropriate triage decision.

**Time Limit:** 8 minutes

*Aisha Thompson, a 32-year-old teacher on maternity leave, stands anxiously at the pharmacy counter cradling her 10-week-old daughter Zara wrapped in a blanket. She clutches a digital thermometer with trembling hands and looks sleep-deprived and worried, having just left the hospital maternity ward a few weeks ago.*
`,
      clinicalBackground: `
# Pediatric Fever Triage

Fever in infants is the #1 reason children present to emergency departments. In the under-three-month group, bedside exam alone is insufficient to rule out serious bacterial infection, which sets the ER referral threshold at any rectal temperature of 38.0°C (100.4°F) or higher. The sections below cover the basis for that threshold, the assessment information triage decisions depend on and how criteria shift in older infants.

## Establishing the fever

A fever is a rectal temperature of 38.0°C (100.4°F) or higher, or one documented at home in the previous 24 hours. The site of measurement matters because the offset between methods is enough to flip a borderline reading. Rectal temperature is the gold standard in infants under three months. Temporal (forehead) readings run about 0.2-0.3°C lower than rectal, and axillary (armpit) readings about 0.7-0.8°C lower, which makes axillary unreliable for triage decisions in this age group.

A complete fever assessment is built from the infant's exact age in days or weeks, the temperature reading itself, the method used to obtain it, the time of fever onset and any antipyretics already administered. A vague report such as "she felt warm so I gave her some Tylenol" doesn't carry enough information to triage on without a documented reading and method.

## The red-flag screen

For infants under three months, any fever already meets the ER referral threshold. The red-flag screen still serves two functions: it informs the receiving ER about presentation severity, and it differentiates a routine referral from a critical one. The screen is organized by physiologic system, with a single open question per category typically sufficient to surface significant findings.

| Category | Ask about | Listen for |
| :--- | :--- | :--- |
| Feeding & hydration | Last feed, wet diapers in the last day, tears when crying | Refusing feeds, fewer than 4-6 wet diapers a day, dry mouth, sunken fontanelle |
| Behavior & neuro | Alertness, ability to wake the infant, response to comfort | Lethargy, paradoxical irritability (worse when held), high-pitched or continuous cry, floppy or stiff tone, seizures |
| Breathing | Effort of breathing and skin color | Grunting, fast breathing, retractions, nasal flaring, blue lips |
| Skin & circulation | Skin color, hand and foot temperature and any rash | Mottling, pale or blue skin, cold extremities with a warm trunk, a non-blanching rash, capillary refill over two seconds |
| Meningitis-specific | Soft spot, neck movement, light sensitivity | Bulging fontanelle, stiff neck, photophobia |

Classical meningitis signs (stiff neck, bulging fontanelle) are frequently absent in infants who actually have bacterial meningitis. A "well-looking" febrile infant under three months is not a reassuring presentation, which is the basis for the age-driven referral rule.

## Risk by age group

The rule reflects base rates of serious bacterial infection in well-appearing febrile infants. UTI rates sit around 10-15% in the 0-28 day group and 5-10% in the 29-90 day group. Bacteremia runs 1-2%, and meningitis falls between 0.2 and 1%. These rates exceed the sensitivity of clinical exam alone, which is why the AAP 2021 guideline calls for blood and urine cultures in this age group (and a lumbar puncture in the 8-21 day subgroup) regardless of clinical appearance.

| Age | UTI | Bacteremia | Meningitis | Common organisms |
| :--- | :--- | :--- | :--- | :--- |
| 0-28 days | ~10-15% | 1-2% | 0.5-1% | GBS, *E. coli* and *Listeria* |
| 29-90 days | ~5-10% | 1-2% | 0.2-0.5% | *E. coli* and GBS |
| 3-36 months | 2-5% | <1% | rare | *E. coli* (UTI); pneumococcus rare post-PCV |

The cutoff lands at three months because three things shift around that age. Maternal antibodies from pregnancy start to wane and the infant's own immune response has had time to mature, which raises the diagnostic value of fever itself. The first round of pneumococcal and Hib vaccines, given at the two-month visit, begins to take effect and collapses the rate of bacterial meningitis and bacteremia from those organisms. And the exam findings that depend on the infant being able to react (stiff neck, photophobia, lethargy distinguishable from sleep) become more reliable past three months. Below that age, a well-appearing infant can still have culture-positive bacteremia or meningitis, which is why clinical impression isn't enough. Past three months, the exam is informative and the base rate of serious bacterial infection drops sharply.

Triage criteria loosen with age. Between three and six months, a rectal temperature of 39.0°C or higher is the cutoff for urgent evaluation, and a temperature of 38.0-39.0°C is reassessed based on clinical appearance and trajectory. Past six months, the same 39.0°C cutoff applies, with any fever lasting more than 24 hours or one not responding to antipyretics warranting follow-up.

## Required workup under three months

Evaluating a febrile infant under three months requires cultures from blood and urine to identify bacteremia or UTI, often a lumbar puncture (a sample of cerebrospinal fluid) to rule out meningitis, and a 24 to 48 hour observation window while those cultures grow. That's an emergency department or hospital admission workflow, not an outpatient one. A pediatrician's office or urgent care can't draw the cultures, can't process them on site, and can't admit for the observation period, which means a redirect through outpatient care delays the workup without changing what's needed.

## Post-vaccination fever

The routine immunization schedule is a common source of fever in young infants, and warrants explicit mention because it is often used to rationalize delayed referral. Fever is common after the 2-, 4- and 6-month immunizations, it peaks around six hours post-vaccination and it usually resolves within 48 hours. The under-three-month referral rule still applies. A vaccine-attributable fever and a fever from early-onset bacteremia present identically at the counter, and the two cannot be distinguished by thermometer or recent immunization history.

## OTC reference (community pharmacy)

The table is included for completeness. For febrile infants under three months, OTC analgesics are not first-line and the appropriate recommendation is ER referral.

| Product Name | Active Ingredient(s) | Price per 4 fl oz (USD) |
| :--- | :--- | :--- |
| Children's Tylenol Oral Suspension (Grape) | Acetaminophen (160 mg / 5mL) | $9.99 |
| Children's Tylenol Dye-Free (Natural Apple) | Acetaminophen (160 mg / 5mL) | $8.99 |
| Equate Children's Pain & Fever (Bubble Gum) | Acetaminophen (160 mg / 5mL) | $6.48 |
| Children's Motrin Oral Suspension (Berry) | Ibuprofen (100 mg / 5 mL) | $10.99 |
| Children's Motrin Dye-Free (Berry) | Ibuprofen (100 mg / 5 mL) | $8.99 |
| Equate Children's Ibuprofen (Grape) | Ibuprofen (100 mg / 5 mL) | $4.16 |
| Children's Advil Suspension (Fruit) | Ibuprofen (100 mg / 5 mL) | $8.99 |

> **Reminder:** Reference only — for febrile infants <3 months, OTC analgesics are NOT first-line. Refer to ER.

---

## References
- [AAP 2021 — Evaluation and Management of Well-Appearing Febrile Infants 8 to 60 Days Old (Pediatrics)](https://publications.aap.org/pediatrics/article/148/2/e2021052228/179783/Evaluation-and-Management-of-Well-Appearing)
- [Rate of UTI, Bacteremia, and Meningitis in Preterm and Term Infants (Pediatrics, 2024)](https://publications.aap.org/pediatrics/article/153/4/e2023062755/196869/Rate-of-Urinary-Tract-Infections-Bacteremia-and)
- [CHOP Febrile Infant Clinical Pathway](https://www.chop.edu/clinical-pathway/febrile-infant-emergent-evaluation-clinical-pathway)
- [UCSF Consensus Guidelines for Febrile Infants 0-90 Days](https://medconnection.ucsfbenioffchildrens.org/febrile-infant-guidelines)
- [Mayo Clinic — Thermometer basics: Taking your child's temperature](https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/in-depth/thermometer/art-20047410)
- [CHOP Vaccine Education Center — Fever and Vaccines](https://www.chop.edu/vaccine-education-center/vaccine-safety/other-vaccine-safety-concerns/fever-and-vaccines)
`,
      tasks: [
        {
          id: "tsk_triage_1",
          scenarioId: "scn_infant_triage_001",
          order: 0,
          title: "Assess baby's age and fever details",
          description:
            "Find out the baby's exact age, when the fever started, how high it is, and how it was measured.",
          hint: "Any fever in a baby under 3 months old is a medical emergency requiring immediate ER referral.",
          acceptanceCriteria:
            "Three pieces of information must ALL be spoken aloud by the parent before this task completes: (1) Zara's age (the parent says '10 weeks' or similar), (2) the actual temperature number (the parent says '101' or similar), AND (3) the measurement method (the parent says 'rectal', 'oral', 'temporal', etc.). If any of the three has not been answered by the parent, the task is INCOMPLETE — the student asking the question is not enough on its own.",
        },
        {
          id: "tsk_triage_2",
          scenarioId: "scn_infant_triage_001",
          order: 1,
          title: "Check for red flag symptoms",
          description:
            "Ask about danger signs that would indicate a more serious infection.",
          hint: "Newborns with fever can deteriorate quickly. Look for signs of sepsis or meningitis.",
          acceptanceCriteria:
            "The student must ask about at least TWO DISTINCT items from this list: (a) feeding or wet diapers, (b) lethargy or unusual irritability, (c) rash, (d) breathing or skin color, (e) vomiting or diarrhea, (f) bulging fontanelle or stiff neck. The student must name the specific symptom in their question. General questions such as 'how is she doing', 'what's going on', 'any other symptoms', 'is she running a fever', or simply asking about her age or temperature do NOT count toward either of the two.",
        },
        {
          id: "tsk_triage_3",
          scenarioId: "scn_infant_triage_001",
          order: 2,
          title: "Make appropriate triage decision",
          description:
            "Decide on the appropriate level of care — OTC treatment, follow-up with a doctor, or emergency referral.",
          hint: "Any rectal temperature of 100.4°F (38.0°C) or higher in a baby under 3 months requires ER evaluation - no exceptions.",
          acceptanceCriteria:
            "The student says the words 'ER' or 'emergency room' as THE recommended next step. Saying 'pediatrician', 'urgent care', 'doctor', 'wait and see', or 'follow up later' does NOT count, even when paired with the ER (e.g. 'go to the ER OR call your pediatrician' is a downgrade and FAILS this task because it gives the parent the option to skip the ER). Recommending OTC treatment (Tylenol, ibuprofen, etc.) at any point during the conversation also FAILS this task.",
        },
        {
          id: "tsk_triage_4",
          scenarioId: "scn_infant_triage_001",
          order: 3,
          title: "Walk the parent through next steps",
          description:
            "Make sure the parent understands what to do and feels supported as you respond to any concerns they raise.",
          hint: "Stay firm if the parent pushes back. Acknowledge the concern first, then re-anchor on the medical reasoning.",
          acceptanceCriteria:
            "ALL THREE conditions must be visible in the transcript before this task completes: (1) The student has already recommended the ER AND has held that recommendation through at least one round of parent pushback (cost, anxiety, vaccine attribution, or 'can we just give Tylenol / wait?'), (2) the student has stated at least one specific reason for the referral (Zara's age under 3 months, risk of serious infection, need for cultures or full workup), AND (3) the student has acknowledged the parent's concern OR addressed the cost worry directly. If the student has only recommended the ER once without facing pushback, or if the parent has not yet pushed back, the task is INCOMPLETE. Downgrading to OTC, 'wait and see', or 'call your pediatrician' at any point FAILS this task.",
        },
      ],
      evaluationPrompt: `
# Role

You are a pharmacy professor specializing in patient triage and emergency recognition. You have access to the full chat history between an AI patient and the student pharmacist.

# Scenario
Aisha Thompson brings her 10-week-old daughter Zara to the pharmacy. Zara has had a rectal temperature of 101.2°F for the past 3 hours. This is a medical emergency requiring immediate ER referral — no OTC treatment is appropriate.

# Instructions
- Score each task out of its listed points. Award 1 point per completed bullet (whole numbers only).
- Address the student directly in first person. Provide one feedback comment per bullet.
- Each feedback bullet must include a verbatim quoted excerpt from the conversation showing what the student actually said (or the closest relevant turn if they did not say it). Quotes must be real text copied from the transcript. Do NOT use bracketed placeholders like "[User likely stated X]" or generic descriptions.
- Each section below corresponds 1:1 to one of the student's in-session tasks.

# Rubric (12 pts total)

## Task 1: Assess baby's age and fever details (3 pts)
- Established Zara's age (10 weeks / under 3 months).
- Asked how the temperature was taken (rectal vs temporal vs axillary) and got "rectal".
- Confirmed the actual reading (101.2°F) and how long the fever has lasted.

## Task 2: Check for red flag symptoms (3 pts)
- Asked about feeding (poor feeding, refusing to eat, decreased wet diapers).
- Asked about behavior changes (lethargy, extreme irritability, difficulty waking, inconsolable crying).
- Asked about physical symptoms (rash, breathing difficulty, vomiting, or diarrhea).

## Task 3: Make appropriate triage decision (3 pts)
- Identified that any fever in a baby <3 months requires ER evaluation.
- Clearly told Aisha to go to the EMERGENCY ROOM (not urgent care, not "call the doctor").
- Did NOT suggest any OTC treatment or "wait and see" at any point.

## Task 4: Walk the parent through next steps (3 pts)
- Maintained the ER referral when Aisha pushed back. Did NOT downgrade to OTC, "wait and see", or "call your pediatrician" under cost or anxiety pressure.
- Explained the reasoning for the recommendation (baby's age, risk of serious infection, need for full workup).
- Acknowledged the parent's concern (cost or anxiety) and gave a clear next step.

## Summary
- What they did well.
- What needs improvement.
- One main goal for their next triage assessment.
`,
      startingMessage: `*Aisha Thompson approaches the pharmacy counter, cradling her tiny daughter Zara against her chest. Her eyes are rimmed red with exhaustion and she fidgets with a digital thermometer in her free hand.*

"Hi, I was wondering if I could speak with the pharmacist about my baby?"`,
      patientInfo: `**Patient:** Zara Thompson

**DOB:** 2025-10-13 (age 10 weeks)
**Sex:** Female
**Weight:** ~10 lb (4.5 kg)

**Allergies:** NKDA (no known drug allergies)
**Medications:** None

## History
- Born full-term, no perinatal complications
- 2-month immunizations administered yesterday afternoon
- Breastfed exclusively
- No prior illnesses
- Mother present today: Aisha Thompson (32 yo, teacher, on maternity leave)
- Father (not present): Marcus Thompson (32 yo, software engineer)

## Today's Presenting Concern
- ~3 hours of fever, 101.2°F rectal
- Slightly less enthusiastic feeding; otherwise no documented red flags
`,
      personaPrompt: `
You are Aisha Thompson, a 32-year-old Black teacher on maternity leave. You are standing at a pharmacy counter with your 10-week-old daughter Zara. You are a first-time parent, anxious, sleep-deprived, and worried about your newborn's fever. You and your husband Marcus (at home) are financially conscious and want to avoid an expensive ER visit if possible.

<background>
- About 3 hours ago, Zara felt warm to the touch.
- Zara has been fussier than usual and feels warm, but is still feeding (though slightly less enthusiastically).
- You are exhausted from lack of sleep.
</background>

<hiddenInfo>
- The following facts are LOCKED in your memory. Only share each fact when the pharmacist asks a question that specifically targets it.
- Zara is exactly 10 weeks old (born 10 weeks ago) — only state her age when asked.
- You took Zara's temperature RECTALLY and it read 101.2°F — only state the reading and the method when asked.
- Zara weighs approximately 10 pounds.
- Zara has no rash, vomiting, or diarrhea.
- Zara is breastfed and not taking any medications.
- Zara had her 2-month vaccinations yesterday afternoon (this is likely contributing to the fever).
- No family history of serious genetic conditions.
</hiddenInfo>

<personality>
- Anxious but trying to stay composed (teacher mindset — you ask clarifying questions).
- Polite, respectful, and desperately want reassurance.
- Mentions cost concerns once or twice ("we're trying to avoid an ER bill if we can").
- Scared this might be serious but hoping it's nothing.
</personality>

<concerns>
- Express only ONE concern at a time.
- You're worried this might be meningitis or something serious (you read online that fevers in newborns can be dangerous).
- You want to avoid a costly ER visit if possible, but will comply if the pharmacist insists.
- You're wondering if you can just give her some Tylenol at home.
- You're not sure if the fever is from the vaccines or something more serious.
- **Wait for the pharmacist to ask questions before volunteering details.**
</concerns>

<formatting>
- Keep responses short — 1 to 2 sentences.
- Speak as Aisha only. Do NOT roleplay as Marcus or anyone else.
- React realistically if the pharmacist recommends ER (initial resistance due to cost, but ultimately compliance).
- Show relief if the pharmacist is reassuring, but also concern about the baby's age.
- When stating Zara's temperature aloud, paraphrase naturally ("about 101", "just over a hundred and one") OR describe reading off the thermometer in a stage direction (e.g. *glances at the thermometer screen which reads 101.2°F*). Do NOT speak the decimal precision (101.2°F) verbatim in dialogue.
- Only mention HOW you took the temperature (rectal / oral / temporal) if the pharmacist specifically asks about the method. If they ask "what was her temperature", answer the temperature only — do not also volunteer the method.
</formatting>
`,
      rubric: `
# Grading Rubric (12 pts total)

## Task 1: Assess the baby's age and fever details (3 pts)
- Established the baby's age
- Asked how the temperature was taken
- Confirmed the reading and how long the fever has lasted

## Task 2: Check for red flag symptoms (3 pts)
- Asked about feeding and hydration
- Asked about behavior changes (lethargy, irritability)
- Asked about other physical symptoms (breathing, rash, GI)

## Task 3: Make appropriate triage decision (3 pts)
- Recognized the level of urgency for this case
- Made a clear referral to the right level of care
- Avoided suggesting inappropriate OTC treatment

## Task 4: Walk the parent through next steps (3 pts)
- Confirmed clear next steps with the parent
- Explained the reasoning behind the recommendation
- Acknowledged the parent's concerns
`,
      voiceId: "Ashley",
      timeLimit: 480,
      patientName: "Aisha Thompson (Mom) / Zara Thompson",
      patientDob: new Date("2025-10-13"),
      patientGender: "Female",
    },
```

## Why these specific structures

### `personaPrompt` block ordering

Identity paragraph first sets who-and-why. `<background>` is what the patient can volunteer freely (vague, no numbers). `<hiddenInfo>` is what's locked behind explicit student questions (precise facts, with "only state when asked" on every bullet). `<personality>` is the voice/affect. `<concerns>` is what the patient cares about, ordered by importance — this is where you mark a single critical pivot as **directive** if the entire teaching moment hinges on it. `<formatting>` is dialogue style and is mostly boilerplate (temperature paraphrase rule, method-vs-reading separation, one-question-at-a-time).

### `clinicalBackground` headers

Content-based, not task-labeled. `## Establishing the fever` (good) vs `## Task 1: Assess the fever` (bad — turns the panel into a checklist that tells the student exactly what they're being graded on). Headers describe the topic; the topic content stays informational.

### `evaluationPrompt` rubric structure

Each `## Task N:` heading mirrors `tasks[].title` exactly. Each task has 3 specific-keyword sub-bullets — each one independently scoreable, each one worth 1 point. Total = N tasks × 3 = `# Rubric (12 pts total)` for 4 tasks.

### `rubric` (in-scenario panel) structure

Same task structure as `evaluationPrompt`, but generic verbs instead of specific keywords. Why: the student sees this DURING the scenario, so spoilers (the actual answers) get stripped. "Mentioned warning signs of toxicity" (rubric) maps to "Mentioned warning signs of overdose / liver injury (dark urine, jaundice, persistent fatigue, vomiting)" (eval prompt).

### Task `acceptanceCriteria` design

The auto-task-checker is a small Llama 3.1 8B and is unreliable — it hallucinates coverage. So:

- Criteria are intentionally LENIENT (a subset of rubric sub-bullets — fires on "good enough", not "excellent").
- Use clear AND/OR logic so the model can answer YES/NO with high confidence.
- Acceptable to be very explicit about what does and doesn't count (see Task 2's "specific symptom in their question; general questions do NOT count").

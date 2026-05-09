# New Chart Skill

## Purpose

Co-author a new patient chart for the workup feature through a structured 3-phase brainstorming workflow, then generate the full chart data file and answer key using a planner agent + parallel sub-agents. The skill acts as a clinical co-author — probing for learning objectives, proposing errors, and researching realistic clinical data — rather than just scaffolding a template.

## Input

Optional arguments when invoking:

```
/new-chart                                    # Start from scratch
/new-chart ICU septic shock                   # Start with a scenario seed
/new-chart based on docs/chart-reference.pdf  # Start from a reference document
```

If a reference document path is provided, read it first and use it as the clinical foundation.

## Workflow Overview

```
Phase 1: Brainstorm (interactive, 3-4 rounds of AskUserQuestion)
   ↓
Phase 2: Master Plan (detailed section-by-section blueprint with exact values)
   ↓
Phase 3: Generate (4 chunk agents + 1 notes agent in parallel → bash cat → type check)
```

---

## Phase 1: Clinical Scenario Brainstorming

This phase is interactive. Use `AskUserQuestion` to gather information in waves. After each wave, summarize what you've captured and propose defaults for anything the user hasn't specified. If the user doesn't clarify, make the best clinical assumption and move on.

### Wave 1: Setting & Scenario

Ask:

```
1. What unit/setting? (Med-Surg, ICU/CCU, ED, Stepdown, Renal, Respiratory, Oncology, Pediatrics...)
2. Primary diagnosis or clinical problem? (Or "surprise me" for a common case in that unit)
3. Do you have reference charts, labs, or clinical documents to base this on?
```

If the user provides a reference document, read it and extract:

- Patient demographics (anonymize/fictionalize)
- Lab values and trends
- Medication list
- Clinical timeline
- Any notable findings

If no reference, note that Phase 2 will research realistic values.

**Defaults if user says "surprise me"**: Pick a high-yield case for the selected unit:

- ICU → Sepsis, ARDS, DKA, AKI on CKD, status epilepticus
- Med-Surg → CHF exacerbation, COPD exacerbation, cellulitis, pneumonia, VTE
- Renal → AKI, CKD complications, electrolyte emergencies, dialysis management
- Respiratory → Asthma exacerbation, PE, pleural effusion, oxygen therapy management
- ED → Chest pain workup, overdose/toxicology, anaphylaxis, acute abdomen

### Wave 2: Patient Profile & Learning Objectives

Based on Wave 1 answers, propose and ask:

```
1. Patient demographics — propose: age, sex, relevant PMH, home medications
   (The PMH and home meds should create opportunities for drug interactions,
   contraindications, and med rec issues)
2. What should pharmacy students learn from this case? Propose 3-5 learning objectives.
   Examples:
   - Identify drug-disease contraindications
   - Perform medication reconciliation
   - Recognize antibiotic de-escalation opportunities
   - Catch dosing errors in renal impairment
   - Evaluate insulin management transitions
3. Difficulty level: beginner / intermediate / advanced
4. Estimated completion time (minutes)
```

Present proposed demographics with clinical reasoning for each choice. For example:

> "I'm proposing CKD Stage 3 as a comorbidity because it creates opportunities for students to catch renally-dosed medications and contraindicated drugs (metformin, NSAIDs, etc.)"

### Wave 3: Disease Progression & Pharmacy Errors

This is the most important wave. Based on everything gathered so far, present a detailed proposal:

```
1. DISEASE PROGRESSION (day-by-day outline)
   Day 1: Presentation — what brought them in, initial severity
   Day 2: Hospital course — improving, worsening, complications?
   Day 3+: Resolution trajectory or escalation

2. PHARMACY ERRORS TO EMBED (propose 3-5)
   Each error should be:
   - Realistic (happens in real hospitals)
   - Discoverable (evidence exists in the chart to catch it)
   - Educational (teaches a key pharmacy concept)

   Examples of error types:
   - Drug continued despite contraindication (e.g., metformin in AKI)
   - Missing prophylaxis (DVT, stress ulcer, glycemic)
   - Wrong dose for organ function (renal/hepatic dosing)
   - Drug interaction not addressed
   - Antibiotic spectrum mismatch or failure to de-escalate
   - Home medication inappropriately held or continued
   - Lab monitoring gap (drug levels, renal function with nephrotoxins)

3. COMORBIDITIES (propose list with reasoning for each)
   Each comorbidity should serve a teaching purpose.

4. KEY MEDICATIONS (proposed med list — home + inpatient)
```

Ask the user to refine, add, or remove any of the above. Anything they don't comment on is accepted as proposed.

---

## Phase 2: Master Plan Generation

After Phase 1 is complete, generate a comprehensive master plan document. This plan is the single source of truth that all sub-agents will reference. Use the TodoWrite tool to track the plan creation.

### Research Step

Before writing the plan, do clinical research for realistic values:

- Use `WebSearch` to look up clinical guidelines, typical lab ranges, and disease progression patterns
- Use `context7` MCP tools if relevant medical library documentation is available
- Research realistic vital sign trends for the disease state
- Look up current antibiotic guidelines, dosing protocols, drug interactions
- Verify medication doses are realistic for the patient's weight/renal function

### Master Plan Structure

Write the master plan as a structured document. The plan is saved to disk at `src/lib/workup/charts/.staging/{chart-id}/master-plan.md` so all agents can read it.

**Incremental Writing (Context Protection)**: Write the master plan to disk **section by section** using `Edit` (append), not all at once. This prevents context exhaustion on large plans (500+ lines for complex cases):

1. Create staging directory: `mkdir -p src/lib/workup/charts/.staging/{chart-id}`
2. Write META + DEMOGRAPHICS → `Write` to `master-plan.md`
3. Write TIMELINE → `Edit` (append) to `master-plan.md`
4. Write VITALS PLAN → `Edit` (append)
5. Write LABS PLAN → `Edit` (append)
6. Write MEDICATIONS PLAN → `Edit` (append)
7. Write remaining sections → `Edit` (append) each
8. Write EMBEDDED ERRORS + ANSWER KEY OUTLINE → `Edit` (append)

The conversation only holds the _current section_ being composed (~50-80 lines), not the entire plan. After all sections are written, read back just the highlights for the user approval summary.

**Write to disk BEFORE user approval** — if context compaction hits during the approval step, the plan is already safe on disk.

**CRITICAL — Exact Values Requirement**: The master plan must specify **every single data value** that will appear in the chart. Agents transcribe values from the plan — they do NOT invent values. This ensures consistency when agents cannot see each other's output. For example:

- Labs: list every result with its exact numeric value, unit, reference range, and flag
- Vitals: list every reading with exact HR, BP, RR, Temp, SpO2 at each timepoint
- Medications: list every dose, route, frequency, start/end date
- Notes: outline key content points and which `{{LABS:...}}`, `{{VITALS:...}}`, and `{{IMAGING:...}}` markers to embed

The plan is organized by section:

```markdown
# Master Plan: {Patient Name}

## META

- Chart ID: {lastname-firstname} (kebab-case)
- Title: "{description}"
- Difficulty: {level}
- Estimated Time: {minutes}
- Current Datetime: "{MM/DD/YYYY HH:MM}" (the simulated "now" — end of case)
- Admission Date: "{MM/DD/YYYY}"
- Length of Stay: {N} days
- Unit: {unit}

## DEMOGRAPHICS

- Name, MRN, DOB, Age, Sex
- Location (unit + bed)
- Allergies (with reaction types — include at least one that creates a teaching point)
- Admitting Dx, Code Status
- Weight (kg), Height (cm)
- Attending physician name
- PMH list (with reasoning for each)
- Home medications (with doses, routes, frequencies)
- Social history

## TIMELINE (day-by-day disease progression)

### Day 1 — {Date}

- Clinical events: {what happens}
- Vitals trend: {HR, BP, RR, Temp, SpO2 ranges}
- Key lab changes: {which panels ordered, notable values}
- Medication changes: {started, stopped, adjusted}
- Nursing observations: {key assessment findings}

### Day 2 — {Date}

[... same structure ...]

### Day N — {Date}

[... through to current datetime ...]

## CLINICAL NOTES PLAN

### Clinician Roster

Define every clinician who will write notes in this chart. Each gets a persona and writing style:

| Role                                  | Name   | Credential   | Persona                                                                                 | Writing Style                                                                                                                                                          |
| ------------------------------------- | ------ | ------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ED Physician                          | {Name} | MD           | "Busy ED attending, 8 patients in the department"                                       | Terse, problem-focused, lots of abbreviations                                                                                                                          |
| Attending (ICU/Hospitalist)           | {Name} | MD           | "Busy intensivist/hospitalist, 14-patient census"                                       | Copy-forward heavy, updates only what changed                                                                                                                          |
| Nursing (Day)                         | {Name} | RN, BSN      | "Day shift nurse, 2 ICU patients / 4 floor patients"                                    | Systematic assessment, charting by exception                                                                                                                           |
| Nursing (Night)                       | {Name} | RN           | "Night shift nurse, overnight events focus"                                             | Brief unless something happened overnight                                                                                                                              |
| {Specialty} Consult                   | {Name} | MD/PharmD/DO | "Fellow or specialist consulted on Day {N}"                                             | Focused on their specialty's concerns only                                                                                                                             |
| SLP (if intubated/dysphagia risk)     | {Name} | CCC-SLP      | "Speech pathologist, consult for swallow eval post-extubation or aspiration risk"       | Structured: oral mech exam, bedside swallow trial results, diet rec, aspiration precautions. Brief and recommendation-focused                                          |
| RD (if complex diet needs)            | {Name} | RD, CNSC     | "Clinical dietitian, consult for TF management, renal/cardiac/DM diet, or malnutrition" | Structured: nutrition assessment (BMI, prealbumin, intake), caloric/protein goals, diet order rec, TF formula if applicable. Uses calculated values                    |
| Case Manager/SW (if dispo complexity) | {Name} | RN-CM / MSW  | "Case manager or social worker, consult for discharge planning"                         | Focused on barriers to discharge: insurance, home setup, DME, SNF placement, family meetings, interpreter needs, follow-up coordination. Practical and action-oriented |
| ...                                   | ...    | ...          | ...                                                                                     | ...                                                                                                                                                                    |

**When to include ancillary consults:**

- **SLP**: Any patient intubated >24hr, stroke/neuro patients, aspiration pneumonia concern, elderly with dysphagia risk. Order placed → bedside swallow eval → note with diet recommendation. Must appear BEFORE patient starts PO diet.
- **RD**: Patients on tube feeds (specific formula recs), complex overlapping dietary needs (DM + HF + CKD = carb-controlled + sodium-restricted + renal), TPN, malnutrition/refeeding risk, bariatric patients.
- **Case Manager/SW**: Complex disposition (SNF vs home, home health needs), language barriers requiring interpreter coordination, elderly patients living alone, insurance/prior auth needs, family meetings for goals of care, patients requiring DME or post-acute services.

### Note Sequence (chronological)

For each note, specify:

- Author (from roster above)
- Datetime
- Note type (ED, Admission H&P, Progress, Nursing Assessment, Consult)
- Key content points to include
- Any {{VITALS:...}}, {{LABS:...}}, or {{IMAGING:...}} inline markers to embed
- Teaching-relevant details to emphasize or bury

### Progress Note Copy-Forward Rules

Attending and consulting physician progress notes MUST follow real clinical copy-forward workflow:

1. **Day 1 (Admission/H&P or first progress note)**: Written from scratch — full history, exam, assessment, plan
2. **Day 2+**: Copy the ENTIRE previous day's note as the starting point, then:
   - Update the "Events Overnight / Interval History" section
   - Update vitals and exam findings ONLY where changed (leave unchanged sections identical)
   - Update `{{VITALS:...}}` and `{{LABS:...}}` date references to pull the current day's data
   - Update assessment/plan sections for active changes only
   - Leave resolved or stable problems with identical wording + "stable" / "continue current management"
   - Stale copy-paste artifacts are EXPECTED (e.g., "plan to extubate today" still present the day after extubation) — this is realistic
3. The note should look ~70-80% identical to the previous day's note for a stable patient

### Physician Note Realism Rules

Progress notes must read like a real physician typed them quickly. Apply ALL of these:

1. **No parentheticals for context.** Physicians don't have time to add explanatory parentheticals. NEVER write `(requires ACEI washout)`, `(off inotropes >24hr, HR 86, SBP 112)`, `(language barrier makes neuro exam challenging)`. Either flatten the info into the sentence or cut it entirely.
   - BAD: `Start carvedilol 3.125mg BID (off inotropes >24hr, HR 86, SBP 112)`
   - GOOD: `Start carvedilol 3.125mg BID`

2. **Overnight events = clinical events only.** The "Events Overnight" section should list clinical events (extubated, pressors weaned, diet advanced, line removed). NEVER include lab values or vitals in overnight events — those are already in the `{{LABS:...}}` and `{{VITALS:...}}` sections below. Physicians don't re-type numbers they can see in the embedded tables.
   - BAD: `Overnight: SCr improved 2.8→2.5, lactate normalized 0.9, BG 148-168 on SSI`
   - GOOD: `Overnight: Tolerating PO, ambulated with PT, weaned O2 to RA`

3. **Active problems: 2-3 bullets max per problem** in progress notes (Day 2+). The admission H&P can have slightly more. Physicians write terse plans, not paragraphs.
   - BAD: 6 bullets under "AKI on CKD" with reasoning, monitoring plan, and dose adjustments
   - GOOD: `- SCr 2.5, trending down from 2.8\n- Continue holding lisinopril\n- Renally dose all meds`

4. **PPX & Lines: collapse to 2 lines.** Don't use separate bullets for each prophylaxis item. Format:
```

### PPX & Lines

DVT/GI ppx: enoxaparin, pantoprazole IV Q12H
R IJ TLC — D/C today. Foley — D/C today. PT/OT evaluating.

```

5. **No lab annotations in extras.** `{{LABS:...}}` extras should be bare values, never annotated.
- BAD: `"extras": ["Lactate 0.9 (normal)", "Procalcitonin 0.3 (down from 1.8)"]`
- GOOD: `"extras": ["Lactate 0.9", "Procalcitonin 0.3"]`

6. **Terse assessment headers.** No parentheticals in problem names or assessments.
- BAD: `### HFrEF (EF 25%, last echo 02/23)`
- GOOD: `### HFrEF EF 25%`

7. **Short disposition.** 1-2 lines max. No bullet lists for discharge planning.
- BAD: 5 bullets about discharge criteria, social work, insurance, follow-up
- GOOD: `Targeting discharge tomorrow if tolerating PO furosemide. SW arranging home health.`

8. **No medication reconciliation sections.** Med rec is pharmacy's job. Physicians list medications under each active problem, not in a dedicated med rec section.

### Nursing Note Rules

- Nursing assessments do NOT copy-forward — each is an independent shift assessment
- Different nurse names for day vs. night shifts (same nurses can repeat across days)
- Focus on: neuro, cardiac, respiratory, GI, GU, skin, lines/drains, pain, safety
- Chart by exception — only elaborate on abnormal findings

**Nursing Note Realism Rules (CRITICAL):**

1. **Blank lines between ROS sections.** Each `**Section:**` paragraph MUST be preceded by a blank line (`\n\n`) for proper markdown rendering. Without this, all ROS sections run together into one unreadable block.
```

**Neuro:** Alert, oriented, GCS 15. No distress.

**Cardiac:** A-fib, HR 80-88, BP 112/68. No edema.

**Resp:** Room air, SpO2 96%. Lungs clear bilaterally.

```

2. **No exact medication doses.** Nurses chart drug names only — doses are on the MAR. Write "metformin given via OGT" not "Metformin 1000mg BID given via OGT". Write "warfarin given" not "warfarin 5mg given". The only exception is if the dose itself is clinically relevant to a nursing observation (e.g., "insulin drip at 4 units/hr").

3. **Simplified blood glucose documentation.** Use narrative form, not exact values. Nurses don't list every BG reading in their assessment — that's on the flowsheet.
- BAD: `BG: 286→274→218→194→182, insulin drip titrated per protocol`
- GOOD: `BG trending down on insulin protocol` or `BG within target on SQ regimen` or `BG stable overnight`

4. **No parentheticals.** Same rule as physician notes. Flatten or cut.
- BAD: `Follows simple commands in English (nods, points).`
- GOOD: `Follows simple commands in English, nods, points.`

5. **No lab values in nursing assessment.** Nurses don't write SCr, INR, or other lab values in their shift assessment. They document clinical observations (urine output, skin color, bleeding signs), not lab numbers.
- BAD: `GU: Foley draining clear yellow, 45mL/hr. SCr 2.5, down from 2.8.`
- GOOD: `GU: Foley draining clear yellow, 45mL/hr. UOP adequate.`

6. **Pantoprazole/protonix: keep it simple.** Just "taking protonix" or omit entirely. Nurses don't chart `Pantoprazole 40mg IV Q12H` in their narrative — that's MAR territory.

7. **Drug names use common/brand names.** Nurses often write brand names in narrative notes: "protonix" not "pantoprazole", "lasix" not "furosemide". Use whichever is more natural for each drug.

## LABS PLAN

**Panel Name Allowlist (CRITICAL):** Every `panelName` in the lab data MUST match one of the panels in `LabResultsTab.tsx` PANEL_ORDER. If a panel name doesn't match, those labs will silently not render. Valid panel names:

```

CMP, CBC, Coags, LFTs, Cardiac, Inflammatory, ABG, Other, Drug Levels

```

Common mistakes: using "Hepatic" instead of "LFTs", "Cardiac Markers" instead of "Cardiac", "Misc" instead of "Other". If you need a new panel, you must add it to PANEL_ORDER in `src/components/workup/tabs/LabResultsTab.tsx`.

For each day, specify:

- Which panels to include (CMP, CBC, Coags, ABG, etc.)
- Exact values for each result (with units and reference ranges)
- Flag any H/L/C values
- Ensure lab trends are internally consistent with disease progression
- Include drug levels if applicable (vancomycin, aminoglycosides, etc.)
- Lab draw times must NEVER be on-the-hour. Morning labs are drawn during 04:00-06:00 phlebotomy rounds — use times like 05:18, 05:22, 04:47, NOT 06:00. STAT labs can be any time but should correlate with a clinical event and still avoid round times.

## VITALS PLAN

- Frequency (Q4H, Q1H for ICU, etc.)
- Exact values for each timepoint — timestamps must NEVER be on-the-hour (e.g., NOT 06:00, 10:00, 14:00). Use realistic offsets: 06:04, 10:02, 14:08, 18:12, 22:06. Vary ±2-15 min from the scheduled time.
- No vital sign parameter should have more than 3 identical consecutive values. Real patients have natural variation — if baseline RR is 14, use a mix of 13, 14, 15. Specify small ranges (e.g., "RR 13-15") for stable parameters.
- Trends must match disease progression (e.g., fever → defervescence, tachycardia → normalization)

## MEDICATIONS PLAN

For each medication:

- Name, dose, route, frequency
- Start date, end date (if applicable)
- Category: infusion / scheduled / prn / home
- isActive status
- Notes and admin instructions — NEVER include meta-annotations like `[ERROR:]`, `[INTENTIONAL:]`, `[BUG:]` in `notes` or any data field rendered in the UI. Intentional errors must be silent in the data; they are documented ONLY in the answer key.
- Flag which medications are INTENTIONAL ERRORS (in the master plan only — NOT in the chart data)
- For medications discontinued during the admission, explicitly specify the `endDate` and mark `isActive: false`. When a note says "D/C vancomycin" on Day 4, the medication entry must reflect this.

## MAR PLAN

For each medication, specify:

- Administration times and statuses (given/not-given/held/due) — times must NEVER be on-the-hour or half-hour. Use realistic offsets: 08:12 not 08:00, 16:05 not 16:00, 21:08 not 21:00. Cluster around standard med pass windows (0600-0800, 1200-1400, 1800-2000, 2200-0000) with ±2-15 min variation.
- Nurse names for each administration
- Any PRN administrations with reason
- Hold reasons where applicable
- If the chart includes sliding scale insulin (SSI), define the exact BG→dose brackets in the master plan (e.g., 150-199→2u, 200-249→4u, 250-299→6u, 300-349→8u). Every SSI dose in the MAR, `insulinDoses` array, flowsheet "Insulin given" parameter, and nursing notes must match these brackets based on the corresponding BG reading.
- Flag entries that are INTENTIONAL ERRORS (e.g., med given despite contraindication)

## MICROBIOLOGY PLAN

For each specimen:

- Type, collection date, result date
- Organism (if positive), gram stain
- Full susceptibility panel (if applicable)
- How results should influence antibiotic choices
- Result date must be consistent with the stated timeframe in notes. If `collectedDate` is 03/01 and `resultDate` is 03/03, notes should say "No growth at 48 hours" (not "5 days"). Final negative = 5 days, preliminary negative = 48-72 hours. Match `resultDate - collectedDate` to the stated interval.

## FLOWSHEET PLAN

- Parameters to include by category (Hemodynamic, Respiratory, Renal, etc.)
- Values at each timepoint
- Must be consistent with vitals and disease progression

## TIMELINE/CHARTS DATA PLAN

- Antibiotic entries with start/stop events and style (solid/dashed/dotted)
- Glucose trend data points — timestamps must exactly match the flowsheet BG times
- Creatinine trend data points — timestamps must exactly match the lab draw times
- Insulin doses (if applicable) — timestamps must exactly match the MAR SSI administration times
- Vasopressor/sedation drip timelines (if ICU)
- MAP and RASS trends (if ICU)
- **Cross-section alignment rule**: The master plan should define a single canonical timestamp for each data point. Timeline, flowsheet, labs, and MAR must all reference the same timestamp — never let agents independently choose times for the same event.

## LDA PLAN (Lines, Drains, Airways)

For each device:

- Type (line/drain/airway), name, location
- Insert date, removed date (if applicable)
- Details (e.g., "16G", "Triple lumen", "7.5mm")
- Approximate body position {x, y} on the body diagram SVG
  Uses **patient's perspective** (anatomical position): patient's RIGHT = low x (~30-75), patient's LEFT = high x (~125-170). Imagine facing the patient.
  (Reference: x range ~30-170, y range ~20-280. Head ~{100,25}, neck ~{100,50},
  R subclavian ~{65,60}, L subclavian ~{135,60}, R arm ~{40,100}, L arm ~{160,100},
  R hand ~{30,150}, L hand ~{170,150}, chest ~{100,90}, abdomen ~{100,160},
  R groin ~{75,200}, L groin ~{125,200}, urethral ~{100,210})

## EMBEDDED ERRORS (detailed specification)

For each intentional error:

1. Error description
2. Where it appears in the chart (which tab, which data point)
3. What evidence exists to catch it (which other tab/data contradicts it)
4. The correct action the student should identify
5. Clinical reasoning / teaching point

## ANSWER KEY OUTLINE

The answer key is written for **pharmacy students**, not medical students. Focus on:

- **Medication safety errors** (DDIs, contraindications, wrong dose, wrong route)
- **Drug therapy recommendations** (GDMT optimization, dose adjustments, therapeutic substitutions)
- **Renal dosing & calculations** (CrCl by Cockcroft-Gault, dose adjustments for renal impairment)
- **Glycemic management** (insulin regimen assessment, monitoring)
- **Antibiotic stewardship** (appropriateness, de-escalation, duration)
- **Medication reconciliation** (all home meds accounted for with disposition)
- **Monitoring plan** (what to monitor, frequency, targets)

Do NOT focus on physician-scope items like hemodynamic management, ventilator weaning, echo interpretation, or surgical decision-making unless they directly impact medication decisions.

Structure:
- Key findings per section (with importance: CRITICAL/MAJOR/MINOR)
- ICU/Clinical Pharmacy Checklist (summary table)
- Common mistakes (what students typically miss)
- Clinical pearls (teaching points tied to the embedded errors)
```

### Consistency Cross-Check

Before presenting the plan for approval, read back the completed `master-plan.md` from disk and verify these consistency axes:

1. **Lab trends vs. clinical narrative** — Do the numbers match the disease progression? (e.g., if creatinine trends 2.1 → 1.8 → 1.4, the notes shouldn't say "worsening renal function")
2. **Medication timing vs. lab results** — Is each drug started/stopped at the right time relative to the lab that triggered it? (e.g., antibiotic change after culture results come back)
3. **Vitals trends vs. clinical events** — Does fever resolve after antibiotics start? Does BP improve after vasopressor initiation?
4. **Embedded errors vs. supporting evidence** — For each intentional error, does the chart data actually contain the evidence needed for students to catch it?
5. **Timestamp realism** — Are ALL timestamps (vitals, labs, MAR) offset from round hours? No :00 or :30 times.
6. **Medication lifecycle** — For every medication discontinued in the narrative, does its entry have `isActive: false` and an `endDate`?
7. **SSI dose consistency** — If sliding scale insulin is used, does every dose across MAR, `insulinDoses`, flowsheet, and nursing notes match the defined BG brackets?
8. **Cross-section timestamp alignment** — Do timeline glucose timestamps match flowsheet BG times? Do creatinine timestamps match lab draw times? Do insulin timestamps match MAR SSI times?
9. **No meta-annotations in data** — Do any medication `notes`, lab `note`, or other rendered fields contain `[ERROR:]`, `[INTENTIONAL:]`, or similar bracketed commentary? These spoil intentional errors for students.

Fix any contradictions before proceeding.

### Plan Review

Present the master plan summary to the user (highlights only — not the raw 500+ lines):

- List of clinical notes that will be generated
- Summary of lab panels and trends
- Medication list with flagged errors
- Disease progression overview
- Embedded errors summary

Ask: "Does this plan look good? Any adjustments before I generate the chart?"

Wait for user approval before proceeding to Phase 3.

---

## Phase 3: Chunk-Based Parallel Generation

After the master plan is approved, generate the chart using **4 chunk agents + 1 notes agent + 1 answer key agent**. Each agent writes a raw file fragment to a staging directory. The final chart file is assembled by concatenating the chunks with `cat`.

### Why Chunks, Not Fine-Grained Agents

**Lessons learned**: Running 9+ individual agents (one per section) creates too much coordination overhead, and a single "assembly agent" that reads all staging files and writes a 3000+ line file will time out. The solution:

1. **4 chunk agents** each write a ~500-900 line fragment of the final `.ts` file
2. **1 notes agent** writes all clinical notes (copy-forward needs single context)
3. Chunks are **raw file fragments** (not standalone exports) — they concatenate directly into the final file
4. **Bash `cat`** assembles the final file instantly — no assembly agent needed

### Staging Directory Setup

The staging directory and `master-plan.md` should already exist from Phase 2 (incremental writing). Verify before launching agents:

```bash
ls -la src/lib/workup/charts/.staging/{chart-id}/master-plan.md
```

If starting fresh (e.g., resuming after context loss), create the directory and write the plan first.

Staging structure:

```
src/lib/workup/charts/.staging/{chart-id}/
├── master-plan.md         # The approved master plan (written before agents launch)
├── chunk-a.ts             # Import + header + demographics + vitals + labs
├── chunk-b.ts             # Medications + micro + imaging + LDAs
├── chunk-c.ts             # All clinical notes
├── chunk-d.ts             # Timeline + flowsheet + MAR + closing brace
└── answer-key.md          # Answer key (runs last)
```

The `.staging` directory should be gitignored. Add to `.gitignore` if not already present:

```
src/lib/workup/charts/.staging/
```

### Chunk File Format (CRITICAL)

Each chunk is a **raw fragment** of the final TypeScript file. When concatenated in order (A + B + C + D), they form a valid, complete file. This means:

- **Chunk A** starts with `import type { PatientChart } from "../types";` and the opening `export const name: PatientChart = {`. It includes demographics, vitals, and labs, with a trailing comma after the last section.
- **Chunk B** continues with medications, micro, imaging, and LDAs, each with trailing commas.
- **Chunk C** contains the `notes: [...]` array with all clinical notes, trailing comma.
- **Chunk D** contains timeline data, flowsheet, MAR, and the closing `};`.

**No chunk is standalone valid TypeScript** — they only work when concatenated. This is intentional: it eliminates the need for an assembly agent to read/combine/rewrite.

**Sentinel comments at chunk boundaries**: Each chunk ends with a boundary marker comment to aid post-concatenation validation:

```typescript
// chunk-a ends with:
  ],  // end labs
  // ── CHUNK-A-END ──

// chunk-b starts with:
  // ── CHUNK-B-START ──
  // ── Medications ────────

// chunk-b ends with:
  ],  // end ldas
  // ── CHUNK-B-END ──

// etc.
```

After concatenation, verify all boundaries are present: `grep -n "CHUNK-.-" {chart-id}.ts`

### Sub-Agent Architecture

**All 4 chunk agents launch in parallel** (Batch 1). The notes agent also launches in parallel. The answer key agent runs after everything completes (Batch 2).

**If agents appear to queue** (multiple agents take >3 min to start writing their staging file), stagger into two mini-batches:

- **1a**: chunk-a, chunk-b, chunk-d (structured data — fastest to generate)
- **1b** (after 1a launches): notes-agent, answer-key-agent (longest-running)

#### Batch 1 — Launch All in Parallel (5 agents)

| #   | Agent              | Chunk File      | Sections Included                                     | Approx Lines |
| --- | ------------------ | --------------- | ----------------------------------------------------- | ------------ |
| 1   | `chunk-a-agent`    | `chunk-a.ts`    | Import, export header, demographics, vitals, labs     | ~800-900     |
| 2   | `chunk-b-agent`    | `chunk-b.ts`    | Medications, microbiology, imaging, LDAs              | ~400-600     |
| 3   | `notes-agent`      | `chunk-c.ts`    | ALL clinical notes (ED, attending, nursing, consults) | ~500-700     |
| 4   | `chunk-d-agent`    | `chunk-d.ts`    | Timeline data, flowsheet, MAR, closing `};`           | ~600-800     |
| 5   | `answer-key-agent` | `answer-key.md` | Full answer key markdown                              | ~200-400     |

**Why notes get their own agent**: Clinical notes require copy-forward logic (Day 2 copies Day 1), clinician personas, and cross-note consistency. A single notes agent handles all of this in one sequential pass, producing all notes (ED, attending, nursing, consults) in chronological order.

**Splitting notes for long admissions (>12 notes)**: For cases with 5+ days / >12 notes, split into 2 agents to avoid context limits:

| Agent                                   | Notes                                                      | Why Independent                                                                             |
| --------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `physician-notes-agent` → `chunk-c1.ts` | ED, attending H&P, attending progress notes, consult notes | Need cross-reference consistency (consult refs attending's plan, copy-forward carries text) |
| `nursing-notes-agent` → `chunk-c2.ts`   | All nursing shift assessments                              | Independent of physician notes — reference orders/events from master plan, not note text    |

Nursing notes reference physician _decisions_ ("levo DC'd per MD orders") but get that info from the master plan's timeline, not from reading the attending's actual note. So they can run in parallel with the physician notes agent without losing any cross-reference accuracy.

When split, concatenation becomes: `cat chunk-a.ts chunk-b.ts chunk-c1.ts chunk-c2.ts chunk-d.ts > chart.ts` — chunk-c1 contains `notes: [` and physician notes, chunk-c2 contains nursing notes and the closing `],`.

#### Agent Prompt Requirements

Every chunk agent prompt MUST include:

1. **The master plan file path** — agent reads `src/lib/workup/charts/.staging/{chart-id}/master-plan.md`
2. **The types file path** — agent reads `src/lib/workup/types.ts`
3. **A format reference snippet** — a 30-50 line excerpt from `henderson-robert.ts` showing ONLY the relevant section's exact format (not the whole 3000-line file)
4. **Exact data values** — the master plan must contain every value. Agents transcribe, not invent.
5. **The output file path** — agent writes to its chunk file using the `Write` tool
6. **Trailing comma rule** — every section must end with a trailing comma (except the last property before `};` in chunk D)

**Format reference snippets are essential**. Without them, agents will use wrong naming conventions (e.g., "Sodium" instead of "Na", full datetime instead of "MM/DD HH:MM" for vitals). Extract the relevant 30-50 lines from henderson-robert.ts and paste them directly into the agent prompt.

**Extract snippets live, not from memory**: Before launching agents, use the `Read` tool to read the relevant line ranges from henderson-robert.ts (or whichever chart is the current format reference). This ensures snippets reflect any type changes or convention updates. Approximate line ranges for henderson-robert.ts:

- Demographics: lines 1-80
- Vitals: lines 80-200
- Labs: lines 200-900
- Medications: lines 900-1200
- Micro/Imaging: lines 1200-1400
- LDAs: lines 1400-1500
- Notes: lines 1500-2400
- Timeline: lines 2400-2700
- Flowsheet: lines 2700-2800
- MAR: lines 2800-2900

These ranges will shift as charts are updated — use `Grep` to find section divider comments (`// ── Vitals ──`) to locate exact ranges.

### Chunk Agent Prompt Template

Every chunk agent receives a **compact prompt** with these sections:

```
You are generating {CHUNK DESCRIPTION} for a patient chart.

## Step 1: Read Context Files
1. Read the master plan: src/lib/workup/charts/.staging/{chart-id}/master-plan.md
2. Read the types: src/lib/workup/types.ts

## Step 2: Generate
Write a RAW FILE FRAGMENT (not standalone TypeScript) for your chunk.
Your output will be concatenated with other chunks to form the final file.

{CHUNK-SPECIFIC INSTRUCTIONS — what sections to include, where to start/end}

## Step 3: Write to Staging File
Use the Write tool to save your output to:
  src/lib/workup/charts/.staging/{chart-id}/{chunk-filename}.ts

## Format Reference
{30-50 LINE SNIPPET from henderson-robert.ts showing ONLY this chunk's sections}

## Data Values
All values come from the master plan. Do NOT invent values — transcribe exactly.

## Naming Conventions (CRITICAL)
- Lab names: Use abbreviated names (Na, K, Cl, CO2, BUN, SCr, Glu, Ca, Mg, Phos,
  WBC, Hgb, Hct, Plt, INR, PTT, Tbili, AST, ALT, AlkPhos, Albumin, Lactate, etc.)
- Vitals datetime: "MM/DD HH:MM" (no year, no seconds)
- Lab/note datetime: "MM/DD/YYYY HH:MM"
- Inline markers in notes: {{VITALS:{"datetime":"MM/DD",...}}}, {{LABS:{"date":"MM/DD/YYYY",...}}}, {{IMAGING:[...]}}
- Active problems: NO numbering (use `### Problem Name — Status`, not `### Problem 1: Name`)
- 2-space indentation throughout
- Section divider comments: // ── Section Name ────────
- Trailing comma after each section

## Timestamp Realism (CRITICAL)
- ALL timestamps (vitals, labs, MAR) must be off-the-hour. NEVER use :00 or :30.
  - Vitals: offset ±2-15 min from schedule (06:04, 10:02, 14:08, 18:12, 22:06)
  - Labs: morning draws 04:30-05:45 (05:18, 05:22, 04:47), NOT 06:00
  - MAR: cluster near med pass windows with ±2-15 min variation (08:12, 16:05, 21:08)
- Vital sign variation: no more than 3 identical consecutive values for any parameter

## Data Field Purity (CRITICAL)
- NEVER include meta-annotations like [ERROR:], [INTENTIONAL:], [BUG:], or any
  bracketed commentary in medication `notes`, lab `note`, or any field rendered in
  the UI. Intentional errors must be silent — documented ONLY in the answer key.
```

#### Chunk A — Header + Demographics + Vitals + Labs

```
Your chunk starts the file. Begin with:
  import type { PatientChart } from "../types";
  export const {camelCaseName}: PatientChart = {
    id: "{chart-id}",
    title: "{title}",
    ...

Include: demographics object, vitals array, labs array.
End with a trailing comma after the labs array. Do NOT close the object.
```

#### Chunk B — Medications + Micro + Imaging + LDAs

```
Your chunk continues the file (no import, no export, no opening brace).
Start directly with the first property:
  // ── Medications ────────
  medications: [...]

Include: medications array, micro array, imaging array, ldas array.
End with a trailing comma. Do NOT close the object.
```

#### Chunk C — Clinical Notes (Single Agent)

The notes agent writes ALL clinical notes in one sequential pass. This is essential because:

- Attending progress notes use **copy-forward** (Day 2 copies Day 1)
- Cross-note consistency (consult references attending's plan)
- Clinician personas need to be consistent across their notes

```
Your chunk contains ONLY the notes array:
  // ── Clinical Notes ────────
  notes: [
    { ... note 1 ... },
    { ... note 2 ... },
    ...
  ],

Include ALL notes in chronological order: ED, Admission H&P, nursing assessments,
progress notes, consult notes. Each note has its own clinician persona and style.
End with a trailing comma. Do NOT close the object.
```

**Inline marker formats** (include in notes agent prompt):

```
## Vitals — use {{VITALS:...}} marker instead of plain text
{{VITALS:{"datetime":"MM/DD","extras":["additional context line 1","I/O (24hr): IN X | OUT Y | Net Z"]}}}
- "datetime" is the MM/DD date prefix to match chart.vitals entries (picks latest entry for that date)
- "extras" is optional — for I/O, vent settings, drip info, O2 delivery, etc.

## Labs — use {{LABS:...}} marker
{{LABS:{"date":"MM/DD/YYYY","panels":["CMP","CBC"],"extras":["Lactate 1.2","BNP 3400"]}}}

## Imaging — use {{IMAGING:...}} marker
{{IMAGING:[{"name":"CXR (portable)","impression":"Bilateral pulmonary edema"}]}}
```

**Active Problems formatting rules**:

- Do NOT number problems (no "Problem 1:", "Problem 2:", etc.)
- Use `### Problem Name — Status` format (e.g., `### AKI on CKD — Improving`)
- Doctors list problems by name, not by number
- **Copy-forward problem names**: Day 1 establishes the canonical problem names. Day 2+ MUST keep the exact same problem names — only append/update status tags after the dash. Do NOT rename, abbreviate, or restructure problems. Examples:
  - Day 1: `### Cardiogenic Shock / Acute Decompensated HFrEF` → Day 4: `### Cardiogenic Shock / Acute Decompensated HFrEF — Improving, Off Inotropes` (name preserved, status appended)
  - WRONG: Day 1 `### Atrial Fibrillation with RVR` → Day 3 `### Atrial Fibrillation — Rate Controlled` (name shortened)
  - RIGHT: Day 1 `### Atrial Fibrillation with RVR` → Day 3 `### Atrial Fibrillation with RVR — Rate Controlled` (name preserved)
- New problems can be added at the bottom of the list (e.g., `### Shock Liver`, `### Disposition`)
- Problems are never removed — they get `— Resolved` status instead

**Notes agent persona guidance** (include in prompt):

| Clinician Type     | Writing Style                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ED Physician       | Terse, abbreviation-heavy, problem-focused, documents MDM                                                                                                                           |
| Attending (Day 1)  | Full H&P from scratch — detailed history, exam, A&P                                                                                                                                 |
| Attending (Day 2+) | **COPY FORWARD** previous note, update only what changed. ~70-80% identical. Include 1-2 stale copy-paste artifacts (e.g., "plan to extubate today" still present after extubation) |
| Nursing            | Independent shift assessments (NOT copy-forward). Chart by exception. Different nurse names for day/night shifts                                                                    |
| Consult            | Specialty-focused. May reference primary team's plan. Fellow notes end with "Discussed with Dr. {Attending}"                                                                        |

#### Chunk D — Timeline + Flowsheet + MAR + Closing

```
Your chunk ends the file. Start with:
  // ── Timeline/Charts Data ────────
  timelineData: { ... }

Include: timelineData object, flowsheet array, mar array.
End with the closing of the PatientChart object:
  };

This chunk CLOSES the file — include the final };
```

### Assembly via Bash Concatenation

After all chunk agents complete, assembly is a **single bash command** — no assembly agent needed:

```bash
cat \
  src/lib/workup/charts/.staging/{chart-id}/chunk-a.ts \
  src/lib/workup/charts/.staging/{chart-id}/chunk-b.ts \
  src/lib/workup/charts/.staging/{chart-id}/chunk-c.ts \
  src/lib/workup/charts/.staging/{chart-id}/chunk-d.ts \
  > src/lib/workup/charts/{chart-id}.ts
```

Then:

1. **Normalize line endings** (Windows Git Bash can produce mixed CRLF/LF):
   ```bash
   sed -i 's/\r$//' src/lib/workup/charts/{chart-id}.ts
   ```
2. **Verify chunk boundaries**:
   ```bash
   grep -n "CHUNK-.-" src/lib/workup/charts/{chart-id}.ts
   ```
   Should show A-END, B-START, B-END, C-START, C-END, D-START in order.
3. **Update** `src/lib/workup/charts/index.ts` — add import + registry entry
4. **Copy** answer key: `cp .staging/{chart-id}/answer-key.md src/lib/workup/answers/{chart-id}.md`
5. **Type check**: `npx tsc --noEmit` — fix any errors
6. **Clean up**: `rm -rf src/lib/workup/charts/.staging/{chart-id}`

### Notes Indentation

If the notes agent writes note objects at the top level (0 or 2 spaces), you may need to re-indent before concatenation:

```bash
# Add 2 spaces to every line for proper nesting inside the PatientChart object
sed 's/^/  /' chunk-c-raw.ts > chunk-c.ts
```

Alternatively, instruct the notes agent to write with the correct indentation (2 spaces for the `notes:` property, 4 spaces for each note object, 6 spaces for note fields). Specifying the exact indentation in the prompt is more reliable than post-processing.

### Stuck Agent Recovery

If any chunk agent runs for more than **5 minutes** without producing its staging file:

1. **Stop** the stuck agent with `TaskStop`
2. **Check** what was written (if anything) — `ls -la` the staging directory
3. **Re-run** the agent with a more focused prompt:
   - Reduce scope if possible (e.g., split a large chunk into two sub-chunks)
   - Include more explicit data in the prompt rather than relying on master plan reading
   - If the agent is struggling with volume, paste the exact values directly in the prompt instead of having it read and transform from the master plan
4. If a chunk repeatedly fails, write it manually by reading the master plan and using the Write tool directly

### Chunk Validation Before Concatenation

Before running `cat`, verify each chunk:

```bash
# Check all chunks exist and are non-empty
for f in chunk-a.ts chunk-b.ts chunk-c.ts chunk-d.ts; do
  wc -l src/lib/workup/charts/.staging/{chart-id}/$f
done
```

Quick sanity checks:

- Chunk A starts with `import type`
- Chunk D ends with `};`
- Middle chunks (B, C) don't have `import` or `};`
- All chunks use 2-space indentation for top-level properties

### Post-Generation Validation

After assembly:

- Run `npx tsc --noEmit` on the generated file to catch type errors
- Fix any type issues
- Verify the chart renders by checking imports resolve correctly
- Present a summary of what was generated:

```
Chart generated: {Patient Name}

Files created:
- src/lib/workup/charts/{chart-id}.ts ({N} lines)
- src/lib/workup/answers/{chart-id}.md

Chart contents:
- {N} clinical notes ({types})
- {N} vital sign readings over {N} days
- {N} lab panels ({panel names})
- {N} medications ({N} active, {N} home)
- {N} MAR entries
- {N} microbiology specimens
- {N} flowsheet parameters
- {N} timeline entries
- {N} LDAs

Embedded errors: {N}
1. {error summary}
2. {error summary}
...

Answer key: {N} active problems, {N} checklist items, {N} clinical pearls
```

---

## Tools Required

### Research

- `WebSearch` — Clinical guidelines, lab reference ranges, disease progression data
- `context7` MCP tools — Medical library documentation (if available)
- `Read` — Reference documents provided by user, existing chart files for patterns

### File Operations

- `Read` — Existing charts and types for reference
- `Write` — New chart data file, answer key markdown
- `Edit` — Update chart registry (index.ts)
- `Glob` — Find existing chart files and answers

### User Interaction

- `AskUserQuestion` — Brainstorming waves in Phase 1, plan approval in Phase 2

### Parallel Generation

- `Agent` — 4 chunk agents + 1 notes agent + 1 answer key agent (Phase 3)

### Assembly & Validation

- `Bash` — `cat` for chunk concatenation, `npx tsc --noEmit` for type checking, `sed` for indentation fixes

### Progress Tracking

- `TodoWrite` — Track progress across all 3 phases

---

## Error Handling

**User Provides Minimal Input**:

- Make the best clinical assumption at every step
- Propose reasonable defaults and move forward
- Example: If user says "ICU case" with no further detail, propose a sepsis case with standard comorbidities

**Reference Document Can't Be Parsed**:

```
I couldn't extract structured data from that document.
Let's build the case from scratch — I'll use clinical references for realistic values.
```

**Chunk Agent Produces Empty/Malformed Output**:

- Check the staging file: `wc -l chunk-X.ts` — should be >50 lines for any chunk
- If empty, re-run the agent with more explicit data in the prompt (paste values directly)
- If malformed (wrong indentation, missing commas), fix with `sed` before concatenation

**Chunk Agent Times Out (>5 minutes)**:

- Stop with `TaskStop`, then re-run with a smaller scope
- If the chunk is too large, split it: e.g., chunk-a into chunk-a1 (demo+vitals) and chunk-a2 (labs)
- As a last resort, write the chunk manually using the Write tool

**Type Check Fails After Concatenation**:

- Read the type errors from `npx tsc --noEmit`
- Common issues: missing trailing commas between chunks, wrong property names, missing required fields
- Fix with the Edit tool on the concatenated file, then re-run type check
- Do NOT re-run all agents — just fix the specific errors

**Naming Convention Mismatch**:

- If an agent uses full names ("Sodium") instead of abbreviated ("Na"), fix with find-and-replace
- This is why format reference snippets in agent prompts are essential — include the exact abbreviated names

**Chart File Too Large** (>3000 lines):

- This is expected for complex cases — existing charts are ~2900 lines
- Don't try to shorten clinical data for file size reasons

**Context Compaction During Generation**:

- Because agents write to staging files on disk, context compaction won't lose their output
- If the main conversation is compacted mid-generation, check staging directory for completed chunks
- Resume from wherever the process was interrupted — don't re-run completed agents

**Research Yields No Results**:

- Fall back to model's built-in medical knowledge
- Note in the plan which values are estimated vs. evidence-based

---

## Important Notes

**DO:**

- Probe the user for clinical intent — don't just accept surface-level input
- Propose specific, realistic errors with clinical reasoning
- Research current clinical guidelines for accuracy
- Ensure internal consistency across ALL chart sections (labs match vitals match notes match meds)
- Include `{{VITALS:...}}`, `{{LABS:...}}`, and `{{IMAGING:...}}` markers in clinical notes where appropriate
- Make home medications create teaching opportunities (interactions, contraindications, med rec)
- Include allergies that create clinical decision points
- Give each note a realistic author name and credential
- Make progress notes copy-forward heavy (~70-80% identical day-to-day for stable patients)
- Include realistic copy-paste artifacts (stale lines, outdated references) as documentation realism
- Write each clinician's notes in their authentic voice (ED docs are terse, nurses chart by exception, fellows reference their attending)
- Use appropriate abbreviations per clinician type (RNs use different abbreviations than MDs)
- Have consult notes focus narrowly on that specialty's concerns
- Let some consult agents "miss" things outside their specialty — this is realistic
- Use realistic off-the-hour timestamps for ALL timed data (vitals, labs, MAR) — never :00 or :30
- Vary vital sign values reading-to-reading (no more than 3 identical consecutive values for any parameter)
- Define SSI brackets in the master plan and cross-check every insulin dose against them
- Mark discontinued medications with `isActive: false` and `endDate` matching the D/C date in notes
- Align timeline data timestamps with their source sections (glucose→flowsheet, creatinine→labs, insulin→MAR)
- Ensure blood culture result dates are consistent with the stated timeframe in notes (48h preliminary vs 5-day final)

**DON'T:**

- Generate a chart without user approval of the master plan
- Skip the brainstorming waves — they ensure educational value
- Use placeholder or obviously fake data (lab values must be clinically plausible)
- Create a case with no embedded errors — the whole point is for students to find problems
- Ignore the user's learning objectives when designing the case
- Make errors too obvious or too obscure — they should be findable with careful chart review
- Forget to update `src/lib/workup/charts/index.ts` after creating the chart file
- Write all notes in the same voice — each clinician type writes differently
- Make progress notes look freshly written each day — they should clearly be copy-forwarded
- Confuse copy-paste artifacts (documentation realism) with intentional pharmacy errors (teaching points)
- Use a single assembly agent to write a 3000+ line file — it WILL time out. Use chunk concatenation instead
- Run 9+ fine-grained agents when 4-5 chunk agents are more reliable and faster
- Tell agents to "read henderson-robert.ts" without specifying which lines — include a 30-50 line format snippet
- Let agents invent data values — the master plan must contain every value; agents transcribe
- Use full lab names ("Sodium", "Potassium") — always use abbreviated names ("Na", "K") matching existing charts
- Number active problems in notes ("Problem 1:", "Problem 2:") — doctors list problems by name only (e.g., `### AKI on CKD — Improving`)
- Write vitals as plain text in notes — always use `{{VITALS:...}}` inline markers that pull from chart.vitals data
- Use on-the-hour timestamps (:00) or half-hour (:30) for vitals, labs, or MAR entries — real clinical data is NEVER this precise
- Include meta-annotations like `[ERROR:]`, `[INTENTIONAL:]`, `[BUG:]` in any data field rendered in the UI — intentional errors must be silent in the data, documented ONLY in the answer key
- Leave discontinued medications with `isActive: true` or missing `endDate` — if a note says "D/C med X", the medication entry must reflect it
- Use identical values for 4+ consecutive vital sign readings — vary by ±1-2 for stable parameters
- Mirror LDA body positions — use patient's perspective (R = low x, L = high x), NOT viewer's perspective
- Use lab `panelName` values not in the PANEL_ORDER allowlist (CMP, CBC, Coags, LFTs, Cardiac, Inflammatory, ABG, Other, Drug Levels) — unlisted panels silently won't render
- Write parentheticals `(...)` in physician or nursing notes — flatten info into the sentence or cut it
- Put lab values in physician overnight events or nursing ROS sections — labs belong in `{{LABS:...}}` markers and flowsheets, not in narrative text
- Write more than 2-3 bullets per active problem in progress notes (Day 2+)
- Include exact medication doses in nursing notes — doses are on the MAR, nurses chart drug names only
- List exact BG values in nursing notes — use narrative form ("BG trending down on protocol")
- Skip blank lines between `**ROS Section:**` paragraphs in nursing notes — without `\n\n` they render as one unreadable block
- Write the answer key for medical students — it's for pharmacy students (med safety, DDIs, renal dosing, monitoring, not hemodynamics or echo interpretation)

## Edge Cases

**User Wants a Very Simple Case (Beginner)**:

- Fewer days (2-3 day admission)
- Fewer comorbidities (1-2)
- More obvious errors (1-2, clearly visible)
- Simpler medication list
- Fewer lab panels

**User Wants an Advanced Case**:

- Longer admission (5-7+ days)
- Multiple comorbidities with overlapping drug considerations
- Subtle errors requiring cross-referencing multiple tabs
- Complex medication regimens (drips, transitions, therapeutic drug monitoring)
- ICU-level data (ventilator settings, vasopressors, sedation scoring)

**User Provides a Real (Redacted) Chart**:

- Use it as a clinical foundation
- Fictionalize ALL patient identifiers (name, MRN, dates, locations)
- Enhance with intentional errors for teaching value
- Fill in any gaps with researched realistic data

**Non-ICU Cases (No Vasopressors/Ventilator)**:

- `timelineData` can have empty arrays for vasopressors, sedation, MAP, RASS
- Flowsheet won't need respiratory/ventilator parameters
- LDAs will be simpler (PIV, maybe Foley, no arterial lines or CVC)
- MAR will be simpler (scheduled + PRN, minimal continuous infusions)

## Usage

```
/new-chart                              # Start interactive brainstorming
/new-chart ICU DKA                      # Seed with unit and diagnosis
/new-chart med-surg CHF exacerbation    # Seed with specific scenario
/new-chart based on docs/reference.pdf  # Build from reference document
```

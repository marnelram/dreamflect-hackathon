# Chart Quality Check Skill

## Purpose

Perform a comprehensive quality check on a patient chart data file for the workup feature. Validates clinical realism, internal consistency, data accuracy, and educational value of embedded errors. This skill acts as a clinical reviewer — systematically auditing every section of the chart against real-world standards.

## Input

```
/chart-qc chen-gloria              # QC a specific chart by ID
/chart-qc martinez-sofia           # QC another chart
/chart-qc chen-gloria --section labs  # QC only the labs section (quick check)
```

The argument is the chart ID (kebab-case filename without extension). If no argument is provided, ask the user which chart to QC.

## Workflow Overview

```
Phase 1: Load chart data, types, and answer key
   ↓
Phase 2: Run all quality checks (parallel agents for large charts)
   ↓
Phase 3: Compile findings report with severity ratings
```

---

## Phase 1: Load Context

### Step 1: Read Required Files

Read these files to understand the chart:

1. **Chart data**: `src/lib/workup/charts/{chart-id}.ts` — the full patient chart
2. **Answer key**: `src/lib/workup/answers/{chart-id}.md` — expected findings
3. **Types**: `src/lib/workup/types.ts` — TypeScript interface definitions

Since chart files are large (2000-3000+ lines), read in sections:

- Lines 1-100: Demographics
- Lines 100-300: Vitals
- Lines 300-900: Labs
- Lines 900-1200: Medications
- Lines 1200-1500: Micro, Imaging, LDAs
- Lines 1500-2500: Clinical Notes
- Lines 2500-2800: Timeline data
- Lines 2800-end: Flowsheet, MAR

Adjust ranges by searching for section divider comments (`// ── Section Name ──`).

### Step 2: Extract Key Patient Parameters

Before running checks, extract these baseline values that multiple checks depend on:

- **Age, Sex, Weight (kg), Height (cm)** — needed for CrCl, BSA, dose calculations
- **Allergies** — needed for allergy cross-check
- **SCr values over time** — needed for renal dosing validation
- **Admission date, current datetime** — needed for chronological integrity
- **Code status** — needed for consistency check across notes
- **PMH and home medications** — needed for medication reconciliation check

---

## Phase 2: Quality Checks

Run the following checks. For large charts, launch parallel agents for independent checks. For quick section-specific QC (--section flag), run only the relevant check.

Use `TodoWrite` to track each check as a task. Mark each completed as you go.

### Check 1: Chronological Integrity

**What**: Verify all timestamps across every section are internally consistent and chronologically ordered.

**How**:

- All vitals timestamps are in chronological order
- All lab draw times are in chronological order
- All note datetimes are in chronological order
- All MAR administration times are in chronological order
- No timestamp falls before the admission date
- No timestamp falls after the `currentDatetime`
- Lab draw times, vital times, and note times align temporally (e.g., a 6 AM lab draw should appear before an 8 AM progress note referencing it)

**Red flags**:

- Any timestamp out of order within a section
- Events happening before admission
- Events happening after the simulated "now"

### Check 2: Vitals Realism

**What**: Verify vital sign timing, values, and trends match the clinical course.

**How**:

- **Timing**: Vitals should be Q4H (floor) or Q1H-Q2H (ICU), NOT exactly on the hour. Real vitals are taken at times like 06:12, 10:47, 14:23 — not 06:00, 10:00, 14:00. Minor variation (±5-15 min from schedule) is expected.
- **Value ranges**: All values physiologically possible (HR 30-220, SBP 50-250, DBP 20-150, RR 4-45, Temp 93-107°F, SpO2 60-100%)
- **Trend consistency**: Vitals trends match disease progression described in notes:
  - Septic shock → tachycardic, hypotensive, febrile early → improving with treatment
  - DKA → tachycardic, Kussmaul breathing (high RR) → normalizing
  - Post-extubation → RR may transiently increase
- **No identical consecutive readings**: Real vitals vary slightly reading-to-reading. Flag if 3+ consecutive identical HR or BP values.
- **Heart rate / blood pressure correlation**: If on vasopressors, MAP should correlate with drip rate changes

**Severity**:

- On-the-hour timing → MAJOR (unrealistic)
- Physiologically impossible values → CRITICAL
- Trend mismatch → MAJOR
- Identical consecutive readings → MINOR

### Check 3: Lab Draw Times & Values

**What**: Verify lab draw times are realistic, panels are contextually appropriate, values trend correctly, and flags match.

**How**:

- **Draw times**: Labs should NOT be drawn exactly on the hour (e.g., 06:00, 12:00, 18:00). Realistic times: 04:32, 05:15, 14:47. Morning labs are typically drawn 04:00-06:00 (phlebotomy rounds). STAT labs can be any time but should correlate with a clinical event.
- **Panel appropriateness**:
  - CMP/BMP every day for acute patients
  - CBC daily or Q12H if bleeding/sepsis
  - Coags if on anticoagulation or liver disease
  - ABG if on ventilator or respiratory distress
  - Drug levels (vanco, aminoglycosides) at appropriate intervals
  - Lactate if sepsis/shock
- **Value trending**:
  - Values should change gradually (no sudden jumps without clinical explanation)
  - WBC trend should correlate with infection course
  - SCr trend should match renal function narrative
  - Lactate should trend down with successful resuscitation
  - K+ should be monitored if on diuretics/insulin
- **Flag accuracy**: Every lab result flagged H (high) or L (low) must actually be outside the stated reference range, and vice versa — values outside range MUST be flagged
- **Critical values**: Flag any critical results (K+ <3.0 or >6.0, Na+ <120 or >160, Glucose <50 or >500, etc.) and verify they're addressed in the clinical notes

**Severity**:

- On-the-hour draw times (especially 06:00, 18:00) → MAJOR
- Wrong flag (H/L mismatch with reference range) → CRITICAL
- Missing expected panel → MINOR
- Value jump without explanation → MAJOR
- Critical value not addressed in notes → CRITICAL

### Check 4: Medication Validation

**What**: Verify doses are correct for the patient, start/stop dates are consistent, and intentional errors are properly embedded.

**How**:

- **Renal dosing**: Calculate CrCl using Cockcroft-Gault:
  ```
  CrCl = [(140 - age) × weight(kg)] / [72 × SCr]  (× 0.85 if female)
  ```
  Check renally-cleared drugs against calculated CrCl:
  - Vancomycin (requires therapeutic drug monitoring)
  - Enoxaparin (reduce dose if CrCl <30)
  - Piperacillin-tazobactam (extended infusion, adjust if CrCl <20)
  - Fluoroquinolones (adjust if CrCl <30-50)
  - Gabapentin/pregabalin (adjust if CrCl <60)
  - Metformin (contraindicated if CrCl <30)
- **Weight-based dosing**:
  - Enoxaparin: 1 mg/kg Q12H (treatment) or 40mg daily (prophylaxis)
  - Vancomycin: typically 15-20 mg/kg Q8-12H loading
  - Heparin drips: weight-based protocols
- **Dose ranges**: Verify all doses are within FDA-approved ranges (use WebSearch if unsure)
- **Route appropriateness**: IV for acute/NPO patients, transition to PO when tolerating diet
- **Start/stop consistency**:
  - If a note says "discontinue X," med should have an end date
  - If cultures finalize, empiric antibiotics should be narrowed/de-escalated
  - Home meds should be reconciled (continued, held, or substituted)
- **Intentional errors**: Each embedded medication error should be:
  - Actually present in the medications array
  - Discoverable from chart evidence (lab values, allergies, clinical context)
  - NOT so obvious that it breaks immersion (e.g., lethal dose)
- **Category correctness**: `isActive` flags, med categories (infusion/scheduled/prn/home) make sense

**Severity**:

- Wrong dose for renal function (not intentional) → CRITICAL
- Dose outside FDA range (not intentional) → CRITICAL
- Start/stop date mismatch with notes → MAJOR
- Missing isActive update → MINOR

### Check 5: Clinical Notes Quality

**What**: Verify notes are realistic, personas are distinct, copy-forward is implemented, and template markers are valid.

**How**:

- **Copy-forward verification** (attending/progress notes):
  - Day 2+ progress notes should be ~70-80% identical to the previous day's note
  - Only updated sections: interval events, vitals, labs, and active plan changes
  - Stable problems should have near-identical wording
  - Look for realistic copy-paste artifacts (stale references, outdated plans)
  - **Flag if each progress note appears entirely rewritten** — this is unrealistic
- **Persona distinctiveness**:
  - ED physician: terse, abbreviation-heavy, focused on MDM
  - Attending: comprehensive on Day 1, copy-forward on Day 2+
  - Nursing: charting by exception, systematic assessments, different voice than MDs
  - Consults: narrowly focused on their specialty
  - **Flag if all notes sound the same** — different clinicians write differently
- **Template markers**:
  - `{{VITALS:{"datetime":"MM/DD",...}}}` — verify vitals data exists for that date
  - `{{LABS:{"date":"MM/DD/YYYY",...}}}` — verify a lab panel exists for that date
  - `{{IMAGING:[...]}}` — verify imaging results exist for that date
  - All markers should have corresponding data in the vitals/labs/imaging sections
  - No orphaned markers (referencing dates with no data)
- **Active problem formatting**:
  - Problems should NOT be numbered (no "Problem 1:", "Problem 2:")
  - Use `### Problem Name — Status` format (e.g., `### AKI on CKD — Improving`)
- **Problem list copy-forward consistency**:
  - Day 1 establishes canonical problem names. Day 2+ must keep the EXACT same names — only status tags after `—` should change
  - Flag if a problem name is shortened, abbreviated, or restructured between notes (e.g., "Septic Shock / Aspiration Pneumonia" becoming "Aspiration PNA" → MAJOR)
  - New problems added at the bottom are fine
  - Problems should never be removed — they get `— Resolved` status
- **Clinical content accuracy**:
  - Vital signs described in notes should roughly match the vitals data
  - Labs discussed in notes should match actual lab values
  - Medication changes described should match the medications section
  - Assessment should be consistent with objective data
- **Nursing note independence**: Each nursing assessment should be written independently (NOT copy-forwarded from previous shift)
- **Clinician names/credentials**: Consistent throughout (same doctor doesn't change credentials)

**Severity**:

- Template marker references nonexistent data → CRITICAL
- No copy-forward in progress notes → MAJOR
- All notes same voice/style → MAJOR
- Factual mismatch (note says "K 4.5" but lab shows 3.8) → CRITICAL
- Nursing notes copy-forwarded → MINOR

### Check 6: MAR Validation

**What**: Verify medication administration records match orders, timing is realistic, and nurse assignments are consistent.

**How**:

- **Order-MAR alignment**: Every active scheduled medication should have MAR entries at the correct frequency
  - Q6H meds → ~4 entries per day
  - Q8H meds → ~3 entries per day
  - Q12H meds → ~2 entries per day
  - Daily meds → 1 entry per day
  - PRN meds → entries only when administered (with reason)
- **Administration times**:
  - Should NOT be exactly on the hour (e.g., not 08:00, 14:00, 20:00)
  - Realistic times: 08:12, 14:05, 20:23
  - Nursing med pass windows: ~0600-0800, ~1200-1400, ~1800-2000, ~2200-0000
  - Times should cluster around these windows with natural variation
- **Nurse names**:
  - Day shift nurses should administer during 0700-1900
  - Night shift nurses should administer during 1900-0700
  - Same nurse should appear consistently within their shift
  - Flag if a "day nurse" is giving meds at 0300
- **Status consistency**:
  - "given" — standard administration
  - "held" — should have a reason (e.g., vitals, NPO status, lab value)
  - "not-given" — patient refused or unavailable
  - "due" — future or pending administration
- **PRN entries**: Must include a reason (pain scale, nausea, anxiety, etc.)
- **Held medications**: If a med is held, verify the reason is clinically appropriate and documented
- **Intentional MAR errors**: If an error involves a medication being given despite contraindication, the MAR should show it was actually administered

**Severity**:

- On-the-hour admin times → MAJOR
- Nurse shift mismatch (day nurse at 3 AM) → MAJOR
- PRN without reason → MINOR
- Missing MAR entries for active scheduled meds → MAJOR
- Held without documented reason → MINOR

### Check 7: Microbiology & Imaging

**What**: Verify micro results match clinical narrative, culture timing is realistic, and imaging supports the diagnosis.

**How**:

- **Culture timing**:
  - Blood cultures: collected before antibiotics started (verify timing)
  - Urine culture: collected on admission or when UTI suspected
  - Sputum culture: if pneumonia or ventilated patient
  - Result timing: Gram stain 1-2 hours, preliminary culture 24-48h, final 48-72h, susceptibilities 48-72h
- **Susceptibility accuracy**:
  - Organism susceptibility patterns should be realistic (e.g., MRSA resistant to oxacillin, ESBL E. coli resistant to cephalosporins)
  - Antibiotics tested should be standard for the organism
  - MIC values (if included) should be clinically plausible
- **Antibiotic correlation**:
  - Empiric antibiotics should be started before culture results
  - De-escalation should occur after susceptibilities return (or be an intentional error if not)
  - Chosen antibiotic should cover the identified organism (or be an intentional error)
- **Imaging findings**:
  - Results should support the clinical diagnosis
  - Timing should make clinical sense (CT before surgery, CXR on admission for respiratory complaints)
  - Follow-up imaging for evolving conditions
- **Consistency with notes**: Micro/imaging results discussed in clinical notes should match the actual data

**Severity**:

- Impossible susceptibility pattern → CRITICAL
- Culture collected after antibiotics started (without note) → MAJOR
- Imaging doesn't support documented diagnosis → MAJOR
- Result timing unrealistic (final culture in 6 hours) → MAJOR

### Check 8: LDA (Lines, Drains, Airways)

**What**: Verify insert/remove dates match clinical events and device types are appropriate.

**How**:

- **Insertion timing**:
  - Central lines: inserted when IV access needed or vasopressors started
  - Arterial lines: inserted when continuous BP monitoring needed (shock, drips)
  - Foley catheter: inserted for strict I&O monitoring, surgery, or immobility
  - ETT/tracheostomy: matches intubation/extubation events in notes
  - Chest tubes: matches pleural procedures
- **Removal timing**:
  - Lines removed when no longer needed (e.g., vasopressors weaned → arterial line out)
  - Foley removed as early as clinically appropriate (48-72h review)
  - ETT removed at extubation (should match extubation note)
- **Location accuracy**:
  - Body position {x, y} should be anatomically correct for the device type
  - Central lines: subclavian, IJ, or femoral positions
  - Peripheral IVs: arm positions
  - Foley: urethral position
- **Device details**: Gauge/size appropriate (e.g., 16-18G PIV, 7.0-8.0mm ETT, triple-lumen CVC)
- **Note consistency**: LDA insertions/removals should be documented in clinical notes

**Severity**:

- LDA insert/remove doesn't match clinical events → MAJOR
- Anatomically wrong body position → MINOR
- Missing LDA for documented procedure → MAJOR

### Check 9: Timeline/Flowsheet Consistency

**What**: Verify timeline chart data matches vitals, labs, medications, and clinical events.

**How**:

- **Antibiotic timeline**:
  - Start/stop events match medication start/end dates
  - Style (solid/dashed/dotted) appropriate for the antibiotic type
  - De-escalation visible in timeline
- **Glucose chart** (if applicable):
  - Glucose data points match lab glucose values
  - Insulin doses correlate with glucose readings
  - Sliding scale pattern visible if applicable
- **Vasopressor/sedation timeline** (if ICU):
  - Drip start/stop matches medication section
  - Rate changes correlate with clinical events
  - MAP trend matches vasopressor titration
  - RASS scores match sedation level described in notes
- **Flowsheet parameters**:
  - Values match corresponding vitals and lab data
  - Hemodynamic parameters match vitals section
  - Respiratory parameters match ventilator notes
  - Renal parameters (UOP) are clinically plausible
  - I&O totals make mathematical sense

**Severity**:

- Timeline data contradicts medication dates → CRITICAL
- Flowsheet values don't match vitals/labs → MAJOR
- Missing expected parameters → MINOR

### Check 10: Allergy & Drug Interaction Cross-Check

**What**: Verify allergies are respected in medication orders and known drug interactions are either addressed or intentionally embedded.

**How**:

- **Allergy violations**: Cross-reference documented allergies with all prescribed medications
  - Check for same-drug allergies
  - Check for cross-reactivity (e.g., penicillin allergy → cephalosporin caution)
  - If a medication is prescribed despite allergy, verify it's an intentional error or documented override
- **Drug-drug interactions**: Check for major interactions between concurrent medications
  - QT-prolonging combinations
  - Serotonin syndrome risk combinations
  - Nephrotoxic combinations
  - Bleeding risk combinations (anticoagulants + antiplatelets + NSAIDs)
  - If interactions exist, verify they're either addressed in notes or are intentional errors
- **Drug-disease contraindications**: Check medications against PMH
  - Beta-blockers in decompensated heart failure
  - NSAIDs in CKD/AKI
  - Metformin in AKI/lactic acidosis
  - Fluoroquinolones with myasthenia gravis

**Severity**:

- Unintentional allergy violation → CRITICAL
- Major unintentional drug interaction → CRITICAL
- Drug-disease contraindication (unintentional) → CRITICAL
- Minor interaction not addressed → MINOR

### Check 11: Embedded Errors & Answer Key Alignment

**What**: Verify all intentional errors are properly embedded in the chart with discoverable evidence, and the answer key accurately reflects the chart data.

**How**:

- **Error discoverability**: For each documented intentional error:
  - Locate the error in the chart data (which section, which data point)
  - Locate the evidence that reveals it as an error (which other section/data point)
  - Verify a student could reasonably discover the error by cross-referencing chart tabs
  - Flag if the error is too obvious (breaks immersion) or too obscure (requires external knowledge not in chart)
- **Error count**: Verify the stated number of errors matches what's actually in the chart
- **Answer key accuracy**:
  - Every finding mentioned in the answer key should be verifiable from chart data
  - Lab values cited in the answer key should match the actual lab values
  - Medication names/doses cited should match the medications section
  - Problem priorities (CRITICAL/MAJOR/MINOR) should be clinically appropriate
- **Completeness**: Answer key should address all major clinical issues visible in the chart, not just the intentional errors
- **No phantom findings**: Answer key should not reference data that doesn't exist in the chart

**Severity**:

- Error undiscoverable from chart data → CRITICAL
- Answer key cites wrong value → CRITICAL
- Missing error (claimed but not in chart) → CRITICAL
- Answer key missing a major finding → MAJOR

### Check 12: Demographics & Metadata Consistency

**What**: Verify patient demographics are realistic and consistently referenced throughout the chart.

**How**:

- **Realistic demographics**:
  - Age/weight/height proportional and realistic
  - MRN format consistent with hospital convention
  - Location matches unit type (ICU bed for ICU patient, floor bed for floor patient)
- **Name consistency**: Patient name matches across demographics, notes, and answer key
- **Date consistency**: Admission date, DOB, and currentDatetime are all internally consistent
  - Patient age matches DOB to currentDatetime calculation
  - Length of stay matches admission date to currentDatetime
- **Code status**: Referenced consistently across notes (if changed, the change should be documented)
- **PMH referenced**: Comorbidities listed in demographics should appear in clinical notes and influence medication choices

**Severity**:

- Age doesn't match DOB → CRITICAL
- Name inconsistency → MAJOR
- Unrealistic weight for age/sex → MINOR
- PMH listed but never referenced → MINOR

### Check 13: TypeScript Compilation

**What**: Verify the chart file compiles without TypeScript errors.

**How**:

```bash
npx tsc --noEmit src/lib/workup/charts/{chart-id}.ts
```

If errors are found, categorize them:

- Missing required fields → CRITICAL
- Type mismatch → CRITICAL
- Unused imports → MINOR

**Severity**: All type errors are at minimum MAJOR

---

## Phase 3: Findings Report

After all checks complete, compile a structured report.

### Report Format

```markdown
# Chart QC Report: {Patient Name} ({chart-id})

## Summary

- **Total findings**: {N}
- **CRITICAL**: {N} (must fix before use)
- **MAJOR**: {N} (should fix — affects realism or educational value)
- **MINOR**: {N} (nice to fix — polish items)
- **Overall grade**: PASS / PASS WITH FIXES / FAIL

## Critical Findings

1. **[Check Name]** — {Description}
   - Location: {section/line reference}
   - Issue: {What's wrong}
   - Fix: {Suggested fix}

## Major Findings

{Same format}

## Minor Findings

{Same format}

## Checks Passed

- ✅ {Check name} — {brief note}
- ✅ {Check name} — {brief note}

## Embedded Errors Audit

| #   | Error Description | Location      | Evidence          | Discoverable? |
| --- | ----------------- | ------------- | ----------------- | ------------- |
| 1   | {description}     | {tab/section} | {what reveals it} | ✅ / ⚠️ / ❌  |
| 2   | ...               | ...           | ...               | ...           |

## Recommendations

- {Any general improvement suggestions}
```

### Grading Criteria

- **PASS**: 0 CRITICAL, ≤2 MAJOR, any number of MINOR
- **PASS WITH FIXES**: 0 CRITICAL, 3+ MAJOR findings
- **FAIL**: Any CRITICAL findings

---

## Parallel Execution Strategy

For efficiency, launch checks in parallel using the Agent tool where checks are independent:

**Batch 1** (independent — launch in parallel):

- Agent 1: Check 1 (Chronological) + Check 12 (Demographics)
- Agent 2: Check 2 (Vitals) + Check 9 (Timeline/Flowsheet)
- Agent 3: Check 3 (Labs) + Check 7 (Micro/Imaging)
- Agent 4: Check 4 (Medications) + Check 10 (Allergies/Interactions)

**Batch 2** (depends on Batch 1 findings):

- Check 5 (Notes) — needs lab/med findings for cross-reference
- Check 6 (MAR) — needs medication findings
- Check 8 (LDAs) — needs notes findings
- Check 11 (Errors/Answer Key) — needs all other findings

**Batch 3** (final):

- Check 13 (TypeScript) — standalone
- Compile report

For smaller or quick-section QC, run checks sequentially in the main conversation instead.

---

## Tools Required

### File Operations

- `Read` — Chart data file (in sections due to size), answer key, types
- `Grep` — Search for section dividers, specific values, template markers
- `Glob` — Find chart files and answer keys

### Research

- `WebSearch` — Verify drug doses, interaction checks, clinical guidelines
- `context7` MCP tools — Medical reference documentation (if available)

### Computation

- `Bash` — TypeScript compilation check (`npx tsc --noEmit`), CrCl calculation

### Parallel Execution

- `Agent` — Launch parallel QC check agents for large charts

### Progress Tracking

- `TodoWrite` — Track each check's completion status

### User Interaction

- `AskUserQuestion` — Clarify chart ID if not provided, ask about ambiguous findings

---

## Error Handling

**Chart File Not Found**:

```
Could not find chart file at src/lib/workup/charts/{chart-id}.ts
Available charts: {list from index.ts}
```

**Answer Key Not Found**:

```
Warning: No answer key found at src/lib/workup/answers/{chart-id}.md
Skipping Check 11 (answer key alignment). All other checks will proceed.
```

**Chart File Too Large to Read at Once**:

- Read in sections using offset/limit parameters
- Use Grep to locate specific sections by divider comments

**Ambiguous Finding (Could Be Intentional Error)**:

- Cross-reference with the answer key
- If the answer key lists it as an intentional error → note it as "intentional, properly embedded"
- If NOT in the answer key → flag as an unintentional issue

**WebSearch Unavailable**:

- Fall back to model's built-in medical knowledge for dose verification
- Note in the report which checks used estimated vs. evidence-based thresholds

---

## Important Notes

**DO:**

- ✅ Read the ENTIRE chart before making judgments (issues in one section may be explained by another)
- ✅ Distinguish between intentional errors (educational) and unintentional errors (bugs)
- ✅ Cross-reference the answer key before flagging medication/clinical issues
- ✅ Calculate CrCl using actual patient weight, age, sex, and SCr from the chart
- ✅ Check every single `{{VITALS:...}}`, `{{LABS:...}}`, and `{{IMAGING:...}}` marker against actual data
- ✅ Verify lab flags (H/L) against the stated reference ranges, not just clinical norms
- ✅ Note when a finding is borderline and might be acceptable
- ✅ Provide specific fix suggestions for every finding

**DON'T:**

- ❌ Flag intentional errors as bugs — check the answer key first
- ❌ Apply ICU standards to floor patients or vice versa
- ❌ Require exact clinical precision for educational scenarios (reasonable approximations are fine)
- ❌ Flag copy-forward artifacts in progress notes as errors — they're intentional realism
- ❌ Expect perfection in nursing documentation — real nurses chart by exception
- ❌ Flag realistic clinical variation as errors (e.g., BP 122/78 → 118/74 is normal variation)
- ❌ Use model hallucination for drug doses — always verify with WebSearch when uncertain
- ❌ Skip checks because the chart "looks fine" — be systematic

## Usage

```
/chart-qc chen-gloria                    # Full QC of chen-gloria chart
/chart-qc martinez-sofia                 # Full QC of martinez-sofia chart
/chart-qc henderson-robert --section labs # Quick check on just labs
/chart-qc chen-gloria --fix              # QC and auto-fix minor issues
```

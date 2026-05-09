# Topic ID Conventions

Quick reference for naming `topicId`, `moduleId`, and `scenarioId` strings in the staging file. These are throwaway slugs — the production database assigns its own `cuid()` IDs on import. The conventions below exist so the staging file is human-scannable and `/create-scenario` can match scenarios to their parent module reliably.

## Topic ID

Format:

```
topic_<setting_short>_<topic_short>
```

`<setting_short>` derived from the `PharmacySetting` enum in [prisma/schema.prisma](../../../prisma/schema.prisma):

| PharmacySetting | setting_short |
|-----------------|---------------|
| `COMMUNITY` | `comm` |
| `AMBULATORY_CARE` | `amb` |
| `HOSPITAL` | `hosp` |
| `INFUSION` | `inf` |

`<topic_short>` is a 1-3 word lowercase slug describing the clinical area:

| Topic area | topic_short |
|------------|-------------|
| OTC pediatric self-care | `otc_peds` |
| OTC adult cough/cold | `otc_cough` |
| Diabetes management | `diabetes` |
| Hypertension management | `htn` |
| Hyperlipidemia | `lipids` |
| Anticoagulation | `anticoag` |
| Asthma | `asthma` |
| COPD | `copd` |
| Chronic pain | `pain_chronic` |
| Acute pain (post-op, dental) | `pain_acute` |
| Geriatric polypharmacy | `geri_polypharm` |
| Pregnancy/lactation safety | `preg_lact` |
| Vaccinations | `vaccines` |
| HIV / PrEP | `hiv` |
| Mental health (SSRI counseling, etc.) | `mental_health` |
| Dermatology (OTC skin) | `derm_otc` |

If the topic isn't on this list, pick a 1-3 word lowercase slug that reads cleanly. Avoid plurals (`vaccines` → `vaccine`? both work, but pick one and stick with it within a topic).

## Examples

| Setting | Topic | topicId |
|---------|-------|---------|
| Community | OTC pediatric self-care | `topic_comm_otc_peds` |
| Ambulatory care | Diabetes management | `topic_amb_diabetes` |
| Hospital | Anticoagulation | `topic_hosp_anticoag` |
| Infusion | Chemotherapy support | `topic_inf_chemo` |
| Community | Adult OTC cough/cold | `topic_comm_otc_cough` |
| Ambulatory care | Geriatric polypharmacy | `topic_amb_geri_polypharm` |

The existing module in `example-module.ts` uses `topic_otc_counseling` — predates this convention. Don't rename it; the convention applies to new modules.

## Module ID

Format:

```
mod_<topic_short>_<seq>_001
```

`<seq>` is optional and only needed if you have multiple modules under the same topic (e.g. `mod_otc_peds_intro_001` for an intro module and `mod_otc_peds_advanced_001` for an advanced one). For a single module under a topic, drop `<seq>`:

```
mod_otc_peds_001
mod_amb_diabetes_001
mod_hosp_anticoag_001
```

The trailing `_001` is the module version. If you ever ship a v2 of the module, increment to `_002`. Today, always `_001`.

## Scenario ID

Format:

```
scn_<topic_short>_<seq>_NNN
```

`NNN` is the 0-padded scenario number within the module, starting at `001`:

```
scn_otc_peds_001
scn_otc_peds_002
scn_otc_peds_003
scn_otc_peds_004
```

If the module uses a `<seq>` differentiator, include it:

```
scn_otc_peds_intro_001
scn_otc_peds_intro_002
scn_otc_peds_advanced_001
```

These IDs are **committed at scaffold time and frozen**. `/create-scenario` MUST preserve them when filling stubs. Renumbering breaks `harness.ts --scenario <id>` references and any downstream allowlist files in `.claude/skills/iterate-scenario/reports/`.

## Legacy IDs in the existing module

The current `mod_otc_peds_001` uses scenario IDs that pre-date this convention:

- `scn_infant_triage_001`
- `scn_product_selection_001`
- `scn_patient_counseling_001`
- `scn_infant_pain_001`

These don't follow `scn_<topic_short>_NNN` — they use descriptive slugs. Either pattern is fine for human readability; the new convention is just simpler to generate algorithmically and easier to scan. Don't rename existing IDs (breaks the iterate-scenario reports). Use the new convention for new modules.

## When in doubt

- Lowercase only.
- Underscores between segments, no hyphens.
- No version suffix on `topicId`.
- 3-digit zero-pad on scenario `NNN`.
- ASCII only.

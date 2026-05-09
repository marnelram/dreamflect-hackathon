# Voice Mapping — Demographic to `voiceId`

Curated table for silent auto-pick during `/create-scenario`. The 20 valid `VoiceId` enum values come from [agentAPI/inworldvoices.json](../../../agentAPI/inworldvoices.json); the picks below filter that catalog by patient demographics so the skill doesn't have to re-derive matches every run.

When the patient sketch maps cleanly to a row, pick the **primary**. Fall back to the alternate if the primary somehow doesn't fit (rare). If nothing fits, default to `Elizabeth`.

## Primary picks by demographic

| Patient profile | Primary | Alternate | Rationale |
|-----------------|---------|-----------|-----------|
| Anxious mother, 20s-30s | `Ashley` | `Sarah` | Warm + natural; reads as caring without being saccharine. |
| Curious / questioning young woman, 20s | `Sarah` | `Ashley` | Fast-talking, questioning tone — fits a patient who probes. |
| Professional adult woman, 30s-50s | `Elizabeth` | `Deborah` | Default/composed female narrator quality. |
| Gentle / elegant woman, 40s+ | `Deborah` | `Elizabeth` | Softer tone for less-anxious presentations. |
| Posh middle-aged British woman | `Wendy` | `Olivia` | Distinct British signal in adult range. |
| Young, upbeat British woman, 20s | `Olivia` | `Sarah` | Younger British alternative. |
| Indian-accented adult woman | `Priya` | `Elizabeth` | Only Indian-accented voice in catalog. |
| Quirky / playful woman | `Julia` | `Sarah` | High-pitched, playful — fits unusual presentations. |
| Childlike voice (child patient if speaking) | `Pixie` | `Julia` | Squeaky, cartoon — reads as a child. Use sparingly; most pediatric scenarios use the caregiver, not the child. |
| Friendly conversational adult man | `Shaun` | `Dennis` | Default warm male. |
| Calm middle-aged man, smooth voice | `Dennis` | `Shaun` | Slightly older / steadier than Shaun. |
| Energetic, expressive adult man | `Alex` | `Mark` | Slight nasal quality, mid-range. Fits enthusiastic / talkative. |
| Rapid-fire / animated man | `Mark` | `Edward` | High-energy delivery. |
| Streetwise / fast-talking man | `Edward` | `Mark` | Emphatic, urban-coded. |
| Lively American man | `Timothy` | `Shaun` | Upbeat without nasal quality. |
| Older British man, refined | `Craig` | `Ronald` | Distinct British, articulate. |
| Older British man, gravelly | `Ronald` | `Craig` | Deeper / more weathered British. |
| Gravelly older man, weathered | `Theodore` | `Ronald` | American equivalent of Ronald — time-worn. |
| Commanding / gruff narrator-like | `Hades` | `Theodore` | Use sparingly; sounds villainous in normal patient flow. |
| Robotic / menacing | `Dominus` | `Hades` | Reserved for unusual scenarios (AI-character study?). Don't pick for real patients. |

## Picking heuristics

The patient sketch typically encodes 2-3 demographic axes: age, gender, accent. Match the primary axis first:

1. **Gender** narrows the catalog roughly in half.
2. **Accent** (if mentioned: British, Indian) narrows further. If no accent mentioned, default to American.
3. **Age** (young / middle / older) and **affect** (anxious / calm / quirky / streetwise) pick within the narrowed list.

Examples:

- "32-year-old anxious Black mother of a newborn" → female, no accent specified, anxious-affect → **`Ashley`** (warm, natural; matches the existing `scn_infant_triage_001` pick).
- "78-year-old English man with worsening confusion" → male, British, older → **`Craig`** or **`Ronald`** (Craig if more articulate, Ronald if more gravelly).
- "26-year-old Indian software engineer asking about lisinopril" → female-likely-or-male; if female, Indian → **`Priya`**. If male and Indian, fall back to `Dennis` (no Indian-male voice exists in the catalog) and note the limitation.
- "9-year-old presenting with the parent" → if the parent speaks, pick the parent's voice. The 9-year-old as the speaker is rare; if needed, **`Pixie`** but flag that to the user.

## Voices to avoid for normal scenarios

- **`Dominus`** (robotic / menacing villain)
- **`Hades`** (commanding gruff narrator)
- **`Pixie`** (childlike — only when the scenario explicitly has the child speaking, and even then check it sounds right)
- **`Julia`** (quirky / playful — fine for unusual presentations, not default adult)

These exist in the enum but rarely fit a realistic pharmacy patient. If you find yourself reaching for one, double-check the scenario actually calls for it.

## Default

If no demographic information is available or the sketch is ambiguous: **`Elizabeth`**. This is the Prisma enum's default and reads as a neutral, professional adult woman.

## Override path for the user

The skill picks silently and writes the chosen `voiceId` to the file. If the user disagrees, they edit `voiceId` directly — single-token change, no skill re-run needed. The hand-back summary should mention which voice was picked and why so the user can react quickly:

```
Voice: Ashley (auto-picked for anxious 30s mother, no accent specified)
```

## Existing scenario picks (sanity reference)

For comparison against the existing module:

| Scenario | voiceId | Patient profile |
|----------|---------|-----------------|
| `scn_infant_triage_001` | `Ashley` | 32yo anxious Black mother, no accent specified |
| `scn_product_selection_001` | `Shaun` | (caregiver — adult man, friendly) |
| `scn_patient_counseling_001` | `Priya` | Adult woman with Indian accent |
| `scn_infant_pain_001` | `Deborah` | (parent — gentle adult woman) |

These are sane picks. Use them as calibration.

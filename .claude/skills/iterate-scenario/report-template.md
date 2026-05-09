# Iteration {{iteration}} — {{scenarioTitle}}

Scenario ID: `{{scenarioId}}`
Timestamp: {{timestamp}}
Total cost: ${{cost.total}}

## Summary

- Critical bugs: **{{bugs.critical.length}}**
- Advisory findings: {{bugs.advisory.length}}
- Total trials: {{totalTrials}}
- Stop reasons: {{stopReasons}}

## Critical Bugs (drive edits)

{{#each bugs.critical}}
### [{{detectorId}}] persona={{personaId}} ({{hitsAcrossTrials}}/{{totalTrials}} trials)

**Rule:** {{rule}}
**Adjudicator:** {{adjudicationReason}}

```
{{example.fullTurn}}
```

{{/each}}

## Advisory Findings (do NOT drive edits)

{{#each bugs.advisory}}
- **{{detectorId}}** (persona={{personaId}}, {{hitsAcrossTrials}}/{{totalTrials}}): {{rule}}
{{/each}}

## Per-Persona Overview

{{#each perPersona}}
### {{personaId}}

- Rubric: {{rubricSnapshot.overallScore}} / {{rubricSnapshot.totalPossible}}
{{#each trials}}
- Trial {{trialIndex}}: {{turnCount}} turns, stop={{stopReason}}, lookups={{lookupCount}} ({{lookupHitRate}}% hit)
{{/each}}
{{/each}}

## Cost Breakdown

```json
{{cost.byStage}}
```

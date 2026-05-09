# Plan Feature Skill

## Purpose

Adversarial planning skill for use in **plan mode only**. Launches a planner agent that drafts an implementation plan, then three adversarial agents (technical, product/UX, security) that critique it in parallel. The planner incorporates their feedback, and the cycle repeats for a number of rounds proportional to task complexity. The final plan is written to TodoWrite for execution.

## Input

Must be invoked from plan mode with a description of the feature or bug:

```
/plan-feature Add voice toggle to scenario interface
/plan-feature Fix race condition in flashcard batch sync
```

## Preconditions

- **Must be in plan mode.** If not in plan mode, instruct the user to enter plan mode first (`/plan`) and stop.

## Workflow Overview

```
1. Assess complexity → determine round count (1-3)
2. Planner agent drafts initial plan
3. Three adversarial agents critique in parallel:
   - Technical Adversary (architecture, performance, edge cases, correctness)
   - Product/UX Adversary (user flows, accessibility, confusion, regressions)
   - Security Adversary (auth, injection, data exposure, OWASP top 10)
4. Planner reviews all critiques and revises plan
5. Repeat steps 3-4 for remaining rounds
6. Present final plan to user for approval (plan mode handles this)
7. On approval, write plan to TodoWrite
```

---

## Step 1: Assess Complexity

Analyze the feature/bug description and codebase to determine complexity:

| Complexity | Rounds | Criteria |
|-----------|--------|----------|
| **Low** (bug fix, small tweak) | 1 | Single file or narrow scope, clear fix, no architectural changes |
| **Medium** (feature, moderate refactor) | 2 | Multiple files, new API routes or components, some design decisions |
| **High** (large feature, cross-cutting) | 3 | New system/subsystem, database changes, multiple integration points, affects auth/billing/AI |

Present the assessment to the user:

```
Complexity: {Low/Medium/High} → {1/2/3} adversarial rounds

Reasoning: {brief justification}
```

The user can override the round count if they disagree.

## Step 2: Planner Drafts Initial Plan

The planner agent analyzes the codebase and creates a detailed implementation plan.

**Spawn the planner agent** (`Agent` tool with `subagent_type: "general-purpose"`):

Prompt the planner with:

```
You are a senior software architect planning an implementation for the LeetCare codebase.

**Task**: {feature/bug description from user}

**Instructions**:
1. Read CLAUDE.md for full project context
2. Search the codebase for relevant existing code, patterns, and similar implementations
3. Research any unfamiliar APIs via Context7 if needed
4. Create a detailed implementation plan with:

   a. **Summary**: One paragraph describing what will be built and why
   b. **Files to modify**: List each file with what changes are needed
   c. **Files to create**: Any new files with their purpose
   d. **Database changes**: Schema changes if any (Prisma)
   e. **API changes**: New or modified endpoints
   f. **Key implementation details**: Important logic, algorithms, state management
   g. **Testing approach**: What to test and how
   h. **Migration/deployment notes**: Any special steps needed

Return the full plan as markdown.
```

## Step 3: Adversarial Review (Parallel)

Spawn **three adversarial agents in parallel** using the `Agent` tool. Each receives the planner's draft and critiques it from their perspective.

### Technical Adversary

Spawn with `subagent_type: "general-purpose"`:

```
You are a senior technical reviewer adversarially critiquing an implementation plan for the LeetCare codebase (Next.js 15, Prisma, TypeScript strict).

**Your job**: Find everything that could go wrong technically. Be thorough and skeptical.

**Plan to review**:
{planner's draft plan}

**Review these areas**:
1. **Architecture**: Does this follow existing patterns? Will it create tech debt? Is the component split (server/client) correct?
2. **Performance**: N+1 queries? Unnecessary re-renders? Large bundle impact? Missing pagination/virtualization?
3. **Edge cases**: Race conditions? Concurrent users? Empty states? Network failures? Partial failures?
4. **Correctness**: Logic errors? Off-by-one? Timezone issues? Type safety gaps?
5. **Data integrity**: Missing transactions? Orphaned records? Cascade delete issues?
6. **Scalability**: Will this work with 10x users? Large datasets?
7. **Dependencies**: Are proposed libraries necessary? Version conflicts?

**Read the relevant codebase files** to verify your critiques are grounded in reality (not hypothetical).

**Output format**:
For each issue found:
- **Issue**: {description}
- **Severity**: Critical / High / Medium / Low
- **Location**: {which part of the plan}
- **Suggestion**: {how to fix it}

If something in the plan is solid, say so briefly. Don't nitpick for the sake of it — focus on issues that would actually cause problems.
```

### Product/UX Adversary

Spawn with `subagent_type: "general-purpose"`:

```
You are a product manager and UX expert adversarially critiquing an implementation plan for LeetCare — an AI-powered patient simulator for pharmacy students.

**Your job**: Find everything that could go wrong from a user experience and product perspective. Think like a pharmacy student and a professor using this app.

**Plan to review**:
{planner's draft plan}

**Review these areas**:
1. **User flow**: Is the flow intuitive? Are there dead ends? Missing back navigation? Confusing state transitions?
2. **Accessibility**: Keyboard navigation? Screen reader support? Color contrast? Focus management?
3. **Error states**: What does the user see when things fail? Are error messages helpful?
4. **Loading states**: Missing loading indicators? Skeleton screens where needed?
5. **Mobile responsiveness**: Will this work on mobile web? Does it affect the React Native app?
6. **Consistency**: Does this match existing UI patterns in the app? Unexpected behavior changes?
7. **Edge cases (UX)**: First-time user experience? Empty states? Long content? Slow connections?
8. **Regression risk**: Could this break existing user workflows?

**Read relevant UI components and pages** in the codebase to verify concerns.

**Output format**:
For each issue found:
- **Issue**: {description}
- **Severity**: Critical / High / Medium / Low
- **Location**: {which part of the plan}
- **Suggestion**: {how to fix it}

Focus on real UX problems that would confuse or frustrate users, not subjective style preferences.
```

### Security Adversary

Spawn with `subagent_type: "general-purpose"`:

```
You are a security engineer adversarially critiquing an implementation plan for LeetCare — a Next.js 15 app with Better Auth, Prisma, and multiple AI API integrations.

**Your job**: Find every security vulnerability this plan could introduce. Be paranoid.

**Plan to review**:
{planner's draft plan}

**Review these areas**:
1. **Authentication & Authorization**: Missing auth checks? IDOR vulnerabilities? Role escalation? Session handling?
2. **Input validation**: Unsanitized user input? Missing Zod schemas? SQL/NoSQL injection via Prisma raw queries?
3. **XSS**: User content rendered without sanitization? Dangerously set HTML?
4. **CSRF**: Missing CSRF protection on state-changing endpoints?
5. **Data exposure**: Sensitive data in API responses? PII leakage? Overly broad queries?
6. **API security**: Missing rate limiting? Unauthenticated endpoints? Mass assignment?
7. **Secrets**: Hardcoded keys? Env vars exposed to client? Secrets in git?
8. **Dependencies**: Known vulnerabilities in proposed packages?

**Read relevant API routes and auth patterns** in the codebase to verify concerns.

**Output format**:
For each issue found:
- **Issue**: {description}
- **Severity**: Critical / High / Medium / Low
- **Location**: {which part of the plan}
- **Suggestion**: {how to fix it}
- **OWASP category**: {if applicable}

Focus on real vulnerabilities, not theoretical concerns that the existing framework already handles.
```

## Step 4: Planner Revises Plan

After all three adversarial agents return, **spawn the planner agent again** with all critiques:

```
You are the same senior software architect. You previously drafted this implementation plan:

{previous plan}

Three adversarial reviewers have critiqued your plan:

**Technical Review**:
{technical adversary output}

**Product/UX Review**:
{product adversary output}

**Security Review**:
{security adversary output}

**Instructions**:
1. Review each critique carefully
2. For each issue raised:
   - If valid: incorporate the fix into your revised plan
   - If invalid or already handled: briefly explain why (1 sentence)
3. Produce a **revised plan** with the same structure as the original
4. Add a **Changes Made** section at the end summarizing what was changed and why

{If this is NOT the final round}: Focus on addressing Critical and High severity issues. Medium/Low can be noted for next round.
{If this IS the final round}: Address all remaining issues. The plan should be comprehensive and ready for implementation.

Return the full revised plan as markdown.
```

## Step 5: Repeat (if rounds remain)

If more rounds remain, go back to Step 3 with the revised plan. Each subsequent round should surface fewer issues as the plan improves.

## Step 6: Present Final Plan

Present the final plan to the user in plan mode. Plan mode already handles user review and approval. Include:

```
## Adversarial Planning Complete

**Rounds**: {N} | **Issues found**: {total} | **Addressed**: {count} | **Dismissed**: {count}

### Final Plan
{revised plan from last round}

### Adversarial Summary
| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Technical | {n} | {n} | {n} | {n} |
| Product/UX | {n} | {n} | {n} | {n} |
| Security | {n} | {n} | {n} | {n} |

### Dismissed Issues (with reasoning)
{list of issues the planner dismissed and why}
```

The user reviews and can request changes. Plan mode handles this iteration.

## Step 7: Write to TodoWrite

Once the user approves the plan, convert it into a structured TodoWrite task list:

- Break the plan into discrete, actionable steps
- Order tasks by dependency (what must be done first)
- Group related changes (e.g., "Create API route + update types" as one task)
- Include testing as explicit tasks

## Tools Required

### Agent Spawning

- `Agent` (subagent_type: `general-purpose`) — Planner agent, three adversarial agents

### Task Management

- `TodoWrite` — Write final approved plan as tasks

### Code Analysis (used by spawned agents)

- `Read`, `Grep`, `Glob` — Codebase analysis
- `mcp__context7__resolve-library-id`, `mcp__context7__query-docs` — API documentation lookup

## Output

- Adversarially-reviewed implementation plan
- Severity-ranked summary of issues found and addressed
- TodoWrite task list ready for execution

## Error Handling

**Not in Plan Mode**:

```
/plan-feature must be used in plan mode. Enter plan mode first with /plan, then run /plan-feature.
```

**Agent Timeout/Failure**:

If an adversarial agent fails, continue with the remaining agents' feedback. Note the missing perspective:

```
Note: {Technical/Product/Security} review failed. Proceeding with available feedback.
Consider manually reviewing {area} before approving the plan.
```

**No Issues Found**:

If all adversaries find zero issues (unlikely for complex features), note this and proceed directly to presenting the plan. The plan is likely either very simple or the agents need more context — flag this to the user.

## Important Notes

**DO:**

- Always run all three adversarial agents in parallel for speed
- Ground all critiques in actual codebase reading (not hypothetical)
- Track issue counts across rounds to show convergence
- Respect the user's round count override
- Present dismissed issues transparently

**DON'T:**

- Run outside of plan mode
- Skip the adversarial step for "simple" tasks (even 1 round has value)
- Let adversaries be overly pedantic — focus on real issues
- Auto-approve the plan — the user must review in plan mode
- Modify any code — this skill only plans
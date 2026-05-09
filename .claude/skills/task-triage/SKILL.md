# Task Triage Skill

## Purpose

Pull tasks from Linear (Todo + Backlog), cross-reference with business goals, recommend a prioritized set of tasks targeting ~30 minutes of Claude Code work, and then autonomously execute the approved tasks sequentially — planning each one, implementing it, and updating Linear status along the way.

## Workflow

### Phase 1: Gather Context

#### 1.1 Fetch Linear Tasks

Query Linear for all Todo and Backlog tasks in the LeetCare project:

```
mcp__linear-server__list_issues({
  project: "LeetCare",
  limit: 50
})
```

Filter results to only `Todo` and `Backlog` statuses. For each task, extract:

- Issue ID (e.g., "LIN-123")
- Title
- Labels (Feature, Bug, Improvement)
- Priority (1=Urgent, 2=High, 3=Normal, 4=Low)
- Description (full text)
- Estimate (if set)

#### 1.2 Read Business Goals

Read these docs to understand current strategic priorities:

- `docs/business-docs/PRODUCT_ROADMAP.md` — current product priorities and phase
- `docs/business-docs/EXECUTIVE_SUMMARY.md` — strategic pillars
- `docs/business-docs/COMMERCIAL_ROADMAP.md` — revenue and growth targets

Extract the current priorities and phase to inform task ranking.

#### 1.3 Flag Sensitive Tasks

Identify tasks that touch sensitive areas and should be flagged for manual handling:

- **Auth/security**: Tasks mentioning auth, login, session, middleware, Better Auth, OAuth
- **Billing/payments**: Tasks mentioning Stripe, subscription, pricing, payment, checkout
- **Environment/config**: Tasks mentioning .env, secrets, API keys, deployment, Railway

These tasks should be marked with a warning and excluded from autonomous execution (but still shown in the recommendation list with a note).

### Phase 2: Prioritize and Recommend

#### 2.1 Score Tasks

For each task, compute a composite priority score based on:

1. **Linear Priority** (weight: 40%) — Urgent=4, High=3, Normal=2, Low=1
2. **Business Alignment** (weight: 40%) — How well the task aligns with current business goals from the docs (rate 1-4)
3. **Complexity Estimate** (weight: 20%) — Prefer quick wins. Estimate implementation time:
   - Small (~5 min): score 4
   - Medium (~10-15 min): score 3
   - Large (~20-30 min): score 2
   - XL (30+ min): score 1

#### 2.2 Select Recommended Batch

From the scored list:

- Sort by composite score (descending)
- Select tasks that together total ~30 minutes of estimated work
- Group related tasks that could share a branch/PR
- Cap at 5 tasks maximum per session

#### 2.3 Present Recommendations

Show the user a ranked list of ALL tasks from Linear (Todo + Backlog), with your recommended batch highlighted. For each task show:

```
Recommended Tasks (~30 min estimated):
  1. [LIN-123] Fix flashcard queue deduplication (Bug, Urgent) ~5 min
     Why: Directly impacts retention metrics — top business priority
  2. [LIN-456] Add deck completion toast (Improvement, High) ~10 min
     Why: Aligns with user engagement goals in product roadmap
  3. [LIN-789] Update practice page grid layout (Feature, Normal) ~15 min
     Why: Supports onboarding polish for UW pilot

  Flagged (needs manual handling):
  4. [LIN-101] Update Stripe webhook handler (Bug, High) ~10 min
     Reason: Touches billing/payments — skipped for autonomous execution

  Other available tasks:
  5. [LIN-202] Refactor case editor toolbar (Improvement, Low) ~20 min
  6. [LIN-303] Add scenario timer pause (Feature, Normal) ~15 min
  ...
```

Then ask the user: **"Which tasks should I work on? (Enter numbers, e.g. 1,2,3)"**

Also offer: **"Or type 'recommended' to accept the suggested batch."**

### Phase 3: Execute Approved Tasks

Once the user approves a set of tasks:

#### 3.1 Group and Branch

- Group related tasks (same feature area, shared files) into a single branch
- Unrelated tasks get separate branches
- Branch naming: `feat/LIN-{id}-{slug}` or `fix/LIN-{id}-{slug}` based on label
- For grouped tasks: `feat/LIN-{id1}-LIN-{id2}-{slug}`

#### 3.2 Sequential Execution Loop

For each task (or task group):

**Step A — Move to In Progress**

```
mcp__linear-server__save_issue({
  id: "{ISSUE_ID}",
  data: { state: "In Progress" }
})
```

**Step B — Plan**

Enter plan mode and create an implementation plan:

- Read the Linear issue description fully
- Identify affected files by searching the codebase
- List specific changes needed
- Note any risks or dependencies
- Present the plan briefly to the user (don't wait for approval — just show it and proceed)

**Step C — Implement**

Execute the plan:

- Create feature branch (if not already on one)
- Make code changes
- Run relevant linting (`pnpm lint`) and type checking (`npx tsc --noEmit`) on changed files
- Fix any issues found

**Step D — Commit and Update Linear**

After each task (or task group) is complete:

- Stage relevant files (specific files, not `git add .`)
- Commit with conventional message: `feat(LIN-{id}): {title}` or `fix(LIN-{id}): {title}`
- Move Linear issue to "In Review":

```
mcp__linear-server__save_issue({
  id: "{ISSUE_ID}",
  data: { state: "In Review" }
})
```

**Step E — Next Task**

Move to the next task. If the next task is unrelated, switch to a new branch from master.

#### 3.3 Create PR(s)

After all tasks are complete:

- Push branch(es) to remote
- Create PR(s) using `gh pr create`
- PR title: task title (or combined title for grouped tasks)
- PR body: summary of changes, link to Linear issue(s)
- Base branch: `master`

### Phase 4: Summary

Present a completion summary:

```
Session Complete!

Completed:
  [LIN-123] Fix flashcard queue deduplication — In Review
  [LIN-456] Add deck completion toast — In Review

PR(s) created:
  #42: Fix flashcard queue dedup and add completion toast
    https://github.com/user/repo/pull/42

Skipped:
  [LIN-101] Update Stripe webhook — flagged as billing (manual)

Remaining in backlog: 15 tasks
```

## Tools Required

### Linear MCP

- `mcp__linear-server__list_issues` — Fetch tasks
- `mcp__linear-server__get_issue` — Get full issue details
- `mcp__linear-server__save_issue` — Update issue status

### File Operations

- `Read` — Read business docs and source files
- `Edit` — Implement changes
- `Write` — Create new files if needed
- `Glob` — Find files in codebase
- `Grep` — Search codebase for patterns

### Shell

- `Bash` — Git operations, linting, type checking, PR creation

### User Interaction

- `AskUserQuestion` — Present task list and get user selection

## Input

None — invoked via `/task-triage`

## Output

- Prioritized task list with business goal alignment
- Implemented and committed code changes
- Linear issues moved through statuses (In Progress -> In Review)
- Pull request(s) created
- Session summary

## Error Handling

**No Tasks Found:**
```
No tasks found in Todo or Backlog for LeetCare.
```

**Linear API Error:**
```
Error fetching tasks from Linear. Check your Linear connection.
```

**Build/Lint Failure During Implementation:**
- Attempt to fix automatically
- If unfixable, revert changes for that task, move Linear issue back to Todo, note in summary, and continue to next task

**Task Too Complex (exceeds ~30 min solo):**
- Note in recommendation: "This task may exceed session budget"
- If approved and it's taking too long, commit partial progress, note in summary

## Important Notes

**DO:**
- Always read business docs fresh (they may have been updated)
- Show your reasoning for why each task was recommended
- Commit after each task (not at the end)
- Keep the user informed of progress between tasks
- Batch related tasks into one branch/PR

**DON'T:**
- Auto-execute tasks touching auth, billing, or env without explicit user approval
- Force push or push to master directly
- Skip linting/type checking
- Spend more than ~30 min total without checking in with the user
- Install new packages without asking
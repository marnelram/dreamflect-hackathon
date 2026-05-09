# Prep Skill

## Purpose

Prepare working changes on Dreamflect for a clean commit. Reviews every file in the current git diff, tidies code, runs the two quality gates this project actually has (`tsc`, `next lint`), updates the root `CLAUDE.md` if architecture shifted, and drafts a commit message. The step between "done coding" and "ready to ship."

This is a 6-hour hackathon project (Generative UI Global Hackathon, May 2026). Don't add tests, don't add a formatter, don't add new tooling, don't aggressively refactor. Tidy what's there.

## Workflow

### 1. Identify Changed Files

Get the deduped list of files in the current diff (staged + unstaged + untracked):

```bash
git diff --name-only HEAD
git diff --name-only --cached
git ls-files --others --exclude-standard
```

If no changes:

```
No changes detected. Nothing to prep.
```

**Off-limits paths — skip review entirely:**

- `dreamflect-handoff/**` — original Claude Design export, treated as read-only reference. If a changed file lives in here, flag it to the user and stop.
- `pnpm-lock.yaml`, `node_modules/**`, `.next/**` — never edit by hand.
- `public/_gen/**` — staged image-generation outputs from `/genimg`; leave alone.

### 2. Review Each Changed File

For every file in the diff, Read it and check for:

**Code tidiness**

- Remove leftover `console.log` / `console.debug` clearly used for debugging. **Preserve** intentional logging in `app/api/**/route.ts`, error handlers, and the runtime route — those are deliberate.
- Remove commented-out code blocks (dead code).
- Remove unused imports.
- Trim comments. CLAUDE.md sets the tone: minimal comments, only where the WHY is non-obvious. Remove "explain the what" comments.
- Remove `TODO` / `FIXME` that this change resolved.
- Remove trailing whitespace.

**Security / leakage**

- No hardcoded secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, Better Auth secrets).
- No real `.env.local` values committed; only `.env.local.example` should carry placeholders.
- No leaking of internal Neon connection strings into client components (anything under `src/components/**` or `app/**` that isn't a route handler / server component).

**Don't refactor on this pass.** No file-length triggers, no folder-size triggers, no "extract to a hook" decisions. If something is genuinely too big to ship, flag it to the user — don't move files unprompted. Hackathon scope.

### 3. Dreamflect-specific guardrails

Before saving any edit, check the change against these load-bearing patterns from CLAUDE.md. If a change violates one, stop and flag it to the user rather than "fixing" it.

**Frontend tool rendering pattern (`src/components/DreamSession.tsx`)**

- The `render` callback for every `useFrontendTool` must call `commitOnce(name, args, fn)` and return `null`. Do not inline the dedupe, do not remove the `useRef<Set<string>>`. Without it, render fires repeatedly on status transitions and you get duplicate commits / infinite loops.
- Tools register by name; the `name` string is the dedupe key seed and must stay stable.

**v2 imports only**

- Frontend: `@copilotkit/react-core/v2`. Server: `@copilotkit/runtime/v2`. Never the bare paths, never v1 hooks (`useCopilotChat`, `useCopilotAction`) in the same flow as v2.
- `@copilotkit/shared/v2` does **not** exist — there's an inline `randomUUID` polyfill at the top of `DreamSession.tsx`. Don't try to import it.

**Anthropic SDK usage**

- The CopilotKit runtime reads `ANTHROPIC_API_KEY` from env automatically. Do not import `@anthropic-ai/sdk` directly to forward the key. The `^0.88.0` peer-dep mismatch with `@copilotkit/runtime`'s `peerOptional ^0.57.0` is intentional — don't downgrade.

**A2UI catalog substitution (`DreamSession.tsx`)**

- The agent emits `"<basicCatalog.id>"` literally; `DreamSession` does a JSON round-trip with `replaceAll("<basicCatalog.id>", basicCatalog.id)` before handing messages to `<A2uiTakeawayStep>`. Don't remove the substitution. Don't try to make the agent emit the real id.

**Two database clients are intentional**

- `src/lib/db.ts` uses `@neondatabase/serverless` for app/edge queries.
- `src/lib/auth.ts` uses `pg.Pool` because Better Auth requires it.
- Don't import `auth.ts` from edge routes (the OG image routes go straight to `@neondatabase/serverless`). Don't try to consolidate.

**System prompt is load-bearing**

- `src/lib/system-prompt.ts` defines: one tool call per turn, no conversational text, archetype→probe variable mapping, and the exact A2UI takeaway message shape. If a step starts misbehaving the fix usually lives here, but don't edit it as part of "tidying" — surface the change to the user.

**Save hook lives inside `commitOnce("takeaway", ...)`**

- The session save POST fires from inside the takeaway commit. The takeaway screen polls `/api/sessions/[id]/status` for the gpt-image-1 result. Don't move the save call out of the commit closure unless the user asks.

**Providers wrap the page, not the layout**

- `app/layout.tsx` is a bare server shell. `<Providers>` lives in `app/page.tsx` (client). Auth pages and `/history` deliberately don't get CopilotKit context.

**Multi-endpoint runtime**

- The runtime route is `app/api/copilotkit/[[...path]]/route.ts` (optional catch-all) and `<CopilotKitProvider useSingleEndpoint={false}>`. Don't collapse to a single endpoint.
- The runtime is constructed **fresh per request** so the system prompt can include prior dreams. Don't hoist the runtime to module scope.

**Agent name**

- `<CopilotKitProvider agent="default">` matches the key in `agents: { default: agent }`. Rename one → rename both.

### 4. Run quality gates

This project's only gates. Run them in parallel:

```bash
npx tsc --noEmit
pnpm lint
```

- **`tsc --noEmit`** — fix any type errors **in files you actually changed**. If type errors exist in unrelated files, note them but do not fix.
- **`pnpm lint`** runs `next lint`. CLAUDE.md notes it's not actively wired into the workflow, so existing baseline warnings may be present. Fix any **new** lint errors in changed files; don't touch warnings in untouched files.

Do **not** run `next build` here — too slow for an iteration loop. `/ship` can do it.

There is no test suite. Do not invent one.

### 5. Update root CLAUDE.md (when warranted)

The project has a single root `CLAUDE.md`. Update it when:

- A new step / `useFrontendTool` was added → mention it in the rendering-pattern section.
- A new env var was introduced → add to the `.env.local.example` and mention here.
- The system prompt's tool-mapping behaviour changed → reflect in the "System prompt is load-bearing" section.
- A new top-level route was added under `app/` (especially if it has different auth treatment).
- The CopilotKit / A2UI wiring changed in a way that would surprise a future contributor.

Do **not** update for: refactors that don't change interfaces, bug fixes that preserve behaviour, copy/styling tweaks, new shadcn primitives in `src/components/ui/`.

Read CLAUDE.md before editing. Match the existing terse, fact-first tone. No preambles.

### 6. Final review

```bash
git diff --stat
git diff
```

Sanity-check the full changeset (your cleanup edits included). Confirm nothing accidentally broke a load-bearing pattern from step 3.

### 7. Linear (optional, only if relevant)

Detect a Linear issue ID by pattern-matching the current branch name for `LIN-\d+` (or `[A-Z]+-\d+` if Marnel uses a different prefix in this repo).

```bash
git rev-parse --abbrev-ref HEAD
```

- If a match is found, move the issue to "In Review":

  ```typescript
  mcp__linear-server__save_issue({
    id: "{LINEAR_ISSUE_ID}",
    data: { state: "In Review" },
  });
  ```

  If the call fails, warn but continue — never block the prep on Linear.

- If no match is found, **skip silently**. This is a hackathon project and most branches won't have a Linear ID. Don't ask, don't prompt.

### 8. Draft commit message

Follow whatever convention `git log` already shows in this repo. If the log is empty (early hackathon commits), default to a plain imperative subject + optional body.

```
{concise imperative summary of the change}

{Optional body: why this change, gotchas, anything a future contributor would want to know}
```

Guidelines:

- Subject under 72 chars, imperative mood ("add" not "added").
- Focus on the *why*. The diff already shows the *what*.
- If a Linear ID was detected, prepend its scope: e.g. `feat(LIN-12): wire up archetype probe`. Otherwise no scope is fine.

### 9. Hand off to the user

Present the result, don't auto-commit:

```
Prep complete.

Files reviewed: {N}
- {one-line summary of cleanup performed}
- tsc: {clean | N errors fixed | N pre-existing in unrelated files}
- lint: {clean | N fixed | N pre-existing}
- CLAUDE.md: {updated section X | no update needed}
- Linear: {LIN-{id} → In Review | not detected, skipped}

Suggested commit message:
---
{message}
---

Ready to commit? Run /ship or commit manually.
```

## Tools required

**File ops** — `Read`, `Edit`, `Glob`, `Grep`. `Write` only if a change genuinely needs a new file (rare during prep).

**Shell** — `Bash` for git, `tsc`, `pnpm lint`. **Use `pnpm`, not `npm`** — the user has been explicit about this.

**Linear MCP** — `mcp__linear-server__save_issue`, only if a Linear ID is detected on the branch.

**User interaction** — `AskUserQuestion`, only when a guardrail in step 3 is violated and you need a human decision before proceeding.

## Input

None. Skill is invoked via `/prep`.

Optional positional arg: a path filter to scope review.

```
/prep                           # all changed files
/prep src/components/steps/     # only changes under steps/
```

## Output

- Changed files reviewed and tidied (no aggressive refactors).
- `tsc --noEmit` clean for changed files.
- `pnpm lint` clean for changed files.
- `CLAUDE.md` updated if a documented architecture changed.
- Linear issue moved to "In Review" iff branch name carried an ID.
- Draft commit message presented. **No auto-commit.**

## Important

**DO**

- Touch only files in the git diff.
- Preserve intentional logging in API routes / error handlers / the runtime.
- Keep CLAUDE.md edits terse and fact-first.
- Flag violations of step-3 guardrails to the user — don't "fix" them silently.
- Default to leaving things alone when in doubt.

**DON'T**

- Modify `dreamflect-handoff/**`.
- Add tests, a formatter, or extra linting infrastructure. CLAUDE.md says no.
- Reorganize folders or split files based on size heuristics — this is a hackathon.
- Auto-commit (that's `/ship`).
- Edit `src/lib/system-prompt.ts` as part of "tidying" — it's load-bearing.
- Downgrade `@anthropic-ai/sdk` to silence the peer-dep warning.
- Import `@copilotkit/shared/v2` (doesn't exist) or mix v1 + v2 hooks.
- Run `npm install` / `npm i` against this repo.

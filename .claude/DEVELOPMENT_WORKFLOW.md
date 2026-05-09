# Development Workflow

Automated development workflow for LeetCare features using Linear, Context7, and automated testing.

## Overview

This workflow automates the complete feature development lifecycle:

1. Find and select a task from Linear
2. Initialize the task (move to In Progress, create branch)
3. Research requirements and gather documentation
4. Build the feature with tests
5. Ship the feature (commit, move to review, create PR)

## Workflow Steps

```
/find-task
  ↓
  Shows top 5 Linear tasks (sorted by priority)
  ↓
  User selects task
  ↓
task-initializer agent (auto-spawned)
  ├─ Move Linear issue: Todo → In Progress
  └─ Create git branch: {type}/LIN-{id}-{description}
  ↓
research agent (auto-spawned)
  ├─ Fetch Linear issue details
  ├─ Look up docs via Context7
  ├─ Analyze codebase patterns
  └─ Ask clarifying questions
  ↓
  User answers questions
  ↓
builder agent (auto-spawned with context)
  ├─ Create smoke tests (key workflows only)
  ├─ Implement feature
  ├─ Run tests & auto-fix failures
  └─ Call /ship skill
  ↓
/ship skill (auto-invoked)
  ├─ Commit with conventional message
  ├─ Move Linear: In Progress → In Review
  └─ Create PR (set reviewer)
  ↓
Done! 🚀
```

## Commands

### `/find-task`

Query Linear for available tasks and select which to work on.

**What it does**:

- Queries Linear for tasks in "Todo" column (LeetCare project)
- Sorts by priority (Urgent → High → Normal → Low)
- Shows top 5 tasks as multiple choice
- Auto-spawns `task-initializer` agent after selection

**Usage**:

```
/find-task
```

### `/ship`

Finalize and ship completed work.

**What it does**:

- Commits changes with conventional commit message
- Moves Linear issue to "In Review"
- Creates pull request with you as reviewer

**Usage**:
Called automatically by builder agent, or manually:

```
/ship LIN-123
```

## Agents

### task-initializer

Initializes a new task by updating Linear and creating a git branch.

**Responsibilities**:

- Move Linear issue from "Todo" to "In Progress"
- Create git branch: `{feature|bugfix|improvement}/LIN-{id}-{description}`
- Checkout new branch
- Auto-spawn research agent

### research

Gathers comprehensive context before implementation.

**Responsibilities**:

- Fetch Linear issue details and analyze requirements
- Look up API documentation via Context7 (Vercel AI SDK, Better Auth, etc.)
- Read relevant codebase patterns
- Identify unclear requirements
- Ask clarifying questions
- Create comprehensive plan for builder
- Auto-spawn builder agent with full context

**Documentation Sources**:

- Context7 for API/package docs
- Codebase patterns from existing implementations
- Linear issue description and comments

### builder

Implements the feature with tests.

**Responsibilities**:

- Create smoke tests (skip UI-only changes)
- Implement feature following existing patterns
- Run tests and auto-fix failures
- Verify TypeScript build passes
- Auto-invoke `/ship` skill when complete

**Testing Strategy**:

- ✅ Smoke tests for key workflows (happy path only)
- ✅ New features and bug fixes
- ❌ Skip tests for UI-only or content-only changes

## Branch Naming Convention

Format: `{prefix}/LIN-{id}-{description}`

**Prefixes**:

- `feature/` - New functionality (Linear label: Feature)
- `bugfix/` - Bug fixes (Linear label: Bug)
- `improvement/` - Enhancements (Linear label: Improvement)

**Examples**:

- `feature/LIN-123-add-voice-toggle`
- `bugfix/LIN-124-fix-rate-limit-modal`
- `improvement/LIN-125-optimize-db-queries`

## Commit Message Format

Standard conventional commits:

```
{type}(LIN-{id}): {description}

{optional body}
```

**Types**:

- `feat` - New feature
- `fix` - Bug fix
- `improvement` - Enhancement to existing feature

**Examples**:

```
feat(LIN-123): Add voice toggle to scenario interface

Allows users to switch between text and voice modes during scenarios.
Includes rate limit checking and loading states.
```

## Pull Request Template

```markdown
## Summary

{One-liner from Linear issue description}

## Changes

{List key changes made}

## Linear Issue

Closes LIN-{id}
https://linear.app/marnel/issue/LIN-{id}

## Testing

- [x] Tests passing
- [x] Feature works as expected
- [x] No TypeScript errors

🤖 Generated via Claude Code development workflow
```

## Required Setup

**Linear MCP**:

- Linear server configured in Claude Code
- Access to LeetCare project
- Permissions to update issues

**Context7 MCP**:

- Context7 server configured
- Access to documentation for:
  - Next.js, React, Prisma
  - Vercel AI SDK
  - Better Auth
  - LiveKit
  - PostHog

**Git & GitHub**:

- Git configured with user.name and user.email
- GitHub CLI (`gh`) installed and authenticated
- Push access to repository

**Environment**:

- Node.js and pnpm installed
- Prisma configured
- Tests runnable (`pnpm test`)

## Usage Example

### Complete Workflow

1. **Find a task**:

   ```
   /find-task
   ```

   _Shows: LIN-123: Add voice toggle (Feature, High)_

2. **Select task**:
   _User clicks: "LIN-123: Add voice toggle"_

3. **Task initialized** (automatic):

   ```
   ✓ Linear issue LIN-123 moved to In Progress
   ✓ Created branch: feature/LIN-123-add-voice-toggle
   ✓ Research agent starting...
   ```

4. **Research phase** (automatic):

   ```
   Analyzing Linear issue...
   Looking up LiveKit documentation...
   Reviewing existing voice components...

   Question: Should the toggle preserve conversation history when switching modes?
   ```

   _User answers: "Yes, preserve history"_

5. **Building phase** (automatic):

   ```
   Creating smoke test for voice toggle...
   Implementing VoiceToggleButton component...
   Running tests... ✓ All tests pass
   Calling /ship...
   ```

6. **Shipping phase** (automatic):

   ```
   ✓ Committed: feat(LIN-123): Add voice toggle to scenario interface
   ✓ Pushed to origin/feature/LIN-123-add-voice-toggle
   ✓ Linear issue moved to In Review
   ✓ PR created: https://github.com/.../pull/456

   🚀 Task complete! PR ready for review.
   ```

## Manual Checkpoints

The workflow has **three manual interaction points**:

1. **Task Selection** (`/find-task`)
   - Pick which task to work on

2. **Requirement Clarification** (research agent)
   - Answer questions about unclear requirements
   - Provide additional context if needed

3. **Final Review** (after `/ship`)
   - Review the PR before merging
   - Run additional manual testing if desired

All other steps are fully automated.

## Error Handling

**No tasks found**:

```
No tasks found in the Todo column for LeetCare project.
All tasks are either in progress or completed! 🎉
```

**Tests fail during build**:

- Builder auto-fixes and re-runs tests
- Iterates until all tests pass
- Only ships when tests are green

**Git operations fail**:

- Reports clear error messages
- Provides manual commands if needed
- Never force-pushes or overwrites work

**Linear API errors**:

- Reports error and continues where possible
- Prompts manual Linear updates if API fails
- Never leaves tasks in inconsistent state

## Best Practices

**For Users**:

- Review clarifying questions carefully in research phase
- Provide clear, specific answers
- Review PRs before merging
- Keep Linear issues well-described

**For Agents**:

- task-initializer: Keep it simple, just Linear + git
- research: Ask focused questions, provide comprehensive context
- builder: Follow existing patterns, keep it simple, test thoroughly

**General**:

- One task at a time (no parallel workflows)
- Always let tests pass before shipping
- Use conventional commits consistently
- Keep Linear as source of truth

## Troubleshooting

**Agent not spawning**:

- Check Linear issue ID is valid
- Ensure previous step completed successfully
- Review agent logs for errors

**Documentation not found**:

- Verify Context7 MCP is configured
- Check library name spelling
- Fall back to codebase patterns if docs unavailable

**Tests not running**:

- Ensure `pnpm test` works locally
- Check test file paths are correct
- Verify Playwright is installed for E2E tests

**PR creation fails**:

- Check GitHub CLI is authenticated: `gh auth status`
- Verify repository access
- Create PR manually if needed

## File Structure

```
.claude/
├── agents/
│   ├── task-initializer.md    # Initialize task & branch
│   ├── research.md             # Gather context & ask questions
│   └── builder.md              # Implement & test feature
├── skills/
│   ├── find-task.md            # Query Linear for tasks
│   └── ship.md                 # Commit, update Linear, create PR
└── DEVELOPMENT_WORKFLOW.md     # This file
```

## Future Enhancements

Potential improvements to this workflow:

- [ ] Add `/pause-task` skill to save progress without shipping
- [ ] Support for multi-file PRs (split large changes)
- [ ] Auto-update PR when pushing new commits
- [ ] Integration with CI/CD status checks
- [ ] Slack/Discord notifications on PR creation
- [ ] Analytics tracking for development velocity
- [ ] Support for dependent tasks (blockers)

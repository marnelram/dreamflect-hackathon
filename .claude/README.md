# Claude Code Configuration

This directory contains custom agents and skills for automated development workflows in the LeetCare project.

## Quick Start

```bash
# 1. Find a task to work on
/find-task

# 2. Pick a task from the list
# → Automatically initializes task, researches, and builds

# 3. Answer any clarifying questions from research agent

# 4. Wait for feature to be built and shipped
# → Automatically commits, creates PR, and updates Linear
```

## What's Included

### Skills (User Commands)

- **`/find-task`** - Query Linear for available tasks
- **`/ship`** - Finalize and ship completed work (auto-invoked by builder)

### Agents (Automated Workers)

- **`task-initializer`** - Move Linear issue to In Progress, create git branch
- **`research`** - Gather documentation, analyze requirements, ask clarifying questions
- **`builder`** - Create tests, implement feature, auto-fix test failures

### Other

- **`posthog-metric-tester`** - Test PostHog event tracking implementation
- **`DEVELOPMENT_WORKFLOW.md`** - Complete workflow documentation

## Workflow Diagram

```
User Action:    /find-task
                    ↓
Auto:           Shows 5 tasks → User picks one
                    ↓
Auto:           task-initializer (Linear + Git)
                    ↓
Auto:           research (Context7 + Codebase analysis)
                    ↓
User Action:    Answer clarifying questions
                    ↓
Auto:           builder (Tests + Implementation)
                    ↓
Auto:           /ship (Commit + PR + Linear update)
                    ↓
Done:           PR ready for review! 🚀
```

## Manual Checkpoints

1. **Task Selection** - Choose which task to work on
2. **Requirement Clarification** - Answer research questions
3. **Final PR Review** - Review and merge PR

Everything else is automated!

## File Structure

```
.claude/
├── agents/                          # Automated workers (.md files)
│   ├── task-initializer.md          # Initialize task (Linear + Git)
│   ├── research.md                  # Gather context (Context7 + Codebase)
│   ├── builder.md                   # Build feature (Tests + Implementation)
│   └── posthog-metric-tester.md     # Test PostHog events
│
├── skills/                          # User commands (subdirectories with SKILL.md)
│   ├── find-task/
│   │   └── SKILL.md                 # /find-task - Query Linear tasks
│   └── ship/
│       └── SKILL.md                 # /ship - Finalize and create PR
│
├── settings.local.json              # Permissions configuration
├── settings.template.json           # Settings template
├── DEVELOPMENT_WORKFLOW.md          # Complete workflow documentation
└── README.md                        # This file
```

## Requirements

**MCP Servers**:

- Linear MCP (task management)
- Context7 MCP (documentation lookup)
- PostHog MCP (analytics, optional)
- Neon MCP (database, optional)

**Git Setup**:

- GitHub CLI (`gh`) installed and authenticated
- Git user.name and user.email configured
- Repository push access

**Development Environment**:

- Node.js + pnpm
- Prisma configured
- Tests runnable (`pnpm test`)

## Examples

### Example 1: Add New Feature

```
> /find-task

Found 5 tasks. Select one:
1. LIN-123: Add voice toggle (Feature, High)
2. LIN-124: Implement rate limiting (Feature, Normal)
...

[User selects: LIN-123]

✓ Task initialized: feature/LIN-123-add-voice-toggle
✓ Researching LiveKit docs and existing voice patterns...

Research Agent: Should the toggle preserve conversation history?
[User answers: Yes]

✓ Creating smoke test...
✓ Implementing VoiceToggleButton component...
✓ Tests passing ✓
✓ Shipped! PR #456 created
```

### Example 2: Fix Bug

```
> /find-task

Found 5 tasks. Select one:
1. LIN-130: Fix evaluation modal not closing (Bug, Urgent)
...

[User selects: LIN-130]

✓ Task initialized: bugfix/LIN-130-fix-evaluation-modal
✓ Analyzing modal components and state management...

Research Agent: Should the modal close on overlay click or only with X button?
[User answers: Both]

✓ Creating regression test...
✓ Fixing modal close handler...
✓ Tests passing ✓
✓ Shipped! PR #457 created
```

## Documentation

For complete workflow details, see [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md).

For PostHog testing, see [agents/posthog-metric-tester.md](./agents/posthog-metric-tester.md).

## Troubleshooting

**Agent not starting**:

- Check Linear API connection
- Verify MCP servers are running
- Review previous step completion

**Tests failing**:

- Builder auto-fixes test failures
- If it can't fix, review test output
- May need manual intervention for complex issues

**PR creation fails**:

- Check `gh auth status`
- Ensure repository access
- Create PR manually: `gh pr create --help`

**Documentation not found**:

- Context7 MCP may need configuration
- Fall back to codebase patterns
- Check library name spelling

## Tips

- Keep Linear issues well-described (helps research agent)
- Provide clear answers to clarifying questions
- Review PRs before merging
- One task at a time (no parallel workflows)
- Let tests pass before shipping

## Support

For issues or improvements to this workflow:

1. Check [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
2. Review agent documentation in `agents/`
3. Open an issue on GitHub
4. Contact: marnelram@gmail.com

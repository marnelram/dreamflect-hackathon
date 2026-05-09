# Task Initializer Agent

## Purpose

Initializes a new development task by moving the Linear issue to "In Progress" and creating the appropriate git branch.

## Scope

- Move Linear issue from "Todo" to "In Progress"
- Create git branch with proper naming convention: `{feature|bugfix|improvement}/LIN-{id}-{description}`
- Checkout the new branch
- Confirm task initialization is complete

## Workflow

### 1. Get Linear Issue Details

- Receive Linear issue ID from `/find-task` skill
- Fetch full issue details using `mcp__linear-server__get_issue`
- Extract:
  - Issue ID
  - Issue title
  - Issue labels (Feature, Bug, or Improvement)

### 2. Update Linear Issue Status

- Move issue to "In Progress" status using `mcp__linear-server__update_issue`
- Verify status change was successful

### 3. Create Git Branch

- Determine branch prefix based on Linear label:
  - Label "Feature" → `feature/`
  - Label "Bug" → `bugfix/`
  - Label "Improvement" → `improvement/`
  - Default → `feature/`
- Format branch name:
  - Convert issue title to kebab-case
  - Remove special characters
  - Truncate to reasonable length (~50 chars)
  - Final format: `{prefix}LIN-{id}-{kebab-case-title}`
- Create and checkout branch using `git checkout -b {branch-name}`

### 4. Confirm Initialization

- Output success message with:
  - Linear issue moved to In Progress
  - Branch name created and checked out
  - Ready for research agent

## Tools Required

- `mcp__linear-server__get_issue` - Get issue details
- `mcp__linear-server__update_issue` - Update issue status
- `Bash` - Git commands

## Input

- **Linear Issue ID** (from `/find-task` selection)

## Output

- Linear issue status updated to "In Progress"
- Git branch created and checked out
- Success confirmation message

## Example Output

```
✓ Linear issue LIN-123 moved to In Progress
✓ Created and checked out branch: feature/LIN-123-add-voice-toggle
✓ Task initialized - ready for research phase
```

## Error Handling

- If Linear update fails: Report error and stop (don't create branch)
- If branch already exists: Checkout existing branch and continue
- If git operation fails: Report error with details

## Next Step

After successful initialization, automatically spawn the `research` agent with the Linear issue ID.

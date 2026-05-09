# Find Task Skill

## Purpose

Query Linear for available tasks in the "Todo" column, display top 5 tasks sorted by priority, and let the user select which task to work on. After selection, automatically spawn the `task-initializer` agent.

## Workflow

### 1. Query Linear for Available Tasks

Use Linear MCP to get tasks:

```typescript
mcp__linear -
  server__list_issues({
    project: "LeetCare",
    state: "Todo",
    limit: 50, // Get more to ensure we have enough after filtering
    orderBy: "updatedAt",
  });
```

### 2. Filter and Sort Tasks

From the results:

- Filter to only tasks in "Todo" state
- Sort by priority (1=Urgent, 2=High, 3=Normal, 4=Low)
- Take top 5 tasks
- For each task, extract:
  - Issue ID
  - Title
  - Labels (Feature, Bug, Improvement)
  - Priority level
  - Description (first 100 chars)

### 3. Present Tasks to User

Use `AskUserQuestion` to show multiple choice:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Which task would you like to work on?",
      header: "Select Task",
      multiSelect: false,
      options: [
        {
          label: "LIN-123: Add voice toggle (Feature, High)",
          description:
            "Users should be able to switch between text and voice modes...",
        },
        {
          label: "LIN-124: Fix rate limit modal (Bug, Urgent)",
          description: "Rate limit modal not showing correct usage count...",
        },
        // ... up to 5 tasks
      ],
    },
  ],
});
```

**Option Format**:

- **Label**: `LIN-{id}: {title} ({label}, {priority})`
- **Description**: First 100 chars of issue description

**Priority Display**:

- 1 → "Urgent"
- 2 → "High"
- 3 → "Normal"
- 4 → "Low"

### 4. Extract Linear Issue ID

After user selects a task:

- Parse the selected option to extract Linear issue ID (e.g., "LIN-123")
- Store the full issue details for the next agent

### 5. Spawn Task Initializer Agent

Use `Task` tool to spawn the `task-initializer` agent:

```typescript
Task({
  subagent_type: "task-initializer",
  description: "Initialize task LIN-123",
  prompt: `Initialize task for Linear issue LIN-123.

Issue details:
- Title: Add voice toggle
- Label: Feature
- Priority: High`,
});
```

## Tools Required

### Linear MCP

- `mcp__linear-server__list_issues` - Query available tasks

### User Interaction

- `AskUserQuestion` - Multiple choice selection

### Agent Spawning

- `Task` - Spawn task-initializer agent

## Input

None (skill is invoked by user via `/find-task` command)

## Output

- Display of top 5 available tasks
- User selection
- task-initializer agent spawned with Linear issue ID

## Example Output

```
Found 23 tasks in Todo. Here are the top 5 by priority:

[Shows multiple choice with 5 tasks]

User selects: LIN-123: Add voice toggle (Feature, High)

✓ Task selected: LIN-123
✓ Spawning task-initializer agent...
```

## Error Handling

**No Tasks Found**:

```
No tasks found in the Todo column for LeetCare project.
All tasks are either in progress or completed! 🎉
```

**Linear API Error**:

```
Error fetching tasks from Linear: {error message}
Please check your Linear connection and try again.
```

**Fewer than 5 Tasks**:

- Show all available tasks (even if less than 5)
- Don't fail if there are 1-4 tasks

## Edge Cases

**Tasks with Same Priority**:

- Sort by updated date (most recently updated first)

**Very Long Titles**:

- Truncate option label to 80 chars
- Full description shown in description field

**Tasks Without Labels**:

- Show as "No label" in option
- Still include in list

## Next Steps

After user selection, the workflow continues with:

1. task-initializer agent (moves to In Progress, creates branch)
2. research agent (gathers context, asks questions)
3. builder agent (implements feature)
4. /ship skill (commits and creates PR)

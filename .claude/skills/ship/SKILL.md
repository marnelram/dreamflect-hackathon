# Ship Skill

## Purpose

Finalize a completed feature by committing changes with a conventional commit message, moving the Linear issue to "In Review", and creating a pull request. This is the final step in the development workflow.

## Workflow

### 1. Validate Preconditions

Before shipping, verify:

- ✅ Changes exist (git status shows modified/new files)
- ✅ Tests are passing (implied by builder calling this skill)
- ✅ On a feature branch (not on master or dev)
- ❌ No uncommitted changes from previous work

Check git status:

```bash
git status --porcelain
```

If no changes found:

```
No changes to commit. Ensure your feature is complete before shipping.
```

### 2. Get Linear Issue Details

Fetch Linear issue to generate commit message:

```typescript
mcp__linear -
  server__get_issue({
    id: "{LINEAR_ISSUE_ID}",
  });
```

Extract:

- Issue ID (e.g., "LIN-123")
- Issue title
- Issue labels (Feature, Bug, Improvement)

### 3. Create Conventional Commit Message

Format commit message based on label:

**Feature**:

```
feat(LIN-{id}): {title}

{Optional: Additional context if needed}
```

**Bug**:

```
fix(LIN-{id}): {title}

{Optional: Additional context if needed}
```

**Improvement**:

```
improvement(LIN-{id}): {title}

{Optional: Additional context if needed}
```

**Example**:

```
feat(LIN-123): Add voice toggle to scenario interface

Allows users to switch between text and voice modes during scenarios.
Includes rate limit checking and loading states.
```

**Guidelines**:

- Keep first line under 72 characters
- Use imperative mood ("Add" not "Added")
- Include issue ID in scope
- Optional body for additional context (if changes are complex)

### 4. Stage and Commit Changes

```bash
# Stage all changes
git add .

# Commit with conventional message
git commit -m "{commit_message}"
```

Verify commit was successful:

```bash
git log -1 --oneline
```

### 5. Push Branch to Remote

```bash
# Push branch and set upstream
git push -u origin {current_branch}
```

### 6. Move Linear Issue to "In Review"

```typescript
mcp__linear -
  server__update_issue({
    id: "{LINEAR_ISSUE_ID}",
    data: {
      state: "In Review",
    },
  });
```

### 7. Create Pull Request

Use GitHub CLI to create PR:

```bash
gh pr create \
  --title "{Issue Title}" \
  --body "$(cat <<'EOF'
## Summary
{Brief description of changes from Linear issue}

## Changes
{Auto-generated from git log or manual summary}

## Linear Issue
Closes LIN-{id}
{Linear issue URL}

## Testing
- [ ] Tests passing
- [ ] Feature works as expected
- [ ] No TypeScript errors

🤖 Generated via Claude Code development workflow
EOF
)" \
  --reviewer {USER_GITHUB_USERNAME} \
  --base master
```

**PR Title**: Use Linear issue title
**PR Body Template**:

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

**PR Settings**:

- Reviewer: User (Marnel)
- Base branch: `master`
- Auto-fill from Linear issue description

### 8. Output Success Message

```
✓ Changes committed: feat(LIN-123): Add voice toggle to scenario interface
✓ Pushed to origin/{branch-name}
✓ Linear issue LIN-123 moved to In Review
✓ Pull request created: https://github.com/user/repo/pull/{PR_NUMBER}
✓ Reviewer set: {username}

🚀 Task complete! PR ready for review.
```

## Tools Required

### Git Operations

- `Bash` - All git and GitHub CLI commands

### Linear MCP

- `mcp__linear-server__get_issue` - Get issue details
- `mcp__linear-server__update_issue` - Move to In Review

## Input

**From builder agent**:

- Linear issue ID

**Expected state**:

- On feature branch with uncommitted changes
- All tests passing
- Feature complete and ready to ship

## Output

- Git commit created with conventional message
- Changes pushed to remote branch
- Linear issue moved to "In Review" status
- Pull request created and assigned for review
- Success confirmation message

## Error Handling

**No Changes to Commit**:

```
Error: No changes detected. Ensure feature is implemented before shipping.
```

**Not on Feature Branch**:

```
Error: Cannot ship from master/dev branch. Switch to a feature branch first.
```

**Git Push Failed**:

```
Error: Failed to push to remote. Check network connection and permissions.
```

**Linear Update Failed**:

```
Warning: Could not move Linear issue to In Review. Please update manually.
Continuing with PR creation...
```

**PR Creation Failed**:

```
Error: Failed to create PR. Run manually:
  gh pr create --title "..." --body "..." --reviewer {user} --base master
```

**GitHub CLI Not Installed**:

```
Error: GitHub CLI (gh) not found. Install it first:
  https://cli.github.com/
```

## Required Environment

**Git Configuration**:

- Git user.name and user.email configured
- Remote repository configured
- Push access to origin

**GitHub CLI**:

- `gh` installed and authenticated
- Permissions to create PRs
- Repository access

**Linear Access**:

- Linear MCP server configured
- API access to update issues

## Edge Cases

**Large Changesets**:

- If > 50 files changed, ask user to review before committing
- Consider splitting into multiple PRs

**Merge Conflicts**:

- If remote has updates, prompt user to pull and resolve conflicts
- Don't auto-merge or force push

**Existing PR**:

- If PR already exists for this branch, update it instead of creating new one
- Use `gh pr edit` to update title/body

## Important Notes

**DO**:

- ✅ Always use conventional commit format
- ✅ Include Linear issue ID in commit scope
- ✅ Set user as reviewer
- ✅ Link Linear issue in PR body
- ✅ Push to remote before creating PR

**DON'T**:

- ❌ Force push (--force)
- ❌ Push to master/dev directly
- ❌ Create PR without reviewer
- ❌ Skip Linear status update
- ❌ Commit failing tests

## Usage

This skill is automatically called by the builder agent when implementation is complete and all tests pass. It can also be manually invoked:

```
/ship LIN-123
```

Where `LIN-123` is the Linear issue ID.

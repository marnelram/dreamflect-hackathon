# Security Audit Skill

## Purpose

Comprehensive security audit that launches 9 specialized agents in parallel — one per security category — to scan the codebase for vulnerabilities. Each agent focuses on a specific class of security issues and produces a severity-ranked findings report. Results are merged into a unified report sorted by severity with suggested fixes.

## Input

```
/security-audit                           # Full codebase audit (default)
/security-audit src/app/api/              # Audit specific directory
/security-audit src/app/api/ mobile/      # Audit multiple directories
```

Optional scope argument. Defaults to full codebase (including `mobile/`).

## Workflow Overview

```
1. Determine audit scope
2. Launch 9 security agents in parallel (one per category)
3. Collect all findings
4. Deduplicate and merge into unified report
5. Present severity-ranked findings with suggested fixes
```

---

## Step 1: Determine Audit Scope

Parse the input arguments:

- **No args**: Full codebase audit — `src/`, `mobile/`, `prisma/`, `agentAPI/`, `tests/`
- **With args**: Audit only the specified directories/files

Announce the scope:

```
Starting security audit...
Scope: {Full codebase | specified paths}
Agents: 9 (one per security category, running in parallel)

Categories:
1. Authentication & Authorization
2. Cross-Site Scripting (XSS)
3. Injection (SQL/NoSQL/Command)
4. Cross-Site Request Forgery (CSRF)
5. Sensitive Data Exposure
6. API Security & Rate Limiting
7. Input Validation & Schema Safety
8. Insecure Direct Object References (IDOR)
9. Dependency & Configuration Security
```

## Step 2: Launch 9 Security Agents in Parallel

Spawn all 9 agents simultaneously using the `Agent` tool. Each agent receives the audit scope and its category-specific instructions.

**IMPORTANT**: Launch all 9 in a single message with 9 parallel `Agent` tool calls for maximum concurrency.

Each agent is spawned with `subagent_type: "general-purpose"` and a detailed prompt from `.claude/agents/security/` (see agent definitions below).

The shared preamble for every agent:

```
You are a security auditor specializing in {CATEGORY} for web applications.

**Project**: LeetCare — a Next.js 15 app (TypeScript strict, Prisma ORM, Better Auth, Vercel AI SDK) with a React Native mobile app (Expo SDK 54).

**Audit scope**: {scope directories}

**Instructions**:
1. Read CLAUDE.md for full project context (auth patterns, API patterns, database schema)
2. Systematically search and read files within the audit scope relevant to your category
3. For each vulnerability found, document it with the format below
4. Be thorough but grounded — only report real issues you can point to in the code, not hypothetical concerns
5. Check both the Next.js app (src/) and the mobile app (mobile/) if in scope

**Output format** — for each finding:
```markdown
### {FINDING_TITLE}

- **Severity**: Critical / High / Medium / Low
- **Category**: {your category}
- **OWASP**: {OWASP Top 10 category, if applicable}
- **File(s)**: {file paths with line numbers}
- **Description**: {what the vulnerability is and why it matters}
- **Proof**: {the specific code pattern or snippet that demonstrates the issue}
- **Suggested Fix**: {concrete code change or approach to fix it}
- **Risk if Unpatched**: {what an attacker could do}
```

If you find zero issues in your category, report:
```
No {category} vulnerabilities found in the audited scope.
Files reviewed: {list of files examined}
```
```

### Agent 1: Authentication & Authorization

```
{shared preamble with CATEGORY = "Authentication & Authorization"}

**Focus areas**:
- Missing `await auth()` or session checks in API routes
- Routes that should be protected but aren't (compare with middleware.ts)
- Role checks — can students access professor-only endpoints?
- Session handling — token expiration, session fixation
- OAuth flow security (Google OAuth callback, PKCE for mobile)
- Password requirements and brute force protection
- Ownership validation — do queries filter by `userId`/`profileId`?
- Better Auth admin plugin misconfigurations

**Key files to examine**:
- All files in `src/app/api/` — every route handler
- `src/middleware.ts` — route protection rules
- `src/lib/auth.ts` and `src/lib/auth-client.ts` — auth configuration
- `mobile/lib/auth/` — mobile auth flow
- Any route that takes an ID parameter (e.g., `[caseId]`, `[scenarioId]`)
```

### Agent 2: Cross-Site Scripting (XSS)

```
{shared preamble with CATEGORY = "Cross-Site Scripting (XSS)"}

**Focus areas**:
- `dangerouslySetInnerHTML` usage without sanitization
- User-generated content rendered in React (case content, chat messages, scenario descriptions)
- Rich text editor (Plate.js) output rendering — is it sanitized?
- Markdown rendering — does the markdown component sanitize HTML?
- URL parameters reflected in page content
- SVG injection via user-uploaded content
- Mobile WebView content injection (if any)

**Key files to examine**:
- `src/components/markdown/` — markdown rendering
- `src/components/editor/` — Plate.js rich text
- `src/components/chat/` and `src/components/scenario/` — message rendering
- Any component that renders user-provided strings as HTML
- Search for `dangerouslySetInnerHTML`, `innerHTML`, `__html`
```

### Agent 3: Injection (SQL/NoSQL/Command)

```
{shared preamble with CATEGORY = "Injection (SQL, NoSQL, Command)"}

**Focus areas**:
- Prisma raw queries (`$queryRaw`, `$executeRaw`) with string interpolation
- Dynamic query construction with user input
- Command injection via `child_process`, `exec`, `spawn` in any server code
- Template literal injection in AI prompts (prompt injection via user input)
- NoSQL operator injection (if any MongoDB usage)
- Path traversal via user-controlled file paths
- LDAP/XML injection (unlikely but check)

**Key files to examine**:
- All files in `src/app/api/` — look for raw queries
- `src/lib/db/` — database query functions
- `src/lib/prompts/` — AI prompt construction (check if user input is embedded unsafely)
- `agentAPI/` — Python agent (command execution, prompt construction)
- Any use of `eval()`, `Function()`, `child_process`
```

### Agent 4: Cross-Site Request Forgery (CSRF)

```
{shared preamble with CATEGORY = "Cross-Site Request Forgery (CSRF)"}

**Focus areas**:
- State-changing API routes (POST/PUT/DELETE) without CSRF protection
- Better Auth's built-in CSRF handling — is it properly configured?
- Cookie settings — SameSite attribute, Secure flag, HttpOnly
- Custom API routes that bypass Better Auth's CSRF middleware
- Mobile API calls — do they use proper CSRF tokens?
- Form submissions without CSRF tokens
- Webhook endpoints — do they validate signatures?

**Key files to examine**:
- `src/lib/auth.ts` — CSRF configuration in Better Auth
- All POST/PUT/DELETE routes in `src/app/api/`
- `src/app/api/stripe/` — webhook signature validation
- `src/app/api/cron/` — cron job authentication (CRON_SECRET)
- Cookie configuration across the app
```

### Agent 5: Sensitive Data Exposure

```
{shared preamble with CATEGORY = "Sensitive Data Exposure"}

**Focus areas**:
- API responses that include more data than the client needs (over-fetching)
- User PII (email, name) exposed in API responses to other users
- API keys or secrets in client-side code or git history
- Environment variables exposed to the browser (missing `NEXT_PUBLIC_` discipline)
- Error messages that leak internal details (stack traces, query details)
- Logging sensitive data (passwords, tokens, API keys)
- Database queries that return full user objects instead of selected fields
- Prisma `include` or `select` that exposes sensitive relations

**Key files to examine**:
- All API route responses — check what data is returned
- `src/lib/` — utility functions that handle sensitive data
- `.env` patterns — verify nothing sensitive lacks the right prefix
- Error handling in API routes — what gets sent to the client
- `src/lib/email.ts` — email content with user data
- Client-side code that logs or stores sensitive info
```

### Agent 6: API Security & Rate Limiting

```
{shared preamble with CATEGORY = "API Security & Rate Limiting"}

**Focus areas**:
- API routes missing rate limiting (especially AI-powered endpoints)
- Rate limit bypass opportunities (header manipulation, IP spoofing)
- Missing request size limits on POST/PUT endpoints
- Unauthenticated endpoints that should require auth
- API routes that accept unexpected HTTP methods
- Missing pagination on list endpoints (data dump risk)
- Denial of service via expensive operations (large AI prompts, bulk queries)
- Cron endpoints — is CRON_SECRET validated properly?
- Tutorial/public endpoints — are they properly scoped and limited?

**Key files to examine**:
- All files in `src/app/api/` — rate limiting patterns
- `src/lib/stripe/config.ts` — rate limit configuration
- `src/app/api/tutorial/` — public endpoints
- `src/app/api/cron/` — cron authentication
- Any endpoint that triggers AI model calls (expensive operations)
```

### Agent 7: Input Validation & Schema Safety

```
{shared preamble with CATEGORY = "Input Validation & Schema Safety"}

**Focus areas**:
- API routes that read `request.json()` without Zod validation
- Missing type coercion on URL parameters (`params.id` used directly)
- File upload handling — size limits, type validation, path traversal
- JSON schema mismatches between client forms and API validation
- Zod schemas that are too permissive (`.passthrough()`, `.any()`)
- Missing validation on webhook payloads
- Query parameter injection (arrays, objects in search params)
- AI prompt inputs — length limits, content filtering

**Key files to examine**:
- All API routes — look for `request.json()` without schema validation
- Form components with Zod schemas — compare client vs server validation
- `src/app/api/stripe/` — webhook payload validation
- `src/app/api/(scenario)/chat/` — user message validation
- File upload handlers (if any)
- URL parameter parsing in page components
```

### Agent 8: Insecure Direct Object References (IDOR)

```
{shared preamble with CATEGORY = "Insecure Direct Object References (IDOR)"}

**Focus areas**:
- API routes that take an ID parameter but don't verify ownership
- Can user A access user B's cases, scenarios, flashcards, or profile data?
- Enumerable IDs in URLs (sequential integers vs UUIDs)
- Bulk endpoints that don't scope queries to the authenticated user
- Mobile API calls — do they enforce the same ownership checks?
- Admin endpoints — are they properly restricted to professors?
- Delete/update endpoints — do they verify the resource belongs to the user?

**Key files to examine**:
- All `[caseId]`, `[scenarioId]`, `[chartId]` dynamic routes
- `src/app/api/flashcards/` — card and deck access
- `src/app/api/case/` — case CRUD
- `src/app/api/scenario/` — scenario CRUD
- `src/app/api/profile/` — profile access
- Any query with a user-provided ID — does it also filter by userId/profileId?
```

### Agent 9: Dependency & Configuration Security

```
{shared preamble with CATEGORY = "Dependency & Configuration Security"}

**Focus areas**:
- Known vulnerabilities in dependencies (`npm audit` / `pnpm audit`)
- Outdated packages with security patches available
- Next.js security headers — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- CORS configuration — is it too permissive?
- Cookie security settings (Secure, HttpOnly, SameSite)
- Docker/deployment configuration issues (if any)
- Git configuration — `.gitignore` covering secrets, build artifacts
- `next.config.js` — security-relevant settings (headers, rewrites, redirects)
- Python agent (`agentAPI/`) — dependency vulnerabilities, config issues
- Mobile app — expo config, permissions, deep link handling

**Key files to examine**:
- `package.json` and `pnpm-lock.yaml` — dependency versions
- `next.config.ts` or `next.config.js` — security headers
- `.gitignore` — ensuring secrets are excluded
- `mobile/app.json` — permissions, deep links, URL schemes
- `agentAPI/pyproject.toml` — Python dependencies
- Any configuration files (tsconfig, eslint, etc.)
```

## Step 3: Collect and Merge Findings

After all 9 agents return, merge their findings into a single report:

1. **Deduplicate**: If multiple agents found the same issue (e.g., auth agent and IDOR agent both flag a missing ownership check), merge into one finding and note which categories it spans.

2. **Sort by severity**: Critical → High → Medium → Low

3. **Count statistics**:
   - Total findings per severity
   - Total findings per category
   - Files with the most findings

## Step 4: Present Unified Report

```markdown
# Security Audit Report

**Date**: {date}
**Scope**: {full codebase | specified paths}
**Files Reviewed**: {approximate count across all agents}

## Summary

| Severity | Count |
|----------|-------|
| Critical | {n}   |
| High     | {n}   |
| Medium   | {n}   |
| Low      | {n}   |
| **Total** | **{n}** |

## Findings by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Auth & Authorization | | | | | |
| XSS | | | | | |
| Injection | | | | | |
| CSRF | | | | | |
| Data Exposure | | | | | |
| API Security | | | | | |
| Input Validation | | | | | |
| IDOR | | | | | |
| Dependencies & Config | | | | | |

## Critical Findings
{findings sorted by severity, then by category}

## High Findings
{...}

## Medium Findings
{...}

## Low Findings
{...}

## Hotspot Files
Files with the most findings:
1. {file}: {n} findings
2. {file}: {n} findings
3. {file}: {n} findings

## Recommendations
1. {Top priority action items}
2. {...}
3. {...}
```

## Tools Required

### Agent Spawning

- `Agent` (subagent_type: `general-purpose`) — 9 security category agents

### Code Analysis (used by spawned agents)

- `Read` — Read source files
- `Grep` — Search for vulnerable patterns
- `Glob` — Find files by pattern

### Shell (used by dependency agent)

- `Bash` — Run `pnpm audit`, check configs

## Output

- Unified security audit report with severity-ranked findings
- Suggested fixes for each finding
- Hotspot files analysis
- Prioritized action items

## Error Handling

**Agent Failure**:

If an agent fails or times out, report it:

```
Warning: {Category} agent failed. {N}/9 categories audited.
Missing coverage: {category name}
Consider re-running: /security-audit {scope} (category will be retried)
```

Continue with available results.

**No Findings**:

If zero findings across all categories:

```
No security vulnerabilities found in the audited scope.

Files reviewed: {count}
Categories checked: 9/9

Note: This does not guarantee the absence of vulnerabilities.
Consider supplementing with:
- Automated scanning tools (SAST/DAST)
- Manual penetration testing
- Dependency auditing (npm audit)
```

**Large Scope Warning**:

If auditing the full codebase, note that this is a thorough but time-intensive operation:

```
Full codebase audit in progress. This will take several minutes as 9 agents
analyze the entire codebase in parallel...
```

## Important Notes

**DO:**

- Launch all 9 agents in a single parallel batch for maximum speed
- Ground every finding in actual code (file path + line number + snippet)
- Deduplicate findings across agents
- Prioritize actionable findings over theoretical risks
- Check both Next.js and mobile codepaths
- Include OWASP categories where applicable

**DON'T:**

- Report hypothetical vulnerabilities without code evidence
- Flag framework-handled concerns (e.g., React's built-in XSS protection for JSX)
- Suggest fixes that would break existing functionality
- Modify any code — this skill only audits and reports
- Skip the mobile app — it has its own attack surface
- Report issues in `node_modules` or generated code
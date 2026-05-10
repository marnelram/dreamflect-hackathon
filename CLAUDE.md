# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Dreamflect started as a 6-hour Generative UI Hackathon entry and grew into a working app: auth + persistent memory + visible history, evening reflection, real Whisper voice capture, and gpt-image-1 dream art layered under shareable wallpaper PNGs. The core idea is unchanged: the user types one thing — their dream — and Claude Opus 4.7 picks every screen after that by calling frontend tools.

Built with Next.js 15 App Router, CopilotKit v2 (headless), A2UI v0.9, shadcn/ui (Tailwind v4), Better Auth, and Neon Postgres.

The full submission writeup, demo script, and protocol map are in [README.md](README.md). This file is for future-Claude working in the codebase.

## Commands

**Use pnpm, not npm.** The user prefers pnpm; do not run `npm install` or `npm i` against this repo. There is a `.npmrc` with `node-linker=hoisted` so Next.js can resolve `@tailwindcss/postcss` and `@swc/helpers` without pnpm's isolated-module weirdness — keep that file.

```bash
pnpm install
pnpm dev           # http://localhost:3000
pnpm build && pnpm start
```

If you ever see ERESOLVE-style errors (rare — `@copilotkit/runtime` lists an older `@anthropic-ai/sdk` as `peerOptional`), `pnpm install --no-strict-peer-dependencies`. Don't downgrade the SDK to silence it — newer Opus 4.7 features live in current versions.

There is no test suite, no linter wired up, no formatter. Don't add them unless asked.

## Architecture: the one big idea

**The agent doesn't talk. It renders.** No chat bubbles. No assistant text. Every post-capture screen is the result of Claude calling a frontend tool whose `handler` updates local state, which swaps the stage's contents to the matching component. Six `useFrontendTool` registrations (one is conditional) + one A2UI surface = the entire flow.

```
User types/speaks dream
      │
      ▼
agent.addMessage + copilotkit.runAgent
      │
      ▼
Claude (CopilotKit BuiltInAgent, model "anthropic:claude-opus-4-7")
      │
      ▼  one tool call per turn
propose_gap_fill         → GapFill component
propose_sensitivity_flag → SensitivityCheck (only if dream surfaces trauma/grief/ideation/abuse/acute distress)
propose_archetype        → Archetype card (with optional painted symbol overlay)
propose_probe            → Probe (with optional central_image)
propose_interpretation   → Interpret blockquote
emit_takeaway            → A2UI surface rendered by @a2ui/react
```

The whole point of "would this be impossible as a chat?" is that the gap-fill question, the archetype, the probe, the interpretation, and the takeaway are all picked from the user's specific dream at runtime. *Being chased* gets a different probe than *falling*; the literal screen for two different users cannot exist as a static component.

## Rendering pattern: interactive handlers pause via Promise

The orchestrator is `src/components/DreamSession.tsx`. Each `useFrontendTool` uses the `handler` callback (not `render`) to commit the agent's args into local state. Interactive tools (gap-fill, sensitivity, archetype, probe, interpret) **return a Promise that's only resolved when the user clicks** — while the Promise is pending, no tool result is emitted, so the model literally cannot call the next tool. The agent loop is paused on the client. The resolved string becomes the tool result, and the model reads it as the user's response.

```ts
useFrontendTool({
  name: "propose_archetype",
  parameters: z.object({ ... }),
  handler: async (args) => {
    const spec = args as ArchetypeSpec;
    archetypeSpecRef.current = spec;
    setArchetypeSpec(spec);
    setStep("archetype");
    setAwaitingStep(null);
    playTransition();
    return new Promise<string>((resolve) => {
      archetypeResolveRef.current = (confirmed) =>
        resolve(confirmed
          ? "User said: that archetype lands. Move on to the probe."
          : "User said: not quite. Suggest a different archetype.");
    });
  },
});
```

The user-action callback (e.g. `onArchetypeConfirm`) calls the saved `resolveRef`, which emits the tool result and lets the agent loop continue. **Don't add a separate `sendUserMessage(...)` for interactive steps** — the tool result IS the user's response. (Capture is the only step that uses `sendUserMessage`, because there's no in-flight tool to resolve.)

`emit_takeaway` is the only non-interactive tool: it returns `"ok"` immediately and the session ends.

`handler` fires **exactly once per tool invocation** — unlike `render`, which fires multiple times across status transitions. There's a vestigial `commitOnce` still in the file; the active path is `handler`-based. If you add a new tool, use `handler`.

The `render` return value isn't used — we don't render tools inline in a chat thread. State drives a parent-level switch in DreamSession's JSX that mounts the matching `<XxxStep>` inside `<SessionShell>`.

## Loading state between steps

`src/components/steps/Loading.tsx` shows step-aware copy ("listening — sitting with what you said…", "considering — naming the shape…", etc.) while the agent decides what to render next. Wired via:

- `awaitingStep: Exclude<StepKind, "capture"> | null` state in DreamSession
- Each user-action handler (`onCaptureSubmit`, `onGapFillAnswer`, etc.) sets `awaitingStep` to the next expected step **before** triggering the agent — for capture this means calling `sendUserMessage`; for the other steps it means resolving the in-flight tool's Promise
- Each tool's `handler` clears `awaitingStep` when it fires
- DreamSession's JSX gives `awaitingStep` priority — if set, render `<LoadingStep>` instead of the step's own component

If the agent fires a different tool than the one expected (e.g. user submitted a dream and `awaitingStep` was `"gap-fill"` but the agent went to `"sensitivity-check"` instead), the loading state still clears correctly because every handler clears it.

## runAgent retry on streaming JSON parse failure

`copilotkit.runAgent({ agent })` occasionally throws a `SyntaxError` ("Unterminated string in JSON at position N") when the model's streamed tool-call args get truncated mid-string and CopilotKit's internal `JSON.parse` of the partial chunk fails. These are transient SSE-stream blips, not malformed model output.

`sendUserMessage` in `DreamSession.tsx` wraps `runAgent` in a small retry loop:
- Up to 3 total attempts
- Only retries on `SyntaxError` — other errors fail fast (auth, schema, etc. aren't transient)
- Backoff is `300ms * attempt` (300ms, then 600ms)
- The user message is added to `agent.messages` once before the loop, so each retry just re-runs from the same starting point — don't move `addMessage` inside the loop
- On final failure, `setAwaitingStep(null)` bounces the user back to the step they were on instead of leaving them stranded on `<LoadingStep>`

If you see this error fire repeatedly on the *same* step rather than randomly, the fix is in the system prompt or tool schema, not the retry logic — the model is reliably producing bad JSON for that tool and retries won't save it.

## Critical wiring details

**Routes.** `/` is the marketing landing page (`app/page.tsx`, server component) — its CTAs link to `/reflect`. The dream ritual lives at `/reflect` (`app/reflect/page.tsx`, client). Sign-in / sign-up redirect to `/reflect` after success; the history page back-link and the takeaway's "preview evening reflection" link both point at `/reflect` (with `?mode=evening` for the latter).

**Providers wrap the dream ritual, not the layout.** `app/layout.tsx` is a bare server-component shell. `app/reflect/page.tsx` (client) reads `?mode=evening` from `useSearchParams` inside a Suspense boundary, then wraps `<DreamSession>` in `<Providers mode={mode}>`. The landing page (`/`), auth pages (`/signin`, `/signup`), and `/history` don't need CopilotKit context, so they don't get it.

**Single-route runtime.** The CopilotKit v2 runtime route is plain `app/api/copilotkit/route.ts` (no catch-all), constructed with `createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit", mode: "single-route" })`. The provider must set `useSingleEndpoint={true}`. We tried `[[...path]]` with `useSingleEndpoint={false}` and it was unstable under Fast Refresh — single-route mode survives HMR cleanly. **Do not** re-add the catch-all.

`BuiltInAgent + CopilotRuntime` is constructed **fresh per request** so the system prompt can include the user's prior dreams (memory) and the current mode.

**Agent name.** The runtime route registers a single agent under `agents: { default: agent }` and `<CopilotKitProvider>` omits the `agent` prop — CopilotKit picks the lone registered agent automatically. If you ever register a second agent in the runtime, you must add `agent="<name>"` back to the provider so it knows which one to use.

**v2 imports vs v1.** Use `@copilotkit/react-core/v2` (frontend) and `@copilotkit/runtime/v2` (server) — never the bare paths. Don't mix v1 hooks (`useCopilotChat`, `useCopilotAction`) with v2 (`useAgent`, `useFrontendTool`).

**`@copilotkit/shared/v2` does not exist.** Don't try to import `randomUUID` from it — there's an inline polyfill at the top of `DreamSession.tsx`.

**A2UI catalogId substitution.** The agent emits A2UI messages with the literal string `"<basicCatalog.id>"` as the `catalogId`. `DreamSession` does a JSON round-trip with `replaceAll("<basicCatalog.id>", basicCatalog.id)` before handing the messages to `<A2uiTakeawayStep>` → `MessageProcessor`. Skip the substitution and the surface won't render.

**Two database clients.** `src/lib/db.ts` uses `@neondatabase/serverless` (HTTP, edge-friendly) for app queries. `src/lib/auth.ts` uses `pg.Pool` because Better Auth needs it. **Don't import `auth.ts` into edge routes** — the OG image routes use `@neondatabase/serverless` directly to query the takeaway, bypassing the auth library.

**Save hook lives inside the `emit_takeaway` handler.** The handler fires the save POST fire-and-forget, then `/api/sessions` kicks off `gpt-image-1` in the background. The takeaway screen polls `/api/sessions/[id]/status` to know when share buttons can light up. If you move the save call elsewhere, thread the session id forward yourself.

## Sensitivity check (safety pre-empt)

There's a `propose_sensitivity_flag` tool the agent calls after gap-fill if the dream surfaces one of the categories in `SensitivityCategory`: `trauma_replay`, `grief_visitation`, `ideation`, `abuse`, `acute_distress`. It maps to `SensitivityFlagSpec` in `src/lib/types.ts` and renders a soft acknowledgment screen with a continue button. The system prompt instructs the agent to flag *gently*, never pathologize, and only when the dream itself contains the signal — not for ordinary "scary" content.

If you change the `SensitivityCategory` union, also update the prompt's flagging guidance and the screen's category-specific copy.

## Sound design

`src/lib/sfx.ts` exposes synthesized sine-wave SFX with no audio assets:

- `playChime` — generic button tap (auto-fired by `<Button>`'s onClickCapture)
- `playBloom` — mic recording starts
- `playFall` — mic recording ends
- `playTransition` — between agent steps
- `playReveal` — takeaway emerges

The `AudioContext` is created lazily on the first user-gesture call (browser policy). All effects are short, low-volume, and gated by an internal master gain. Don't add asset-based audio — the synthesized minimalism is part of the visual register.

## Visual layers

Every step gets a painterly watercolor backdrop:

- `src/components/StepBackdrop.tsx` maps each `StepKind` to `/public/backdrops/<step>.png`
- These are pre-generated via `scripts/run-backdrops.mjs` (gpt-image-1 with a strict palette + style lock); committed to `/public/`
- `SessionShell` renders `<StepBackdrop step={step} />` absolutely behind the stage content
- The archetype step also overlays a *symbol* image: `src/lib/archetype-image.ts` maps the agent's freeform archetype name → `/public/archetype-<slug>.png` for the canonical 5 (chase, falling, flying, lost-place, test). Returns `null` for unmapped archetypes — the step backdrop alone is the fallback
- CSS keyframes in `globals.css`: `glow-step` (current step pip), `glow-mic` (capture mic), `glow-halo` (ambient ring). All gated by `prefers-reduced-motion: reduce`

## Voice capture (Whisper)

`src/lib/use-audio-recorder.ts` wraps `MediaRecorder`. Two patterns are load-bearing:

1. **Support detection in `useEffect`, not as a render-time const.** SSR renders before `window.MediaRecorder` is reliably present; computing `supported` inside a useEffect avoids the hydration flash that previously showed "voice not supported here" on the first paint. The hook returns `supported: true` optimistically until the effect proves otherwise.
2. **MIME-type negotiation.** Don't hardcode `audio/webm`. Iterate `["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]` and use the first `MediaRecorder.isTypeSupported(...)` accepts. Brave/Safari occasionally reject the bare `audio/webm` we used to pass.

The transcribe endpoint (`/api/transcribe`, Node runtime) accepts multipart audio and forwards to OpenAI Whisper (`whisper-1`). Falls back gracefully (`503` → text mode) if `OPENAI_API_KEY` is missing.

## Share-image OG routes

Three edge-runtime routes serve the dream image, two with typography baked on top and one without:

- `/api/takeaway-og/portrait/[id]` — 1170×2632 iPhone lock-screen wallpaper (typography-overlay over AI image)
- `/api/takeaway-og/square/[id]` — **1080×1080 Instagram feed-square** (typography-overlay; sized so Instagram's CDN doesn't rescale). If you change these dimensions, also re-tune the typography sizes inside that route — the question font, kicker, and subtitle were calibrated for 1080.
- `/api/sessions/[id]/image` — raw gpt-image-1 PNG, no overlay. Used by the in-screen `<DreamImageCard>` preview on the takeaway. Returns 202 while pending, 410 on failed, 200 PNG when ready.

The two `takeaway-og` routes accept two patterns via the `[id]` segment:

- `/portrait/<uuid>` — looks up the saved session, uses the gpt-image-1 b64 as background when `image_status === 'ready'`, otherwise falls back to the dusk-blue gradient
- `/portrait/inline?q=...` — pure typography path, no DB hit. The `inline` literal short-circuits the lookup; used as a fallback when the session save failed but the user still wants to share

A UUID validation regex (`UUID_RE`) gates the DB lookup so the `inline` literal can't accidentally hit Postgres. `next/og` fetches the Fraunces WOFF inline from Google Fonts (cached across requests). All three routes are public-readable — UUIDs are unguessable, and edge runtime can't import `auth.ts` (Better Auth needs `pg.Pool`).

## Takeaway screen specifics

The takeaway is the only step with a multi-pass render. It interleaves the AI dream image with the agent's A2UI surface and stages everything sequentially so gpt-image-1's ~10–15s latency is hidden behind a reveal animation.

1. **One agent surface, two client surfaces.** The agent emits a single A2UI surface shaped `Column[question, evening]`. [`splitTakeawayMessages`](src/components/steps/A2uiTakeaway.tsx) rewrites it into TWO sibling surfaces (`takeaway-q`, `takeaway-e`) at the client boundary so a `<DreamImageCard>` can sit between them. **If you change the agent's `emit_takeaway` A2UI shape (e.g. add a third Text), update the split logic — it expects exactly two children under `root`.** When the split fails (unexpected shape), the component falls back to rendering `takeawaySpec.question` / `evening_line` as plain text and still drops the image card in the middle.

2. **Markdown rendering inside A2UI Text needs a renderer.** A2UI's basic catalog Text component implements `variant: "h1"` by prepending `# ` and asking the surrounding `MarkdownContext` to render it. Without a renderer, basicCatalog falls through to plain text and the literal `# ` leaks into the DOM. We wire it via `<MarkdownContext.Provider value={renderMarkdown}>` from `@a2ui/markdown-it`. The takeaway-specific styling that maps `<h1>` back to italic serif (so it reads as a quiet question, not a chunky heading) lives in `globals.css` under `.takeaway-q-surface :is(h1, h2, h3)`.

3. **Sequential reveal cadence.** Stagger via CSS `animation-delay` on the shared `.reveal-step` class: kicker 0ms → question 300ms → image card 1500ms → evening 3200ms → buttons 3800ms. ~3.8s total. The middle slot for the image is deliberate — by the time the user's eye reaches it, gpt-image-1 has typically already returned. If you adjust timings, keep the image card's reveal delay above ~1s so the skeleton has time to register.

4. **Share/wallpaper button gating.** Buttons are disabled while `imageStatus === "pending"` so an early click doesn't silently download the typography-only fallback. They re-enable on `"ready"` or `"failed"` (failure path uses the OG gradient fallback), and ALSO when `sessionId` is null (save itself failed → `/inline?q=` path). Don't gate on a single condition — both terminal-status and no-sessionId need to open the buttons, otherwise share gets bricked when persistence is down.

## System prompt is load-bearing

`src/lib/system-prompt.ts` exports `buildSystemPrompt({ mode, priorSessions, latestMorning, userName })`, called per-request inside the runtime route. It tells Claude:

- Call exactly ONE tool per turn
- Never write conversational text outside tool args
- The mapping of archetype → probe variable (chase → agency, falling → impact/witness, etc.)
- When to call `propose_sensitivity_flag` (and when not to)
- The exact A2UI message shape to emit for the takeaway

Prepends a `## prior dreams` block when `priorSessions.length > 0`, so Claude can quietly notice "this is the third chase dream this month." Don't put `Date.now()` or anything else volatile in the prompt — it'd defeat any future Anthropic prompt-cache.

If a step misbehaves (e.g. agent answers in plain text instead of calling a tool), the fix is almost always in the prompt, not in the tool schemas.

## Auth, memory, persistence

- **Better Auth**, email + password only. Schema: four tables (`user`, `session`, `account`, `verification`) — generated via `npx @better-auth/cli generate`, applied to Neon via the Neon MCP `run_sql_transaction` tool.
- `src/middleware.ts` redirects unauth-d requests on `/history/*` and `/api/sessions/*` to `/signin`. Everything else is public — including `/`, `/reflect`, `/api/copilotkit/*`, `/api/transcribe/*`, `/api/takeaway-og/*` — so anonymous users can run the dream ritual end-to-end and only get gated when they try to save (the sign-up gate lives inside the takeaway screen).
- `dream_sessions` table holds the saved session JSONB blobs + `image_b64` + `image_status`. UUID PKs are unguessable enough that public read by id is acceptable for v1.

## OpenAI is optional

`src/lib/openai.ts` returns `null` if `OPENAI_API_KEY` isn't set. Both consumers (Whisper transcription and gpt-image-1) check this and degrade gracefully — voice falls back to text-only mode, share images use a typography-only gradient. Don't break this contract; the app should work end-to-end without an OpenAI key.

## Design tokens

`src/app/globals.css` overrides the standard shadcn/ui OKLCH variables with the Dreamflect dusk-blue/cream/coral palette. The values come from the `--a-*` CSS variables (mapped from the original handoff's hex codes). Dark mode is the default (set on `<html>` via `className="dark"` in `app/layout.tsx`) because the wireframe's saved DEFAULTS were dark + coral.

shadcn primitives in `src/components/ui/` were hand-written (not added via `npx shadcn add`). They follow shadcn's "new-york" conventions but are scoped to what the steps actually need.

## Source-of-truth design files (do not edit)

`dreamflect-handoff/` is the original Claude Design export — read-only reference. When matching the wireframe, read `dreamflect-handoff/dreamflect/project/Wireframes Mid-fi.html` and `flow-dreamy.jsx` for the exact layouts and styles, then re-implement in shadcn + Tailwind in `src/components/steps/`.

## Adding a new step

1. Add the spec type in `src/lib/types.ts` and extend the `StepKind` union.
2. Build the component in `src/components/steps/`.
3. Register a `useFrontendTool` in `DreamSession.tsx` with a Zod schema; in the `handler`, set the spec, set `step`, clear `awaitingStep`, optionally call `playTransition()`.
4. Wire the new step into the JSX switch at the bottom of DreamSession (and add it to the `awaitingStep` flow if it's gated by a user action).
5. Add an entry in `LoadingStep`'s `COPY` map and in `StepBackdrop`'s `BACKDROPS` map (drop a backdrop PNG into `/public/backdrops/<slug>.png` — generate via `scripts/run-backdrops.mjs` for visual cohesion).
6. Update `src/lib/system-prompt.ts` with when/why the agent should call the new tool.
7. Bump `total` on `<ProgressDots>` (currently 6).

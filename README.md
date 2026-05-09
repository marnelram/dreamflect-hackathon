# Dreamflect

> A self-reflection app for your dreams. We don't interpret them for you — we help you interpret them yourself.

Dreams are your subconscious sending you messages. Most apps hand you a dictionary entry and call it a day. Dreamflect asks you the right questions — picked for the dream you actually had — until the meaning lands for *you*. The moment of self-recognition is the product.

## The philosophy

There's a spectrum between *"here's what your dream means"* (prescriptive, horoscope) and *"what do you think it means?"* (passive, lazy therapist). Dreamflect lives in the middle: it offers a specific interpretive frame, then asks if it resonates, and welcomes the pushback. The disagreement — *"actually, I think it's more about…"* — is usually where the insight shows up. By that point you're not being interpreted to. You're interpreting.

## A session in six steps

A morning session takes about five minutes.

1. **Capture** — Type or speak your dream while it's fresh. Voice transcription via Whisper; text input is a first-class option, not a fallback.
2. **Gap-fill** — Most people lean either toward specifics (play-by-play of events) or feelings (it felt heavy, suffocating), rarely both. Claude reads what you wrote and asks for the half that's missing. Without it, the categorization step would anchor to the wrong thing.
3. **Recognize** — Claude names the shape of the dream — *being chased, falling, hidden room, social disconnection*, etc. — and shows it as a card with a brief description. You confirm or push back. The taxonomy is internal routing for the AI's question strategy; you don't have to learn it, but the descriptions build dream literacy over time.
4. **Probe** — One archetype-specific unlock question. For chasing dreams, the critical variable is agency and the relationship to the pursuer. For falling, it's about impact and witness. For being-watched, the audience. Each archetype has a different question that gets to the heart of what the subconscious is processing.
5. **Frame** — An interpretive frame, offered. Quote + expansion. Then a 5-point resonance check: *no · sort of · close · yes · exactly*. The picks where users land between extremes are where the model gets to learn what to do better next time.
6. **Takeaway** — One short, portable question to carry into the day. Saved with the session.

The takeaway screen also generates a downloadable wallpaper PNG (gpt-image-1, ~10–15s, fire-and-forget) that overlays the takeaway question on AI-generated dream art.

## Two touchpoints, one rhythm

The morning is the question. The evening is where it lands.

Before bed, Dreamflect quietly asks: *this morning you reflected on a dream about [theme] — did anything today connect?* Dreams process things already happening in waking life, so the odds are high that something during the day rhymed. That's the "oh wait" moment — and the place the deeper "connect the dream to your life" work actually happens, when the user has time and context that the morning constraint doesn't allow. Over weeks, recurring patterns surface on their own ("you've dreamed of falling three times this month — every time it followed a Sunday").

## The archetype framework

Dreamflect's question strategy is anchored to about 18 dream archetypes drawn from common patterns: physical/spatial (*being chased, falling, flying, water, natural disasters, vehicles*), identity/self (*past places, death/transformation, hidden rooms, exposure*), social/performance (*exam, social disconnection, social failure, being watched, meeting a celebrity*), and powerlessness (*unable to speak/move, being lost, losing teeth*). Plus a meta category for recurring dreams and a graceful fallback for purely surreal ones.

The archetypes are an **internal routing system**, not a label the user has to care about. They determine *which* questions get asked, not *what* the dream means.

## Sensitivity

If a dream surfaces trauma, grief, ideation, abuse, or acute distress, Claude pauses on a soft acknowledgment screen before proceeding. Categories live in `SensitivityCategory`. The system prompt's flagging guidance is conservative — it triggers on signals in the dream itself, not on ordinary "scary" content.

## What's in the box

| Capability | What it does |
|---|---|
| **Memory** | Every completed session is saved to Postgres. The next session's system prompt includes the last 5 archetypes + takeaways so Claude can quietly notice "this is the third chase dream this month — the agency variable keeps shifting." |
| **Visible /history** | A page listing every prior takeaway with date + archetype. Memory becomes tangible. |
| **Evening reflection** | A second flow (`/reflect?mode=evening`) that references the morning's takeaway and asks "did anything today rhyme?" Same agent, different system prompt. |
| **Voice capture** | Real Whisper transcription. Browser-agnostic via `MediaRecorder`. Falls back to text-only if `OPENAI_API_KEY` is missing. |
| **Share-as-image** | gpt-image-1 generates atmospheric dream art at save-time. Two share routes (`/api/takeaway-og/{portrait,square}/[id]`) overlay the takeaway question in Fraunces italic via `next/og`. Wallpaper format (1170×2632) + Instagram-square (1080×1080). Falls back to a typography-only gradient if image gen fails. |
| **Auth** | Better Auth with email + password, custom Dreamflect-styled signin/signup. No social, no magic links — direct path to the dream. |

## Stack

- **Next.js 15** App Router + TypeScript
- **Tailwind v4** + **shadcn/ui** (hand-written primitives, Dreamflect OKLCH palette)
- **CopilotKit v2** (headless `useAgent` + `useFrontendTool`, single-route runtime)
- **A2UI v0.9** (`@a2ui/web_core` + `@a2ui/react`) for the takeaway surface
- **Better Auth** (email+password, `pg.Pool` adapter against Neon)
- **Neon Postgres** via `@neondatabase/serverless` (HTTP, edge-friendly)
- **Anthropic Claude Opus 4.7** via CopilotKit's `BuiltInAgent({ model: "anthropic:claude-opus-4-7" })`
- **OpenAI** Whisper (transcription) + gpt-image-1 (dream art) — both optional

## Architecture

```
Browser                                 Next.js                              External
─────────                               ──────────                           ─────────
Providers (mode: morning|evening)  ──▶  /api/copilotkit/route.ts      ──▶   Anthropic Opus 4.7
   │                                       │ (per-request)
   │                                       │   - reads session cookie (Better Auth)
   ├─ useFrontendTool ×6 (gap-fill,        │   - reads ?mode= query
   │   sensitivity, archetype, probe,      │   - fetches prior sessions from Neon
   │   interpret, takeaway)                │   - buildSystemPrompt({mode, priorSessions, latestMorning})
   │                                       │   - new BuiltInAgent + CopilotRuntime per request
   ├─ useAgent.addMessage / runAgent
   └─ takeaway commit triggers:
       └─ POST /api/sessions ───────▶    saveSession (Neon)
                                            └─ fire-and-forget gpt-image-1 ──▶ OpenAI
                                                 └─ writes image_b64 to row

CaptureStep mic button:
   └─ MediaRecorder → POST /api/transcribe ──▶ OpenAI Whisper

Takeaway screen share buttons:
   └─ /api/takeaway-og/{portrait,square}/[id] (edge runtime)
        └─ reads image_b64 + takeaway from Neon (HTTP driver)
        └─ overlays Fraunces italic via next/og ImageResponse

/history (server component) ──▶ getAllSessions(userId) ──▶ Neon
```

The agent doesn't write conversational text — every post-capture screen is the result of Claude calling a frontend tool whose `handler` updates local state, which swaps the stage's contents to the matching component. The system prompt enforces "exactly one tool per turn, no narration."

## Run it

```bash
# Use pnpm — npm conflicts with the existing pnpm-lock.yaml.
pnpm install

# Configure env (see .env.local.example)
# Required: ANTHROPIC_API_KEY, DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
# Optional: OPENAI_API_KEY (enables voice + AI dream images)
cp .env.local.example .env.local
# generate a secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Apply schema once (Better Auth tables + dream_sessions)
# — see scripts/ or apply via Neon MCP / psql
# — Better Auth schema can be generated with: npx @better-auth/cli generate

pnpm dev
# → http://localhost:3000
```

`pnpm` is required because `.npmrc` sets `node-linker=hoisted` so Next.js can resolve `@tailwindcss/postcss` and `@swc/helpers` without isolated-module weirdness.

## Critical files

```
src/
  app/
    api/
      auth/[...all]/route.ts            ← Better Auth catch-all
      copilotkit/route.ts               ← per-request agent (auth + mode + memory)
      sessions/route.ts                 ← POST: persist session, kicks off image gen
      sessions/[id]/status/route.ts     ← image-gen polling
      transcribe/route.ts               ← Whisper
      takeaway-og/portrait/[id]/route.tsx  ← lock-screen wallpaper (edge)
      takeaway-og/square/[id]/route.tsx    ← Instagram square (edge)
    (auth)/signin/page.tsx              ← custom sign-in UI
    (auth)/signup/page.tsx              ← custom sign-up UI
    history/page.tsx                    ← server component, lists prior sessions
    reflect/page.tsx                    ← reads ?mode= and wraps Providers
    page.tsx                            ← marketing landing page
    layout.tsx                          ← bare html shell
    globals.css                         ← Tailwind v4 + Dreamflect OKLCH tokens
  components/
    DreamSession.tsx                    ← orchestrator, 6 useFrontendTool, save hook
    SessionShell.tsx                    ← responsive layout (left rail + stage)
    Providers.tsx                       ← <CopilotKitProvider> with mode prop
    steps/Capture.tsx                   ← mic + transcribe + textarea
    steps/A2uiTakeaway.tsx              ← A2UI renderer + share buttons + evening preview
    steps/{GapFill,Archetype,Probe,Interpret,SensitivityCheck,Loading}.tsx
    ui/                                 ← shadcn primitives
  lib/
    auth.ts                             ← Better Auth instance (pg.Pool → Neon)
    auth-client.ts                      ← createAuthClient + useSession
    db.ts                               ← Neon HTTP client + DB helpers
    openai.ts                           ← singleton OpenAI client (returns null if no key)
    dream-image.ts                      ← gpt-image-1 wrapper, fire-and-forget
    use-audio-recorder.ts               ← MediaRecorder hook
    system-prompt.ts                    ← buildSystemPrompt({mode, priorSessions, latestMorning})
    types.ts                            ← spec types per tool payload
    utils.ts                            ← cn() helper
  middleware.ts                         ← redirects unauth-d to /signin for /history + /api/sessions
scripts/
  genimg.mjs                            ← reusable gpt-image-1 wrapper (CLI + module)
  run-backdrops.mjs                     ← generates static atmospheric backdrops
```

## Known limitations

- **Voice + AI image require `OPENAI_API_KEY`.** Without it, voice falls back to text-only and shared images use a typography-only gradient. The app still works.
- **GPT Image latency (~15s).** Hidden by generating server-side at save-time; the share button polls `/api/sessions/[id]/status` and only enables when ready.
- **GPT Image storage.** ~1.5MB base64 per session in Postgres. At scale, move to Vercel Blob or S3.
- **Live transcription isn't live yet.** Whisper transcribes the full clip after recording stops. Streaming would help users catch mistranscriptions in real-time (e.g., "steampunk" → "steam pump") — a known UX gap, particularly for dreams' unusual vocabulary.
- **Pushback on Recognize is binary.** "Yes" / "Not quite" rather than free-text correction. The design-doc envisions a richer "actually, I think it's more about…" flow.
- **Single user model.** No org accounts, no shared dreams.
- **Evening reflection is manual-trigger.** No real push notifications yet — preview button on the takeaway screen.
- **Multi-dream handling isn't built.** If you describe two dreams that "melted" into each other, the agent treats them as one.

## Origins

Started as a 6-hour Generative UI Hackathon entry (track: *No Designer, No Problem*) — wireframes from `dreamflect-handoff/` (Claude Design export). The hackathon prototype shipped the morning flow as a generative-UI demo: every screen after capture is built at runtime by Claude calling a frontend tool. That mechanism stuck because it lets the gap-fill, archetype, probe, and frame all be picked from your specific dream — a static set of components couldn't do it. Subsequent sessions added auth, persistent memory, the evening reflection loop, voice capture, and AI dream imagery to turn the demo into a working app.

---
name: genimg
description: Use when the user wants to generate, brainstorm, or iterate on an image for the Dreamflect app — e.g. "make me a hero image", "generate a cloud backdrop for the landing page", "I need a moth illustration", "try a different vibe for the takeaway screen", "create an image and drop it in public", or any other ad-hoc image idea during a brainstorming session. Wraps the OpenAI gpt-image-1 generator at scripts/genimg.mjs, stages variants under public/_gen/<slug>/, lets Claude visually pick the best, and (on user approval) promotes the winner to a permanent path in public/.
---

# Generate an image and place it in public/

You are wrapping `scripts/genimg.mjs` to brainstorm imagery for the Dreamflect app. The user describes what they want; you write the prompt, generate variants, view them, recommend, and on approval promote the winner into `public/`.

## Workflow

### 1. Translate the user's idea into a strong prompt

Default style for Dreamflect (override only if the user explicitly asks for something else):

> Soft watercolor on textured paper. Painterly, atmospheric, contemplative.
> Palette (strict): deep dusk blue (#0f1320), cream (#eae5d5), warm coral accents (#e27a4a), muted lifted blue (#8cb0ff). No other colors. Predominantly dusk blue.
> No text, no UI, no frames, no watermarks. Soft edges, gentle gradients, slight paper grain.
> Quiet, dreamy, slightly mythic. Never literal or cartoonish.

Append the user's specific scene description after that base. If they want characters/mascots, allow them — but keep style cues consistent so the new image lives in the same world as the existing `.scratch/images/` set.

Pick a kebab-case slug from the user's intent (e.g. `landing-hero`, `dreamy-cat`, `archetype-keyhole-v2`). Keep slugs descriptive — they end up as filenames.

### 2. Pick size and count

| Use case | `--size` | `--n` |
|---|---|---|
| Phone-frame backdrop / portrait hero | `1024x1536` (default) | 3 |
| Landing-page wide hero / banner | `1536x1024` | 3 |
| Square card / og:image / favicon source | `1024x1024` | 3 |
| Final pass after a winning prompt | (whatever shape) | 1 with `--quality high` |

Default to `--quality medium` (≈$0.06/img) for first passes. Only use `high` (≈$0.19/img) once the user has approved the direction.

### 3. Generate

Always run with `--out public/_gen` so variants stage inside `public/` (referenceable from Next.js immediately) but under a clearly-WIP `_gen` folder.

```powershell
node --env-file=.env.local scripts/genimg.mjs `
  --prompt "<full prompt>" `
  --slug "<slug>" `
  --n 3 `
  --out public/_gen `
  --quality medium `
  --size 1024x1536
```

(For Bash use backslash continuations instead of backticks.)

If the prompt is long, pass it via a here-string to avoid quoting hell:

```powershell
$p = @'
<full prompt here, multi-line ok>
'@
node --env-file=.env.local scripts/genimg.mjs --prompt $p --slug "<slug>" --n 3 --out public/_gen
```

### 4. Review and recommend

Read each generated PNG with the Read tool (Claude Code can view images), then write a short table ranking them. Call out:
- Which best matches the user's intent
- Negative-space placement (matters for content overlay)
- Palette adherence
- Anything weird (text artifacts, extra limbs, palette drift, etc.)

Recommend ONE winner per slug. If none feel right, propose a prompt revision rather than asking the user to settle.

### 5. Promote the winner (only on user approval)

When the user picks one (or accepts your recommendation), move the winner to a permanent path and clean up the rest:

```powershell
Move-Item public/_gen/<slug>/<n>.png public/<slug>.png -Force
Remove-Item public/_gen/<slug> -Recurse -Force
```

Then surface the public path so they can drop it in code:

```tsx
<img src="/<slug>.png" alt="..." />
```

If they want to keep iterating (different prompt, different vibe), DON'T promote yet — re-run with a new slug like `<slug>-v2` so you can compare.

## Things to remember

- **Cost**: `medium` 1024×1536 ≈ $0.06/img. 3 variants ≈ $0.20. Tell the user the rough cost before generating big batches (>6 images).
- **Key**: lives in `.env.local` as `OPENAI_API_KEY`. Always invoke the script with `node --env-file=.env.local ...`.
- **`public/_gen/`** is the staging area. Add to `.gitignore` if it grows; for now, the user manually approves what stays.
- **Style consistency** is the whole point — the existing `.scratch/images/` set defines the painterly world. New images should look like they belong there unless the user asks otherwise.
- **Never invent prompts unilaterally** for high-stakes imagery (logo, hero shot they'll publish). For brainstorm-y "try something dreamy" requests, go ahead and propose.
- **Don't run gpt-image-1 for icons or UI primitives** — those should be hand-coded SVG/Lucide. Reserve generation for atmospheric/illustrative imagery.

## When NOT to use this skill

- The user wants a precise illustration with text, brand marks, exact pixel layout — gpt-image-1 is unreliable at typography and exact composition.
- The user wants UI mockups — that's a Figma/code job, not generation.
- The user wants stock photography — point them to Unsplash or similar instead.

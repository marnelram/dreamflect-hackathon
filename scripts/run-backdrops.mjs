// Generates atmospheric backdrops for each of Dreamflect's 6 steps.
// All prompts share STYLE_BASE so the set feels like one cohesive dream.
//
// Run: node --env-file=.env.local scripts/run-backdrops.mjs
//
// Cost (gpt-image-1, medium quality, 1024x1536): ~$0.06/img × 18 imgs ≈ $1.10.
// Bump to quality: "high" in genimg.mjs (or override here) for finalists.

import { genimg } from "./genimg.mjs";

const STYLE_BASE = `
Soft watercolor backdrop for a mobile app screen. Painterly, atmospheric, contemplative.

Palette (strict): deep dusk blue (#0f1320), cream (#eae5d5), warm coral accents (#e27a4a),
muted lifted blue (#8cb0ff). No other colors. Predominantly dusk blue.

Style rules:
- No characters, no people, no animals, no faces.
- No text, no letters, no UI elements, no frames.
- Generous negative space, especially in the lower two-thirds — this will overlay app content.
- Soft edges, gentle gradients, slight paper grain.
- Quiet, dreamy, slightly mythic. Never literal or cartoonish.
- Portrait orientation, full bleed.
`.trim();

const PROMPTS = [
  {
    slug: "1-capture",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Scene: pre-dawn calm. A vast stillness. Mist drifting low over flat water just before sunrise. ` +
      `The faintest cream glow at the very top horizon. Mostly empty deep dusk blue. ` +
      `Mood: a held breath before the day begins.`,
  },
  {
    slug: "2-gapfill",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Scene: a soft veil of mist parting at the upper edge to reveal an indistinct path forward — ` +
      `a faint trail, a half-seen doorway, or a gap between clouds. ` +
      `Cool dusk blue dominant, with a faint cream halo around the opening. ` +
      `Mood: a gentle question hanging in the air.`,
  },
  {
    slug: "3-archetype",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Scene: a single abstract dream-symbol drifting in soft mist near the upper area — ` +
      `something like a glowing keyhole, an ornate doorway silhouette, or an unfamiliar floating shape. ` +
      `Cream and dusk blue with a hint of warm coral light radiating from the symbol. ` +
      `Mood: mythic, archetypal, hushed reverence.`,
  },
  {
    slug: "4-probe",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Scene: a still pond at twilight reflecting layered clouds. Slight ripples. ` +
      `Slightly more saturated dusk blue, deeper shadows in the corners. ` +
      `Mood: introspective, going inward, the reflection inviting a deeper question.`,
  },
  {
    slug: "5-interpret",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Scene: clouds beginning to part near the upper edge. Soft warm coral-cream light breaking through, ` +
      `washing down across cool dusk blue. A sense of pieces fitting together. ` +
      `Mood: clarity emerging, hopeful, luminous.`,
  },
  {
    slug: "6-takeaway",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Scene: morning has arrived. Soft warm coral-cream light washing over a quiet distant landscape — ` +
      `gentle rolling hills or shoreline, mist clearing. The dusk blue is now a memory at the edges. ` +
      `Mood: calm, resolved, ready to carry the dream into the day.`,
  },
];

const N_PER_PROMPT = 3;

console.log(`Generating ${PROMPTS.length * N_PER_PROMPT} backdrops (${PROMPTS.length} prompts × ${N_PER_PROMPT} variants)...`);
console.log(`Output: .scratch/images/<slug>/`);

const t0 = Date.now();
for (const { slug, prompt } of PROMPTS) {
  const start = Date.now();
  process.stdout.write(`\n→ ${slug} ... `);
  try {
    const paths = await genimg({ prompt, slug, n: N_PER_PROMPT });
    console.log(`${paths.length} files in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    for (const p of paths) console.log(`   ${p}`);
  } catch (err) {
    console.log(`FAILED`);
    console.error(`   ${err.message}`);
  }
}
console.log(`\nTotal: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

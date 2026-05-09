// Generates one painted symbol per dream archetype.
// The archetype list comes from src/lib/system-prompt.ts:
//   chase, falling, flying, lost-place, test.
//
// Style stays cohesive with the 6 backdrops in public/backdrops/.
// Subjects are deliberately abstract / non-figural (mist, feather, doorway,
// book) — gpt-image-1 is unreliable with human figures and we want
// painterly metaphor, not literal illustration.
//
// Run: node --env-file=.env.local scripts/run-archetypes.mjs

import { genimg } from "./genimg.mjs";

const STYLE_BASE = `
Soft watercolor on textured paper. Painterly, atmospheric, contemplative.

Palette (strict): deep dusk blue (#0f1320), cream (#eae5d5), warm coral accents (#e27a4a),
muted lifted blue (#8cb0ff). No other colors. Predominantly dusk blue.

Style rules:
- No human figures, no faces, no people.
- No text, no letters, no UI elements, no frames.
- A single iconic symbol or motif, centered, with very generous empty space around it.
- Soft edges, gentle gradients, slight paper grain.
- Quiet, dreamy, slightly mythic. Painterly metaphor, never literal or cartoonish.
- Square portrait composition, the symbol floating in soft mist.
`.trim();

const PROMPTS = [
  {
    slug: "chase",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Symbol for the CHASE archetype: a swirl of motion-blurred mist trailing across the frame, ` +
      `as if something just passed through. A faint suggestion of urgency frozen in time. ` +
      `Cool dusk blue with a single warm coral wisp. Empty negative space around the motion.`,
  },
  {
    slug: "falling",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Symbol for the FALLING archetype: a single watercolor feather or leaf descending slowly through ` +
      `layered cloud-mist. The feather is centered, drifting down. Soft cream feather against deep dusk blue. ` +
      `A faint warm coral glow far below suggests gentle landing rather than impact.`,
  },
  {
    slug: "flying",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Symbol for the FLYING archetype: a single watercolor feather rising upward on a soft updraft of warm light. ` +
      `Cream-coral light radiating from above, deep dusk blue below. The feather drifts slightly off-center. ` +
      `A sense of weightless ascent. Generous empty sky around it.`,
  },
  {
    slug: "lost-place",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Symbol for the LOST-PLACE archetype: an indistinct ornate doorway or gate emerging from thick mist, ` +
      `slightly off-center. Half-revealed, half-hidden. Cream-coral glow seeping through the doorway opening. ` +
      `Surrounding space is dense dusk-blue mist. The doorway invites without explaining.`,
  },
  {
    slug: "test",
    prompt:
      `${STYLE_BASE}\n\n` +
      `Symbol for the TEST/EXAM archetype: a single closed book or sealed envelope resting on a still ` +
      `dark surface, with a small cream candle glow nearby. Centered, minimal, hushed. ` +
      `Most of the frame is deep dusk blue with very generous negative space. A waiting-room stillness.`,
  },
];

const N_PER = 2; // two variants per archetype so we can pick the better one
const SIZE = "1024x1024"; // square — these will sit centered above text in the Archetype card

console.log(`Generating ${PROMPTS.length * N_PER} archetype symbols (${PROMPTS.length} archetypes × ${N_PER} variants)...`);
console.log(`Output: public/_gen/archetype-<slug>/`);

const t0 = Date.now();
for (const { slug, prompt } of PROMPTS) {
  const start = Date.now();
  process.stdout.write(`\n→ archetype-${slug} ... `);
  try {
    const paths = await genimg({
      prompt,
      slug: `archetype-${slug}`,
      n: N_PER,
      outRoot: "public/_gen",
      size: SIZE,
      quality: "medium",
    });
    console.log(`${paths.length} files in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    for (const p of paths) console.log(`   ${p}`);
  } catch (err) {
    console.log(`FAILED`);
    console.error(`   ${err.message}`);
  }
}
console.log(`\nTotal: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

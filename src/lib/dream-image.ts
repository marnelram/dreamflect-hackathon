import { setSessionImage } from "@/lib/db";
import { getOpenAI } from "@/lib/openai";

const STYLE_BASE = `Soft watercolor illustration evoking a dream archetype. Painterly, atmospheric, contemplative.

Palette (strict): deep dusk blue (#0f1320), cream (#eae5d5), warm coral accents (#e27a4a), muted lifted blue (#8cb0ff). No other colors. Predominantly dusk blue with a cream wash.

Style rules:
- No characters, no people, no animals, no faces.
- No text, no letters, no UI elements, no logos, no frames.
- Generous negative space in the upper third — typography will overlay there.
- Soft edges, gentle gradients, slight paper grain.
- Quiet, dreamy, slightly mythic. Never literal or cartoonish.
- Portrait orientation, full bleed.`;

type Specs = {
  archetype: { name?: string; description?: string } | null;
  takeaway: { question?: string; evening_line?: string } | null;
};

function buildPrompt({ archetype, takeaway }: Specs): string {
  const archetypeName = archetype?.name ?? "an unnamed dream";
  const archetypeDesc = archetype?.description ?? "";
  const question = takeaway?.question ?? "";
  return `${STYLE_BASE}

Scene: a single atmospheric image evoking the archetype "${archetypeName}". ${archetypeDesc}
Mood: the emotional register of the question "${question}".

Composition: portrait, generous empty space at the top half, the visual focus settles in the lower-middle. Calm. Open. The viewer should feel they could overlay one short line of italic serif text across the upper third without the image fighting it.`;
}

/**
 * Generate a dream image via gpt-image-1 and store the b64 in the session row.
 * Runs fire-and-forget — failures are logged and stored as 'failed', never thrown.
 */
export async function generateAndStoreDreamImage(
  sessionId: string,
  specs: Specs
): Promise<void> {
  const openai = getOpenAI();
  if (!openai) {
    // Key missing — fall back: leave image_status as 'pending' (set in saveSession).
    // The OG routes will treat any non-'ready' status as the typography-only path.
    await setSessionImage(sessionId, null, "failed");
    return;
  }

  try {
    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: buildPrompt(specs),
      size: "1024x1536",
      quality: "medium",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json ?? null;
    if (!b64) {
      console.warn(`[dream-image] no b64_json for session ${sessionId}`);
      await setSessionImage(sessionId, null, "failed");
      return;
    }
    await setSessionImage(sessionId, b64, "ready");
  } catch (err) {
    console.error(`[dream-image] generation failed for ${sessionId}`, err);
    await setSessionImage(sessionId, null, "failed");
  }
}

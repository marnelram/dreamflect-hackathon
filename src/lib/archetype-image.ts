/**
 * Map an agent-emitted archetype name (freeform lowercase like "being chased",
 * "falling", "lost place", "test/exam") to a slug used for the painted symbol
 * image at /public/archetype-<slug>.png.
 *
 * Order of checks matters — first match wins. Returns null if the name doesn't
 * fit any of the canonical archetypes; the caller should fall back to no image
 * (the step backdrop is still visible behind).
 */
export type ArchetypeSlug = "chase" | "falling" | "flying" | "lost-place" | "test";

export function archetypeImageSlug(name: string): ArchetypeSlug | null {
  const n = name.toLowerCase();
  if (/(chas|pursu|run)/.test(n)) return "chase";
  if (/fall/.test(n)) return "falling";
  if (/(fly|sour|float|levitat)/.test(n)) return "flying";
  if (/(lost|maze|labyrinth|unfamiliar place|wander)/.test(n)) return "lost-place";
  if (/(test|exam|interview|trial)/.test(n)) return "test";
  return null;
}

export function archetypeImagePath(name: string): string | null {
  const slug = archetypeImageSlug(name);
  return slug ? `/archetype-${slug}.png` : null;
}

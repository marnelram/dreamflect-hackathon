// Reusable image generator for OpenAI's gpt-image-1.
//
// Library usage (from another script):
//   import { genimg } from "./genimg.mjs";
//   await genimg({ prompt, slug: "foo", n: 3 });
//
// CLI usage:
//   node --env-file=.env.local scripts/genimg.mjs \
//     --prompt "soft watercolor moth on cream paper" \
//     --slug landing-hero \
//     --n 3 \
//     --out public/_gen \
//     --quality medium \
//     --size 1024x1536
//
// All flags except --prompt have defaults. Output: <out>/<slug>/1.png, 2.png, ...

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT = "https://api.openai.com/v1/images/generations";

export async function genimg({
  prompt,
  slug,
  n = 3,
  size = "1024x1536",      // portrait by default — good for hero/phone-frame backdrops
  quality = "medium",       // "low" | "medium" | "high" | "auto"
  outRoot = ".scratch/images",
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing — run with: node --env-file=.env.local ...");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: "gpt-image-1", prompt, n, size, quality }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status} ${res.statusText}: ${body}`);
  }

  const data = await res.json();
  const dir = join(outRoot, slug);
  await mkdir(dir, { recursive: true });

  const paths = [];
  for (let i = 0; i < data.data.length; i++) {
    const b64 = data.data[i].b64_json;
    if (!b64) throw new Error(`No b64_json on item ${i} — got keys: ${Object.keys(data.data[i]).join(",")}`);
    const path = join(dir, `${i + 1}.png`);
    await writeFile(path, Buffer.from(b64, "base64"));
    paths.push(path);
  }
  return paths;
}

// ───────────────────────── CLI ─────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = val;
      i++;
    }
  }
  return out;
}

const isCliEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCliEntry) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.prompt) {
    console.log(`Usage:
  node --env-file=.env.local scripts/genimg.mjs \\
    --prompt "..."         (required)
    --slug <name>          (default: "adhoc")
    --n <count>            (default: 3)
    --out <dir>            (default: ".scratch/images")
    --quality <q>          (default: "medium" — low|medium|high|auto)
    --size <WxH>           (default: "1024x1536" — also: 1024x1024, 1536x1024, auto)`);
    process.exit(args.help ? 0 : 1);
  }
  const paths = await genimg({
    prompt: args.prompt,
    slug: args.slug ?? "adhoc",
    n: args.n ? Number(args.n) : 3,
    outRoot: args.out ?? ".scratch/images",
    quality: args.quality ?? "medium",
    size: args.size ?? "1024x1536",
  });
  for (const p of paths) console.log(p);
}

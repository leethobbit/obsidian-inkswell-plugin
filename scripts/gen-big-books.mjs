/**
 * Generate two ~200k-word test books in the dev scratch vault, for testing the
 * Write → Stream view (and anything else that has to scale to a long novel).
 *
 *   Big Book (short scenes)  400 scenes × ~500 words
 *   Big Book (long scenes)    70 scenes × ~2,570 words, plus one 20k-word scene
 *
 * Scenes carry `chapter` (a run of 5), `pov`, `plotlines`, `characters` and
 * `status`, so the stream's filters have something to filter. Prose is
 * deterministic filler with paragraphs, dialogue, italics, bold and the odd
 * to-do marker. Only ever writes into `examples/dev-vault/` (git-ignored);
 * re-running replaces both books. `--remove` deletes them.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vault = join(root, "examples", "dev-vault");
if (!existsSync(vault)) {
  console.error("[big-books] examples/dev-vault not found — run `npm run dev-vault:reset` first.");
  process.exit(1);
}

const BOOKS = [
  { title: "Big Book (short scenes)", scenes: 400, words: 500 },
  { title: "Big Book (long scenes)", scenes: 70, words: 2570, giant: 35 },
];

if (process.argv.includes("--remove")) {
  for (const b of BOOKS) rmSync(join(vault, "Big Books", b.title), { recursive: true, force: true });
  console.log("[big-books] removed");
  process.exit(0);
}

// Deterministic PRNG (mulberry32) so every run produces the same books.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = (
  "the a she he they it was had said went came looked turned door window light dark " +
  "river city morning night rain wind stone road house room table letter voice hand " +
  "eyes face silence harbour market tower bridge lantern smoke glass iron salt ship " +
  "slowly quietly again never always almost before after because while through under " +
  "remembered wondered waited listened answered whispered carried followed opened closed"
).split(" ");
const POVS = ["Mira", "Tobias", "Anwen", "Corin"];
const PLOTLINES = ["The heist", "The letters", "Mira and Tobias", "The flood"];
const CHARACTERS = ["Mira", "Tobias", "Anwen", "Corin", "The Warden", "Old Bess"];
const STATUSES = ["idea", "outline", "draft", "revised", "final"];

function sentence(r) {
  const n = 6 + Math.floor(r() * 14);
  const w = [];
  for (let i = 0; i < n; i++) w.push(WORDS[Math.floor(r() * WORDS.length)]);
  if (r() < 0.12) w[2] = `*${w[2]}*`;
  if (r() < 0.05) w[4] = `**${w[4]}**`;
  const s = w.join(" ");
  return s[0].toUpperCase() + s.slice(1) + ".";
}

function prose(r, target) {
  const paras = [];
  let count = 0;
  while (count < target) {
    let p;
    if (r() < 0.25) {
      p = `"${sentence(r).slice(0, -1)}," ${POVS[Math.floor(r() * POVS.length)]} said.`;
    } else {
      const k = 2 + Math.floor(r() * 4);
      p = Array.from({ length: k }, () => sentence(r)).join(" ");
    }
    if (r() < 0.02) p += " [TODO: check this]";
    paras.push(p);
    count += p.split(/\s+/).length;
  }
  return paras.join("\n\n");
}

const pick = (r, list, max) => {
  const out = new Set();
  const n = 1 + Math.floor(r() * max);
  while (out.size < n) out.add(list[Math.floor(r() * list.length)]);
  return [...out];
};

let total = 0;
for (const book of BOOKS) {
  const r = rng(book.scenes);
  const dir = join(vault, "Big Books", book.title);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "Scenes"), { recursive: true });
  const titles = [];
  let words = 0;
  for (let i = 0; i < book.scenes; i++) {
    const title = `Scene ${String(i + 1).padStart(3, "0")}`;
    titles.push(title);
    const target = book.giant === i ? 20000 : book.words;
    const body = prose(r, target);
    words += body.split(/\s+/).length;
    const fm = [
      "---",
      `chapter: Chapter ${Math.floor(i / 5) + 1}`,
      `pov: ${POVS[Math.floor(r() * POVS.length)]}`,
      "plotlines:",
      ...pick(r, PLOTLINES, 2).map((p) => `  - ${p}`),
      "characters:",
      ...pick(r, CHARACTERS, 3).map((c) => `  - "[[${c}]]"`),
      `status: ${STATUSES[Math.floor(r() * STATUSES.length)]}`,
      "---",
      "",
    ].join("\n");
    writeFileSync(join(dir, "Scenes", `${title}.md`), fm + body + "\n");
  }
  const index = [
    "---",
    "longform:",
    "  format: scenes",
    `  title: ${book.title}`,
    "  workflow: Default Workflow",
    "  sceneFolder: Scenes",
    "  scenes:",
    ...titles.map((t) => `    - ${t}`),
    "  ignoredFiles: []",
    "---",
    "",
  ].join("\n");
  writeFileSync(join(dir, `${book.title}.md`), index);
  total += words;
  console.log(`[big-books] ${book.title}: ${book.scenes} scenes, ~${words.toLocaleString()} words`);
}
console.log(`[big-books] done (~${total.toLocaleString()} words) in examples/dev-vault/Big Books/`);

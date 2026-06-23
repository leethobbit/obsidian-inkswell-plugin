/**
 * Deterministically generate the sample vault's seeded Inkswell telemetry
 * (writingLog: daily words + sprints, plus demo settings and ideas).
 *
 * Deterministic by design — fixed PRNG seed, no Date.now / Math.random — so the
 * committed data.json is reproducible. Telemetry is anchored to END so Track
 * reads "live" around then (see the aging caveat in the sample's _Start Here).
 *
 *   node scripts/gen-sample-data.mjs [outDir]
 *
 * outDir defaults to the bundled sample vault's plugin folder.
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const END = "2026-06-22"; // anchor "today" (a Monday)
const START = "2026-01-05"; // ~24 weeks back

// --- tiny seeded PRNG (mulberry32) ---
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x1a5e11); // fixed seed

function dateKey(d) {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

const start = new Date(`${START}T00:00:00Z`);
const end = new Date(`${END}T00:00:00Z`);

// A deliberate mid-March break week, for realism.
const breakStart = new Date("2026-03-16T00:00:00Z");
const breakEnd = new Date("2026-03-23T00:00:00Z");
// Active streak: every day written, ending on END.
const streakStart = addDays(end, -10); // 11 inclusive days

const daily = {};
const writingDays = [];
for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
  const key = dateKey(d);
  const dow = d.getUTCDay();
  const inBreak = d >= breakStart && d < breakEnd;
  const inStreak = d >= streakStart;

  let write;
  if (inBreak) write = false;
  else if (inStreak) write = true;
  else {
    const p = dow === 0 || dow === 6 ? 0.3 : 0.78; // ~5 days/week
    write = rng() < p;
  }
  if (!write) continue;

  let words = Math.round(220 + rng() * 520);
  if (rng() < 0.16) words += Math.round(300 + rng() * 600); // surge day
  if (key === END) words = 430; // partial "today"
  daily[key] = words;
  writingDays.push(key);
}

// --- sprints: ~14 on real writing days in the last ~11 weeks ---
const sprintPool = writingDays.filter((k) => k >= "2026-04-06");
const sprints = [];
const picks = [];
for (let i = sprintPool.length - 1, taken = 0; i >= 0 && taken < 14; i -= 2, taken++) {
  picks.push(sprintPool[i]);
}
picks.reverse();
for (const key of picks) {
  const morning = rng() < 0.5;
  const hh = morning ? "08" : "20";
  const mm = `${Math.floor(rng() * 50)}`.padStart(2, "0");
  const dur = rng() < 0.6 ? 900 : 1500;
  const elapsed = rng() < 0.25 ? Math.round(dur * (0.6 + rng() * 0.3)) : dur;
  const wpm = 22 + rng() * 20;
  const words = Math.max(120, Math.round((elapsed / 60) * wpm));
  const goal = rng() < 0.7 ? (dur === 900 ? 350 : 600) : null;
  sprints.push({ start: `${key}T${hh}:${mm}:00.000Z`, durationSec: dur, elapsedSec: elapsed, words, goal });
}
sprints.sort((a, b) => a.start.localeCompare(b.start));

const data = {
  settings: {
    defaultCompileFormat: "md",
    showWordCounts: true,
    sceneHeadingLevel: 1,
    dailyWordGoal: 700,
    weeklyWordGoal: 3000,
    monthlyWordGoal: 12000,
    habitDaysPerWeek: 5,
    habitMinWords: 150,
    defaultSprintMinutes: 25,
    defaultSprintWordGoal: 600,
    streakThreshold: 100,
    codexFolder: "Codex",
  },
  writingLog: { daily, baselines: {}, sprints },
  ideas: [
    {
      id: "idea-lattice-hum",
      text: "The lattice hums a different note over each district — Mara can navigate the city blind, by ear alone.",
      created: "2026-06-09T21:14:00.000Z",
      pinned: true,
    },
    {
      id: "idea-coll-lamp",
      text: "What if Coll keeps one unlit lamp on his desk — the only memory he refuses to file?",
      created: "2026-06-18T07:42:00.000Z",
      pinned: false,
    },
  ],
  activeProject: "The Lamplighter's Archive.md",
};

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const outDir =
  process.argv[2] ||
  join(root, "examples", "sample-vault", ".obsidian", "plugins", "inkswell");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "data.json"), JSON.stringify(data, null, 2) + "\n");

const total = Object.values(daily).reduce((a, b) => a + b, 0);
console.log(`[gen-sample-data] wrote ${join(outDir, "data.json")}`);
console.log(`[gen-sample-data] ${Object.keys(daily).length} days, ${total.toLocaleString()} lifetime words, ${sprints.length} sprints (anchored to ${END}).`);

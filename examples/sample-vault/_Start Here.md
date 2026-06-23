# 👋 Start Here — the Inkswell sample project

Welcome. This vault is a **complete, mid-draft novel** so you can see what
Inkswell looks like in real use instead of an empty project. The book is
*[[The Lamplighter's Archive]]* — original fiction, included so the sample is
free to ship (see [licensing](#licensing)).

> [!tip] First time? Do these two things
> 1. **Enable the plugin.** Settings (⚙) → *Community plugins* → turn **off**
>    Restricted Mode → enable **Inkswell**. (A fresh vault starts in Restricted
>    Mode, so community plugins are off until you allow them.)
> 2. **Open the workspace.** Click the **pen-tip ribbon icon** on the left, or
>    run the command *"Open Inkswell projects"* (Ctrl/Cmd-P). Pick
>    **The Lamplighter's Archive** in the project selector at the top.

---

## The five-minute tour

Inkswell is one tab with a **left icon rail**. Each stop does one job:

| Stop | What you'll see in this sample |
|------|-------------------------------|
| **Home** | The project's scene list with per-scene word counts and status colors. Click a scene to open the **Inspector** (status, POV, chapter, characters, word target). |
| **Plan → Beats** | A *Save the Cat!* beat sheet. Several beats are filled in and ticked; later beats are still open — exactly mid-outline. |
| **Plan → Board** | The same scenes as draggable status cards. |
| **Plan → Codex** | The story bible: characters, locations, a world, a concept, and a faction. Open **Mara Vance** to see her profile and the scenes that reference her. |
| **Write** | A distraction-light Live-Preview editor that walks the manuscript in order. Start a **Sprint** from the rail (bottom) and watch the word count tick. |
| **Track** | Word-goal rings, a writing-history chart, a 26-week heatmap, streaks, and sprint stats — all populated from seeded history. |
| **Revise → Log** | The **invisible-revision** decision log: "from now on, assume X" notes, some applied, some pending. |
| **Publish** | The compile pipeline. This project groups scenes into chapters on export — hit compile and read the assembled manuscript. |

---

## How the sample maps to the data

Nothing here is magic — it's all plain Markdown you can inspect:

- **The project** is defined by the `longform:` and `inkswell:` frontmatter on
  [[The Lamplighter's Archive]] (the index note). That one block declares the
  scene order, the word target, the beat sheet, the compile recipe, the series,
  and the revision log.
- **Each scene** lives in [Manuscript/](Manuscript/) with flat frontmatter:
  `status`, `pov`, `chapter`, `act`, `characters`, `location`, `targetWords`.
  Those fields drive the colors, the Inspector, and the Track → Structure tallies.
- **Codex entries** in [Codex/](Codex/) are just notes carrying a `codex:` key.
  Scenes link to them with ordinary `[[wikilinks]]` in their `characters` /
  `location` fields, and the Codex panel finds the references automatically.
- **Sprint and daily-word history** is *not* in these notes — it lives in the
  plugin's `data.json`. That's why it travels with this vault but wouldn't travel
  with a loose folder of chapters.

## Try editing something

The fastest way to feel the loop:

1. Go to **Write**, open scene **02 – What the Light Remembers**, and add a
   sentence. The status-bar word count for today goes up immediately.
2. Open **Track** — today's ring and the history chart reflect your new words.
3. On **Home**, change a scene's status in the Inspector and watch the color and
   the Track → Structure tally update.

> [!warning] About the dates in Track
> The seeded writing history is anchored to **June 2026**, so the *Today / Week /
> Month* rings and the current-streak read "live" around then. Opening this vault
> much later is harmless — the **history chart, heatmap, and sprint list still
> render** — but the rings reset because there are no entries for the real
> current date. Write a few words (step 1 above) and today's ring fills back in.
> Also note the seeded "today" is a **Monday**, so the Week ring starts fresh.

## Licensing

*The Lamplighter's Archive* and all Codex entries here are **original work**
created for this sample and distributed under the same license as the plugin.
No public-domain or third-party text is bundled, so there are no edition,
translation, or jurisdiction concerns — you can ship, fork, or rewrite it freely.

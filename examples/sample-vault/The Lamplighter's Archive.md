---
longform:
  format: scenes
  title: The Lamplighter's Archive
  draftTitle: First Draft
  sceneFolder: Manuscript
  ignoredFiles: []
  scenes:
    - "01 - The Last Lamp on Vesper Row"
    - "02 - What the Light Remembers"
    - "03 - Inspector Coll"
    - "04 - The Undercroft"
    - "05 - A Memory Not Her Own"
    - "06 - The Archivist's Bargain"
    - "07 - Blackout"
inkswell:
  series:
    name: The Lattice Cycle
    order: 1
  goals:
    target: 90000
  compile:
    sceneSteps:
      - id: strip-frontmatter
        options: {}
      - id: remove-comments
        options: {}
      - id: group-by-chapter
        options:
          level: 1
          sceneBreak: "* * *"
    manuscriptSteps:
      - id: trim-blank-lines
        options: {}
    separator: "\n\n"
    targetBasename: Lamplighter - manuscript
    format: md
  beats:
    template: save-the-cat
    assignments:
      opening-image:
        scenes:
          - "01 - The Last Lamp on Vesper Row"
        note: Mara lights the last lamp on her route as the district sleeps — the city's memory kept safe for one more night.
        done: true
      theme-stated:
        note: "A line from her mother: \"Some things are only true while someone remembers them.\""
        done: true
      setup:
        scenes:
          - "01 - The Last Lamp on Vesper Row"
          - "02 - What the Light Remembers"
        note: Establish the Lattice, the lamplighter's trade, and Mara's quiet, unambitious life.
        done: true
      catalyst:
        scenes:
          - "02 - What the Light Remembers"
        note: A lamp shows Mara a memory that cannot be hers — a room she has never entered.
        done: true
      debate:
        scenes:
          - "03 - Inspector Coll"
        note: Report the anomaly and stay safe, or keep it secret and chase it? Coll's arrival forces the question.
      break-into-2:
        scenes:
          - "04 - The Undercroft"
        note: Mara descends into the sealed Undercroft to find where stray memories drain to.
      midpoint:
        scenes:
          - "05 - A Memory Not Her Own"
        note: False victory — she finds the Archive, and learns it has been waiting for someone who can read it.
      all-is-lost:
        scenes:
          - "07 - Blackout"
        note: The district goes dark. Every lamp on Vesper Row is wiped at once.
  revisions:
    - id: rev-lamplight-stores
      text: "From now on, lamplight stores memory — it doesn't merely illuminate. Treat earlier \"light\" references as retroactively true."
      scene: "02 - What the Light Remembers"
      status: applied
      created: "2026-03-14T09:12:00.000Z"
    - id: rev-coll-knows-mara
      text: From now on, Inspector Coll already knew Mara years ago, from before the Undercroft was sealed.
      scene: "03 - Inspector Coll"
      status: pending
      created: "2026-05-02T18:40:00.000Z"
    - id: rev-archive-sentient
      text: The Archive is sentient. Assume every reference to it implies intent, not just storage.
      scene: null
      status: pending
      created: "2026-06-10T20:05:00.000Z"
---

# The Lamplighter's Archive

> *Book One of [[Aszmar|The Lattice Cycle]].*

This is the **project index** — Inkswell reads the `longform` and `inkswell`
blocks above to assemble the project. You normally never edit this by hand;
the panels (Plan, Write, Track, Publish) write to it for you.

Open the **Inkswell** view (pen-tool ribbon icon, or the command
*"Open Inkswell projects"*) and this project will be listed. New here? Start
with [[_Start Here]].

## Logline

A lamplighter who tends the memory-lamps of a sleeping city lights one that
shows her a memory she never lived — and follows it down into the sealed Archive
the city has spent a generation pretending to forget.

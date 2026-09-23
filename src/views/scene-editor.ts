/**
 * The manuscript editing surface: a CodeMirror 6 editor with Live-Preview-style
 * Markdown rendering. Content is always styled (italic/bold/heading/etc.), and the
 * syntax markers (`*`, `**`, backticks, heading `#`s, quote `>`) are hidden until a
 * selection sits on the construct — then they reappear (dimmed) so you can edit
 * them. This keeps the surface fully ours: it uses only the CM6 packages Obsidian
 * already provides at runtime (view/state/commands), with no new bundled dependency
 * and no reliance on Obsidian's private editor internals.
 *
 * The scanning + hide/reveal logic is a pure function (`lib/markdown-syntax.ts`)
 * so it can be unit-tested without a DOM; this module is just the CM adapter:
 * intents → decorations, with hidden markers made atomic so the cursor steps over
 * them. Styling lives in styles.css against the `cm-md-*` classes.
 */

import {
  CompletionContext,
  CompletionResult,
  autocompletion,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  Compartment,
  EditorSelection,
  EditorState,
  RangeSet,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  GutterMarker,
  ViewPlugin,
  ViewUpdate,
  gutter,
  keymap,
  scrollPastEnd,
  tooltips,
} from "@codemirror/view";
import { MarkKind, toggleInlineMark } from "../lib/inline-format";
import {
  LinkCandidate,
  completionText,
  linkContextAt,
  rankCandidates,
} from "../lib/link-complete";
import { Sel, buildSyntaxIntents } from "../lib/markdown-syntax";
import { formatMilestone, milestoneOffsets } from "../lib/milestones";
import { PlaceholderKind, PLACEHOLDER_TEMPLATES } from "../lib/placeholders";
import { TypographyRules, smartTypography } from "../lib/smart-typography";
import { wikilinkAt } from "../lib/wikilinks";

function buildDecorations(view: EditorView): { all: DecorationSet; hidden: DecorationSet } {
  const sels: Sel[] = view.state.selection.ranges.map((r) => ({ from: r.from, to: r.to }));
  const intents = buildSyntaxIntents(view.state.doc.toString(), sels);

  const all = [];
  const hidden = [];
  for (const it of intents) {
    if (it.type === "hide") {
      const d = Decoration.replace({});
      all.push(d.range(it.from, it.to));
      hidden.push(d.range(it.from, it.to));
    } else if (it.type === "line") {
      // Block classification (heading / quote / hr / first paragraph / HTML
      // alignment) for the manuscript-typography CSS; never atomic.
      all.push(Decoration.line({ class: it.cls }).range(it.from));
    } else {
      all.push(
        Decoration.mark({ class: it.cls, attributes: it.attrs }).range(it.from, it.to)
      );
    }
  }
  return { all: Decoration.set(all, true), hidden: Decoration.set(hidden, true) };
}

const markdownHighlighter = ViewPlugin.fromClass(
  class {
    all: DecorationSet;
    hidden: DecorationSet;
    constructor(view: EditorView) {
      const d = buildDecorations(view);
      this.all = d.all;
      this.hidden = d.hidden;
    }
    update(u: ViewUpdate): void {
      // Selection changes drive marker hide/reveal, so rebuild on both.
      if (u.docChanged || u.selectionSet) {
        const d = buildDecorations(u.view);
        this.all = d.all;
        this.hidden = d.hidden;
      }
    }
  },
  { decorations: (v) => v.all }
);

// Make the currently-hidden markers atomic so cursor motion skips over the
// collapsed ranges in one step instead of landing in a zero-width gap.
const atomicMarkers = EditorView.atomicRanges.of(
  (view) => view.plugin(markdownHighlighter)?.hidden ?? Decoration.none
);

// Transient "flash" highlight used when navigating to a to-do from the Todos
// panel: a single mark over the token that auto-clears (see `flashRange`).
const setFlash = StateEffect.define<{ from: number; to: number } | null>();

const flashField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setFlash)) {
        deco =
          e.value && e.value.to > e.value.from
            ? Decoration.set([
                Decoration.mark({ class: "cm-todo-flash" }).range(e.value.from, e.value.to),
              ])
            : Decoration.none;
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Typewriter mode: keep the caret's line vertically centered as you type or move
 * with the keyboard. A `transactionExtender` attaches CM's own
 * `scrollIntoView(pos, { y: "center" })` effect to the same transaction, so it
 * rides the normal update (no second dispatch, no fight with the default
 * "scroll the cursor into view" behavior — an explicit effect wins over the
 * flag). Pointer selections are excluded so a mouse click doesn't yank the
 * page; programmatic reseeds carry no user event and are ignored too.
 * `scrollPastEnd` adds the bottom padding that lets the last line reach center.
 * Lives in a Compartment so Settings can flip it on a live editor without a
 * rebuild (which would discard undo history).
 */
const typewriterCompartment = new Compartment();

const typewriterExt = [
  EditorState.transactionExtender.of((tr) => {
    if (!tr.docChanged && !tr.selection) return null;
    if (tr.isUserEvent("select.pointer")) return null;
    const drives =
      tr.isUserEvent("input") ||
      tr.isUserEvent("delete") ||
      tr.isUserEvent("move") ||
      tr.isUserEvent("select") ||
      tr.isUserEvent("undo") ||
      tr.isUserEvent("redo");
    if (!drives) return null;
    return {
      effects: EditorView.scrollIntoView(tr.newSelection.main.head, { y: "center" }),
    };
  }),
  scrollPastEnd(),
];

/** Turn typewriter mode on/off for a live editor (recenters when turning on). */
export function setTypewriter(view: EditorView, on: boolean): void {
  view.dispatch({
    effects: [
      typewriterCompartment.reconfigure(on ? typewriterExt : []),
      ...(on ? [EditorView.scrollIntoView(view.state.selection.main.head, { y: "center" })] : []),
    ],
  });
}

/** Live-read editor preferences (see WritePanel.applyEditorPrefs for the push side). */
export interface EditorPrefs {
  /** Keep the caret line vertically centered (typewriter scrolling). */
  typewriter: boolean;
  /** Book-style paragraph indents / centered headings (CSS via `is-manuscript`). */
  manuscript: boolean;
  /** Gutter tag every N words of the scene (0 = off). */
  milestoneWords: number;
}

/**
 * Milestone gutter: a small tag in the left gutter on the line where the
 * scene's running word count passes each multiple of N ("500", "1k", "1.5k").
 * Recomputed on every doc change (one tokenizer pass, the same cost class as
 * the topbar count) and on an explicit refresh effect when the setting
 * changes. The gutter sits INSIDE the centered 90ch editor box, so it never
 * fights the layout; with no markers it renders no elements and takes no width.
 */
const milestoneRefresh = StateEffect.define<null>();

class MilestoneMarker extends GutterMarker {
  constructor(readonly words: number) {
    super();
  }
  eq(other: MilestoneMarker): boolean {
    return other.words === this.words;
  }
  toDOM(): Node {
    const el = createSpan({ cls: "cm-milestone", text: formatMilestone(this.words) });
    el.title = `${this.words.toLocaleString()} words`;
    return el;
  }
}

// `RangeSet.empty` is typed RangeSet<any>; a typed empty set keeps the lint gate clean.
const NO_MARKERS: RangeSet<GutterMarker> = RangeSet.of<GutterMarker>([]);

function computeMilestones(state: EditorState, every: number): RangeSet<GutterMarker> {
  if (every <= 0) return NO_MARKERS;
  const doc = state.doc;
  // Several milestones on one (long) line → keep the highest.
  const byLine = new Map<number, number>();
  for (const m of milestoneOffsets(doc.toString(), every)) {
    const from = doc.lineAt(m.offset).from;
    byLine.set(from, Math.max(byLine.get(from) ?? 0, m.words));
  }
  const ranges = [...byLine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([from, words]) => new MilestoneMarker(words).range(from));
  return RangeSet.of(ranges, true);
}

function hasRefresh(u: ViewUpdate): boolean {
  return u.transactions.some((tr) => tr.effects.some((e) => e.is(milestoneRefresh)));
}

function milestoneGutter(getEvery: () => number) {
  const plugin = ViewPlugin.fromClass(
    class {
      markers: RangeSet<GutterMarker>;
      constructor(view: EditorView) {
        this.markers = computeMilestones(view.state, getEvery());
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || hasRefresh(u)) this.markers = computeMilestones(u.state, getEvery());
      }
    }
  );
  return [
    plugin,
    gutter({
      class: "cm-milestone-gutter",
      markers: (view) => view.plugin(plugin)?.markers ?? NO_MARKERS,
      lineMarkerChange: (u) => u.docChanged || hasRefresh(u),
    }),
  ];
}

/** Recompute the milestone gutter now (after the setting changed). */
export function refreshMilestones(view: EditorView): void {
  view.dispatch({ effects: milestoneRefresh.of(null) });
}

/**
 * `[[` link completion. Typing `[[` (or anything after it) opens a popup of
 * codex entries (name and aliases), the project's scenes, then other notes,
 * ranked by the pure `rankCandidates`. Ranking is ours, so CM's own filter is
 * off and the source re-runs on every keystroke. Accepting writes `Name]]`
 * (or `Name|alias]]`), skipping a `]]` the writer already typed. Tooltips are
 * fixed-positioned so the popup escapes the scroller's overflow clipping.
 */
function linkCompletion(getCandidates: () => LinkCandidate[]) {
  const source = (ctx: CompletionContext): CompletionResult | null => {
    const line = ctx.state.doc.lineAt(ctx.pos);
    const lc = linkContextAt(line.text, ctx.pos - line.from);
    if (!lc) return null;
    const ranked = rankCandidates(lc.query, getCandidates());
    if (ranked.length === 0) return null;
    return {
      from: line.from + lc.from,
      filter: false,
      options: ranked.map((c) => ({
        label: c.alias ? `${c.alias}  →  ${c.name}` : c.name,
        detail: c.detail,
        type: c.kind,
        apply: (view: EditorView, _c: unknown, from: number, to: number) => {
          const text = completionText(c);
          const alreadyClosed = view.state.sliceDoc(to, to + 2) === "]]";
          const insert = alreadyClosed ? text.slice(0, -2) : text;
          const anchor = from + insert.length + (alreadyClosed ? 2 : 0);
          view.dispatch({
            changes: { from, to, insert },
            selection: { anchor },
            userEvent: "input.complete",
            scrollIntoView: true,
          });
        },
      })),
    };
  };
  return [
    autocompletion({
      override: [source],
      icons: false,
      activateOnTyping: true,
      defaultKeymap: true,
      tooltipClass: () => "inkswell-linkcomplete",
    }),
    tooltips({ position: "fixed" }),
  ];
}

/**
 * Select a range, scroll it into view, and flash it briefly — the editor-side of
 * "click a to-do in Revise → jump here and show me which one". Offsets are clamped
 * to the document; the flash clears itself after a beat.
 */
export function flashRange(view: EditorView, from: number, to: number): void {
  const len = view.state.doc.length;
  const a = Math.max(0, Math.min(from, len));
  const b = Math.max(a, Math.min(to, len));
  view.dispatch({
    selection: { anchor: a, head: b },
    effects: setFlash.of({ from: a, to: b }),
    scrollIntoView: true,
  });
  view.focus();
  window.setTimeout(() => {
    try {
      view.dispatch({ effects: setFlash.of(null) });
    } catch {
      /* editor was destroyed before the flash cleared — ignore */
    }
  }, 1200);
}

/**
 * Insert a to-do marker. With no selection, drops the empty template and lands the
 * cursor inside it (ready to type). With a selection, WRAPS it as the marker's
 * content — `[KIND: <selection>]` — so you can tag existing text in place.
 * Refocuses the editor so a toolbar-button insertion doesn't strand focus.
 */
export function insertPlaceholder(view: EditorView, kind: PlaceholderKind): void {
  const tpl = PLACEHOLDER_TEMPLATES[kind];
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  if (selected) {
    const open = tpl.text.slice(0, tpl.cursor); // e.g. "[TODO: "
    const insert = `${open}${selected}]`;
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + open.length, head: from + open.length + selected.length },
    });
  } else {
    view.dispatch({
      changes: { from, to, insert: tpl.text },
      selection: { anchor: from + tpl.cursor },
    });
  }
  view.focus();
}

/** Host callbacks a shortcut or editor event may need beyond the editor itself. */
export interface EditorShortcutHooks {
  /** Log a revision issue for the open scene (Mod-Shift-L). */
  onLogIssue?: () => void;
  /** Create a codex entry from the selection / word at the cursor (Mod-Shift-C). */
  onQuickCodex?: () => void;
  /** Follow a wikilink (Mod-click on it, or the open-link command). */
  onOpenLink?: (linktext: string) => void;
  /** The pointer entered a rendered wikilink (drives Obsidian's Page Preview). */
  onHoverLink?: (e: MouseEvent, el: HTMLElement, linktext: string) => void;
}

/** The `.cm-md-link` element under an event target, if any. */
function linkElementAt(target: EventTarget | null): HTMLElement | null {
  const node = target as Node | null;
  if (!node) return null;
  const el = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
  return el?.closest<HTMLElement>(".cm-md-link") ?? null;
}

/** The wikilink under the main cursor, as Obsidian linktext, or null. */
export function linkAtCursor(view: EditorView): string | null {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return wikilinkAt(line.text, head - line.from)?.linktext ?? null;
}

/** One editor-local keyboard shortcut, in a form both CM and Obsidian can bind. */
export interface EditorShortcut {
  /** Obsidian-style modifiers (`Scope.register`); joined with `-` for CM. */
  modifiers: ("Mod" | "Shift")[];
  /** Lower-case key name. */
  key: string;
  run: (view: EditorView, hooks: EditorShortcutHooks) => void;
}

/**
 * Every keyboard shortcut local to the manuscript editor. ONE table, bound two
 * ways: as a CM keymap inside the editor, AND — by the Write panel — as an
 * Obsidian `Scope` pushed while the editor is focused. Both are needed:
 * Obsidian's hotkey manager is a window-level capture listener that consumes
 * any keydown matching a registered hotkey (Mod-B → toggle bold, Mod-Shift-T →
 * undo close tab, …) BEFORE the event reaches CodeMirror, even when the bound
 * command can't run here. The pushed Scope wins over those global hotkeys; the
 * CM keymap covers combos Obsidian has no binding for (and keeps the editor
 * self-contained). Add a shortcut here and it lands in both.
 */
export const EDITOR_SHORTCUTS: EditorShortcut[] = [
  { modifiers: ["Mod"], key: "b", run: (v) => formatSelection(v, "bold") },
  { modifiers: ["Mod"], key: "i", run: (v) => formatSelection(v, "italic") },
  { modifiers: ["Mod", "Shift"], key: "t", run: (v) => insertPlaceholder(v, "todo") },
  { modifiers: ["Mod", "Shift"], key: "r", run: (v) => insertPlaceholder(v, "research") },
  { modifiers: ["Mod", "Shift"], key: "d", run: (v) => insertPlaceholder(v, "dialogue") },
  { modifiers: ["Mod", "Shift"], key: "s", run: (v) => insertPlaceholder(v, "scene") },
  { modifiers: ["Mod", "Shift"], key: "n", run: (v) => insertPlaceholder(v, "note") },
  { modifiers: ["Mod", "Shift"], key: "l", run: (_v, hooks) => hooks.onLogIssue?.() },
  { modifiers: ["Mod", "Shift"], key: "c", run: (_v, hooks) => hooks.onQuickCodex?.() },
];

/**
 * Toggle bold / italic / strikethrough on every selection range — the Write
 * editor's equivalent of Obsidian's `editor:toggle-*` commands, which can't
 * reach this surface (they need a MarkdownView). The transform is the pure
 * `toggleInlineMark`; each range's change is computed against the ORIGINAL doc,
 * which is exactly what `changeByRange` expects (it maps later ranges itself).
 * A backwards selection stays backwards. Refocuses so a menu/palette invocation
 * doesn't strand focus.
 */
export function formatSelection(view: EditorView, kind: MarkKind): boolean {
  const doc = view.state.doc.toString();
  const spec = view.state.changeByRange((range) => {
    const r = toggleInlineMark(doc, range.from, range.to, kind);
    const sel =
      range.anchor > range.head
        ? EditorSelection.range(r.head, r.anchor)
        : EditorSelection.range(r.anchor, r.head);
    return { changes: { from: r.from, to: r.to, insert: r.insert }, range: sel };
  });
  view.dispatch(spec, { userEvent: "input.format", scrollIntoView: true });
  view.focus();
  return true;
}

/**
 * Smart typography as an input handler: a single typed `-`, `.`, `"` or `'`
 * may be replaced by a dash/ellipsis/curly quote (rules in
 * `lib/smart-typography.ts`). An input handler — not a transaction filter —
 * because it sees only DOM user input (never our own reseeds/inserts/undo) and
 * can consult the live composition state. Bails during IME composition (Android,
 * CJK), for replacements (autocorrect), and with multiple cursors. The
 * replacement is tagged `input.type` so it undoes with the surrounding typing.
 */
function smartTypographyHandler(getRules: () => TypographyRules) {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (view.composing) return false;
    if (from !== to || view.state.selection.ranges.length !== 1) return false;
    const main = view.state.selection.main;
    if (!main.empty || main.from !== from) return false;
    const r = smartTypography(view.state.doc.toString(), from, text, getRules());
    if (!r) return false;
    view.dispatch({
      changes: { from: r.from, to: r.to, insert: r.insert },
      selection: { anchor: r.from + r.insert.length },
      userEvent: "input.type",
      scrollIntoView: true,
    });
    return true;
  });
}

export interface SceneEditorOptions {
  parent: HTMLElement;
  doc: string;
  /** Fired after any document change (for live word counts). */
  onChange: () => void;
  /** Fired when the editor loses focus (to flush a save; the host pops its hotkey Scope). */
  onBlur: () => void;
  /** Fired when the editor gains focus (the host pushes its hotkey Scope). */
  onFocus?: () => void;
  /** Fired by the Mod-Shift-L shortcut to log a revision issue for this scene. */
  onLogIssue?: () => void;
  /** Fired by the Mod-Shift-C shortcut to create a codex entry from the selection. */
  onQuickCodex?: () => void;
  /** Fired by Mod-click on a rendered wikilink. */
  onOpenLink?: (linktext: string) => void;
  /** Fired when the pointer enters a rendered wikilink. */
  onHoverLink?: (e: MouseEvent, el: HTMLElement, linktext: string) => void;
  /**
   * Live smart-typography rules, read on every candidate keystroke (so a
   * Settings change applies without rebuilding the editor). Omit to disable.
   */
  getTypography?: () => TypographyRules;
  /**
   * Editor preferences read at creation (typewriter compartment seed). Later
   * changes are pushed via `setTypewriter` / the host's `is-manuscript` class.
   */
  getPrefs?: () => EditorPrefs;
  /** Candidates for `[[` completion, read when the popup opens (omit to disable). */
  getLinkCandidates?: () => LinkCandidate[];
}

/** Create a manuscript editor bound to `parent`, seeded with `doc`. */
export function createSceneEditor(opts: SceneEditorOptions): EditorView {
  return new EditorView({
    parent: opts.parent,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        history(),
        // Editor-local shortcuts (see EDITOR_SHORTCUTS — the Write panel binds
        // the same table as an Obsidian Scope). Listed first so they win.
        keymap.of(
          EDITOR_SHORTCUTS.map((s) => ({
            key: [...s.modifiers, s.key].join("-"),
            run: (view: EditorView) => {
              s.run(view, opts);
              return true;
            },
            stopPropagation: true,
          }))
        ),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        ...(opts.getTypography ? [smartTypographyHandler(opts.getTypography)] : []),
        typewriterCompartment.of(opts.getPrefs?.().typewriter ? typewriterExt : []),
        ...milestoneGutter(() => opts.getPrefs?.().milestoneWords ?? 0),
        ...(opts.getLinkCandidates ? linkCompletion(opts.getLinkCandidates) : []),
        EditorView.lineWrapping,
        markdownHighlighter,
        atomicMarkers,
        flashField,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange();
        }),
        EditorView.domEventHandlers({
          focus: () => {
            opts.onFocus?.();
            return false;
          },
          blur: () => {
            opts.onBlur();
            return false;
          },
          // Mod-click follows a wikilink; a plain click keeps editing semantics
          // (prose is never hijacked by a mis-click). Consumed so CM's own
          // Mod-click (add a cursor) doesn't also fire.
          mousedown: (e) => {
            if (e.button !== 0 || !(e.ctrlKey || e.metaKey)) return false;
            const el = linkElementAt(e.target);
            if (!el) return false;
            e.preventDefault();
            opts.onOpenLink?.(el.dataset["link"] ?? "");
            return true;
          },
          mouseover: (e) => {
            const el = linkElementAt(e.target);
            if (el) opts.onHoverLink?.(e, el, el.dataset["link"] ?? "");
            return false;
          },
        }),
      ],
    }),
  });
}

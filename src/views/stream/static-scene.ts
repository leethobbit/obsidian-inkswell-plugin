/**
 * A scene drawn as plain HTML, exactly as the manuscript editor draws it, for
 * the stream's scenes that aren't being edited.
 *
 * Why not a read-only CodeMirror: CodeMirror only draws the lines near the
 * visible area and ESTIMATES the height of the rest, and for wrapped prose its
 * estimates are off by about a quarter. Inside the stream (where the page
 * scrolls, not the editor) every correction moved the text being read —
 * measured at ~450px jumps while scrolling. Plain HTML is laid out by the
 * browser at its real height, so there is nothing to correct.
 *
 * Same look: the markup copies CodeMirror's wrapper elements and class names
 * (read once from a throwaway view, so CodeMirror's own stylesheet applies),
 * and the line and span classes come from the same `buildSyntaxIntents` the
 * editor decorates with (via the pure `staticLines`) — with no caret, so
 * every marker is hidden.
 */

import { EditorView } from "@codemirror/view";
import { MarkerSet } from "../../lib/placeholders";
import { staticLines } from "../../lib/static-lines";

/** CodeMirror's wrapper classes (theme-scoped), per document (a popout has its own). */
interface CmShell {
  editor: string;
  scroller: string;
  content: string;
}

const shells = new WeakMap<Document, CmShell>();

function cmShell(parent: HTMLElement): CmShell {
  const doc = parent.doc;
  const cached = shells.get(doc);
  if (cached) return cached;
  const host = parent.createDiv({ cls: "inkswell-stream__probe" });
  const view = new EditorView({
    parent: host,
    extensions: [EditorView.lineWrapping, EditorView.editable.of(false)],
  });
  const shell: CmShell = {
    editor: view.dom.className,
    scroller: view.scrollDOM.className,
    content: view.contentDOM.className,
  };
  view.destroy();
  host.remove();
  shells.set(doc, shell);
  return shell;
}

export interface StaticScene {
  /** The `.cm-editor` root. */
  readonly el: HTMLElement;
  /** The document offset at a screen point on the text (nearest line edge beside it). */
  posAt(x: number, y: number): number | null;
  /** The offset at horizontal `x` on the first or last visual line (arrowing in). */
  edgePos(x: number, edge: "first" | "last"): number | null;
  /** The line element at screen height `y`, for keeping the page steady. */
  lineAt(y: number): HTMLElement | null;
}

/** Draw `text` into `parent`. Call again (into an emptied parent) to redraw. */
export function renderStaticScene(parent: HTMLElement, text: string, markers: MarkerSet): StaticScene {
  const shell = cmShell(parent);
  const editor = parent.createDiv();
  editor.className = shell.editor;
  editor.addClass("inkswell-stream__static");
  const scroller = editor.createDiv();
  scroller.className = shell.scroller;
  const content = scroller.createDiv();
  content.className = shell.content;

  // Text node → the document offset of its first character.
  const offsets = new WeakMap<Node, number>();
  const lines: HTMLElement[] = [];
  for (const spec of staticLines(text, markers)) {
    const line = content.createDiv({ cls: ["cm-line", ...spec.cls] });
    line.dataset.from = String(spec.from);
    line.dataset.to = String(spec.to);
    for (const run of spec.runs) {
      let into: HTMLElement = line;
      if (run.cls.length) {
        into = line.createSpan({ cls: run.cls });
        for (const [k, v] of Object.entries(run.attrs)) into.setAttr(k, v);
      }
      offsets.set(into.appendChild(line.doc.createTextNode(run.text)), run.from);
    }
    // An empty line (or one whose text is all hidden markup) still has a line's height.
    if (!line.hasChildNodes()) line.createEl("br");
    lines.push(line);
  }

  const lineAt = (y: number): HTMLElement | null => {
    let lo = 0;
    let hi = lines.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = lines[mid].getBoundingClientRect();
      if (y < r.top) hi = mid - 1;
      else if (y >= r.bottom) lo = mid + 1;
      else return lines[mid];
    }
    return lines[Math.min(Math.max(lo, 0), lines.length - 1)] ?? null;
  };

  const posAt = (x: number, y: number): number | null => {
    const doc = editor.doc;
    let node: Node | null = null;
    let off = 0;
    // The legacy WebKit call is the fallback for iPads that predate the
    // standard one; typed narrowly here because the DOM typings deprecate it.
    const legacy = (doc as unknown as { caretRangeFromPoint?: (x: number, y: number) => Range | null })
      .caretRangeFromPoint;
    if (typeof doc.caretPositionFromPoint === "function") {
      const p = doc.caretPositionFromPoint(x, y);
      node = p?.offsetNode ?? null;
      off = p?.offset ?? 0;
    } else if (legacy) {
      const r = legacy.call(doc, x, y);
      node = r?.startContainer ?? null;
      off = r?.startOffset ?? 0;
    }
    const base = node ? offsets.get(node) : undefined;
    if (base !== undefined) return base + off;
    // Beside the text (line padding, an empty line): that line's nearer end.
    const el = node instanceof HTMLElement ? node : node?.parentElement ?? null;
    const line = el?.closest<HTMLElement>(".cm-line") ?? lineAt(y);
    if (!line || !editor.contains(line)) return null;
    const r = line.getBoundingClientRect();
    return x > r.left + r.width / 2 ? Number(line.dataset.to) : Number(line.dataset.from);
  };

  const edgePos = (x: number, edge: "first" | "last"): number | null => {
    const line = edge === "first" ? lines[0] : lines[lines.length - 1];
    if (!line) return null;
    const r = line.getBoundingClientRect();
    return posAt(x, edge === "first" ? r.top + 4 : r.bottom - 4);
  };

  return { el: editor, posAt, edgePos, lineAt };
}

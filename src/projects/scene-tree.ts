/**
 * Pure operations on an indented scene list.
 *
 * Kept free of Obsidian APIs so the reorder/indent logic is unit-testable and so
 * the explorer view and commands share one implementation. Each function returns
 * a NEW array; it never mutates its input.
 */

import { IndentedScene } from "./types";

/** Move the scene at `from` to position `to` (array splice semantics). */
export function moveScene(
  scenes: IndentedScene[],
  from: number,
  to: number
): IndentedScene[] {
  if (from === to || from < 0 || from >= scenes.length) return scenes.slice();
  const next = scenes.slice();
  const [moved] = next.splice(from, 1);
  const target = to > from ? to - 1 : to;
  next.splice(clamp(target, 0, next.length), 0, moved);
  return next;
}

/**
 * Increase a scene's indent by one, but only if it can legally nest under the
 * preceding scene (indent may exceed the previous scene's by at most 1).
 */
export function indentScene(
  scenes: IndentedScene[],
  index: number
): IndentedScene[] {
  if (index <= 0 || index >= scenes.length) return scenes.slice();
  const prev = scenes[index - 1];
  const cur = scenes[index];
  if (cur.indent > prev.indent) return scenes.slice(); // already max-nested here
  const next = scenes.slice();
  next[index] = { ...cur, indent: cur.indent + 1 };
  return next;
}

/**
 * Decrease a scene's indent by one (and pull its descendants along so the tree
 * stays well-formed). No-op when already at the top level.
 */
export function unindentScene(
  scenes: IndentedScene[],
  index: number
): IndentedScene[] {
  if (index < 0 || index >= scenes.length) return scenes.slice();
  const cur = scenes[index];
  if (cur.indent === 0) return scenes.slice();
  const next = scenes.slice();
  next[index] = { ...cur, indent: cur.indent - 1 };
  // Shift deeper descendants up by one so we don't orphan them.
  for (let i = index + 1; i < next.length; i++) {
    if (next[i].indent > cur.indent) {
      next[i] = { ...next[i], indent: next[i].indent - 1 };
    } else {
      break;
    }
  }
  return next;
}

/** Append a new scene at the end at top-level indent. */
export function addScene(
  scenes: IndentedScene[],
  title: string
): IndentedScene[] {
  return [...scenes, { title, indent: 0 }];
}

/** Remove the scene with the given title (first match). */
export function removeScene(
  scenes: IndentedScene[],
  title: string
): IndentedScene[] {
  const idx = scenes.findIndex((s) => s.title === title);
  if (idx < 0) return scenes.slice();
  return [...scenes.slice(0, idx), ...scenes.slice(idx + 1)];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Failure-surfacing for UI-invoked file/IO operations.
 *
 * Inkswell's vault mutations are almost all fired from event handlers as
 * `void someAsyncOp()` — so an unguarded throw becomes a silent unhandled
 * rejection: the user sees nothing and the operation half-completes. Route those
 * ops through {@link tryFileOp} so a failure logs (with stack) and shows a
 * Notice instead of vanishing.
 *
 * Convention: the *primitive* write helpers (index-writer, `writeSceneMeta`,
 * `processFrontMatter` wrappers, …) keep throwing — they never notify. Every UI
 * entry point (menu action, toggle handler, modal submit) is the layer that
 * wraps, so each failure is reported exactly once with an action-specific
 * message. Don't wrap a primitive that a wrapped action already calls.
 */

import { Notice } from "obsidian";

/**
 * Run a fallible async file operation, surfacing failure to the user. On success
 * returns the op's value; on error logs `[Inkswell] <userMessage>` + the error to
 * the console, shows `userMessage` as a Notice, and returns `null` so the caller
 * can bail. `userMessage` should be a complete, user-facing sentence naming what
 * couldn't be done (e.g. `Couldn't rename the scene.`).
 */
export async function tryFileOp<T>(
  op: () => Promise<T>,
  userMessage: string
): Promise<T | null> {
  try {
    return await op();
  } catch (e) {
    console.error(`[Inkswell] ${userMessage}`, e);
    new Notice(userMessage);
    return null;
  }
}

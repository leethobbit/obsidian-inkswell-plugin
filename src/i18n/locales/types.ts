/** Shared locale types (kept apart from the registry to avoid an import cycle). */
import type { MessageKey } from "./en";

/** A translation: any subset of the English keys. Missing keys fall back to English per key. */
export type Catalog = Partial<Record<MessageKey, string>>;

export interface LocaleInfo {
  /** The language's own name, shown in Settings → Interface language ("Deutsch"). */
  name: string;
  /**
   * Checked by a fluent speaker. An unreviewed (machine-drafted) catalog is
   * never picked automatically from Obsidian's language — only when the writer
   * chooses it in Settings — so nobody is surprised by a rough translation.
   */
  reviewed: boolean;
}

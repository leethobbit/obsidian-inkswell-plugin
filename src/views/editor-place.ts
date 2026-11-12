/**
 * Where the writer was in each scene (pure: no CodeMirror or Obsidian import).
 *
 * Write rebuilds its editor whenever you leave for another destination, switch
 * scenes, or a refresh can't be absorbed in place. Without this the rebuilt
 * editor opened at the top with the cursor at 0, so a trip to the Codex cost
 * you your place (#77). The Write panel records a place as it retires an
 * editor and hands it to the next editor built for the same scene.
 *
 * In memory only: it lasts as long as the Inkswell tab, like an editor tab's
 * own scroll position.
 */

export interface EditorPlace<S> {
  anchor: number;
  head: number;
  /** Document length when recorded. A scroll snapshot only fits that text. */
  docLength: number;
  /** The editor's own scroll position (opaque to this module), or null where
   *  something else scrolls (the stream's page). */
  scroll: S | null;
  /** Hand the keyboard back to the editor when this place is restored. */
  focus: boolean;
}

export interface RecalledPlace<S> {
  anchor: number;
  head: number;
  /** Null when there was none, or the text changed length since (a sync, an
   *  edit in another tab): the caller scrolls to the cursor instead. */
  scroll: S | null;
  focus: boolean;
}

const clamp = (n: number, max: number): number => Math.max(0, Math.min(n, max));

export class EditorPlaces<S> {
  /** Insertion-ordered, oldest first (a Map keeps that order). */
  private places = new Map<string, EditorPlace<S>>();

  constructor(private limit = 200) {}

  remember(path: string, place: EditorPlace<S>): void {
    this.places.delete(path);
    this.places.set(path, place);
    while (this.places.size > this.limit) {
      const oldest = this.places.keys().next();
      if (oldest.done) break;
      this.places.delete(oldest.value);
    }
  }

  /**
   * The place recorded for `path`, fitted to a document `docLength` long.
   * `focus` is handed out once: a later rebuild of the same scene decides
   * afresh whether the editor had the keyboard.
   */
  recall(path: string, docLength: number): RecalledPlace<S> | null {
    const place = this.places.get(path);
    if (!place) return null;
    const focus = place.focus;
    place.focus = false;
    return {
      anchor: clamp(place.anchor, docLength),
      head: clamp(place.head, docLength),
      scroll: place.docLength === docLength ? place.scroll : null,
      focus,
    };
  }

  forget(path: string): void {
    this.places.delete(path);
  }
}

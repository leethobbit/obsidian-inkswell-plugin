/**
 * Soft-keyboard tracking for the phone layout.
 *
 * Ground truth from a real Android device (Obsidian 1.12.7): the webview is
 * completely keyboard-blind — `window.innerHeight` AND `visualViewport` stay
 * at full height while the keyboard is up. What DOES move is Obsidian itself:
 * it writes `--keyboard-height: <px>` (and folds it into
 * `--safe-area-inset-bottom`) as an INLINE STYLE on `documentElement`, and
 * shrinks the app container while an input is focused. So the primary signal
 * is that inline style, watched via MutationObserver; the visualViewport /
 * innerHeight fallbacks remain for platforms that do report the keyboard
 * through the viewport (and cost nothing where they don't).
 *
 * The measured inset is published on the host element as
 * `--inkswell-keyboard-inset` plus an `is-keyboard-open` class (threshold-ed —
 * small viewport wobbles from browser chrome must not flap the UI). CSS does
 * the rest — most importantly hiding the bottom tab bar: with the app
 * container shrunk by Obsidian, the bar (and its navbar lift) otherwise
 * squeezes the content column to nothing and the user types into a void.
 */

/** Insets below this are chrome wobble, not a keyboard. */
const OPEN_THRESHOLD_PX = 100;

export class KeyboardWatcher {
  /** Tallest innerHeight seen — the keyboard-closed baseline for resize mode. */
  private baselineHeight = 0;
  /** Width the baseline was measured at: rotation changes the width (a
   *  keyboard never does), and the old baseline would read as a permanently
   *  open keyboard in landscape — reset it instead. */
  private baselineWidth = 0;

  /**
   * Start watching; publishes to `host` and calls `onChange` after each
   * re-measure. Returns a detach function (hand it to `Component.register`).
   */
  attach(host: HTMLElement, onChange?: (insetPx: number) => void): () => void {
    const win = host.win;
    const doc = host.doc;
    const vv = win.visualViewport;

    const measure = () => {
      if (win.innerWidth !== this.baselineWidth) {
        this.baselineWidth = win.innerWidth;
        this.baselineHeight = win.innerHeight;
      }
      this.baselineHeight = Math.max(this.baselineHeight, win.innerHeight);
      // Primary: Obsidian's own keyboard measurement (Android/iOS native).
      const obsidianInset = parseFloat(
        doc.documentElement.style.getPropertyValue("--keyboard-height")
      );
      const visualInset = vv ? Math.max(0, win.innerHeight - vv.height - vv.offsetTop) : 0;
      const resizeInset = Math.max(0, this.baselineHeight - win.innerHeight);
      const inset = Math.max(
        Number.isFinite(obsidianInset) ? obsidianInset : 0,
        visualInset,
        resizeInset
      );
      const open = inset > OPEN_THRESHOLD_PX;
      host.setCssProps({ "--inkswell-keyboard-inset": `${open ? Math.round(inset) : 0}px` });
      // Class before onChange: alignAboveNavbar must measure the bar in its
      // post-toggle display state or the lift comes out garbage.
      host.toggleClass("is-keyboard-open", open);
      onChange?.(open ? Math.round(inset) : 0);
    };

    // Obsidian updates --keyboard-height by rewriting documentElement's
    // inline style — the observer is the only reliable Android trigger.
    const mo = new MutationObserver(measure);
    mo.observe(doc.documentElement, { attributes: true, attributeFilter: ["style"] });
    // `visualViewport` is an EventTarget, not a Window — registerDomEvent
    // won't take it, so listen manually and detach via the returned closure.
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure); // iOS pans instead of resizing
    win.addEventListener("resize", measure);
    measure();

    return () => {
      mo.disconnect();
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
      win.removeEventListener("resize", measure);
      host.setCssProps({ "--inkswell-keyboard-inset": "0px" });
      host.removeClass("is-keyboard-open");
    };
  }
}

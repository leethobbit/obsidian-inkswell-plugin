/**
 * Small shared behaviors for inline form fields (codex profile, scene meta).
 * Deliberately not a form framework — panels keep building their own fields.
 */

/**
 * Grow a textarea with its content instead of scrolling inside a fixed box,
 * capped to a fraction of the window so a long bio can never take over a phone
 * screen (the cap is what matters on mobile; on desktop it just saves the user
 * a resize-drag).
 *
 * Never shrinks below the `rows` default: panels build their DOM before it is
 * laid out (and the Codex detail pane can be rebuilt while another tab is in
 * front), where `scrollHeight` reads 0 — writing that back collapsed every
 * textarea to its padding, a bare resize grip that looked like a broken input.
 * An unmeasurable box keeps `rows` and is re-measured once it is painted.
 */
export function autosizeTextarea(ta: HTMLTextAreaElement, maxViewportFraction = 0.4): void {
  const grow = () => {
    if (!ta.isConnected) return;
    // Collapse first so scrollHeight reports the content's natural height
    // (otherwise it never shrinks when text is deleted).
    ta.setCssProps({ height: "auto" });
    const natural = ta.scrollHeight;
    if (natural === 0) return; // not laid out yet — `rows` governs until it is
    const max = Math.round(ta.win.innerHeight * maxViewportFraction);
    ta.setCssProps({ height: `${Math.min(natural, max)}px` });
  };
  ta.addEventListener("input", grow);
  // A hidden/unpainted textarea can't be measured at focus time either, but by
  // then it certainly is painted — so the first interaction fits it to content.
  ta.addEventListener("focus", grow);
  grow();
  // Detail panes are typically built in a detached subtree and attached after;
  // one measurement on the next frame catches the common "built, then shown" case.
  ta.win.requestAnimationFrame(grow);
}

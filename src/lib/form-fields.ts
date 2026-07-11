/**
 * Small shared behaviors for inline form fields (codex profile, scene meta).
 * Deliberately not a form framework — panels keep building their own fields.
 */

/**
 * Grow a textarea with its content instead of scrolling inside a fixed 3-row
 * box, capped to a fraction of the window so a long bio can never take over
 * a phone screen (the cap is what matters on mobile; on desktop it just
 * saves the user a resize-drag).
 */
export function autosizeTextarea(ta: HTMLTextAreaElement, maxViewportFraction = 0.4): void {
  const grow = () => {
    if (!ta.isConnected) return;
    const max = Math.round(ta.win.innerHeight * maxViewportFraction);
    // Collapse first so scrollHeight reports the content's natural height
    // (otherwise it never shrinks when text is deleted).
    ta.setCssProps({ height: "auto" });
    ta.setCssProps({ height: `${Math.min(ta.scrollHeight, max)}px` });
  };
  ta.addEventListener("input", grow);
  grow();
}

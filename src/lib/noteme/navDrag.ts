/**
 * Bridges the bottom-nav drag gesture (BottomNav.tsx) to whatever page
 * content is currently mounted, so the content visually "travels" with the
 * navbar during the gesture instead of jumping when the route changes.
 *
 * Kept outside React state on purpose: pointermove fires far more often
 * than a render should, so this writes directly to the DOM node's style
 * (transform/opacity/filter — GPU-friendly, no layout thrashing).
 *
 * Usage on any page that renders <BottomNav />:
 *   <main ref={registerNavDragTarget} ...>
 */

let target: HTMLElement | null = null;

export function registerNavDragTarget(el: HTMLElement | null) {
  target = el;
}

/**
 * value is roughly in [-1, 1]: negative while dragging toward the previous
 * tab, positive toward the next tab, 0 at rest. Values slightly beyond
 * [-1, 1] are expected during rubber-banding at the edges.
 */
export function setNavDragProgress(value: number) {
  if (!target) return;
  const clamped = Math.max(-1.2, Math.min(1.2, value));
  const shift = clamped * -16;
  const magnitude = clamped * clamped;
  target.style.transform = `translate3d(${shift}px, 0, 0)`;
  target.style.opacity = String(1 - Math.min(0.28, magnitude * 0.28));
  target.style.filter = magnitude > 0.02 ? `blur(${Math.min(2.2, magnitude * 2.2)}px)` : "";
}

export function resetNavDragProgress(immediate = false) {
  if (!target) return;
  const node = target;
  if (immediate) {
    node.style.transition = "none";
    node.style.transform = "translate3d(0, 0, 0)";
    node.style.opacity = "1";
    node.style.filter = "";
    void node.offsetHeight; // flush before re-enabling transitions
    node.style.transition = "";
    return;
  }
  node.style.transition =
    "transform 0.4s cubic-bezier(0.22,1.12,0.36,1), opacity 0.32s ease, filter 0.32s ease";
  node.style.transform = "translate3d(0, 0, 0)";
  node.style.opacity = "1";
  node.style.filter = "";
}

/**
 * Grouping on the scenario editor's canvas (EmailBodyRichTextEditor.jsx).
 *
 * The canvas is a flowing, editable document, so a group is a box wrapped
 * around a run of the canvas's top-level blocks. The box is as wide as what
 * can actually be seen of them (text lines, pictures, cards), so it can be
 * moved sideways and centred, and each part is put back where it was after
 * wrapping or unwrapping, so nothing jumps.
 *
 * The rules here are plain functions; the DOM measuring ones read the page
 * only when called.
 */

// How close (layout px) a dragged item's centre must come to the canvas
// centre to snap onto it.
export const SNAP_PX = 6;
// How far (layout px) the mouse must travel before a press becomes a drag.
export const DRAG_START_PX = 3;

/** The smallest rectangle holding every rectangle given (null when none). */
export function unionRects(rects) {
  let box = null;
  for (const r of rects) {
    if (!r || (r.width < 0.5 && r.height < 0.5)) continue;
    const right = r.left + r.width;
    const bottom = r.top + r.height;
    if (!box) {
      box = { left: r.left, top: r.top, right, bottom };
    } else {
      box.left = Math.min(box.left, r.left);
      box.top = Math.min(box.top, r.top);
      box.right = Math.max(box.right, right);
      box.bottom = Math.max(box.bottom, bottom);
    }
  }
  return box
    ? { left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top }
    : null;
}

/** Whether two { left, top, width, height } rectangles overlap at all. */
export function rectsIntersect(a, b) {
  if (!a || !b) return false;
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

/** A picked set with `node` added, or taken out when it was already there. */
export function toggleBlock(picked, node) {
  if (!node) return picked;
  return picked.includes(node) ? picked.filter((n) => n !== node) : [...picked, node];
}

/**
 * The margin-top that leaves a gap of `gap` px between an item and the block
 * above it, whose margin-bottom is `aboveMargin` (null when nothing is above).
 * Stacked blocks share the larger of the two margins, so a gap smaller than
 * the block above's margin needs a negative margin.
 *
 * Moving items up and down by margin keeps the page flowing: what is below
 * follows, and no empty hole is left where the item was (which a `top`
 * offset leaves, and the preview shows).
 */
export function marginForGap(gap, aboveMargin) {
  if (aboveMargin == null || aboveMargin < 0) return gap;
  return gap >= aboveMargin ? gap : gap - aboveMargin;
}

/**
 * Snap a dragged item to the nearest guide within `threshold`: a container's
 * left edge (`start`), centre (`centre`) or right edge (`end`). `left` is
 * where the item's left edge would be. Returns the left to use and the guide
 * snapped to (null when none is near).
 */
export function snapToGuides({ left, width, guides, threshold = SNAP_PX }) {
  let best = null;
  for (const guide of guides) {
    const edge =
      guide.kind === "centre" ? left + width / 2 : guide.kind === "end" ? left + width : left;
    const distance = Math.abs(edge - guide.x);
    if (distance <= threshold && (!best || distance < best.distance)) best = { guide, distance };
  }
  if (!best) return { left, guide: null };
  const { guide } = best;
  const snappedLeft =
    guide.kind === "centre" ? guide.x - width / 2 : guide.kind === "end" ? guide.x - width : guide.x;
  return { left: snappedLeft, guide };
}

/** How far a dragged item may go: keeps it inside the canvas sideways and below its top. */
export function clampMove({ left, top }, { minLeft, maxLeft, minTop }) {
  const hi = Math.max(minLeft, maxLeft);
  return {
    left: Math.max(minLeft, Math.min(hi, left)),
    top: Math.max(minTop, top),
  };
}

// --- Measuring the page (call only in the browser) ---------------------------------

const BOXED_TAGS = new Set([
  "IMG", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "HR", "VIDEO", "CANVAS", "IFRAME", "SVG", "svg",
]);

const isTransparent = (color) =>
  !color || color === "transparent" || /rgba\([^)]*,\s*0\)$/.test(color.replace(/\s+/g, " "));

// An element whose own box can be seen (a picture, a field, a card with a
// background or border), not only the text inside it.
const hasVisibleBox = (el, cs) =>
  BOXED_TAGS.has(el.tagName) ||
  !isTransparent(cs.backgroundColor) ||
  (cs.backgroundImage && cs.backgroundImage !== "none") ||
  (cs.boxShadow && cs.boxShadow !== "none") ||
  ["Top", "Right", "Bottom", "Left"].some(
    (side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none",
  );

/**
 * The screen rectangle of what can be seen of `nodes`: text lines, pictures,
 * fields and boxes with a background or border. A paragraph is as wide as its
 * text, not the whole canvas. Null when nothing can be seen.
 */
export function visibleBounds(nodes) {
  const rects = [];
  const visit = (node) => {
    if (node.nodeType === 3) {
      if (!node.textContent.trim()) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) rects.push(r);
      return;
    }
    if (node.nodeType !== 1) return;
    const cs = window.getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    if (hasVisibleBox(node, cs)) rects.push(node.getBoundingClientRect());
    if (BOXED_TAGS.has(node.tagName)) return;
    node.childNodes.forEach(visit);
  };
  nodes.forEach(visit);
  return unionRects(rects);
}

/** Where each element sits on screen now, to put it back after moving it in the page. */
export function rememberPlaces(nodes) {
  const places = new Map();
  for (const node of nodes) {
    if (node.nodeType !== 1) continue;
    const at = visibleBounds([node]);
    if (at) places.set(node, at);
  }
  return places;
}

/**
 * Nudge each remembered element back to where it was on screen, sideways
 * only unless `vertical` (a group stacks its parts tightly, so only their
 * left-right places are kept). `scale` is screen px per layout px.
 */
export function restorePlaces(places, scale = 1, { vertical = true } = {}) {
  for (const [el, was] of places) {
    const now = visibleBounds([el]);
    if (!now) continue;
    const dx = (now.left - was.left) / scale;
    const dy = vertical ? (now.top - was.top) / scale : 0;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    if (!el.style.position || el.style.position === "static") el.style.position = "relative";
    el.style.left = `${Math.round((parseFloat(el.style.left) || 0) - dx)}px`;
    el.style.top = `${Math.round((parseFloat(el.style.top) || 0) - dy)}px`;
  }
}

/**
 * Where a group of `picked` elements goes: the deepest element holding all of
 * them (`parent`), and, for each, its ancestor among `parent`'s children
 * (`anchors`, in page order). A heading in a card and a banner on the page
 * group at page level, as the card and the banner; two parts of one card
 * group inside that card. Null when nothing picked is on the canvas.
 */
export function groupPlan(editor, picked) {
  const items = picked.filter(
    (el) => el && el !== editor && el.isConnected && editor.contains(el),
  );
  const outer = items.filter((el) => !items.some((other) => other !== el && other.contains(el)));
  if (!outer.length) return null;

  let parent = outer[0].parentNode;
  while (parent && parent !== editor && !outer.every((el) => parent.contains(el))) {
    parent = parent.parentNode;
  }
  if (!parent || !editor.contains(parent)) return null;

  const anchors = [];
  for (const el of outer) {
    let anchor = el;
    while (anchor.parentNode !== parent) anchor = anchor.parentNode;
    if (!anchors.includes(anchor)) anchors.push(anchor);
  }
  anchors.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return { parent, anchors };
}

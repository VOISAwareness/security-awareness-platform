/**
 * The scenario editor's canvas (EmailBodyRichTextEditor.jsx), laid out the
 * way Power BI lays out a report page:
 *
 *  - A page has a fixed width (the email 600px, the browser page 1280px) and
 *    grows in height to hold what is on it. The editor scales it to fit, so
 *    it never scrolls sideways, and the preview shows it at the same size.
 *  - Every item sits at its own position (left, top, width, height in page
 *    px) on its own layer. Items may overlap; the layer order decides which
 *    is in front. Bring forward / send backward move one layer at a time.
 *  - A group is one level deep: a box around items of the page, whose parts
 *    keep their own layers inside it. Groups never hold groups.
 *
 * The saved HTML is the page as designed:
 *   <div class="vshield-page" data-page-width="600" style="position:relative;
 *        width:600px;height:Hpx;margin:0 auto;...">
 *     <div class="vshield-canvas-item" style="position:absolute;left;top;
 *          width;height;z-index">...</div>
 *   </div>
 *
 * Plain functions first (tested); the DOM ones read the page only when called.
 */

export const PAGE_CLASS = 'vshield-page';
export const ITEM_CLASS = 'vshield-canvas-item';
export const GROUP_CLASS = 'vshield-group-item';

/** Page widths (px) for each kind of page. */
export const PAGE_WIDTH = { email: 600, browser: 1280 };
/** The least height a page has, empty or nearly so. */
export const PAGE_MIN_HEIGHT = { email: 360, browser: 720 };
/** Room kept under the lowest item. */
export const PAGE_BOTTOM_ROOM = 24;
/** How close (page px) an edge must come to a guide to snap onto it. */
export const SNAP_PX = 6;
/** How far (screen px) a press must travel to become a drag. */
export const DRAG_START_PX = 3;

const round = (n) => Math.round(n);

/** The smallest rectangle holding every { left, top, width, height } given. */
export function unionRects(rects) {
  let box = null;
  for (const r of rects) {
    if (!r) continue;
    const right = r.left + r.width;
    const bottom = r.top + r.height;
    if (!box) box = { left: r.left, top: r.top, right, bottom };
    else {
      box.left = Math.min(box.left, r.left);
      box.top = Math.min(box.top, r.top);
      box.right = Math.max(box.right, right);
      box.bottom = Math.max(box.bottom, bottom);
    }
  }
  return box ? { left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top } : null;
}

/** Whether two rectangles overlap at all. */
export function rectsIntersect(a, b) {
  if (!a || !b) return false;
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

/** The scale that fits a page `pageWidth` wide into `available` px (never above 1). */
export function fitScale(available, pageWidth) {
  if (!(available > 0) || !(pageWidth > 0)) return 1;
  return Math.min(1, available / pageWidth);
}

/** The page's height: its lowest item plus some room, never below `min`. */
export function pageHeightFor(rects, min) {
  let bottom = 0;
  for (const r of rects) if (r) bottom = Math.max(bottom, r.top + r.height);
  return Math.max(min, Math.ceil(bottom + PAGE_BOTTOM_ROOM));
}

/**
 * Keep a rectangle on the page sideways and below its top: never past the
 * right edge (the page has no sideways scroll) or the left. An item wider
 * than the page is narrowed to it.
 */
export function clampToPage(rect, pageWidth) {
  const width = Math.min(rect.width, pageWidth);
  return {
    ...rect,
    width,
    left: Math.max(0, Math.min(pageWidth - width, rect.left)),
    top: Math.max(0, rect.top),
  };
}

// --- Layers ---------------------------------------------------------------

/**
 * A new layer order (back first, as in the DOM) after moving `moving` items:
 *   'forward'  one layer forward    'backward' one layer back
 *   'front'    in front of all      'back'     behind all
 * Several items move together, keeping their order among themselves.
 */
export function moveLayers(order, moving, op) {
  const set = new Set(moving.filter((m) => order.includes(m)));
  if (!set.size) return order.slice();
  if (op === 'front') return [...order.filter((x) => !set.has(x)), ...order.filter((x) => set.has(x))];
  if (op === 'back') return [...order.filter((x) => set.has(x)), ...order.filter((x) => !set.has(x))];
  const next = order.slice();
  if (op === 'forward') {
    for (let i = next.length - 2; i >= 0; i -= 1) {
      if (set.has(next[i]) && !set.has(next[i + 1])) [next[i], next[i + 1]] = [next[i + 1], next[i]];
    }
  } else if (op === 'backward') {
    for (let i = 1; i < next.length; i += 1) {
      if (set.has(next[i]) && !set.has(next[i - 1])) [next[i], next[i - 1]] = [next[i - 1], next[i]];
    }
  }
  return next;
}

// --- Align and distribute ------------------------------------------------

/**
 * New positions for `rects` aligned to `bounds` (the page or group for one
 * item, the selection's box for several):
 * 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'.
 */
export function alignRects(rects, mode, bounds) {
  return rects.map((r) => {
    const out = { ...r };
    if (mode === 'left') out.left = bounds.left;
    else if (mode === 'center') out.left = bounds.left + (bounds.width - r.width) / 2;
    else if (mode === 'right') out.left = bounds.left + bounds.width - r.width;
    else if (mode === 'top') out.top = bounds.top;
    else if (mode === 'middle') out.top = bounds.top + (bounds.height - r.height) / 2;
    else if (mode === 'bottom') out.top = bounds.top + bounds.height - r.height;
    out.left = round(out.left);
    out.top = round(out.top);
    return out;
  });
}

/**
 * Even gaps between three or more items, across ('horizontal') or down
 * ('vertical'). The outermost two stay where they are. Returned in the
 * order given.
 */
export function distributeRects(rects, axis) {
  if (rects.length < 3) return rects.map((r) => ({ ...r }));
  const pos = axis === 'vertical' ? 'top' : 'left';
  const size = axis === 'vertical' ? 'height' : 'width';
  const sorted = rects.map((r, i) => ({ r, i })).sort((a, b) => a.r[pos] - b.r[pos]);
  const first = sorted[0].r;
  const last = sorted[sorted.length - 1].r;
  const span = last[pos] + last[size] - first[pos];
  const used = sorted.reduce((sum, { r }) => sum + r[size], 0);
  const gap = (span - used) / (sorted.length - 1);
  const out = rects.map((r) => ({ ...r }));
  let at = first[pos];
  for (const { r, i } of sorted) {
    out[i][pos] = round(at);
    at += r[size] + gap;
  }
  return out;
}

// --- Snapping ---------------------------------------------------------------

/**
 * Lines a dragged item can snap to: the edges and centre of the box it is in
 * (the page or its group), and of every other item beside it.
 * Returns { x: [...], y: [...] } in page px.
 */
export function snapLines(container, others) {
  const x = [container.left, container.left + container.width / 2, container.left + container.width];
  const y = [container.top, container.top + container.height / 2, container.top + container.height];
  for (const r of others) {
    if (!r) continue;
    x.push(r.left, r.left + r.width / 2, r.left + r.width);
    y.push(r.top, r.top + r.height / 2, r.top + r.height);
  }
  return { x, y };
}

const snapAxis = (start, size, lines, threshold) => {
  let best = null;
  for (const line of lines) {
    for (const [edge, offset] of [[start, 0], [start + size / 2, size / 2], [start + size, size]]) {
      const d = Math.abs(edge - line);
      if (d <= threshold && (!best || d < best.d)) best = { d, pos: line - offset, line };
    }
  }
  return best;
};

/**
 * A dragged rectangle snapped to the nearest lines (left/centre/right edges
 * across, top/middle/bottom down), within `threshold`. Returns the rectangle
 * to use and the guide lines it snapped to (null when none).
 */
export function snapRect(rect, lines, threshold = SNAP_PX) {
  const sx = snapAxis(rect.left, rect.width, lines.x, threshold);
  const sy = snapAxis(rect.top, rect.height, lines.y, threshold);
  return {
    rect: { ...rect, left: sx ? sx.pos : rect.left, top: sy ? sy.pos : rect.top },
    guideX: sx ? sx.line : null,
    guideY: sy ? sy.line : null,
  };
}

// --- Resizing ---------------------------------------------------------------

/**
 * A rectangle resized from one of its eight handles ('top-left', 'top',
 * 'right', ...) by dx, dy page px. The opposite edge stays put. With
 * `keepRatio` the starting proportions hold.
 */
export function resizeRect(start, handle, dx, dy, { keepRatio = false, minWidth = 16, minHeight = 12 } = {}) {
  const fromLeft = handle.includes('left');
  const fromTop = handle.includes('top');
  const across = fromLeft || handle.includes('right');
  const down = fromTop || handle.includes('bottom');
  let width = across ? start.width + (fromLeft ? -dx : dx) : start.width;
  let height = down ? start.height + (fromTop ? -dy : dy) : start.height;
  if (keepRatio && start.width > 0 && start.height > 0) {
    const ratio = start.width / start.height;
    if (!down) height = width / ratio;
    else if (!across) width = height * ratio;
    else if (Math.abs(width - start.width) / start.width >= Math.abs(height - start.height) / start.height) height = width / ratio;
    else width = height * ratio;
  }
  width = Math.max(minWidth, round(width));
  height = Math.max(minHeight, round(height));
  return {
    left: fromLeft ? start.left + start.width - width : start.left,
    top: fromTop ? start.top + start.height - height : start.top,
    width,
    height,
  };
}

/**
 * Where a part of a group goes when the group is resized from `from` to
 * `to`: its place and size scale with the group (as Power BI does).
 * Positions are relative to the group.
 */
export function scaleIntoGroup(part, from, to) {
  const sx = from.width ? to.width / from.width : 1;
  const sy = from.height ? to.height / from.height : 1;
  return {
    left: round(part.left * sx),
    top: round(part.top * sy),
    width: Math.max(4, round(part.width * sx)),
    height: Math.max(4, round(part.height * sy)),
  };
}

// --- The DOM (call only in the browser) --------------------------------------

const px = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

/** An item's place on its page or in its group, from its own style (page px). */
export function readRect(el) {
  return {
    left: px(el.style.left),
    top: px(el.style.top),
    width: el.offsetWidth || px(el.style.width),
    height: el.offsetHeight || px(el.style.height),
  };
}

/** Put an item at `rect` (left, top, and width/height when given). */
export function writeRect(el, rect, { height = true } = {}) {
  el.style.position = 'absolute';
  el.style.left = `${round(rect.left)}px`;
  el.style.top = `${round(rect.top)}px`;
  if (rect.width != null) el.style.width = `${round(rect.width)}px`;
  if (height && rect.height != null) el.style.height = `${round(rect.height)}px`;
  el.style.boxSizing = 'border-box';
  el.style.margin = '0px';
}

/** The page element inside the editor's box (null when there is none yet). */
export function pageOf(host) {
  return host?.querySelector?.(`:scope > .${PAGE_CLASS}`) || null;
}

/** The items on a page, or the parts of a group, back to front. */
export function layerItems(parent) {
  return parent ? Array.from(parent.children).filter((el) => el.classList.contains(ITEM_CLASS)) : [];
}

/** z-index from the layer order (back first), so the saved page shows it. */
export function renumberLayers(parent) {
  layerItems(parent).forEach((el, i) => {
    el.style.zIndex = String(i + 1);
  });
}

/** Grow or shrink the page to hold its items. */
export function fitPageHeight(page, minHeight) {
  if (!page) return;
  const rects = layerItems(page)
    .filter((el) => el.style.display !== 'none')
    .map((el) => ({ top: px(el.style.top), height: el.offsetHeight }));
  page.style.height = `${pageHeightFor(rects, minHeight)}px`;
}

// Styles a part takes from what holds it. Kept on the part itself when it is
// lifted out onto the page, so it looks the same there.
const INHERITED = [
  'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
  'textAlign', 'letterSpacing', 'textTransform', 'whiteSpace', 'wordBreak',
];

const keepInheritedStyle = (el, cs) => {
  for (const prop of INHERITED) if (!el.style[prop]) el.style[prop] = cs[prop];
};

const BOX_PROPS = ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
  'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'boxShadow'];

const hasOwnBox = (cs) =>
  (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) ||
  (cs.backgroundImage && cs.backgroundImage !== 'none') ||
  ['Top', 'Right', 'Bottom', 'Left'].some((s) => px(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none') ||
  (cs.boxShadow && cs.boxShadow !== 'none');

const isBlankNode = (node) =>
  (node.nodeType === 3 && !node.textContent.trim()) ||
  node.nodeType === 8 ||
  (node.nodeType === 1 && ['BR', 'SCRIPT', 'STYLE'].includes(node.tagName)) ||
  (node.nodeType === 1 && !node.textContent.trim() && !node.querySelector('img, input, button, select, textarea, table, hr') &&
    !['IMG', 'INPUT', 'HR', 'TABLE'].includes(node.tagName) && !hasOwnBox(window.getComputedStyle(node)));

/**
 * Lay out a page from HTML made for the old flowing canvas (a template, an
 * older scenario): it is drawn at the page width, and each block is put on
 * the page where it was seen, as its own item. A card holding several
 * blocks (a template's panel) becomes a group: its background as the back
 * part, and each block on it as a part of its own, so every piece can be
 * selected, moved and layered. Returns the page's HTML.
 *
 * `prepare(html)` readies the HTML first (marks its items).
 */
export function layoutPageHtml(html, { width, minHeight, textStyle = {}, background = '' } = {}) {
  const host = document.createElement('div');
  Object.assign(host.style, {
    position: 'absolute', left: '-100000px', top: '0px', width: `${width}px`, visibility: 'hidden',
    ...textStyle,
  });
  document.body.appendChild(host);
  try {
    host.innerHTML = String(html || '');
    // Loose text at the top level goes on a line of its own.
    for (const node of Array.from(host.childNodes)) {
      if (node.nodeType === 3 && node.textContent.trim()) {
        const p = document.createElement('p');
        node.replaceWith(p);
        p.appendChild(node);
      }
    }
    const origin = host.getBoundingClientRect();
    const rectIn = (el, box) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height };
    };

    const page = document.createElement('div');
    page.className = PAGE_CLASS;
    page.setAttribute('data-page-width', String(width));
    Object.assign(page.style, {
      position: 'relative', width: `${width}px`, margin: '0px auto', overflow: 'hidden', boxSizing: 'border-box',
    });
    if (background) page.style.backgroundColor = background;

    const lift = (el, box) => {
      const r = rectIn(el, box);
      const cs = window.getComputedStyle(el);
      const clone = el.cloneNode(true);
      keepInheritedStyle(clone, cs);
      // Inline things (a lone link, a span) become boxes of their own.
      if (cs.display.startsWith('inline')) clone.style.display = cs.display === 'inline' ? 'inline-block' : cs.display;
      clone.style.removeProperty('right');
      clone.style.removeProperty('bottom');
      clone.style.maxWidth = 'none';
      writeRect(clone, r, { height: false });
      clone.style.height = el.style.height ? `${Math.round(r.height)}px` : 'auto';
      if (!clone.classList.contains(ITEM_CLASS)) {
        clone.classList.add(ITEM_CLASS);
        if (!clone.getAttribute('data-type')) {
          clone.setAttribute('data-type', el.tagName === 'IMG' || el.querySelector('img') ? 'image' : 'text');
        }
      }
      return clone;
    };

    // A child that counts as its own block: a pre-marked template part, a
    // picture, or anything not laid out inline. (An inline-block button in a
    // card still counts, so the card is opened up rather than kept whole.)
    const structuralKid = (n) =>
      n.nodeType === 1 &&
      (n.classList.contains(ITEM_CLASS) || n.tagName === 'IMG' ||
        !window.getComputedStyle(n).display.startsWith('inline'));

    // A card worth opening up: a box of its own holding two or more blocks,
    // and no loose text of its own.
    const isPanel = (el) => {
      if (el.matches('a, img, input, table, button, ul, ol, p, h1, h2, h3, h4, h5, h6')) return false;
      const kids = Array.from(el.childNodes).filter((n) => !isBlankNode(n));
      if (kids.length < 2 || kids.some((n) => n.nodeType !== 1)) return false;
      return kids.every(structuralKid);
    };

    // A real action button (Submit, Verify, Complete Training...). These are
    // lifted out of a card's group so they stand on their own: selectable,
    // movable and given an On-Click one by one.
    const isButton = (el) =>
      !!el && el.nodeType === 1 &&
      (el.getAttribute('data-type') === 'button' ||
        el.classList.contains('vshield-custom-btn') ||
        el.matches('button, input[type="submit"], input[type="button"], input[type="image"]') ||
        !!el.querySelector('button, input[type="submit"], input[type="button"]'));

    // Every meaningful item inside a card, flattening bare wrapper divs
    // (padding- or centre-only, no box of their own) so buried elements — the
    // button above all — surface as their own items. An element with its own
    // box (background, border, shadow), or a leaf of content (text, link,
    // picture, field, button), is taken whole; a bare wrapper is stepped
    // through to its children.
    const collectItems = (container) => {
      const out = [];
      for (const child of Array.from(container.children)) {
        if (isBlankNode(child)) continue;
        const marked = child.classList.contains(ITEM_CLASS);
        const ownBox = hasOwnBox(window.getComputedStyle(child));
        const isLeaf =
          child.matches('a, img, input, button, p, h1, h2, h3, h4, h5, h6') ||
          !child.querySelector(`.${ITEM_CLASS}`);
        if (marked && (ownBox || isLeaf || isButton(child))) {
          out.push(child);
        } else if (child.querySelector(`.${ITEM_CLASS}`)) {
          out.push(...collectItems(child));
        } else if (marked) {
          out.push(child);
        }
      }
      return out;
    };

    const blocks = Array.from(host.childNodes).filter((n) => n.nodeType === 1 && !isBlankNode(n));
    for (const el of blocks) {
      if (!isPanel(el)) {
        page.appendChild(lift(el, origin));
        continue;
      }
      const r = rectIn(el, origin);
      const cs = window.getComputedStyle(el);
      const group = document.createElement('div');
      group.className = `${ITEM_CLASS} ${GROUP_CLASS}`;
      group.setAttribute('data-type', 'group');
      if (el.getAttribute('data-item-name')) group.setAttribute('data-item-name', el.getAttribute('data-item-name'));
      writeRect(group, r);

      if (hasOwnBox(cs)) {
        const back = document.createElement('div');
        back.className = ITEM_CLASS;
        back.setAttribute('data-type', 'shape');
        back.setAttribute('data-item-name', 'Background');
        for (const prop of BOX_PROPS) back.style[prop] = cs[prop];
        writeRect(back, { left: 0, top: 0, width: r.width, height: r.height });
        group.appendChild(back);
      }
      const box = el.getBoundingClientRect();
      const soloButtons = [];
      for (const item of collectItems(el)) {
        if (isButton(item)) {
          // On the page, over the card, measured from the page itself.
          soloButtons.push(lift(item, origin));
        } else {
          group.appendChild(lift(item, box));
        }
      }
      // Keep the card's group only if it still holds a background or a part.
      if (group.children.length) page.appendChild(group);
      // The button(s) go on top of the group so they stay clickable.
      soloButtons.forEach((b) => page.appendChild(b));
    }

    // Measure the page as it now stands, for its height and the parts' heights.
    host.innerHTML = '';
    host.appendChild(page);
    layerItems(page).forEach((el) => {
      if (el.classList.contains(GROUP_CLASS)) renumberLayers(el);
    });
    renumberLayers(page);
    fitPageHeight(page, minHeight);
    return host.innerHTML;
  } finally {
    host.remove();
  }
}

/** An empty page of the given width. */
export function emptyPageHtml(width, minHeight, background = '') {
  const bg = background ? `background-color:${background};` : '';
  return `<div class="${PAGE_CLASS}" data-page-width="${width}" style="position:relative;width:${width}px;height:${minHeight}px;margin:0px auto;overflow:hidden;box-sizing:border-box;${bg}"></div>`;
}

/** Whether HTML is already a laid-out page. */
export function isLaidOut(html) {
  return new RegExp(`class="[^"]*\\b${PAGE_CLASS}\\b`).test(String(html || ''));
}

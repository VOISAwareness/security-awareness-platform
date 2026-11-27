/**
 * Text and item helpers for the scenario editor's canvas
 * (EmailBodyRichTextEditor.jsx): pasted HTML made safe and clean, real
 * pixel font sizes, link targets for each On-Click action, and lengths in
 * the units the designer picked. Plain functions, no DOM.
 */

import { BROWSER_PAGE_LINK, COMPROMISE_LINK, PHISH_LINK } from './simulationPages.js';

// 96 DPI, as the browser lays out pages.
export const PX_PER_CM = 37.7952755906;

/**
 * HTML pasted from Word, Outlook or a web page, cleaned before it goes into
 * an email: no scripts, styles, frames, forms or event handlers (they would
 * be sent to employees, and email clients strip or flag them), none of
 * Office's own markup, and no javascript: links. Formatting written on the
 * elements themselves (bold, colours, sizes, tables) is kept.
 */
export function cleanPastedHtml(html) {
  let out = String(html || '');
  // Only what is between <!--StartFragment--> and <!--EndFragment--> was copied.
  const fragment = out.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i);
  if (fragment) out = fragment[1];
  out = out
    // Conditional comments and plain comments (Outlook's <!--[if mso]>...).
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[(?:if|endif)[^\]]*\]>/gi, '')
    // Whole elements that never belong in an email body.
    .replace(/<(script|style|iframe|object|embed|noscript|template|title|xml|form|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:html|head|body|meta|link|base|script|style|iframe|object|embed|form|xml)\b[^>]*>/gi, '')
    // Office's own tags (<o:p>, <v:shape>, <w:...>): their text stays.
    .replace(/<\/?[a-z]+:[a-z][^>]*>/gi, '')
    // Event handlers, in any quoting.
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Script addresses.
    .replace(/\s(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(?:javascript|vbscript|data:text\/html)[^"'\s>]*\2/gi, ' $1="#"')
    // Office classes and language marks.
    .replace(/\s+class\s*=\s*("[^"]*Mso[^"]*"|'[^']*Mso[^']*'|Mso\w*)/gi, '')
    .replace(/\s+lang\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Office-only style properties (mso-*), keeping the rest of the style.
  out = out.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (match, _q, dq, sq) => {
    const kept = String(dq ?? sq ?? '')
      .split(';')
      .map((rule) => rule.trim())
      .filter((rule) => rule && !/^mso-|^tab-stops|^-ms-|^text-underline/i.test(rule))
      .join('; ');
    return kept ? ` style="${kept.replace(/"/g, "'")}"` : '';
  });
  return out.replace(/<span>\s*<\/span>/gi, '').trim();
}

/**
 * Plain pasted text as HTML: escaped, line breaks kept.
 */
export function plainTextToHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n?/g, '\n')
    .replace(/\n/g, '<br>');
}

/** The font sizes offered, in px. */
export const FONT_SIZES_PX = [9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 72];

/** A computed font size ("14.6667px") as a whole number of px, or null. */
export function fontSizePx(value) {
  const px = parseFloat(value);
  return Number.isFinite(px) && px > 0 ? Math.round(px) : null;
}

/** The first family in a CSS font-family list, without quotes ("Segoe UI"). */
export function firstFontFamily(value) {
  const first = String(value || '').split(',')[0] || '';
  return first.trim().replace(/^["']|["']$/g, '');
}

/**
 * The link an On-Click action is carried by: email clients and the served
 * browser page only ever follow links, never scripts.
 *   landing  -> the landing page (a click is recorded)
 *   page     -> the browser page, page 2 (a click is recorded)
 *   training -> compromised, then the landing page (page 2 only)
 */
export function actionLink(action) {
  if (action === 'training') return COMPROMISE_LINK;
  if (action === 'page') return BROWSER_PAGE_LINK;
  return PHISH_LINK;
}

/** px shown in the units picked ('px' or 'cm'), as text for an input. */
export function toUnit(px, unit) {
  if (!Number.isFinite(px)) return '';
  return unit === 'cm' ? (px / PX_PER_CM).toFixed(2) : String(Math.round(px));
}

/** A length typed in the units picked, back to whole px (null when not a number). */
export function fromUnit(value, unit) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(unit === 'cm' ? n * PX_PER_CM : n);
}

/**
 * A new width and height for a resize, from the starting size and how far
 * the mouse moved (layout px). `corner` names the handle: a side
 * ('left', 'right', 'top', 'bottom') changes one length, a corner
 * ('top-left' ...) both. With `keepRatio` the starting proportions hold,
 * led by whichever length changed more.
 */
export function resizeBox({ width, height, dx, dy, corner, keepRatio = false, minWidth = 20, minHeight = 16 }) {
  const horizontal = /left|right/.test(corner);
  const vertical = /top|bottom/.test(corner);
  let w = horizontal ? width + (corner.includes('left') ? -dx : dx) : width;
  let h = vertical ? height + (corner.includes('top') ? -dy : dy) : height;
  if (keepRatio && width > 0 && height > 0) {
    const ratio = width / height;
    if (!vertical) h = w / ratio;
    else if (!horizontal) w = h * ratio;
    else if (Math.abs(w - width) / width >= Math.abs(h - height) / height) h = w / ratio;
    else w = h * ratio;
  }
  return { width: Math.max(minWidth, Math.round(w)), height: Math.max(minHeight, Math.round(h)) };
}

/**
 * Guides from the other items beside a dragged one: each item's left edge,
 * centre and right edge, in the same coordinates as `snapToGuides`.
 */
export function itemGuides(rects) {
  const guides = [];
  for (const r of rects) {
    if (!r || r.width < 1) continue;
    guides.push(
      { x: r.left, kind: 'start' },
      { x: r.left + r.width / 2, kind: 'centre' },
      { x: r.left + r.width, kind: 'end' },
    );
  }
  return guides;
}

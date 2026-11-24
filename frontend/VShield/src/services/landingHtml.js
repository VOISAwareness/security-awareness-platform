// Landing page HTML as the catalogue editor saves it, and as it comes back.
//
// The editor works on live, editable markup: contenteditable text, move
// cursors, a dashed outline round text boxes, "@UserName" chips. None of that
// belongs on the page a phished person sees, so saving goes through
// exportLandingHtml, which parks those editor-only bits in data-vshield-*
// attributes. prepareForEditor puts them back when the page is opened again,
// so the editor looks exactly as it did.
//
// Both directions also strip anything that could run script (saved pages are
// shared between admins and are loaded straight into the editor's DOM).

export const TRAINING_ROUTE = '/my-training';

// The tracking page refuses anything bigger (it shows the standard page
// instead) and the API refuses to save it. Keep in step with
// MAX_LANDING_BYTES in backend/tracking and backend/reference-api.
export const MAX_LANDING_BYTES = 350 * 1024;

const CANVAS_BG_ATTR = 'data-vshield-canvas-bg';
const DEFAULT_CANVAS_BG = '#ffffff';
const HEX_COLOUR = /^#[0-9a-f]{3,8}$/i;

const TEXTBOX_BORDER = { style: 'dashed', width: '1px', color: 'rgba(100, 116, 139, 0.35)' };
const FX_CHIP_COLOURS = ['#990099', 'rgb(153, 0, 153)'];

/** Size of the HTML as the API and tracking page count it (UTF-8 bytes). */
export function landingBytes(html) {
  return new TextEncoder().encode(String(html || '')).length;
}

/** Where the training buttons go: the app's own My Training page, absolute,
 *  because the page is served from the tracking domain, not the app's. */
export function trainingUrl(appUrl) {
  const base = String(appUrl || '').replace(/\/+$/, '');
  return base + TRAINING_ROUTE;
}

/** True for a link the editor treats as "go to My Training". */
export function isTrainingHref(href) {
  const h = String(href || '').trim();
  if (!h || h === '#' || h === '#training') return true;
  try {
    return new URL(h, 'https://x.invalid').pathname.replace(/\/+$/, '') === TRAINING_ROUTE;
  } catch {
    return false;
  }
}

/** Wrap the page in one element carrying the canvas background, so the colour
 *  is saved with the page. White (the default) and empty pages stay unwrapped. */
export function wrapCanvasBg(html, bg) {
  const content = String(html || '');
  const colour = String(bg || '').trim();
  if (!content.trim() || !HEX_COLOUR.test(colour) || colour.toLowerCase() === DEFAULT_CANVAS_BG
    || colour.toLowerCase() === '#fff') {
    return content;
  }
  return (
    '<div ' + CANVAS_BG_ATTR + '="' + colour + '" style="background-color:' + colour +
    ';min-height:100vh;width:100%;box-sizing:border-box;">' + content + '</div>'
  );
}

/** The reverse of wrapCanvasBg: { bg, html } with bg null when unwrapped. */
export function splitCanvasBg(html) {
  const content = String(html || '');
  const m = content.match(
    new RegExp('^\\s*<div ' + CANVAS_BG_ATTR + '="(#[0-9a-fA-F]{3,8})"[^>]*>([\\s\\S]*)</div>\\s*$')
  );
  return m ? { bg: m[1], html: m[2] } : { bg: null, html: content };
}

// ---------------------------------------------------------------------------
// DOM work (browser only: DOMParser builds an inert document, so nothing in
// the HTML loads or runs while it is being cleaned).
// ---------------------------------------------------------------------------

const DANGEROUS_TAGS = 'script, iframe, frame, frameset, object, embed, applet, base, meta, link[rel="import"]';
const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'background', 'poster'];

/** True for a URL that could run script. Embedded images (data:image/...)
 *  are allowed. Browsers ignore whitespace and control characters inside
 *  the scheme, so those are dropped first. */
export const isScriptUrl = (value) =>
  // eslint-disable-next-line no-control-regex
  /^(javascript:|vbscript:|data:(?!image\/))/i.test(String(value || '').replace(/[\s\u0000-\u001f]/g, ''));

function parseBody(html) {
  return new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html').body;
}

function sanitizeBody(body) {
  body.querySelectorAll(DANGEROUS_TAGS).forEach((el) => el.remove());
  body.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        el.removeAttribute(attr.name);
      } else if (URL_ATTRS.includes(name) && isScriptUrl(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return body;
}

/** Strip script, event handlers and script URLs. Content and styling stay. */
export function sanitizeLandingHtml(html) {
  if (!String(html || '').trim()) return String(html || '');
  return sanitizeBody(parseBody(html)).innerHTML;
}

const isTextboxBorder = (el) =>
  el.style.borderStyle === TEXTBOX_BORDER.style &&
  el.style.borderWidth === TEXTBOX_BORDER.width &&
  el.style.borderColor.replace(/\s+/g, '') === TEXTBOX_BORDER.color.replace(/\s+/g, '');

const isFxChip = (el) =>
  el.tagName === 'SPAN' &&
  (el.hasAttribute('data-vshield-fx') ||
    FX_CHIP_COLOURS.includes(el.style.color.replace(/\s+/g, ' ').toLowerCase()));

/**
 * The page as a phished person should get it: no script, nothing editable,
 * no editor cursors or outlines, plain-text placeholders (the tracking page
 * fills them in), and training links that point at the app itself.
 */
export function exportLandingHtml(html, { appUrl } = {}) {
  const { bg, html: inner } = splitCanvasBg(html);
  if (!inner.trim()) return String(html || '');
  const body = sanitizeBody(parseBody(inner));

  // Empty click-to-type boxes left behind by grid mode.
  body.querySelectorAll('.vshield-grid-cursor-box').forEach((box) => {
    const text = (box.textContent || '').replace(/\u200B/g, '').trim();
    if (!text && !box.querySelector('img, a')) box.remove();
  });

  body.querySelectorAll('[contenteditable]').forEach((el) => {
    el.setAttribute('data-vshield-editable', el.getAttribute('contenteditable'));
    el.removeAttribute('contenteditable');
  });
  body.querySelectorAll('[spellcheck]').forEach((el) => {
    el.setAttribute('data-vshield-spellcheck', el.getAttribute('spellcheck'));
    el.removeAttribute('spellcheck');
  });
  body.querySelectorAll('*').forEach((el) => {
    const cursor = el.style.cursor;
    if (cursor === 'move' || cursor === 'text') {
      el.setAttribute('data-vshield-cursor', cursor);
      el.style.removeProperty('cursor');
    }
    if (el.classList.contains('vshield-textbox') && isTextboxBorder(el)) {
      el.setAttribute('data-vshield-textbox-border', 'true');
      // The default is written as one `border:` shorthand; drop it whole
      // (every side matched the default, so nothing custom is lost).
      el.style.removeProperty('border');
      el.style.removeProperty('border-style');
      el.style.removeProperty('border-width');
      el.style.removeProperty('border-color');
    }
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  });

  body.querySelectorAll('span').forEach((span) => {
    if (isFxChip(span)) span.replaceWith(body.ownerDocument.createTextNode(span.textContent || ''));
  });

  const target = trainingUrl(appUrl);
  body.querySelectorAll('a[href]').forEach((a) => {
    if (isTrainingHref(a.getAttribute('href')) && a.closest('[data-action="training"], .vshield-custom-btn')) {
      a.setAttribute('href', target);
      a.setAttribute('target', '_top');
    }
  });
  body.querySelectorAll('[data-url]').forEach((el) => {
    if (isTrainingHref(el.getAttribute('data-url'))) el.setAttribute('data-url', target);
  });

  return wrapCanvasBg(body.innerHTML, bg);
}

/** Undo exportLandingHtml's parking so the editor shows the page as it was
 *  designed. Also cleans out anything that could run script. Expects HTML
 *  without the canvas background wrapper (see splitCanvasBg). */
export function prepareForEditor(html) {
  if (!String(html || '').trim()) return String(html || '');
  const body = sanitizeBody(parseBody(html));
  body.querySelectorAll('[data-vshield-editable]').forEach((el) => {
    el.setAttribute('contenteditable', el.getAttribute('data-vshield-editable'));
    el.removeAttribute('data-vshield-editable');
  });
  body.querySelectorAll('[data-vshield-spellcheck]').forEach((el) => {
    el.setAttribute('spellcheck', el.getAttribute('data-vshield-spellcheck'));
    el.removeAttribute('data-vshield-spellcheck');
  });
  body.querySelectorAll('[data-vshield-cursor]').forEach((el) => {
    el.style.cursor = el.getAttribute('data-vshield-cursor');
    el.removeAttribute('data-vshield-cursor');
  });
  body.querySelectorAll('[data-vshield-textbox-border]').forEach((el) => {
    el.style.borderStyle = TEXTBOX_BORDER.style;
    el.style.borderWidth = TEXTBOX_BORDER.width;
    el.style.borderColor = TEXTBOX_BORDER.color;
    el.removeAttribute('data-vshield-textbox-border');
  });
  return body.innerHTML;
}

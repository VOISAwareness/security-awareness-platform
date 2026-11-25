/**
 * Pictures in an email or a browser page, and whether the people they are
 * sent to will see them.
 *
 *  hosted    our own picture hosting (https://<cdn>/media/<32 hex>/<name>)
 *  embedded  inside the HTML (data:image/...): moved to hosting automatically
 *  external  another website's https address: shown, but it may go away
 *  missing   anything an employee's mail app or browser cannot load: a file
 *            name or path ("logo.png", "/img/x.jpg"), file:, blob:, plain
 *            http:, localhost; typical of HTML written by an AI or copied
 *            from someone's computer
 */

export const PICTURE_MAX_BYTES = 2 * 1024 * 1024;
export const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const HOSTED = /^https:\/\/[^/\s]+\/media\/[0-9a-f]{32}\/[A-Za-z0-9._-]+$/;
const LOCAL_HOST = /^https?:\/\/(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/|$)/i;

const decodeEntities = (text) =>
  String(text ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** What kind of address a picture has (see above). */
export function classifyPicture(src) {
  const value = decodeEntities(src).trim();
  if (!value) return 'missing';
  if (/^data:image\//i.test(value)) return 'embedded';
  if (HOSTED.test(value)) return 'hosted';
  if (LOCAL_HOST.test(value)) return 'missing';
  if (/^https:\/\//i.test(value)) return 'external';
  return 'missing';
}

// <img ... src="x" ...>, and url(x) in styles (a background picture).
const IMG_TAG = /<img\b[^>]*>/gi;
const SRC_ATTR = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const CSS_URL = /url\(\s*(?:&quot;|["'])?([^"')]*?)(?:&quot;|["'])?\s*\)/gi;

/**
 * Every picture in the HTML, in order: { src, kind, start, end } where
 * start / end are the offsets of the whole <img> tag or url(...) in `html`.
 */
export function findPictures(html) {
  const text = String(html ?? '');
  const found = [];
  for (const m of text.matchAll(IMG_TAG)) {
    const attr = m[0].match(SRC_ATTR);
    const src = attr ? decodeEntities(attr[1] ?? attr[2] ?? attr[3] ?? '') : '';
    found.push({ src, kind: 'img', start: m.index, end: m.index + m[0].length });
  }
  for (const m of text.matchAll(CSS_URL)) {
    const src = decodeEntities(m[1]).trim();
    // Only pictures: not fonts or other files a stylesheet may name.
    if (/\.(woff2?|ttf|otf|eot|css)(\?|#|$)/i.test(src)) continue;
    found.push({ src, kind: 'background', start: m.index, end: m.index + m[0].length });
  }
  return found.sort((a, b) => a.start - b.start);
}

/** The distinct addresses of the pictures that cannot be shown, in order. */
export function missingPictures(html) {
  const seen = new Set();
  for (const p of findPictures(html)) {
    if (p.kind === 'img' && !p.src) continue; // an <img> with no address yet
    if (classifyPicture(p.src) === 'missing') seen.add(p.src);
  }
  return [...seen];
}

/** The distinct data: pictures, to move to hosting. */
export function embeddedPictures(html) {
  return [...new Set(findPictures(html).filter((p) => classifyPicture(p.src) === 'embedded').map((p) => p.src))];
}

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeAttr = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * Every use of picture `from` (an <img> src or a url(...)) pointed at `to`,
 * whichever way the HTML quoted or escaped it.
 */
export function replacePicture(html, from, to) {
  const text = String(html ?? '');
  if (!from) return text;
  const spellings = [...new Set([from, escapeAttr(from)])].map(escapeRe).join('|');
  const srcRe = new RegExp(`(\\ssrc\\s*=\\s*)(["']?)(?:${spellings})\\2`, 'gi');
  const urlRe = new RegExp(`url\\(\\s*(&quot;|["'])?(?:${spellings})(?:&quot;|["'])?\\s*\\)`, 'gi');
  return text
    .replace(srcRe, (_, lead, quote) => `${lead}${quote || '"'}${quote === "'" ? to : escapeAttr(to)}${quote || '"'}`)
    .replace(urlRe, () => `url('${to}')`);
}

/** A file the user picked, checked before it is uploaded: '' when fine. */
export function pictureFileProblem(file) {
  if (!file) return 'No file was chosen.';
  if (!PICTURE_TYPES.includes(file.type)) return 'Only PNG, JPEG, GIF or WebP pictures can be used.';
  if (file.size > PICTURE_MAX_BYTES) return 'The picture is larger than 2 MB. Please use a smaller one.';
  return '';
}

/** A data: URL as a Blob, to upload a picture that was inside the HTML. */
export function dataUrlToBlob(dataUrl) {
  const m = String(dataUrl).match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!m) return null;
  const [, type, base64, payload] = m;
  const binary = base64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** "1 picture" / "3 pictures". */
export const picturesLabel = (n) => `${n} picture${n === 1 ? '' : 's'}`;

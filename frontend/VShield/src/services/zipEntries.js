/**
 * A zip's file list, read from its central directory only (the end of the
 * file), so checking a 100 MB course takes a moment and no memory: nothing is
 * unpacked. The server unpacks the package after upload (package-extract);
 * this only catches what would fail there, before the upload starts.
 *
 * Pure (Blob in, data out), so `node --test` covers it.
 */

const EOCD = 0x06054b50;
const EOCD64 = 0x06064b50;
const EOCD64_LOCATOR = 0x07064b50;
const CENTRAL = 0x02014b50;
const MAX_TAIL = 22 + 0xffff + 20;

async function bytesOf(blob, start, end) {
  return new DataView(await blob.slice(start, end).arrayBuffer());
}

/**
 * [{name, encrypted}] for every entry, or null when the file is not a zip.
 */
export async function zipEntries(blob) {
  const size = blob?.size || 0;
  if (size < 22) return null;
  const tailStart = Math.max(0, size - MAX_TAIL);
  const tail = await bytesOf(blob, tailStart, size);
  let at = -1;
  for (let i = tail.byteLength - 22; i >= 0; i -= 1) {
    if (tail.getUint32(i, true) === EOCD) {
      at = i;
      break;
    }
  }
  if (at < 0) return null;
  let count = tail.getUint16(at + 10, true);
  let cdSize = tail.getUint32(at + 12, true);
  let cdOffset = tail.getUint32(at + 16, true);
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    // ZIP64: the real numbers are in the ZIP64 end record
    const loc = at - 20;
    if (loc < 0 || tail.getUint32(loc, true) !== EOCD64_LOCATOR) return null;
    const recAt = Number(tail.getBigUint64(loc + 8, true));
    const rec = await bytesOf(blob, recAt, recAt + 56);
    if (rec.getUint32(0, true) !== EOCD64) return null;
    count = Number(rec.getBigUint64(32, true));
    cdSize = Number(rec.getBigUint64(40, true));
    cdOffset = Number(rec.getBigUint64(48, true));
  }
  if (cdOffset + cdSize > size) return null;
  const cd = await bytesOf(blob, cdOffset, cdOffset + cdSize);
  const utf8 = new TextDecoder('utf-8');
  const latin1 = new TextDecoder('latin1');
  const out = [];
  let p = 0;
  for (let n = 0; n < count; n += 1) {
    if (p + 46 > cd.byteLength || cd.getUint32(p, true) !== CENTRAL) return null;
    const flags = cd.getUint16(p + 8, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    const raw = new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen);
    out.push({ name: (flags & 0x800 ? utf8 : latin1).decode(raw), encrypted: Boolean(flags & 1) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const SKIPPED = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$)/;

function unsafe(name) {
  const path = name.replace(/\\/g, '/');
  return path.startsWith('/') || /^[A-Za-z]:/.test(path) || path.split('/').some((part) => part === '..');
}

/**
 * Whether a zip can be a training package, as the server will judge it:
 * {ok: true, kind: 'scorm' | 'html5', files} or {ok: false, why}.
 */
export function checkPackageEntries(entries) {
  if (!entries) return { ok: false, why: "This file isn't a readable zip." };
  const files = entries.filter((e) => !e.name.endsWith('/') && !SKIPPED.test(e.name.replace(/\\/g, '/')));
  if (!files.length) return { ok: false, why: 'The zip is empty.' };
  const bad = files.find((e) => unsafe(e.name));
  if (bad) return { ok: false, why: `The zip has a file with an unsafe path: ${bad.name.slice(0, 120)}` };
  if (files.some((e) => e.encrypted)) return { ok: false, why: 'The zip is password-protected.' };
  const names = files.map((e) => e.name.toLowerCase());
  if (names.some((n) => n === 'imsmanifest.xml' || n.endsWith('/imsmanifest.xml'))) {
    return { ok: true, kind: 'scorm', files: files.length };
  }
  if (names.some((n) => n.endsWith('.html') || n.endsWith('.htm'))) return { ok: true, kind: 'html5', files: files.length };
  return { ok: false, why: 'The zip has no imsmanifest.xml and no HTML page to open.' };
}

/** Read and check a chosen zip file in one go. */
export async function checkPackageZip(file) {
  try {
    return checkPackageEntries(await zipEntries(file));
  } catch {
    return { ok: false, why: "This file isn't a readable zip." };
  }
}

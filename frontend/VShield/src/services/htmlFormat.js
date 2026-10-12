/**
 * htmlFormat — readable HTML for the editors' HTML (code) view.
 *
 * formatHtml() puts block-level elements on their own indented lines, the way a
 * code editor shows HTML. It only adds or removes whitespace where browsers
 * ignore it (next to block boundaries), so switching to the HTML view and back
 * never changes how an email or landing page looks:
 *  - inline runs (text, <b>, <a>, <span>, <img>…) stay together on one line;
 *  - <pre>, <textarea> and <script> keep their content exactly;
 *  - an element styled display:inline… is treated as inline;
 *  - non-breaking spaces are never touched.
 *
 * highlightHtml() splits code into typed segments for colouring. The editor
 * renders them as text, never as markup.
 */

// Only these count as whitespace: U+00A0 (&nbsp;) is content.
const WS = /[ \t\n\r\f]+/g;
const trimWs = (s) => s.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, '');

const BLOCK = new Set([
  'address', 'article', 'aside', 'base', 'blockquote', 'body', 'caption', 'center', 'col',
  'colgroup', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
  'legend', 'li', 'link', 'main', 'meta', 'nav', 'noscript', 'ol', 'p', 'pre', 'script', 'section',
  'style', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'ul',
]);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Content kept byte for byte.
const RAW = new Set(['script', 'style', 'pre', 'textarea']);
// Opening the key implicitly closes an open element named in its list (HTML's
// optional end tags), so hand-written `<li>a<li>b` does not nest ever deeper.
const P_CLOSERS = ['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'];
const AUTO_CLOSES = {
  li: ['li'],
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],
  tr: ['tr', 'td', 'th'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  tbody: ['thead', 'tbody', 'tr', 'td', 'th'],
  tfoot: ['thead', 'tbody', 'tr', 'td', 'th'],
};
for (const tag of P_CLOSERS) AUTO_CLOSES[tag] = [...(AUTO_CLOSES[tag] || []), 'p'];

const INDENT = '  ';
const WIDTH = 100; // a block whose whole content fits stays on one line

const startsTag = (html, i) => html[i] === '<' && /[a-zA-Z!/?]/.test(html[i + 1] || '');

/** Split HTML into comment / decl / open / close / raw / text tokens, losslessly. */
export function tokenizeHtml(html) {
  const tokens = [];
  const n = html.length;
  let i = 0;
  while (i < n) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const stop = end === -1 ? n : end + 3;
      tokens.push({ type: 'comment', text: html.slice(i, stop) });
      i = stop;
      continue;
    }
    if (startsTag(html, i)) {
      // To the closing '>', skipping any inside quoted attribute values.
      let j = i + 1;
      let quote = null;
      while (j < n) {
        const c = html[j];
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") quote = c;
        else if (c === '>') break;
        j += 1;
      }
      const text = html.slice(i, Math.min(j + 1, n));
      i = Math.min(j + 1, n);
      const m = /^<(\/?)([a-zA-Z][\w:-]*)/.exec(text);
      if (!m) {
        tokens.push({ type: html[i - text.length + 1] === '/' ? 'text' : 'decl', text });
        continue;
      }
      const name = m[2].toLowerCase();
      if (m[1]) {
        tokens.push({ type: 'close', name, text });
        continue;
      }
      const selfClosing = VOID.has(name) || /\/\s*>$/.test(text);
      tokens.push({ type: 'open', name, text, selfClosing });
      if (RAW.has(name) && !selfClosing) {
        const rest = html.slice(i);
        const k = rest.search(new RegExp(`</${name}[\\s>]`, 'i'));
        const content = k === -1 ? rest : rest.slice(0, k);
        if (content) tokens.push({ type: 'raw', name, text: content });
        i += content.length;
      }
      continue;
    }
    let j = i + 1;
    while (j < n && !startsTag(html, j) && !html.startsWith('<!--', j)) j += 1;
    tokens.push({ type: 'text', text: html.slice(i, j) });
    i = j;
  }
  return tokens;
}

const isInlineStyled = (tag) => /\bstyle\s*=\s*("[^"]*|'[^']*)display\s*:\s*inline/i.test(tag);

/** Indent HTML for reading. Formatting formatted output returns it unchanged. */
export function formatHtml(html) {
  const src = String(html ?? '');
  if (!trimWs(src)) return src;

  const lines = []; // { depth, text, kind: 'tag' | 'inline' | 'raw' }
  const stack = []; // open elements: { name, block, depth, start }
  let depth = 0;
  let run = ''; // inline content waiting for its line
  let atom = null; // a <pre> or <script> being collected verbatim

  const flush = () => {
    const text = trimWs(run);
    if (text) lines.push({ depth, text, kind: 'inline' });
    run = '';
  };

  // Close a block: put its end tag on its own line, or fold the whole element
  // onto one line when its only content is a short inline run.
  const closeBlock = (entry, closeText) => {
    flush();
    depth = entry.depth;
    const inner = lines.slice(entry.start + 1);
    const open = lines[entry.start];
    const oneLine =
      inner.length === 0 ||
      (inner.length === 1 && inner[0].kind === 'inline' && !inner[0].text.includes('\n'));
    const joined = `${open.text}${inner.length ? inner[0].text : ''}${closeText}`;
    if (oneLine && depth * INDENT.length + joined.length <= WIDTH) {
      lines.length = entry.start;
      lines.push({ depth, text: joined, kind: 'tag' });
    } else if (closeText) {
      lines.push({ depth, text: closeText, kind: 'tag' });
    }
  };

  const popTo = (index, closeText) => {
    // Inline elements left open inside are closed implicitly; blocks fold.
    for (let k = stack.length - 1; k > index; k -= 1) {
      if (stack[k].block) closeBlock(stack[k], '');
    }
    const entry = stack[index];
    stack.length = index;
    if (entry.block) closeBlock(entry, closeText);
    else run += closeText;
  };

  for (const t of tokenizeHtml(src)) {
    if (atom !== null) {
      atom += t.text;
      if (t.type === 'close' && (t.name === 'pre' || t.name === 'script')) {
        lines.push({ depth, text: atom, kind: 'raw' });
        atom = null;
      }
      continue;
    }

    if (t.type === 'text') {
      run += t.text.replace(WS, ' ');
      continue;
    }

    if (t.type === 'raw') {
      if (t.name === 'style') {
        // CSS ignores whitespace: re-indent it under its tag.
        const cssLines = t.text.split('\n').filter((l) => trimWs(l));
        const shared = Math.min(...cssLines.map((l) => l.match(/^[ \t]*/)[0].length));
        cssLines.forEach((l) => lines.push({ depth, text: l.slice(shared).replace(/[ \t]+$/, ''), kind: 'raw' }));
      } else {
        run += t.text; // <textarea> content, as is
      }
      continue;
    }

    if (t.type === 'comment' || t.type === 'decl') {
      // Inside a run of text a comment stays where it is.
      if (trimWs(run)) run += t.text;
      else {
        run = '';
        lines.push({ depth, text: t.text, kind: 'tag' });
      }
      continue;
    }

    if (t.type === 'open') {
      const block = BLOCK.has(t.name) && !isInlineStyled(t.text);
      const closes = AUTO_CLOSES[t.name];
      if (closes && block) {
        const top = stack[stack.length - 1];
        if (top && top.block && closes.includes(top.name)) popTo(stack.length - 1, '');
      }
      if (block && (t.name === 'pre' || t.name === 'script') && !t.selfClosing) {
        flush();
        atom = t.text;
        continue;
      }
      if (!block) {
        run += t.text;
        if (!t.selfClosing) stack.push({ name: t.name, block: false });
        if (t.name === 'br') flush(); // a line break may start a new line
        continue;
      }
      flush();
      lines.push({ depth, text: t.text, kind: 'tag' });
      if (!t.selfClosing) {
        stack.push({ name: t.name, block: true, depth, start: lines.length - 1 });
        depth += 1;
      }
      continue;
    }

    // close
    let index = -1;
    for (let k = stack.length - 1; k >= 0; k -= 1) {
      if (stack[k].name === t.name) {
        index = k;
        break;
      }
    }
    if (index === -1) {
      // A stray end tag: keep it, on its own line if it is a block's.
      if (BLOCK.has(t.name)) {
        flush();
        lines.push({ depth, text: t.text, kind: 'tag' });
      } else run += t.text;
      continue;
    }
    popTo(index, t.text);
  }

  if (atom !== null) lines.push({ depth, text: atom, kind: 'raw' });
  // Elements still open at the end (end tags left out) close here.
  if (stack.length) popTo(0, '');
  flush();
  return lines.map((l) => INDENT.repeat(l.depth) + l.text).join('\n');
}

const ENTITY = /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi;

function textSegments(text, kind = 'text') {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(ENTITY)) {
    if (m.index > last) out.push({ kind, text: text.slice(last, m.index) });
    out.push({ kind: 'entity', text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind, text: text.slice(last) });
  return out;
}

function tagSegments(tag) {
  const out = [];
  const head = /^<\/?[a-zA-Z][\w:-]*/.exec(tag);
  if (!head) return [{ kind: 'tag', text: tag }];
  out.push({ kind: 'bracket', text: tag.startsWith('</') ? '</' : '<' });
  out.push({ kind: 'tag', text: head[0].replace(/^<\/?/, '') });
  const rest = tag.slice(head[0].length);
  const parts = /(\s+)|(\/?>)$|("[^"]*"?|'[^']*'?)|(=)|([^\s"'=>]+|.)/g;
  let afterEquals = false;
  for (const m of rest.matchAll(parts)) {
    if (m[1]) out.push({ kind: 'text', text: m[1] });
    else if (m[2]) out.push({ kind: 'bracket', text: m[2] });
    else if (m[3]) {
      out.push({ kind: 'value', text: m[3] });
      afterEquals = false;
    } else if (m[4]) {
      out.push({ kind: 'bracket', text: '=' });
      afterEquals = true;
    } else if (m[5]) {
      out.push({ kind: afterEquals ? 'value' : 'attr', text: m[5] });
      afterEquals = false;
    }
  }
  return out;
}

/**
 * Typed segments whose texts join back into `code` exactly:
 * bracket, tag, attr, value, comment, entity, text, raw.
 */
export function highlightHtml(code) {
  const out = [];
  for (const t of tokenizeHtml(String(code ?? ''))) {
    if (t.type === 'open' || t.type === 'close') out.push(...tagSegments(t.text));
    else if (t.type === 'comment' || t.type === 'decl') out.push({ kind: 'comment', text: t.text });
    else if (t.type === 'raw') out.push(...(t.name === 'textarea' ? textSegments(t.text) : [{ kind: 'raw', text: t.text }]));
    else out.push(...textSegments(t.text));
  }
  return out;
}

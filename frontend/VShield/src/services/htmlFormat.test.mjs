import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatHtml, highlightHtml } from './htmlFormat.js';

// Formatting may only touch whitespace (never U+00A0) — the rendered result is the same.
const sansWs = (s) => s.replace(/[ \t\n\r\f]+/g, '');

const EMAIL = '<table width="100%" style="font-family:Arial"><tbody><tr><td align="center"><img src="https://x.test/logo.png" alt="Logo"></td></tr><tr><td><p>Dear <b>{{userName}}</b>,</p><p>Your password expires today.&nbsp;Please <a href="{{phishLink}}" style="color:#E60000">reset it here</a> to keep access.</p><ul><li>Step one</li><li>Step two</li></ul></td></tr></tbody></table>';

test('blocks go on their own indented lines; short ones fold to one line', () => {
  assert.equal(
    formatHtml('<div><p>Hello <b>World</b></p><p>Two</p></div>'),
    '<div>\n  <p>Hello <b>World</b></p>\n  <p>Two</p>\n</div>'
  );
});

test('a realistic email reads like a code editor and only whitespace changed', () => {
  const out = formatHtml(EMAIL);
  assert.equal(sansWs(out), sansWs(EMAIL));
  assert.equal(
    out,
    [
      '<table width="100%" style="font-family:Arial">',
      '  <tbody>',
      '    <tr>',
      '      <td align="center"><img src="https://x.test/logo.png" alt="Logo"></td>',
      '    </tr>',
      '    <tr>',
      '      <td>',
      '        <p>Dear <b>{{userName}}</b>,</p>',
      '        <p>',
      '          Your password expires today.&nbsp;Please <a href="{{phishLink}}" style="color:#E60000">reset it here</a> to keep access.',
      '        </p>',
      '        <ul>',
      '          <li>Step one</li>',
      '          <li>Step two</li>',
      '        </ul>',
      '      </td>',
      '    </tr>',
      '  </tbody>',
      '</table>',
    ].join('\n')
  );
});

test('formatting is idempotent', () => {
  const once = formatHtml(EMAIL);
  assert.equal(formatHtml(once), once);
  const page = formatHtml('<html><head><style>body{margin:0}\n  .a{color:red}</style></head><body><h1>Hi</h1><pre>  keep\n    this</pre></body></html>');
  assert.equal(formatHtml(page), page);
});

test('inline runs, <pre>, <textarea> and non-breaking spaces are kept exactly', () => {
  assert.equal(formatHtml('<p>a<b>b</b>c <i>d</i></p>'), '<p>a<b>b</b>c <i>d</i></p>');
  assert.equal(formatHtml('<div><pre>  x\n   y</pre></div>'), '<div>\n  <pre>  x\n   y</pre>\n</div>');
  assert.equal(formatHtml('<p><textarea>  a\n b</textarea></p>'), '<p>\n  <textarea>  a\n b</textarea>\n</p>');
  assert.equal(formatHtml('<p>a   b</p>'), '<p>a   b</p>');
});

test('elements styled inline stay inline (whitespace between them would show)', () => {
  const cols = '<div style="display:inline-block">a</div><div style="display: inline-block">b</div>';
  assert.equal(formatHtml(cols), cols);
});

test('a line break may start a new line', () => {
  assert.equal(formatHtml('<p>Line one<br>Line two</p>'), '<p>\n  Line one<br>\n  Line two\n</p>');
});

test('long content is not folded onto the tag line', () => {
  const words = 'word '.repeat(30).trim();
  assert.equal(formatHtml(`<p>${words}</p>`), `<p>\n  ${words}\n</p>`);
});

test('style content is re-indented under its tag', () => {
  assert.equal(
    formatHtml('<head><style>\n    body { margin: 0 }\n    p { color: red }\n  </style></head>'),
    '<head>\n  <style>\n    body { margin: 0 }\n    p { color: red }\n  </style>\n</head>'
  );
});

test('optional end tags do not nest deeper and deeper', () => {
  assert.equal(formatHtml('<ul><li>a<li>b</ul>'), '<ul>\n  <li>a\n  <li>b\n</ul>');
  assert.equal(formatHtml('<p>one<p>two'), '<p>one\n<p>two');
});

test('comments, doctype and empty input', () => {
  assert.equal(formatHtml(''), '');
  assert.equal(formatHtml('<!DOCTYPE html><html><body><!-- note --><p>x</p></body></html>'),
    '<!DOCTYPE html>\n<html>\n  <body>\n    <!-- note -->\n    <p>x</p>\n  </body>\n</html>');
  assert.equal(formatHtml('<p>a<!-- c -->b</p>'), '<p>a<!-- c -->b</p>');
});

test('quoted ">" inside an attribute does not end the tag', () => {
  assert.equal(formatHtml('<div title="a > b"><p>x</p></div>'), '<div title="a > b">\n  <p>x</p>\n</div>');
});

test('highlight segments join back into the code, typed', () => {
  const code = formatHtml(EMAIL) + '\n<!-- end -->\n<style>p{}</style>';
  const segs = highlightHtml(code);
  assert.equal(segs.map((s) => s.text).join(''), code);
  const first = segs.slice(0, 7).map((s) => [s.kind, s.text]);
  assert.deepEqual(first, [
    ['bracket', '<'], ['tag', 'table'], ['text', ' '], ['attr', 'width'], ['bracket', '='], ['value', '"100%"'], ['text', ' '],
  ]);
  assert.ok(segs.some((s) => s.kind === 'entity' && s.text === '&nbsp;'));
  assert.ok(segs.some((s) => s.kind === 'comment' && s.text === '<!-- end -->'));
  assert.ok(segs.some((s) => s.kind === 'bracket' && s.text === '</'));
});

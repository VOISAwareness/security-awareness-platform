import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyPicture,
  dataUrlToBlob,
  embeddedPictures,
  findPictures,
  missingPictures,
  pictureFileProblem,
  picturesLabel,
  replacePicture,
} from './pictures.js';

const HOSTED = 'https://d1abc.cloudfront.net/media/0123456789abcdef0123456789abcdef/logo.png';

test('each kind of picture address', () => {
  assert.equal(classifyPicture(HOSTED), 'hosted');
  assert.equal(classifyPicture('data:image/png;base64,iVBORw0KGgo='), 'embedded');
  assert.equal(classifyPicture('https://images.example.com/hero.jpg'), 'external');
  for (const src of [
    'logo.png', './img/a.jpg', '/assets/b.png', 'file:///C:/Users/me/c.png', 'blob:https://x/1',
    'http://example.com/d.png', 'https://localhost:5173/e.png', 'http://127.0.0.1/f.png', '', '   ',
  ]) {
    assert.equal(classifyPicture(src), 'missing', src);
  }
  // a hosted look-alike that is not one of ours
  assert.equal(classifyPicture('https://cdn.example.com/media/short/logo.png'), 'external');
});

test('pictures are found in <img> tags and in CSS url(...)', () => {
  const html =
    '<div style="background:url(&quot;bg.jpg&quot;)"><img alt="Logo" src="logo.png" width="120"></div>' +
    "<img src='" + HOSTED + "'><p style=\"background-image: url('hero.png')\"></p>" +
    '<style>@font-face{src:url(font.woff2)} .x{background:url(data:image/gif;base64,R0lGOD==)}</style>';
  const found = findPictures(html);
  assert.deepEqual(found.map((p) => [p.kind, p.src]), [
    ['background', 'bg.jpg'],
    ['img', 'logo.png'],
    ['img', HOSTED],
    ['background', 'hero.png'],
    ['background', 'data:image/gif;base64,R0lGOD=='],
  ]);
  const logo = found[1];
  assert.equal(html.slice(logo.start, logo.end), '<img alt="Logo" src="logo.png" width="120">');
  assert.deepEqual(missingPictures(html + '<img src="logo.png">'), ['bg.jpg', 'logo.png', 'hero.png']);
  assert.deepEqual(embeddedPictures(html), ['data:image/gif;base64,R0lGOD==']);
});

test('an <img> still being written (no src) is not flagged', () => {
  assert.deepEqual(missingPictures('<img alt="x">'), []);
  assert.deepEqual(missingPictures('<img src="">'), []);
});

test('a picture is swapped everywhere it is used, whatever the quoting', () => {
  const html =
    '<img src="logo.png"><img src=\'logo.png\' alt="b"><img src=logo.png>' +
    '<div style="background:url(&quot;logo.png&quot;)"></div><i style="background:url(logo.png)"></i>' +
    '<img src="other.png">';
  const out = replacePicture(html, 'logo.png', HOSTED);
  assert.doesNotMatch(out, /src=["']?logo\.png|url\((&quot;|["'])?logo\.png/);
  assert.equal(out.split(HOSTED).length - 1, 5);
  assert.match(out, /<img src="other.png">/);
  assert.equal(replacePicture(html, '', HOSTED), html);
});

test('a picture file is checked before upload', () => {
  assert.equal(pictureFileProblem({ type: 'image/png', size: 1000 }), '');
  assert.match(pictureFileProblem({ type: 'image/svg+xml', size: 10 }), /PNG/);
  assert.match(pictureFileProblem({ type: 'image/jpeg', size: 3 * 1024 * 1024 }), /2 MB/);
  assert.match(pictureFileProblem(null), /No file/);
});

test('a data: picture becomes a file to upload', async () => {
  const blob = dataUrlToBlob('data:image/gif;base64,R0lGODlhAQABAAAAACw=');
  assert.equal(blob.type, 'image/gif');
  assert.equal((await blob.arrayBuffer()).byteLength, 14);
  assert.equal(dataUrlToBlob('not a data url'), null);
  assert.equal(picturesLabel(1), '1 picture');
  assert.equal(picturesLabel(3), '3 pictures');
});

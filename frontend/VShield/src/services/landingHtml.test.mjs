import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_LANDING_BYTES,
  isTrainingHref,
  landingBytes,
  splitCanvasBg,
  trainingUrl,
  wrapCanvasBg,
} from './landingHtml.js';

test('size is counted in UTF-8 bytes, as the API and tracking page count it', () => {
  assert.equal(landingBytes('abc'), 3);
  assert.equal(landingBytes('é'), 2);
  assert.equal(landingBytes(''), 0);
  assert.equal(MAX_LANDING_BYTES, 350 * 1024);
});

test('training links are absolute on the app, whatever the trailing slash', () => {
  assert.equal(trainingUrl('https://app.example.com'), 'https://app.example.com/my-training');
  assert.equal(trainingUrl('https://app.example.com/'), 'https://app.example.com/my-training');
});

test('only training-shaped links count as training links', () => {
  for (const href of ['', '#', '#training', '/my-training', '/my-training/', 'https://app.example.com/my-training']) {
    assert.equal(isTrainingHref(href), true, href);
  }
  for (const href of ['https://intranet.example.com/policy', '/help', 'mailto:sec@example.com']) {
    assert.equal(isTrainingHref(href), false, href);
  }
});

test('a non-white canvas background is saved with the page and read back', () => {
  const page = '<div class="a"><p>Hi</p></div><p>Two</p>';
  const wrapped = wrapCanvasBg(page, '#0F172A');
  assert.notEqual(wrapped, page);
  assert.deepEqual(splitCanvasBg(wrapped), { bg: '#0F172A', html: page });
});

test('white, empty or malformed backgrounds leave the page untouched', () => {
  const page = '<p>Hi</p>';
  assert.equal(wrapCanvasBg(page, '#FFFFFF'), page);
  assert.equal(wrapCanvasBg(page, '#fff'), page);
  assert.equal(wrapCanvasBg(page, 'red;"><script>'), page);
  assert.equal(wrapCanvasBg('', '#000000'), '');
  assert.deepEqual(splitCanvasBg(page), { bg: null, html: page });
});

test('script URLs are caught however they are disguised; embedded images are not', async () => {
  const { isScriptUrl } = await import('./landingHtml.js');
  for (const url of ['javascript:alert(1)', ' JaVaScRiPt:x', 'java\tscript:x', 'vbscript:x', 'data:text/html,<b>']) {
    assert.equal(isScriptUrl(url), true, url);
  }
  for (const url of ['https://x.test', '/my-training', 'data:image/png;base64,AAAA', '#training']) {
    assert.equal(isScriptUrl(url), false, url);
  }
});

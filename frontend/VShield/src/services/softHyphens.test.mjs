import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHY, breakPoints, softHyphenate } from './softHyphens.js';

const show = (text) => softHyphenate(text).replaceAll(SHY, '-');

test('long words get syllable breaks, with at least three letters each side', () => {
  assert.equal(show('verification'), 'veri-fica-tion');
  assert.equal(show('impersonating'), 'imper-so-nat-ing');
  assert.equal(show('credential'), 'cre-den-tial');
  for (const word of ['verification', 'communications', 'vulnerability']) {
    for (const at of breakPoints(word)) assert.ok(at >= 3 && word.length - at >= 3, `${word} at ${at}`);
  }
});

test('common endings break off whole', () => {
  assert.equal(show('Management'), 'Manage-ment');
  assert.equal(show('announcements'), 'announce-ments');
  assert.equal(show('everything'), 'every-thing');
  assert.equal(show('restructuring'), 'restruc-tur-ing');
});

test('short words, numbers and punctuation are left alone; the visible text is unchanged', () => {
  const text = 'Urgent IT Helpdesk: reboot & update (SC-044), 2026 workers!';
  assert.equal(softHyphenate(text).replaceAll(SHY, ''), text);
  assert.equal(show('Click the link'), 'Click the link');
  assert.equal(softHyphenate(''), '');
  assert.equal(softHyphenate(undefined), undefined);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { csvCell, csvName, sectionsCsv, toCsv } from './csv.js';

test('csvCell quotes, keeps numbers, and makes formulas inert', () => {
  assert.equal(csvCell('Smith, John'), '"Smith, John"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell(-260), '-260');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('-1+1'), "'-1+1");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell(true), 'Yes');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(NaN), '');
});

test('toCsv and sectionsCsv lay the tables out', () => {
  const cols = [{ label: 'Name', value: (r) => r.n }, { label: 'Points', value: (r) => r.p }];
  assert.equal(toCsv(cols, [{ n: 'A', p: 1 }, { n: 'B, C', p: -2 }]), 'Name,Points\r\nA,1\r\n"B, C",-2');
  assert.equal(sectionsCsv([{ title: 'One', columns: cols, rows: [] }, { title: 'Two', columns: cols, rows: [] }]), 'One\r\nName,Points\r\n\r\nTwo\r\nName,Points');
});

test('csvName makes a dated file name', () => {
  assert.match(csvName('Big picture', 'Q4 Credential Harvest Drill'), /^big-picture-q4-credential-harvest-drill-\d{4}-\d{2}-\d{2}\.csv$/);
});

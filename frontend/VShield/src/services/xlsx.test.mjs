import assert from 'node:assert/strict';
import test from 'node:test';
import { strFromU8, unzipSync } from 'fflate';

import { columnName, sheetName, workbook, xlsxName, xmlText } from './xlsx.js';

const open = (bytes) => {
  const files = unzipSync(bytes);
  return Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strFromU8(v)]));
};

test('columnName: A to Z, then AA', () => {
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnName), ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
});

test('xmlText escapes markup and drops control characters', () => {
  assert.equal(xmlText(`a & <b> "c" 'd'`), 'a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;');
  assert.equal(xmlText('x\u0001y\u0008z'), 'xyz');
  assert.equal(xmlText('tab\tand\nline'), 'tab\tand\nline', 'tabs and new lines are kept');
});

test('sheetName: what Excel accepts, unique', () => {
  const taken = new Set();
  assert.equal(sheetName('What hooks: each [level]?', taken), 'What hooks each level');
  assert.equal(sheetName('A'.repeat(40), taken).length, 31);
  assert.equal(sheetName('People', taken), 'People');
  assert.equal(sheetName('people', taken), 'people 2', 'case-insensitive duplicates get a number');
});

test('workbook: sheets, numbers as numbers, text never a formula, frozen header, filter', () => {
  const bytes = workbook({
    title: 'Test',
    sheets: [
      { name: 'Summary', freeze: false, blocks: [{ title: 'Hello & welcome' }, { note: 'A note' }, { gap: true }, { heading: 'Part one' }] },
      {
        name: 'Data',
        blocks: [
          { title: 'Data' },
          { table: {
            columns: [{ label: 'Name', value: (r) => r.name }, { label: 'Points', value: (r) => r.points, kind: 'int' }, { label: 'Share', value: (r) => r.share, kind: 'pct' }],
            rows: [{ name: '=1+1', points: -300, share: 0.25 }, { name: 'Bob', points: 1200, share: null }],
            filter: true,
          } },
        ],
      },
    ],
  });
  const f = open(bytes);
  for (const part of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'docProps/core.xml']) assert.ok(f[part], part);
  assert.match(f['xl/workbook.xml'], /<sheet name="Summary" sheetId="1"[^>]*\/><sheet name="Data" sheetId="2"/);
  assert.ok(f['xl/worksheets/sheet1.xml'].includes('Hello &amp; welcome'));
  const data = f['xl/worksheets/sheet2.xml'];
  assert.ok(!data.includes('<f>'), 'no formulas anywhere');
  assert.match(data, /<c r="A3" t="inlineStr" s="\d+"><is><t xml:space="preserve">=1\+1<\/t><\/is><\/c>/, 'text that looks like a formula stays text');
  assert.match(data, /<c r="B3" s="5"><v>-300<\/v><\/c>/, 'a whole number, formatted');
  assert.match(data, /<c r="C3" s="7"><v>0.25<\/v><\/c>/, 'a share, as a percentage');
  assert.match(data, /<c r="C4" s="7"\/>/, 'an empty cell keeps its style (and its row line), with no value');
  assert.match(data, /<pane ySplit="2" topLeftCell="A3"[^>]*state="frozen"/, 'the header stays in view');
  assert.ok(data.includes('<autoFilter ref="A2:C4"/>'));
  assert.ok(f['xl/workbook.xml'].includes(`<definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">'Data'!$A$2:$C$4</definedName>`));
});

test('xlsxName: a dated, tidy file name', () => {
  assert.match(xlsxName('Big picture', 'The organisation', 'report'), /^big-picture-the-organisation-report-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('a spanning column merges across the grid, header and rows alike', () => {
  const f = open(workbook({ sheets: [{ name: 'S', blocks: [{ table: { columns: [{ label: 'Sheet', value: (r) => r[0] }, { label: 'What it shows', value: (r) => r[1], span: 3 }], rows: [['People', 'Everyone']] } }] }] }));
  const xml = f['xl/worksheets/sheet1.xml'];
  assert.ok(xml.includes('<mergeCells count="2"><mergeCell ref="B1:D1"/><mergeCell ref="B2:D2"/></mergeCells>'));
  assert.match(xml, /<c r="B2" t="inlineStr"[^>]*><is><t xml:space="preserve">Everyone<\/t>/);
});

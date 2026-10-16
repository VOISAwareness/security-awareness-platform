/**
 * A small Excel (.xlsx) writer, enough for readable reports: several sheets,
 * each a run of blocks top to bottom (a title, a note, a section heading, a
 * table, a gap). Tables get bold headers on a dark band, set widths, real
 * numbers with formats (whole numbers, signed points, percentages, one
 * decimal) so people can sort, sum and filter; the first table on a sheet
 * can freeze its header and carry a filter. It opens the same in Excel,
 * Google Sheets, LibreOffice and Numbers.
 *
 * Text is written as inline strings, never as formulas, so no cell can run
 * anything. Pure apart from downloadXlsx, so `node --test` can cover it.
 *
 *   workbook({ title, sheets: [{ name, blocks, freeze }] }) -> Uint8Array
 *   block: { title } | { note } | { heading } | { gap: true }
 *        | { table: { columns: [{ label, value, kind, width, span }], rows, filter } }
 *   kind: 'text' (default) | 'int' | 'signed' | 'pct' (a fraction) | 'dec'
 *   A value may be { value, kind } to format one cell its own way; `span`
 *   merges a column across that many sheet columns, so tables of different
 *   shapes can share one grid.
 */
import { strToU8, zipSync } from 'fflate';

// Styles, by their index in styles.xml (cellXfs).
const S = { plain: 0, title: 1, note: 2, header: 3, text: 4, int: 5, signed: 6, pct: 7, dec: 8, heading: 9, key: 10 };
const KIND = { text: S.text, int: S.int, signed: S.signed, pct: S.pct, dec: S.dec, key: S.key };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="+#,##0;-#,##0;0"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="0.0"/></numFmts>
<fonts count="6">
<font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="15"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="12"/><color rgb="FF0F766E"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** "A", "B", … "Z", "AA" for a 0-based column. */
export function columnName(i) {
  let n = i + 1;
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Text safe inside XML: the five entities escaped, control characters dropped. */
export function xmlText(v) {
  return String(v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** A sheet name Excel accepts: no []:*?/\, at most 31 characters, unique in `taken`. */
export function sheetName(name, taken = new Set()) {
  const base = String(name || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let out = base;
  for (let k = 2; taken.has(out.toLowerCase()); k += 1) out = `${base.slice(0, 31 - String(k).length - 1)} ${k}`;
  taken.add(out.toLowerCase());
  return out;
}

// Table styles carry a row line, so an empty table cell is still written (styled, no value).
const LINED = new Set([S.text, S.int, S.signed, S.pct, S.dec, S.key]);

function cellXml(ref, value, style) {
  if (value === null || value === undefined || value === '') return LINED.has(style) ? `<c r="${ref}" s="${style}"/>` : '';
  if (typeof value === 'boolean') value = value ? 'Yes' : '';
  if (value === '') return LINED.has(style) ? `<c r="${ref}" s="${style}"/>` : '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return LINED.has(style) ? `<c r="${ref}" s="${style}"/>` : '';
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  // text cells use the text style, so numbers' formats never touch them
  const s = style === S.int || style === S.signed || style === S.pct || style === S.dec ? S.text : style;
  return `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
}

function rowXml(r, cells, height) {
  const body = cells.filter(Boolean).join('');
  return `<row r="${r}"${height ? ` ht="${height}" customHeight="1"` : ''}>${body}</row>`;
}

// The length a value shows as, for column widths.
const shown = (v, kind) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return kind === 'pct' ? 6 : String(Math.round(v)).length + 3;
  return String(v).length;
};

/** One worksheet's XML, and where its filter sits (for the workbook's defined names). */
function sheetXml({ blocks, freeze = true }, { selected }) {
  const rows = [];
  let r = 0;
  let widths = [];
  let frozenAt = null;
  let filter = null;
  const merges = [];
  const wide = (i, n) => { widths[i] = Math.max(widths[i] || 0, n); };
  blocks.forEach((b) => {
    if (b.gap) { r += 1; return; }
    if (b.title !== undefined) { r += 1; rows.push(rowXml(r, [cellXml(`A${r}`, b.title, S.title)], 24)); return; }
    if (b.note !== undefined) { r += 1; rows.push(rowXml(r, [cellXml(`A${r}`, b.note, S.note)])); return; }
    if (b.heading !== undefined) { r += 1; rows.push(rowXml(r, [cellXml(`A${r}`, b.heading, S.heading)], 20)); return; }
    if (!b.table) return;
    const { columns, rows: data, filter: withFilter = false } = b.table;
    // where each column starts on the sheet's grid, and how far it spans
    const at = [];
    columns.reduce((x, c) => { at.push(x); return x + (c.span || 1); }, 0);
    const last = at[at.length - 1] + (columns[columns.length - 1].span || 1) - 1;
    const merge = (row) => columns.forEach((c, i) => { if ((c.span || 1) > 1) merges.push(`${columnName(at[i])}${row}:${columnName(at[i] + c.span - 1)}${row}`); });
    r += 1;
    const head = r;
    rows.push(rowXml(r, columns.flatMap((c, i) => [cellXml(`${columnName(at[i])}${r}`, c.label, S.header), ...Array.from({ length: (c.span || 1) - 1 }, (_, k) => `<c r="${columnName(at[i] + k + 1)}${r}" s="${S.header}"/>`)]), 30));
    merge(r);
    columns.forEach((c, i) => { if (!c.span || c.span === 1) wide(at[i], c.width || Math.min(14, String(c.label).length + 2)); });
    data.forEach((row) => {
      r += 1;
      rows.push(rowXml(r, columns.map((c, i) => {
        let v = c.value(row);
        let kind = c.kind || 'text';
        if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) { kind = v.kind || kind; v = v.value; }
        if (!c.width && (!c.span || c.span === 1)) wide(at[i], Math.min(60, shown(v, kind) + 2));
        return cellXml(`${columnName(at[i])}${r}`, v, KIND[kind] ?? S.text);
      })));
      merge(r);
    });
    if (frozenAt === null && freeze) frozenAt = head;
    if (withFilter && !filter && data.length) filter = `A${head}:${columnName(last)}${r}`;
  });
  widths = Array.from({ length: Math.max(1, widths.length) }, (_, i) => Math.max(8, Math.min(70, widths[i] || 10)));
  const view = frozenAt
    ? `<sheetView workbookViewId="0"${selected ? ' tabSelected="1"' : ''}><pane ySplit="${frozenAt}" topLeftCell="A${frozenAt + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${frozenAt + 1}" sqref="A${frozenAt + 1}"/></sheetView>`
    : `<sheetView workbookViewId="0"${selected ? ' tabSelected="1"' : ''}/>`;
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews>${view}</sheetViews>
<sheetFormatPr defaultRowHeight="16"/>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${rows.join('')}</sheetData>${filter ? `<autoFilter ref="${filter}"/>` : ''}${merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  return { xml, filter };
}

/** The whole workbook as the bytes of an .xlsx file. */
export function workbook({ title = 'Report', sheets }) {
  const taken = new Set();
  const named = sheets.map((s) => ({ ...s, name: sheetName(s.name, taken) }));
  const files = {};
  const built = named.map((s, i) => sheetXml(s, { selected: i === 0 }));
  built.forEach((b, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(b.xml); });
  const names = built.map((b, i) => (b.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlText(named[i].name.replace(/'/g, "''"))}'!${b.filter.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : '')).join('');
  files['[Content_Types].xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${named.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  files['_rels/.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  files['xl/workbook.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${named.map((s, i) => `<sheet name="${xmlText(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${names ? `<definedNames>${names}</definedNames>` : ''}</workbook>`);
  files['xl/_rels/workbook.xml.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${named.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  files['xl/styles.xml'] = strToU8(STYLES);
  files['docProps/core.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlText(title)}</dc:title><dc:creator>VOIS Shield</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`);
  files['docProps/app.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>VOIS Shield</Application></Properties>`);
  return zipSync(files, { level: 6 });
}

/** "big-picture-organisation-2026-10-15.xlsx" */
export function xlsxName(...parts) {
  const slug = parts.filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

/** Save workbook bytes as an .xlsx file. */
export function downloadXlsx(filename, bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

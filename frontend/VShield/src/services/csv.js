/**
 * CSV for exports. A cell is quoted when it needs to be; text a spreadsheet
 * would run as a formula (starting =, +, -, @) gets a leading apostrophe so it
 * stays text. Numbers stay numbers, true/false read Yes/No, empty is blank.
 * Pure, so `node --test` can cover it; downloadCsv is the only browser part.
 */
export function csvCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** `columns` are { label, value: (row) => cell }; one header line, then a line per row. */
export function toCsv(columns, rows) {
  const line = (cells) => cells.map(csvCell).join(',');
  return [line(columns.map((c) => c.label)), ...rows.map((r) => line(columns.map((c) => c.value(r))))].join('\r\n');
}

/** Several tables in one file, each under its title, a blank line between. */
export function sectionsCsv(sections) {
  return sections.map((s) => `${csvCell(s.title)}\r\n${toCsv(s.columns, s.rows)}`).join('\r\n\r\n');
}

/** "big-picture-organisation-2026-10-15.csv" */
export function csvName(...parts) {
  const slug = parts.filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
}

/** Save `text` as a CSV file (with a BOM, so Excel reads accents right). */
export function downloadCsv(filename, text) {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

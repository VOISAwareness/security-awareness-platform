import test from "node:test";
import assert from "node:assert/strict";

import {
  actionLink,
  cleanPastedHtml,
  firstFontFamily,
  fontSizePx,
  fromUnit,
  itemGuides,
  plainTextToHtml,
  resizeBox,
  toUnit,
} from "./canvasText.js";

test("cleanPastedHtml drops scripts, styles, handlers and script links", () => {
  const out = cleanPastedHtml(
    '<html><head><meta charset="utf-8"><style>p{color:red}</style></head><body>' +
      '<script>alert(1)</script><p onclick="steal()" style="color: #333">Hi</p>' +
      '<a href="javascript:alert(1)">x</a><iframe src="https://e.x"></iframe></body></html>',
  );
  assert.equal(out, '<p style="color: #333">Hi</p><a href="#">x</a>');
});

test("cleanPastedHtml keeps only the copied fragment and strips Office markup", () => {
  const word =
    '<html><body><!--StartFragment--><p class=MsoNormal style="mso-line-height-rule:exactly; font-size: 12pt">' +
    'Dear <b>team</b><o:p></o:p></p><!--[if gte mso 9]><xml>junk</xml><![endif]--><!--EndFragment--></body></html>';
  assert.equal(cleanPastedHtml(word), '<p style="font-size: 12pt">Dear <b>team</b></p>');
});

test("plainTextToHtml escapes and keeps line breaks", () => {
  assert.equal(plainTextToHtml("a < b\r\nc & d"), "a &lt; b<br>c &amp; d");
});

test("fontSizePx and firstFontFamily read computed styles", () => {
  assert.equal(fontSizePx("14.6667px"), 15);
  assert.equal(fontSizePx(""), null);
  assert.equal(firstFontFamily("\"Segoe UI\", Calibri, Arial"), "Segoe UI");
});

test("actionLink gives each On-Click its link", () => {
  assert.equal(actionLink("landing"), "{{phishLink}}");
  assert.equal(actionLink("page"), "{{phishLink}}?next=browser");
  assert.equal(actionLink("training"), "{{compromiseLink}}");
});

test("toUnit and fromUnit convert px and cm", () => {
  assert.equal(toUnit(240, "px"), "240");
  assert.equal(toUnit(37.7952755906, "cm"), "1.00");
  assert.equal(fromUnit("2", "cm"), 76);
  assert.equal(fromUnit("120", "px"), 120);
  assert.equal(fromUnit("abc", "px"), null);
});

test("resizeBox changes one length from a side and both from a corner", () => {
  assert.deepEqual(resizeBox({ width: 100, height: 50, dx: 20, dy: 30, corner: "right" }), { width: 120, height: 50 });
  assert.deepEqual(resizeBox({ width: 100, height: 50, dx: 20, dy: 30, corner: "top" }), { width: 100, height: 20 });
  assert.deepEqual(resizeBox({ width: 100, height: 50, dx: -10, dy: 10, corner: "bottom-left" }), {
    width: 110,
    height: 60,
  });
});

test("resizeBox keeps proportions when asked", () => {
  assert.deepEqual(resizeBox({ width: 100, height: 50, dx: 50, dy: 0, corner: "bottom-right", keepRatio: true }), {
    width: 150,
    height: 75,
  });
  assert.deepEqual(resizeBox({ width: 100, height: 50, dx: 0, dy: 25, corner: "bottom", keepRatio: true }), {
    width: 150,
    height: 75,
  });
});

test("resizeBox never goes below the minimum", () => {
  assert.deepEqual(resizeBox({ width: 40, height: 30, dx: -100, dy: -100, corner: "bottom-right" }), {
    width: 20,
    height: 16,
  });
});

test("itemGuides gives each item's edges and centre", () => {
  assert.deepEqual(itemGuides([{ left: 10, width: 100 }, { left: 0, width: 0 }]), [
    { x: 10, kind: "start" },
    { x: 60, kind: "centre" },
    { x: 110, kind: "end" },
  ]);
});

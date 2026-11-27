import test from "node:test";
import assert from "node:assert/strict";

import {
  alignRects,
  clampToPage,
  distributeRects,
  emptyPageHtml,
  fitScale,
  isLaidOut,
  moveLayers,
  pageHeightFor,
  resizeRect,
  scaleIntoGroup,
  snapLines,
  snapRect,
  unionRects,
} from "./canvasLayout.js";

const r = (left, top, width, height) => ({ left, top, width, height });

test("moveLayers moves one layer at a time", () => {
  const order = ["a", "b", "c", "d"];
  assert.deepEqual(moveLayers(order, ["b"], "forward"), ["a", "c", "b", "d"]);
  assert.deepEqual(moveLayers(order, ["c"], "backward"), ["a", "c", "b", "d"]);
  assert.deepEqual(moveLayers(order, ["d"], "forward"), order);
  assert.deepEqual(moveLayers(order, ["a"], "backward"), order);
});

test("moveLayers sends to the front or back, keeping a selection's own order", () => {
  const order = ["a", "b", "c", "d"];
  assert.deepEqual(moveLayers(order, ["a", "c"], "front"), ["b", "d", "a", "c"]);
  assert.deepEqual(moveLayers(order, ["b", "d"], "back"), ["b", "d", "a", "c"]);
  assert.deepEqual(moveLayers(order, ["a", "b"], "forward"), ["c", "a", "b", "d"]);
  assert.deepEqual(moveLayers(order, ["x"], "front"), order);
});

test("alignRects aligns to a box on either axis", () => {
  const box = r(0, 0, 600, 400);
  assert.deepEqual(alignRects([r(50, 10, 100, 40)], "center", box), [r(250, 10, 100, 40)]);
  assert.deepEqual(alignRects([r(50, 10, 100, 40)], "right", box), [r(500, 10, 100, 40)]);
  assert.deepEqual(alignRects([r(50, 10, 100, 40)], "middle", box), [r(50, 180, 100, 40)]);
  assert.deepEqual(alignRects([r(50, 10, 100, 40)], "bottom", box), [r(50, 360, 100, 40)]);
});

test("distributeRects evens the gaps and keeps the outer two", () => {
  const out = distributeRects([r(0, 0, 10, 10), r(100, 0, 10, 10), r(30, 0, 10, 10)], "horizontal");
  assert.deepEqual(out.map((x) => x.left), [0, 100, 50]);
  const two = distributeRects([r(0, 0, 10, 10), r(5, 0, 10, 10)], "vertical");
  assert.deepEqual(two.map((x) => x.top), [0, 0]);
});

test("snapRect snaps to the nearest edge or centre on each axis", () => {
  const lines = snapLines(r(0, 0, 600, 400), [r(100, 100, 50, 50)]);
  const centred = snapRect(r(247, 30, 100, 40), lines);
  assert.equal(centred.rect.left, 250);
  assert.equal(centred.guideX, 300);
  const toItem = snapRect(r(152, 98, 20, 20), lines);
  assert.equal(toItem.rect.left, 150);
  assert.equal(toItem.rect.top, 100);
  const free = snapRect(r(420, 230, 20, 20), lines);
  assert.equal(free.guideX, null);
  assert.equal(free.guideY, null);
});

test("clampToPage keeps an item inside the page sideways", () => {
  assert.deepEqual(clampToPage(r(560, -5, 100, 20), 600), r(500, 0, 100, 20));
  assert.deepEqual(clampToPage(r(-30, 10, 700, 20), 600), r(0, 10, 600, 20));
});

test("resizeRect keeps the opposite edge and can keep proportions", () => {
  assert.deepEqual(resizeRect(r(100, 100, 200, 100), "left", 20, 0), r(120, 100, 180, 100));
  assert.deepEqual(resizeRect(r(100, 100, 200, 100), "top-left", -20, -10), r(80, 90, 220, 110));
  assert.deepEqual(resizeRect(r(0, 0, 200, 100), "bottom-right", 100, 0, { keepRatio: true }), r(0, 0, 300, 150));
  assert.deepEqual(resizeRect(r(0, 0, 50, 50), "right", -100, 0), r(0, 0, 16, 50));
});

test("scaleIntoGroup scales a part with its group", () => {
  assert.deepEqual(scaleIntoGroup(r(10, 20, 100, 40), r(0, 0, 200, 100), r(0, 0, 400, 50)), r(20, 10, 200, 20));
});

test("page size helpers", () => {
  assert.equal(fitScale(300, 600), 0.5);
  assert.equal(fitScale(900, 600), 1);
  assert.equal(pageHeightFor([r(0, 500, 10, 60)], 360), 584);
  assert.equal(pageHeightFor([], 360), 360);
  assert.deepEqual(unionRects([r(10, 10, 10, 10), r(0, 30, 5, 5)]), r(0, 10, 20, 25));
});

test("emptyPageHtml is a laid-out page", () => {
  const html = emptyPageHtml(600, 360);
  assert.ok(isLaidOut(html));
  assert.ok(html.includes("width:600px"));
  assert.equal(isLaidOut("<p>Hello</p>"), false);
});

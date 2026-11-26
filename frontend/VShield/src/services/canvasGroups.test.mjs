import test from "node:test";
import assert from "node:assert/strict";

import {
  clampMove,
  marginForGap,
  rectsIntersect,
  snapToGuides,
  toggleBlock,
  unionRects,
} from "./canvasGroups.js";

test("unionRects holds every rectangle and skips empty ones", () => {
  assert.deepEqual(
    unionRects([
      { left: 10, top: 20, width: 30, height: 10 },
      { left: 0, top: 25, width: 5, height: 40 },
      { left: 99, top: 99, width: 0, height: 0 },
      null,
    ]),
    { left: 0, top: 20, width: 40, height: 45 },
  );
  assert.equal(unionRects([]), null);
});

test("rectsIntersect counts any overlap, not touching edges", () => {
  const a = { left: 0, top: 0, width: 10, height: 10 };
  assert.equal(rectsIntersect(a, { left: 5, top: 5, width: 10, height: 10 }), true);
  assert.equal(rectsIntersect(a, { left: 10, top: 0, width: 5, height: 5 }), false);
  assert.equal(rectsIntersect(a, null), false);
});

test("toggleBlock adds a block, or takes it out when already picked", () => {
  assert.deepEqual(toggleBlock(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleBlock(["a", "b"], "a"), ["b"]);
  assert.deepEqual(toggleBlock(["a"], null), ["a"]);
});

test("clampMove keeps an item inside the canvas, even one wider than it", () => {
  const limits = { minLeft: -20, maxLeft: 80, minTop: -5 };
  assert.deepEqual(clampMove({ left: 100, top: -50 }, limits), { left: 80, top: -5 });
  assert.deepEqual(clampMove({ left: -40, top: 12 }, limits), { left: -20, top: 12 });
  assert.deepEqual(clampMove({ left: 30, top: 0 }, { minLeft: 4, maxLeft: -10, minTop: 0 }), { left: 4, top: 0 });
});

test("marginForGap gives the margin for a gap, sharing the block above's margin", () => {
  assert.equal(marginForGap(30, null), 30);
  assert.equal(marginForGap(30, 14), 30);
  assert.equal(marginForGap(14, 14), 14);
  assert.equal(marginForGap(6, 14), -8);
  assert.equal(marginForGap(-20, 14), -34);
  assert.equal(marginForGap(5, -3), 5);
});

test("snapToGuides snaps to the nearest container edge or centre", () => {
  const guides = [
    { x: 0, kind: "start" },
    { x: 300, kind: "centre" },
    { x: 600, kind: "end" },
  ];
  assert.deepEqual(snapToGuides({ left: 3, width: 100, guides }), { left: 0, guide: guides[0] });
  assert.deepEqual(snapToGuides({ left: 246, width: 100, guides }), { left: 250, guide: guides[1] });
  assert.deepEqual(snapToGuides({ left: 495, width: 100, guides }), { left: 500, guide: guides[2] });
  assert.deepEqual(snapToGuides({ left: 120, width: 100, guides }), { left: 120, guide: null });
});

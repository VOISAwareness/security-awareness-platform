# Canvas editor foundation

Status: **reference** (27 Nov 2026). The model the scenario email / browser-page
editor is built on, written so another developer — or another AI session — can
understand it and build the same kind of editor for the other surfaces the app
needs one for (Landing page, Certificate, Announcement, and so on).

This is the *how it works and why* document. The code is the source of truth;
file and symbol names below point into it.

---

## 1. What this is

A WYSIWYG **free-position canvas editor**, modelled on Power BI's report canvas,
not a word-processor. The author places elements anywhere on a fixed-width
"page", layers them, groups them, and the saved output is plain HTML that renders
the same in the preview and to the end user.

It currently drives two surfaces inside one React component:

- the **email body** (page width 600px), and
- the **browser page / "page 2"** (width 1280px) a phishing click can open.

The same foundation is meant to be reused for the app's other editors
(**Landing page**, **Certificate**, etc. — see §10).

**Primary files**

| File | Role |
|------|------|
| `frontend/VShield/src/services/canvasLayout.js` | The layout model: geometry, layers, groups, and the DOM ⇄ HTML conversion. Half pure functions, half DOM helpers. |
| `frontend/VShield/src/services/canvasText.js` | Text/styling helpers: paste cleaning, font sizes, unit conversion, link placeholders. Pure. |
| `frontend/VShield/src/services/simulationPages.js` | Page *semantics* for the phishing simulation: page ids, the On-Click/link placeholders, preview fill, and what makes a page valid. Partly reusable, partly simulation-specific. |
| `frontend/VShield/src/Pages/Scenarios/CreateNewScenario/EmailDetailsTab/EmailBodyRichTextEditor.jsx` | The editor component itself: state, pointer handling, toolbar, Selection pane, modals. Large. |
| `*.test.mjs` next to the services | `node --test` unit tests for the **pure** functions (no DOM). |

---

## 2. The core mental model

Four ideas carry the whole design. Hold these and the rest follows.

1. **A page is a fixed-width box.** The author designs at a true pixel width
   (600 for email, 1280 for browser). The editor *scales the whole page down* to
   fit the viewport (CSS `transform: scale()`), so **the canvas never scrolls
   sideways** — only down. Because the design width is fixed, the preview and the
   delivered HTML match the canvas exactly.

2. **Every element is an absolutely-positioned item.** No flow layout. Each item
   has `position:absolute; left; top; width; height; z-index`. The author moves
   and resizes items freely; items may overlap.

3. **Layer order is DOM order.** `z-index` is just the item's index among its
   siblings (back = 1). "Bring forward / send backward" swap siblings by one;
   "to front / back" move to the ends. See `moveLayers` / `renumberLayers`.

4. **Groups are one level deep.** An item can be a *group* that contains *parts*,
   positioned relative to the group. A group cannot contain another group. A
   single click selects the top-level item (which may be a group); a double-click
   reaches a part inside it.

Everything saved is ordinary HTML. Everything the editor draws *on top* (handles,
toolbars, snap guides, marquee) is **never saved** — it is marked
`data-floating-control` and lives outside the saved tree.

---

## 3. The DOM contract

This is the single most important section to copy. A "laid-out page" is:

```html
<div class="vshield-page" data-page-width="600" data-min-height="360"
     style="position:relative; width:600px; height:…; margin:0 auto; overflow:hidden; box-sizing:border-box; background-color:…">

  <!-- an item -->
  <div class="vshield-canvas-item" data-type="text"
       style="position:absolute; left:40px; top:24px; width:520px; height:auto; z-index:3; box-sizing:border-box; margin:0">
     …content…
  </div>

  <!-- a group: parts positioned relative to the group box -->
  <div class="vshield-canvas-item vshield-group-item" data-type="group"
       style="position:absolute; left:…; top:…; width:…; height:…; z-index:2">
     <div class="vshield-canvas-item" data-type="shape" data-item-name="Background"
          style="position:absolute; left:0; top:0; width:…; height:…"></div>
     <div class="vshield-canvas-item" data-type="text" style="position:absolute; …"></div>
  </div>
</div>
```

**Classes** (`canvasLayout.js` constants):

- `vshield-page` (`PAGE_CLASS`) — the page root. Exactly one per editor surface.
- `vshield-canvas-item` (`ITEM_CLASS`) — any selectable item, top-level or a part.
- `vshield-group-item` (`GROUP_CLASS`) — added to an item that is a group.

**Data attributes:**

| Attribute | On | Meaning |
|-----------|----|---------|
| `data-page-width` | page | design width in px (authoritative; default from `PAGE_WIDTH`) |
| `data-min-height` | page | least height the page keeps |
| `data-type` | item | one of `text, button, input, image, shape, card, element, group` — drives icons, resize behaviour, On-Click eligibility |
| `data-item-name` | item | author's rename, shown in the Selection pane (else a name is derived from text) |
| `data-hidden="true"` | item | hidden: `display:none` and left out of the saved/sent output |
| `data-action`, `data-url` | item | the On-Click (simulation only — see §8) |
| `data-floating-control="true"` | overlay | editor-only chrome; never part of a saved item |

**Invariants** (keep these true or geometry breaks):

- An item's `left/top` are relative to its parent: the page for a top-level item,
  the group box for a part.
- `writeRect` always sets `box-sizing:border-box` and `margin:0`, so nested
  margins never shift a lifted item.
- `z-index` is assigned only by `renumberLayers(parent)` from sibling order.
- The page is `overflow:hidden`; its height is fit to its lowest item plus
  `PAGE_BOTTOM_ROOM` by `fitPageHeight`.

---

## 4. Pure core vs DOM helpers (`canvasLayout.js`)

The module is split so the hard geometry is **testable without a browser**.

**Pure (unit-tested in `canvasLayout.test.mjs`):**

- `unionRects`, `rectsIntersect` — rectangle maths.
- `fitScale(available, pageWidth)` — the scale that fits the page to the viewport
  (never above 1).
- `pageHeightFor(rects, min)` — page height from its items.
- `clampToPage(rect, pageWidth)` — keep an item inside the page horizontally.
- `moveLayers(order, moving, op)` — `forward|backward|front|back` on an id list.
- `alignRects(rects, mode, bounds)` — left/center/right/top/middle/bottom.
- `distributeRects(rects, axis)` — even the gaps.
- `snapLines(container, others)` / `snapRect(rect, lines, threshold)` — snapping
  to page and sibling edges/centres.
- `resizeRect(start, handle, dx, dy, opts)` — the 8 resize handles, with optional
  ratio lock and min size.
- `scaleIntoGroup(part, from, to)` — scale a part when its group is resized.

**DOM helpers (browser only, not unit-tested):**

- `readRect(el)` / `writeRect(el, rect, {height})` — item geometry ⇄ inline style.
- `pageOf(host)`, `layerItems(parent)`, `renumberLayers(parent)`,
  `fitPageHeight(page, min)`.
- `layoutPageHtml(html, {width, minHeight, textStyle, background})` — convert
  flowing HTML into a laid-out page (see §6).
- `emptyPageHtml(width, minHeight, bg)`, `isLaidOut(html)`.

**Rule of thumb when extending:** push every calculation you can into a pure
function and test it; keep DOM functions thin. New editors reuse the pure core
unchanged.

---

## 5. Coordinates and scaling

There are **three** coordinate spaces, and most editor bugs are a confusion
between them:

1. **Page space** — the design pixels an item is stored in (`left/top/width`).
2. **Overlay space** — the scrollable editor area where handles/toolbars are
   drawn at full size (unscaled).
3. **Screen space** — `getBoundingClientRect()`.

The page is rendered inside a wrapper with `transform: scale(canvasFit)` where
`canvasFit = fitScale(viewportWidth − gutter, pageWidth)`. A `ResizeObserver` on
the scroller recomputes `canvasFit` whenever the editor resizes.

To convert a screen rect to the overlay so a handle lands on the item:
`toOverlay(getBoundingClientRect())` (in the component). `pageScale()` is the
page-rect width ÷ offset width (app zoom × fit); `overlayScale()` is the
scroller's. When you drag, divide screen deltas by `pageScale()` to get page px.

**Why fixed width + scale:** it guarantees the three promises the author cares
about — no horizontal scroll, and preview/delivery identical to the canvas.

---

## 6. Converting legacy / template HTML into items

Templates and older saved content are **flowing HTML** (nested `<div>`s, a card,
headings, a button), not laid-out pages. `layoutPageHtml` renders that HTML in a
hidden host at the page width, measures every block, and rebuilds it as absolute
items. Key behaviours:

- **Each top-level block becomes its own item**, placed where it rendered.
- **A "panel" (a card with ≥2 structural children) becomes a group**: its own box
  styles become a back `data-type="shape"` part named `Background`, and each child
  becomes a part.
- **Transparent wrappers are flattened.** Real templates are deeply nested (card →
  a padding-only wrapper → paragraphs and a button). `collectItems` recurses
  through wrapper `<div>`s that have no box of their own, so buried elements
  surface as their own items. Elements *with* a box (a coloured callout) are kept
  whole.
- **Action buttons are lifted out as solo top-level items** (in front of the
  group), so Submit/Verify/Sign-in is selectable and configurable on its own —
  see `isButton` in `layoutPageHtml`.

Raw template HTML that has no item markers is first run through
`componentizeTemplateHtml` (in the component), which tags `<a>` buttons,
images, headings, paragraphs, inputs and styled containers with
`vshield-canvas-item` + `data-type`. `ensurePageHtml(html, pageId, width, {fresh})`
is the single entry point the component uses: it lays out if needed, optionally
neutralises actions (§8), and strips `contenteditable`.

The conversion is **one-way and cached** — once laid out, HTML round-trips as a
page; `isLaidOut` guards against re-converting.

---

## 7. Selection, editing and pointer model

- **The page root is not `contenteditable`.** Text is edited one item at a time:
  a double-click (or Enter/F2) sets `contenteditable` on that single item
  (`editingRef`/`editingItem`). On save, `contenteditable` and `spellcheck` are
  stripped from the HTML.
- **Click semantics:** a press selects the top-level item under the cursor, which
  may be a group. Once a part of a group is selected, further presses pick parts
  of that group. A double-click on a group selects the part under the mouse; a
  double-click on a text item edits it. `Esc` steps back out: stop editing → part
  to group → clear selection.
- **Multi-select:** Ctrl/Shift-click adds items at the same level; a drag on empty
  canvas is a marquee (`startBoxSelect`).
- **Overlays:** handles, the selection frame, the multi-select toolbar, snap
  guides and the marquee are drawn in overlay space from `toOverlay(...)` and are
  marked `data-floating-control` so they never enter the saved HTML.
- **Selection pane** (Power BI's): lists items front-to-back, groups expand to
  their parts; per-row show/hide (`data-hidden`), double-click rename
  (`data-item-name`), drag to reorder or move into/out of a group.

---

## 8. Page semantics and the On-Click model (`simulationPages.js`)

This layer is where the generic canvas meets *this* app's phishing simulation.
Some is reusable (ids, preview fill); the On-Click rules are simulation-specific.

- **Pages:** `EMAIL_PAGE_ID = 1`, `BROWSER_PAGE_ID = 2`, `MAX_PAGES = 2`,
  `PAGE_LABELS`.
- **Link placeholders** (the only "actions", because email clients and the served
  page follow *links*, never scripts):
  - `{{phishLink}}` — click → landing page (`data-action="landing"`).
  - `{{phishLink}}?next=browser` — click → browser page (`data-action="page"`).
  - `{{compromiseLink}}` — browser page submit → compromised (`data-action="training"`).
- **Nothing is pre-wired.** `toBrowserPageHtml(html)` neutralises a *fresh*
  template: strips `data-action`/`data-url`, turns phishing/compromise links into
  inert `#`, adds `onclick="return false;"`. The author sets the On-Click on the
  real submit button. `ensurePageHtml(..., {fresh:true})` applies this on both
  pages; a *saved* page keeps whatever it already has (never neutralised on load).
- **Which elements may carry an action:** any element on the email; only a real
  submit button on the browser page (`ACTION_WORDS` + `isActionButton`).
- **Validation:** `simulationProblem({emailBody, browserPageHtml})` returns the
  message that blocks a save (email needs a trap; a browser page must be opened by
  the email and must have a configured compromise action; no page may show a
  broken picture). The wizard's Next button stays enabled and toasts the message.
- **Preview:** `previewHtml` / `previewSubject` fill placeholders with sample
  values and strip editor-only markup, so the author sees what the recipient sees.

For a **non-simulation editor** (Certificate, generic Landing page) you keep the
canvas (§2–§7) and replace this layer with your own notion of "what the output
means" — or drop actions entirely.

---

## 9. What is saved vs what is editor-only

Saved (round-trips as the page HTML):

- the `vshield-page` root, its width/min-height/background;
- every `vshield-canvas-item` with its position, size, `z-index`, `data-type`,
  `data-item-name`, `data-hidden`, and (simulation) `data-action`/`data-url`.

Never saved (stripped or marked `data-floating-control`):

- `contenteditable` / `spellcheck`;
- the fx tint (an editor-only CSS class, `.vshield-fx`, not inline style);
- handles, toolbars, snap guides, the marquee, picture-upload markers;
- hover outlines (CSS scoped to `.vshield-editor-canvas`).

`synchroniseEditorValue()` is the choke point: it tidies the page, strips
editor-only attributes, updates `pageHeightPx`, and emits the clean HTML via
`onChange` / `onBrowserPageChange`.

---

## 10. Building a new editor on this foundation

To add, say, a **Certificate** or **Landing page** editor:

1. **Reuse `canvasLayout.js` as-is.** It has no simulation knowledge. Pick a page
   width and min height for your surface (add entries to `PAGE_WIDTH` /
   `PAGE_MIN_HEIGHT`, or pass explicit values to `layoutPageHtml` / `emptyPageHtml`).
2. **Reuse `canvasText.js` as-is** for paste cleaning, font sizes and units.
3. **Render the same DOM contract** (§3): one `vshield-page`, items with the
   classes and inline geometry, `z-index` via `renumberLayers`.
4. **Reuse the scale-to-fit shell** (§5): a scaled wrapper + `ResizeObserver` →
   `fitScale`, overlays drawn from `toOverlay`.
5. **Reuse the pointer/selection/group model** (§7): the click/double-click
   semantics, the Selection pane, the eight handles, snapping and alignment are
   all surface-agnostic.
6. **Replace the semantics layer** (§8) with your own:
   - A Certificate has no actions — drop `data-action` and the On-Click modal.
   - A generic Landing page may keep `{{phishLink}}`/placeholders but with its own
     validation; write a `yourPageProblem(...)` like `simulationProblem`.
   - Keep placeholder-fill for the preview if your output is personalised.
7. **Keep the save contract** (§9): one `synchroniseEditorValue`-style choke point
   that emits clean HTML.

The honest caveat: the editor component itself
(`EmailBodyRichTextEditor.jsx`) is large and still carries email/browser
specifics. The clean seams to extract for reuse are the **three service modules**
and the **DOM contract**. A good refactor would lift the pointer/selection/group
engine into a shared hook (e.g. `useCanvasEditor`) that each surface wraps; until
then, copy the component and swap the semantics layer.

---

## 11. Testing conventions

- **Pure functions are unit-tested** with `node --test` (`*.test.mjs`), no DOM,
  no jsdom. Run: `cd frontend/VShield && npm test`.
- **DOM functions** (`layoutPageHtml`, pointer handling) are **not** unit-tested
  here — there is no browser in CI. They are verified by hand in the app. When you
  add geometry, put it in a pure function and test it; keep the DOM wrapper thin.
- `npm run build` must stay clean. ESLint is advisory (pre-existing react-hooks
  debt, per `AGENTS.md`); don't add new unused vars.

---

## 12. Invariants and gotchas (quick list)

- One `vshield-page` per surface; items are its descendants only.
- `left/top` are parent-relative; a part's parent is its group.
- `z-index` comes only from `renumberLayers`; never hand-set it.
- Groups are one level deep — never nest a group in a group.
- Buttons in templates are lifted **solo**, not kept inside the group.
- Fresh templates start with **no** On-Click; saved pages keep theirs.
- Everything drawn over the canvas is `data-floating-control` and must never be
  saved; `contenteditable`/`spellcheck`/fx-tint are stripped on save.
- Design at the fixed page width; the viewport only scales it. Don't let an item's
  width depend on the viewport.
- The email is delivered with **absolute positions as designed** (a product
  decision): it looks right in the preview and Apple Mail, and reflows in Outlook
  for Windows, new Outlook and Gmail.

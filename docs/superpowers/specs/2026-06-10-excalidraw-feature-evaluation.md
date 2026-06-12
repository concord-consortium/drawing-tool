# Excalidraw — Feature-Fit Evaluation

**Date:** 2026-06-10
**Companion to:** `2026-06-10-unified-drawing-tool-assessment.md` (the feature
inventory). Section numbers below (§3.1–§3.9) refer to that document's dimensions.

## Purpose & scope

The companion assessment surveyed third-party options on **activity and
popularity** and flagged Excalidraw as the most popular *full* drawing component
that is also MIT-licensed. This document does the **opposite** axis for that one
candidate: it evaluates **Excalidraw against the features in §3** — i.e. could
Excalidraw, as an embeddable component, satisfy what question-interactives, codap
DrawTool, and CLUE actually need?

This is primarily a **feature-fit** evaluation. Raw popularity metrics live in the
companion doc; a **project health & longevity** section (timeline, roadmap,
company/business model) is included below because it bears directly on whether
Excalidraw is a safe long-term foundation.

**Subject:** `@excalidraw/excalidraw` React component, **MIT**, v0.18.x
(latest June 2026). Canvas-rendered, hand-drawn aesthetic, flat element data
model, ships with an imperative API (`excalidrawAPI`) and export utilities.

**Verdict legend:** ✓ strong fit · ◐ partial / integration work needed ·
✗ gap / would need building · ⚠ mismatch or risk.

## Summary scorecard

| §3 dimension | Fit | One-line |
|---|:--:|---|
| 3.1 Toolbar tools | ✓ | Superset of legacy + CLUE for shapes; configurable/hideable UI |
| 3.2 Object manipulation & control points | ✓ | Resize, rotate, multi-point line edit, group, align, flip, z-order, binding |
| 3.3 Stamps & background images | ◐ | "Libraries" ≈ stamps (good); **no background-image layer** (color only) |
| 3.4 Zoom / pan / canvas | ✓ | Built-in zoom, pan, zoom-to-fit, scroll |
| 3.5 Touch / mobile | ◐ | Works, but desktop-first; known stylus/palm/multitouch gaps |
| 3.6 State & persistence (managed) | ✓ | `initialData`+`onChange` for save/load; `updateScene(captureUpdate)` for CLUE-style external history |
| 3.7 Image export (PNG/SVG) | ✓ | `exportToBlob` (PNG), `exportToSvg` (SVG), `exportToCanvas` — first-class |
| 3.8 Accessibility | ✗ | **Weakest area.** Canvas has no semantic object model; Deque audit open; no screen-reader description of drawn objects |
| 3.9 Engine-specific (variables, voice, annotation) | ◐ | No variables/voice/leader-annotations; but extensible via libraries/embeddables |

**Headline:** Excalidraw is a **strong fit on the mechanical drawing dimensions**
(tools, manipulation, zoom, export) and — importantly — its state model is a
**genuine fit for CLUE's managed-component requirement**, the single hardest
constraint in §3.6. The two real problems are **accessibility** (§3.8, a net gap
that is arguably *worse* than CLUE's current object-list head start) and a set of
**model-mapping mismatches** (background images, nested groups, the hand-drawn
aesthetic) that are surmountable but not free.

---

## Project health & longevity

Because adopting Excalidraw is a multi-year bet, its history, governance, and
business model matter as much as its feature list.

### Timeline & popularity trajectory

- **Launched January 1, 2020** by **Christopher Chedeau** ("vjeux") — a notably
  credible founder (co-creator of React Native, creator of Prettier; then a Meta
  engineer). It began as a side-project prototype: hand-drawn boxes and arrows.
- **Popular almost immediately, not a slow burn.** Within the first ~two weeks it
  gained ellipses/text/selection/color and the Excalidraw name; by mid-January
  2020 it already had ~12k users and ~1.5k GitHub stars. The 2020 remote-work
  surge accelerated adoption.
- **Sustained growth to a top-tier OSS project:** ~125k GitHub stars and ~1.2M
  monthly npm downloads of `@excalidraw/excalidraw` by mid-2026 (see companion
  doc). So it has **5+ years of history** and a large, active community — not a
  young or fading project.

### Roadmap & the perpetual 0.x

- After 5+ years it is **still pre-1.0** (currently **0.18.x**, June 2026). The
  embeddable package treats every minor as potentially breaking: releases ship
  **migration guides** between 0.x versions (e.g. 0.17→0.18), and the npm package
  exposes a `@next` channel for unreleased changes.
- **Practical implication:** integrating means **pinning a version and budgeting
  periodic migration work**; the API is mature and widely used but does *not* yet
  carry a formal stability guarantee. (Third-party coverage has floated a ~2027
  target for 1.0, but **I could not confirm any official 1.0 date** from
  Excalidraw's own docs/repo — treat the "1.0 is coming" framing as unverified.)
- The public backlog/roadmap is maintained as a GitHub Projects board; roadmap
  priorities are driven by the maintainers and the Excalidraw+ product, **not by
  external embedders** — so features we care about (notably accessibility, §3.8)
  are not guaranteed to be prioritized on our timeline.

### Company & business model

- **Independent, bootstrapped, revenue-funded — no venture capital** (Crunchbase
  shows no funding rounds). A **small team (~6 people)**, in deliberate contrast
  to VC-funded competitors like Miro/FigJam.
- **Business model = open-core freemium, monetized via SaaS, not via the
  library.** The editor is **MIT and positioned as "free forever"**; revenue comes
  from **Excalidraw+** (hosted SaaS, ~$6/user/month: cloud workspace, live
  collaboration, presentations, AI, admin/access management). There is also an
  Open Collective for donations.
- **Why this is favorable for us:** unlike tldraw, the monetization lever is the
  **hosted product and team workflows**, *not* license keys or paid extensions to
  the embeddable component. The thing we would embed (`@excalidraw/excalidraw`) is
  the fully-MIT open-source core with **no watermark and no license fee** — the
  paid tier sits *around* it, not *inside* it.

### What's MIT vs. proprietary — and can the server features be replaced?

A natural worry: is the MIT editor just a thin client that's useless without
Excalidraw's servers? The answer is **no** — and the boundary is cleanly drawn.

- **The editor component (`@excalidraw/excalidraw`) is MIT and essentially
  client-side.** It ships **no** server features and **gates nothing** behind a
  backend. Instead it exposes the **integration points** to build server-backed
  features yourself: `onChange` (persist), `updateScene(…, { captureUpdate })`
  (apply remote/external changes), `onPointerUpdate` + `isCollaborating` +
  `appState.collaborators` + `<LiveCollaborationTrigger/>` (live cursors/presence).
  "The package doesn't come with collaboration built in… but exposes APIs to
  implement it."
- **The server-dependent features in the open-source surface are *also* MIT.** The
  reference app at excalidraw.com (`excalidraw-app` in the monorepo) is open source
  and demonstrates real-time multiplayer using **`excalidraw-room`** — a separate
  **MIT** Node.js/Socket.IO relay server. It is **stateless and end-to-end
  encrypted** (the server only relays AES-GCM ciphertext; the key lives in the URL
  fragment, which browsers never send to the server). The whole stack —
  editor + app + collaboration server — is **self-hostable**.
- **What is *not* open source is the Excalidraw+ SaaS backend:** managed accounts,
  persistent cloud storage/workspaces, presentations, AI prompts, and admin/access
  management. But these are **product/infrastructure services layered on top of the
  same MIT editor**, not locked-away editor capabilities.

**So, directly to the question:** yes — in principle another group can implement
their own server-backed features (persistence, sharing, even live collaboration)
and the MIT editor will work with them, because the editor is explicitly designed
to be driven by an external backend through its props/imperative API. Excalidraw's
own open-source app + `excalidraw-room` is the existence proof. Re-creating the
*Excalidraw+* differentiators means building that backend yourself (real work),
but nothing in the **editor** is paywalled or license-keyed to make you do so —
the contrast with tldraw (which license-keys the component itself) is sharp.

**Relevance to us:** we would embed only the MIT editor and wire it to our **own**
persistence — LARA `interactiveState`, the CODAP state handler, and CLUE's
document/MST model — using exactly these props. We would not touch Excalidraw+ at
all. If multi-user editing in CLUE ever became a goal, the same `updateScene
(captureUpdate: NEVER)` + `onPointerUpdate` primitives (optionally reusing
`excalidraw-room`) would carry it — see §3.6.

### Longevity read

| Signal | Reading |
|---|---|
| Age & adoption | ✓ Strong — 5+ yrs, ~125k★, ~1.2M dl/mo, very active |
| Founder/credibility | ✓ Strong — React Native / Prettier author |
| Funding model | ✓ Healthy — bootstrapped, profitable-by-design SaaS funds the OSS core |
| License of the embeddable | ✓ MIT, free-forever, no keys/watermark (vs. tldraw) |
| API stability | ◐ Caution — perpetual 0.x, breaking changes between minors, no confirmed 1.0 date |
| Team size | ◐ Caution — small (~6); roadmap set by their SaaS priorities, not embedders |

**Net:** the project-health picture is **largely reassuring** — a mature, popular,
sustainably-funded OSS project with an MIT core that the business model actively
protects. The two cautions are operational, not existential: **plan for version
pinning + migrations** (no 1.0 stability promise yet), and **don't assume our
priorities (e.g. accessibility) will appear on their roadmap** — we would likely
build those ourselves regardless.

---

## Dimension-by-dimension

### 3.1 Toolbar tools — ✓

**Requirement:** select, freehand, line, arrow/double-arrow, rect/square,
ellipse/circle, text (sizes), stamp, image, clone, delete, color/width, z-order;
CLUE adds align/group/rotate/flip/zoom.

**Excalidraw:** selection, rectangle, diamond, ellipse, arrow, line, draw
(freehand), text, image, eraser, frame, embeddable, laser pointer, plus
Mermaid-to-diagram. Stroke/fill color, stroke width, stroke style (solid/dashed/
dotted), opacity, "sloppiness," arrowheads, font family/size. Arrowheads cover the
arrow/double-arrow need; uniform square/circle come from shift-constrained
rect/ellipse rather than separate tools.

The toolbar is **customizable**: `UIOptions.canvasActions` toggles built-in
actions, `viewModeEnabled`/`zenModeEnabled` strip chrome, and host UI can be
injected (`renderTopRightUI`). Each host could present a reduced toolbar much like
question-interactives' `hideDrawingTools` does today.

**Notes/gaps:** No built-in "annotation" leader-line tool (see §3.9). No literal
"stamp" tool — Libraries fill that role (§3.3). The default look is **hand-drawn**
(see aesthetic note below).

### 3.2 Object manipulation & control points — ✓

**Requirement:** move, resize handles, scale, rotate, custom line/arrow endpoint
handles, multi-select, group, align, flip, z-order.

**Excalidraw:** drag-move; 8 resize handles with a dedicated **rotation** handle;
**line/arrow point editing** (enter a line editor to drag individual points and
add/remove them) — the analog of the legacy custom endpoint handles; rubber-band
**multi-select**; **group/ungroup** (Cmd+G / Cmd+Shift+G); **align** and
**distribute** via context menu; **flip** horizontal/vertical (Shift+H / Shift+V);
**z-order** send-to-front/back/forward/backward. **Arrow binding** keeps arrows
attached to shapes when shapes move — a capability none of our three engines has
today (a bonus, not a requirement).

**Notes/gaps:** Grouping is represented as a **flat `groupIds` array on each
element**, not a nested tree. Excalidraw does support *nested* groups via stacked
group ids, but the shape differs from CLUE's nested `GroupObject` tree — a
**data-model mapping concern** for migration (§ model-mapping). Reported
limitation: alignment commands don't reposition elements *inside* an existing
group.

### 3.3 Stamps & background images — ◐

**Requirement:** stamp tool + authored stamp collections (qi); background image as
a distinct layer with fit modes (legacy qi & codap); CLUE treats images as
objects with no background layer.

**Excalidraw:**
- **Stamps → "Libraries."** Excalidraw's Libraries are collections of reusable
  elements (`.excalidrawlib`), drag-and-drop onto the canvas, with a documented
  `initialData.libraryItems`, an `onLibraryChange` callback, and a public library
  directory. This maps **well** onto qi's authored stamp collections (molecules,
  NGSA objects, custom URLs) and CLUE's stamps — arguably a richer model than
  either has today.
- **Background image → gap.** Excalidraw has only a canvas **background color**
  (`viewBackgroundColor`) and grid mode. There is **no first-class background
  image layer** with fit modes. Like CLUE, images are ordinary elements. To
  reproduce the legacy qi/codap behavior (authored/snapshot/uploaded background,
  `shrinkBackgroundToCanvas` etc.) you would insert a **locked image element** at
  the back and implement fit logic in the wrapper.

**Verdict:** stamps are a strong fit; background images are a real **mismatch**
versus the legacy hosts' current model and need wrapper-level work.

### 3.4 Zoom / pan / canvas — ✓

**Requirement:** zoom/pan are CLUE-only today (legacy hosts lack them);
configurable canvas size/coordinate space.

**Excalidraw:** built-in **zoom** (buttons + pinch/scroll), **pan** (space-drag /
two-finger), **zoom-to-fit**, and an infinite-canvas scroll model with
`scrollToContent` and `onScrollChange`. This *exceeds* the legacy hosts and
matches CLUE. The infinite canvas is a behavior change for the legacy fixed-size
hosts and would need bounding for fixed-dimension export (handled by export
padding / explicit bounds).

### 3.5 Touch / mobile — ◐

**Requirement:** legacy uses hammerjs (pinch-scale, two-finger rotate); CLUE uses
Pointer Events (single-touch draw).

**Excalidraw:** functions on touch with pinch-zoom and two-finger pan, but is
**desktop-first**. A maintainer meta-issue documents known gaps: imperfect palm
rejection, no automatic pen-vs-finger differentiation, missing stylus eraser, and
multitouch quirks. Comparable to CLUE's pragmatic touch story; **better than
nothing but not a polished tablet experience.** For science-classroom tablet use
this deserves hands-on testing.

### 3.6 State & persistence (managed/controlled) — ✓ (the important one)

**Requirement:** the unified component must support a **controlled/managed mode**
(CLUE's hard requirement — external MST/undo owns state, view reacts) *and* a
simple save/load blob contract (LARA/CODAP).

**Excalidraw:**
- **Simple save/load (qi, codap):** `initialData` loads `{elements, appState,
  files}`; `onChange(elements, appState, files)` fires on every change. Serialize
  to JSON for the LARA `interactiveState` / CODAP state handler. Direct fit.
- **Managed mode (CLUE):** the imperative `updateScene(sceneData)` pushes external
  state into the editor, and crucially takes a **`captureUpdate:
  CaptureUpdateAction`** flag (`NEVER` / `DEFER` / `IMMEDIATELY`). This is the
  exact mechanism Excalidraw built for **multiplayer undo/redo**: an external
  store can drive the scene while controlling whether each change enters
  Excalidraw's own history. CLUE's pattern would be: MST is source of truth →
  on MST change push `updateScene(elements, { captureUpdate: NEVER })` → on user
  edits (`onChange`) write back into MST and let CLUE's history capture it, with
  Excalidraw's built-in undo suppressed/hidden.

**Verdict:** this is the standout finding. The dimension that *disqualifies the
legacy engine for CLUE* (it owns its own state) is one Excalidraw **explicitly
supports**. Caveats: it is **not a pure controlled `elements={...}` component** —
syncing is imperative via `updateScene`, so the wrapper needs a **diff/
reconciliation layer and loop-prevention** between the MST tree and Excalidraw's
flat element array. Workable and well-trodden (this is how Excalidraw
collaboration works), but real integration code.

### 3.7 Image export (PNG/SVG) — ✓

**Requirement:** reliable **PNG** (required across hosts), **SVG** desired;
today PNG/SVG are weak everywhere and CLUE has neither.

**Excalidraw:** first-class export utilities — **`exportToBlob`** (PNG default;
also JPEG/WebP), **`exportToSvg`** (SVG), **`exportToCanvas`** (for custom
pipelines), and `exportToClipboard`. Options cover `exportPadding`,
`exportBackground`/`viewBackgroundColor`, `exportWithDarkMode`, scale/
`maxWidthOrHeight`, and `exportEmbedScene` (round-trippable scene embedded in the
PNG/SVG). This directly satisfies the §3.7 requirement and **resolves the gap that
exists in all three current implementations** — including replacing
question-interactives' separate React→SVG report renderer.

**Note:** exported PNG/SVG carry the **hand-drawn rendering**; embedding the scene
in exports also gives a clean re-import path.

### 3.8 Accessibility — ✗ (the biggest gap)

**Requirement (the new goal):** a screen-reader user can **perceive and navigate
the objects** on the canvas (full blind authoring out of scope). CLUE has a head
start via its **object-list view** + per-object `ariaLabel`.

**Excalidraw:** accessibility is its **weakest dimension**. A **Deque audit**
(tracked in an open GitHub issue) found multiple WCAG problems — duplicate IDs,
focusable empty elements, unlabeled buttons, missing focus indicators, and
insufficient contrast — and, more fundamentally, the **canvas exposes no semantic
representation of the drawn objects** to assistive technology. There is **no
object-list / outline** equivalent to CLUE's. Keyboard *operation of the toolbar*
exists (and a Command Palette), but **keyboard navigation across drawn objects and
screen-reader description of them does not.**

**Verdict:** adopting Excalidraw would mean **building the accessibility layer
ourselves** (e.g. a parallel DOM object-list driven by the element array, with
generated descriptions and a keyboard navigation order). This is net-new work that
CLUE has partially already done — so on *this specific dimension* Excalidraw is a
**step back from CLUE's current state**, even though the flat, well-typed element
array is at least a clean data source to generate descriptions from. This gap
deserves heavy weight given accessibility is an explicit project goal.

### 3.9 Engine-specific features — ◐

**Requirement:** CLUE variable chips (shared-model-backed), voice typing; legacy
leader-line annotation tool. (§3.9 concluded these should be optional/injected.)

**Excalidraw:**
- **Variables / voice typing:** not present. Excalidraw has no concept of
  shared-model variable chips or speech-to-text. These are CLUE-specific and would
  need to be rebuilt as extensions.
- **Extensibility:** Excalidraw is **less openly extensible than CLUE's drawing
  engine** for *new object types*. CLUE exposes a registry (`registerDrawingObject
  Info`) that variable chips plug into; Excalidraw's element set is comparatively
  fixed, with extension points being **Libraries** (reusable compositions of
  existing elements), **embeddables** (iframed web content via `validateEmbeddable`),
  and custom surrounding UI. A variable-chip-like custom element would be harder to
  add in Excalidraw than in CLUE.
- **Annotation:** the legacy leader-line "annotation" tool has no direct
  equivalent; arrows bound to shapes plus text approximate it.

**Verdict:** acceptable **if** these features are treated as optional per-host
add-ons (as §3.9 recommends), but Excalidraw's weaker custom-element extensibility
makes CLUE's variable chips specifically harder to reproduce.

---

## Cross-cutting considerations

### Data-model mapping (migration risk)

Excalidraw's model is a **flat array of typed elements** with `groupIds`,
fractional-index z-order, frames (children-by-id), and arrow bindings. Our
existing states are **Fabric JSON** (legacy) and a **nested MST tree** (CLUE).
Converging on Excalidraw means writing **two migrators** (Fabric→Excalidraw,
CLUE→Excalidraw) and reconciling concepts that don't line up 1:1 — nested groups,
background images, text-in-shape containers, stamps→library items. Feasible, but a
non-trivial workstream and a source of fidelity loss to watch.

### Aesthetic

Excalidraw's signature **hand-drawn / sketchy** style is a product decision, not
just a theme. It can be set to a "normal" sloppiness and normal fonts, but the
tool's identity is sketchy. For science assessment drawings this is a
**stakeholder question**, not a technical one — confirm it's acceptable for
formal/report contexts before committing.

### What Excalidraw gives us for free (beyond §3)

Arrow-to-shape binding, infinite canvas, Mermaid import, scene-embedded exports,
a mature libraries ecosystem, and real-time collaboration primitives — none
required by §3, but several (binding, collaboration) are latent wins.

## Bottom line

| | |
|---|---|
| **Strongest fits** | Managed/controlled state (§3.6), image export (§3.7), object manipulation (§3.2), tools (§3.1), zoom/pan (§3.4) |
| **Real gaps / work** | Accessibility (§3.8 — net-new, worse than CLUE today), background-image layer (§3.3), custom-element extensibility for variable chips (§3.9), data-model migration |
| **Stakeholder questions** | Hand-drawn aesthetic; tablet/stylus quality (§3.5) |

Excalidraw clears the bar that the legacy engine fails for CLUE — it can be driven
as a managed component — and it solves the export gap that afflicts all three
today. The decisive open issues are **accessibility** (which Excalidraw does
*worse* than CLUE's current object-list, and which is an explicit project goal) and
the **mapping/aesthetic** mismatches. A sound next step would be a **small
spike**: embed Excalidraw behind a CLUE-style managed wrapper, drive it from an
external store via `updateScene(captureUpdate: NEVER)`, and prototype an
object-list accessibility layer over its element array — that prototype would
resolve the two highest-risk unknowns at once.

---

### Sources

- Excalidraw developer docs — [props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props),
  [`excalidrawAPI`/`updateScene`](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api),
  [export utils](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export),
  [element skeleton](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton).
- Excalidraw GitHub issues — [#7492 (Deque accessibility audit)](https://github.com/excalidraw/excalidraw/issues/7492),
  [#9705 (touch support meta-issue)](https://github.com/excalidraw/excalidraw/issues/9705).
- [Excalidraw Libraries directory](https://libraries.excalidraw.com/);
  [`excalidraw-room`](https://github.com/excalidraw/excalidraw-room) collaboration server;
  npm [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) (MIT, v0.18.x).

Data snapshot June 2026; re-verify against current docs before relying on
specifics.

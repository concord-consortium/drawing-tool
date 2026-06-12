# Unified Drawing Tool — Feature Inventory & Gap Analysis

**Date:** 2026-06-10
**Status:** Assessment / feature inventory (technical path intentionally left open)

## 1. Purpose & Scope

Concord maintains drawing functionality in three places, built on two different
engines:

- **question-interactives** — a React wrapper around the legacy `drawing-tool`
  library (jQuery + Fabric.js).
- **codap DrawTool** — a vanilla-JS/jQuery wrapper around the same legacy
  `drawing-tool` library.
- **CLUE** — a from-scratch React + mobx-state-tree (MST) + SVG drawing engine
  (`src/plugins/drawing/`).

We would like to converge on a **single, unified drawing-tool component** used in
all three places, and to add a feature none of them have today: **accessibility**
(keyboard navigation and screen-reader description of the canvas contents).

**This document does one thing:** catalog what each place actually uses today,
across an agreed set of dimensions, and identify the gaps a unified component
would have to close. It deliberately **does not** pick a technical path (upgrade
Fabric in place, extend CLUE's React/SVG engine, or adopt a third-party React
component). That decision belongs in a follow-up document, for which this
inventory is the input.

### The "three places" are really two engines

Both question-interactives and codap embed the *same* legacy library, so much of
their feature set is shared. They are inventoried separately because they
**configure, version, and extend it differently** — and those differences matter
for unification:

| | question-interactives | codap DrawTool | CLUE |
|---|---|---|---|
| Engine | legacy `drawing-tool` | legacy `drawing-tool` | bespoke React/SVG |
| Library version | **2.3.2** | **2.1.1 (vendored)** | n/a |
| Fabric version | **3.6.3** (bundled) | **3.6.3** (bundled) | none (SVG) |
| Wrapper tech | React 17 | jQuery / vanilla | React 17 + MST |
| Host integration | LARA interactive API | CODAP iframe-phone | CLUE document/tile model |

Both legacy consumers actually run the **same Fabric 3.6.3** — codap's vendored
`drawing-tool` bundle ships Fabric 3.6.3 internally (the `fabric: 3.6.3` upgrade
landed at `drawing-tool` 2.1.0). Note one trap: codap's `index.html` still loads a
**Fabric 1.5.0** `<script>` from a CDN, but that global is **dead/vestigial** —
the bundled Fabric is what runs. The only real drift between the two legacy
consumers is a **minor `drawing-tool` version gap (2.1.1 vendored vs 2.3.2)**, not
a Fabric-engine gap.

## 2. Architecture Snapshot

### 2.1 Legacy `drawing-tool` (used by question-interactives and codap)

- **Rendering:** Fabric.js over an HTML5 `<canvas>`. Objects are Fabric objects;
  the canvas is the single source of truth.
- **Language/UI:** Vanilla JS, jQuery DOM, EventEmitter2 for events. Toolbar is
  built from a declarative `ui-definition.js`.
- **State:** The component **owns its state**. Consumers call `save()` →
  `{version, dt:{width,height}, canvas: <fabricJSON>}` and `load(json)`. There is
  an internal undo/redo stack (max 20 states). It is **not** a controlled
  component — an external store cannot drive the canvas; it can only push/pull via
  the public API.
- **Embedding:** `new DrawingTool(selector, options)`. `options.buttons` selects
  which toolbar buttons appear; `options.stamps` supplies stamp collections.
- **Source of record:** `app/scripts/drawing-tool.js`, `tool.js`, `undo-redo.js`,
  `convert-state.js`, `ui/ui-definition.js`.

### 2.2 CLUE drawing plugin (`src/plugins/drawing/`)

- **Rendering:** Native **SVG** in the React DOM. Each object is a React
  component (`objects/rectangle.tsx`, `ellipse.tsx`, `line.tsx`, `vector.tsx`,
  `text.tsx`, `image.tsx`, `group.tsx`).
- **State:** **mobx-state-tree** model (`model/drawing-content.ts`). The MST tree
  is the source of truth; the SVG view is a pure reaction to it. This is a
  genuinely **managed/controlled** component — CLUE's document model owns the
  snapshot, and CLUE's undo/redo works by applying MST patches to that model, with
  the view re-rendering automatically.
- **Extensibility (notable asset):** The engine exposes a real **plugin/registry
  architecture**. External code can register new **object types** (model class +
  React renderer) via `registerDrawingObjectInfo()` and new **toolbar buttons**
  via `registerTileToolbarButtons("drawing", …)`, without modifying the drawing
  plugin. CLUE's **variable chips** are implemented this way — they live in a
  separate `shared-variables` plugin (`src/plugins/shared-variables/drawing/`),
  register a `VariableChipObject` and three toolbar buttons, and render via an SVG
  `<foreignObject>` wrapping a React `VariableChip` from
  `@concord-consortium/diagram-view`. This is exactly the kind of extension point a
  unified, multi-host component would want.
- **Coupling:** Deeply integrated with CLUE — `NavigatableTileModel` (zoom/pan),
  global `gImageMap` (images), CLUE logging, CLUE clipboard, tile annotation
  system, context providers, and the cross-tile **shared-variables model** (the
  source of variable-chip data). Not extractable as-is without dependency
  injection.
- **Versioning:** `model/drawing-migrator.ts` migrates older snapshots
  (1.0.0 → 1.1.0+) and can replay a legacy "changes" delta log.

### Key architectural contrast

The legacy engine is **canvas + imperative + self-owned state**. CLUE is
**SVG + declarative + externally-owned state**. The unification's hardest
questions (state ownership, image export, accessibility) all flow from this split.

## 3. Feature Inventory Matrix

Legend: ✓ = present · ◐ = partial / indirect · ✗ = not present · — = n/a

### 3.1 Toolbar tools

| Tool | question-interactives | codap DrawTool | CLUE |
|---|---|---|---|
| Select / multi-select | ✓ | ✓ | ✓ |
| Freehand / pencil | ✓ | ✓ | ✓ (polyline) |
| Line | ✓ | ✓ | ✓ (vector) |
| Arrow / double-arrow | ✓ (lines palette) | ✓ | ✓ (vector head/tail shapes) |
| Rectangle / square | ✓ (shapes palette) | ✓ | ✓ (rectangle) |
| Ellipse / circle | ✓ (shapes palette) | ✓ | ✓ (ellipse) |
| Text (multiple font sizes) | ✓ | ✓ | ✓ |
| Stamp | ✓ (rich collections) | ◐ (supported, not configured) | ✓ |
| Image upload | ◐ (background only) | ◐ (background only) | ✓ (as object) |
| Clone / duplicate | ✓ | ✓ | ✓ |
| Delete | ✓ | ✓ | ✓ |
| Stroke color | ✓ | ✓ | ✓ |
| Fill color | ✓ | ✓ | ✓ |
| Stroke width | ✓ | ✓ | ✓ |
| Undo / redo | ✓ (in-tool) | ✓ (in-tool) | ◐ (via CLUE doc undo, no in-tool button) |
| Annotation (text + leader) | ◐ (Labbook only) | ◐ (optional button) | ✗ (CLUE has separate annotation system) |
| Z-order: front/back | ✓ | ✓ | ◐ (relative reorder via list, no front/back buttons) |
| Align (6-way) | ✗ | ✗ | ✓ |
| Group / ungroup | ✗ (Fabric active-selection only) | ✗ | ✓ (nested groups) |
| Rotate (90°) | ✗ (no UI; Fabric handle only) | ✗ | ✓ |
| Flip horizontal / vertical | ✗ | ✗ | ✓ |
| Zoom in/out / fit-all | ✗ | ✗ | ✓ |
| Voice typing | ✗ | ✗ | ✓ |

**Takeaway:** CLUE is a strict **superset** of the legacy toolbar (align, group,
rotate, flip, zoom, voice typing are CLUE-only), except that the legacy tool has a
built-in **undo/redo button** and **annotation tool** that CLUE handles
differently (document-level undo; a separate annotation subsystem).

### 3.2 Object manipulation & control points

| Capability | Legacy (qi & codap) | CLUE |
|---|---|---|
| Move (drag) | ✓ | ✓ |
| Resize handles | ✓ (Fabric corner handles, 12px/22px touch) | ✓ (`transformable.tsx` + `selection-box.tsx`) |
| Scale (uniform lock for square/circle) | ✓ | ✓ |
| Rotate via handle | ✓ (Fabric rotation handle) | ✓ (data supports arbitrary angle; UI uses 90° button) |
| Custom endpoint handles for lines/arrows | ✓ (`line-custom-control-points.js`) | ✓ (per-object resize) |
| Multi-select | ✓ (Fabric ActiveSelection) | ✓ (selection id array) |
| Group as first-class object | ✗ | ✓ (`objects/group.tsx`, nestable) |
| Alignment | ✗ | ✓ |
| Flip | ✗ | ✓ |
| Z-order control | ✓ (front/back) | ◐ (relative reorder) |

### 3.3 Stamps & background images

| Capability | question-interactives | codap DrawTool | CLUE |
|---|---|---|---|
| Stamp tool | ✓ | ◐ (not configured) | ✓ |
| Authored stamp collections | ✓ (molecules, NGSA objects, custom URLs) | ✗ | ◐ (stamps array in model) |
| Background image | ✓ (authored URL, user upload to S3, or snapshot) | ✓ (drag-drop + CODAP-pushed) | ✗ (no background layer; images are objects) |
| Background fit modes | ✓ (shrink/resize-canvas/resize-bg) | ✓ (resize-canvas-to-bg) | — |
| CORS handling | ✓ (LARA image proxy) | ◐ (relies on data URLs) | ◐ (gImageMap) |

**Takeaway:** Background image is a **legacy-only** concept (a dedicated
background distinct from drawn objects). CLUE treats every image as a regular
object — there is no background layer. A unified component needs an explicit
decision on whether "background image" is a first-class concept.

### 3.4 Zoom / pan / canvas

| Capability | Legacy (qi & codap) | CLUE |
|---|---|---|
| Zoom controls | ✗ | ✓ (0.1–2.0, step 0.1, fit-all) |
| Pan / offset | ✗ | ✓ (offsetX/offsetY in `NavigatableTileModel`) |
| Configurable canvas size | ✓ (`width`/`height`, `setDimensions`) | ✓ (visible canvas size drives fit) |
| Coordinate space | Fabric pixels, top-left origin | SVG pixels, top-left origin |
| Canvas auto-resize to host | ✓ codap (frame negotiation); ◐ qi (CSS scale) | ✓ (tile sizing) |

### 3.5 Touch / mobile

| Capability | Legacy (qi & codap) | CLUE |
|---|---|---|
| Input model | Fabric mouse/touch + **hammerjs** | **Pointer Events** (mouse+touch unified) |
| Pinch-to-scale selected object | ✓ (hammerjs) | ✗ (single-touch for drawing; pinch = browser zoom) |
| Two-finger rotate | ✓ (hammerjs) | ✗ |
| Tap-vs-hold disambiguation | ◐ | ✓ (`useTouchHold`) |
| Mobile text-input zoom workaround | ✓ (hidden textarea reposition) | n/a (native inputs) |

### 3.6 State & persistence

| Aspect | question-interactives | codap DrawTool | CLUE |
|---|---|---|---|
| Serialization format | Fabric JSON (`save()`/`load()`) | Fabric JSON (`save()`/`load()`) | MST snapshot JSON (`exportJson()`) |
| State versioning/migration | ✓ (`convert-state.js`) | ✓ (`convert-state.js`) | ✓ (`drawing-migrator.ts`) |
| Owns its own state? | ✓ (component-owned) | ✓ (component-owned) | ✗ (**document/MST-owned**) |
| Controlled/managed component | ✗ | ✗ | ✓ |
| Undo/redo | in-tool stack (max 20) | in-tool stack (max 20) | external (CLUE doc undo via MST patches) |
| External system can drive state live | ✗ (push/pull only) | ✗ (push/pull only) | ✓ |
| Host persistence wiring | LARA `interactiveState` (drawing + background stored separately) | CODAP `customInteractiveStateHandler`, dirty-flag notify | CLUE tile snapshot in document |

**This is the single biggest architectural gap.** CLUE *requires* a managed
component: its undo/history and collaboration apply patches to a model the host
owns, and the view must re-render from that model. The legacy engine is the
opposite — it owns its state and exposes only save/load. Any unified component
must support the **controlled/managed** mode CLUE needs, while still offering the
simple save/load contract the LARA and CODAP wrappers rely on.

### 3.7 Image export

| Capability | question-interactives | codap DrawTool | CLUE |
|---|---|---|---|
| PNG / raster export | ◐ (Fabric `canvas.toDataURL` available; used indirectly) | ✓ (camera button → `canvas.toDataURL` → CODAP) | ✗ (no built-in rasterization) |
| SVG export | ✗ (no Fabric `toSVG` exposed) | ✗ | ◐ (SVG-native in DOM, but **no export action**) |
| Report/static render | ✓ (**custom React → SVG re-renderer** for LARA report items) | ✗ | ✗ |
| Snapshot of another interactive | ✓ (LARA `getInteractiveSnapshot`) | ✗ | ✗ |

**Takeaway — counterintuitive:** PNG and SVG export are **weak everywhere**, and
weak in *opposite* ways.
- The legacy (canvas) engine can trivially produce **PNG** (`toDataURL`) but has
  no clean **SVG** export wired up.
- CLUE *is* SVG in the DOM (SVG would be easy) but has **no export of any kind** —
  not even PNG, which would require rasterizing the SVG.
- question-interactives separately re-implements a **React-based SVG renderer**
  purely to draw saved Fabric state into report HTML — evidence that SVG output is
  a real requirement, currently met by a parallel code path.

Since the unified component must reliably emit **PNG** (required) and ideally
**SVG** (nice-to-have), this needs first-class export on whichever engine wins —
neither engine gives it for free today.

### 3.8 Accessibility

| Capability | question-interactives | codap DrawTool | CLUE |
|---|---|---|---|
| Canvas/container focusable | ◐ (`tabindex=0` on canvas) | ◐ (`tabindex=0` on canvas) | ✓ (tile focus trap) |
| Keyboard shortcuts | ◐ (delete, undo/redo, copy/paste, select-all) | ◐ (same) | ✓ (delete, copy/paste, group/ungroup, list reorder) |
| Keyboard tool/object navigation | ✗ | ✗ | ◐ (object list view is keyboard-sortable) |
| ARIA roles/labels on objects | ✗ | ✗ | ◐ (`Transformable` has role/aria-label; `ariaLabel` per object) |
| Screen-reader object list | ✗ | ✗ | ✓ (`object-list-view.tsx`, semantic `<ul>/<li>`) |
| aria-live announcements | ✗ | ✗ | ◐ (voice-typing uses `useAnnounce`) |

**Takeaway:** Accessibility is **largely net-new for all three**, but CLUE has a
meaningful head start: an **object-list view** that already enumerates canvas
contents with semantic markup and ARIA, plus per-object `ariaLabel`. The stated
goal — a screen-reader user can *describe* the objects in the canvas even if they
can't draw blind — maps almost exactly onto extending CLUE's object-list pattern.
The legacy engine has essentially nothing here beyond a focusable canvas and a few
shortcuts.

### 3.9 Engine-specific features

| Feature | Legacy (qi & codap) | CLUE | Notes for unification |
|---|---|---|---|
| Variable chips | ✗ | ✓ (shipped via the `shared-variables` plugin) | Real, working CLUE feature. Chips are a drawing object (`type: "variable"`) referencing a **cross-tile shared variables model** (`@concord-consortium/diagram-view`); adds New / Insert / Edit-variable toolbar buttons. Tightly bound to CLUE's shared-model system. |
| Voice typing | ✗ | ✓ (Web Speech API) | CLUE-only; optional/pluggable. |
| Annotation (leader + text) | ✓ (legacy annotation tool) | ✗ (CLUE uses separate tagging system) | Two different concepts share a name. |
| CLUE tile coupling | — | ✓ (gImageMap, logging, clipboard, tile model) | Must be dependency-injected to reuse CLUE's engine. |
| LARA snapshot / report items | ✓ | — | Host-specific; lives in the wrapper, not the engine. |

## 4. Gap Analysis

For a single component to serve all three places, here is what each dimension
requires, relative to today:

- **Toolbar tools.** CLUE's set is a superset; the only legacy-only items are the
  in-tool **undo/redo button** and the legacy **annotation tool**. A unified
  component needs configurable toolbars (legacy already does this via
  `options.buttons`; CLUE toggles tools in code) so each host shows only what it
  needs.
- **Object manipulation.** Whichever engine wins must keep custom **line/arrow
  endpoint handles** (legacy has them; CLUE has per-object resize) and offer
  **group/align/flip/rotate** (CLUE has all; legacy has none of the UI).
- **Stamps & background.** Must reconcile **background-image-as-distinct-layer**
  (legacy) with **image-as-object** (CLUE). Authored stamp collections (qi) and
  host-pushed backgrounds (codap) must remain supported.
- **Zoom/pan.** Legacy-side hosts gain a capability they don't have today; fine,
  but zoom/pan interacts with coordinate space used by **image export** and
  **hit-testing for accessibility**, so it can't be bolted on naively.
- **Touch.** A decision is needed on pinch-scale / two-finger-rotate (legacy
  hammerjs) vs. the simpler Pointer-Events model (CLUE). Moving to CLUE's model
  *removes* a gesture legacy users have today.
- **State.** The component must support a **controlled/managed mode** (CLUE's
  hard requirement) *and* a self-owned save/load mode (LARA/CODAP). This is the
  central design constraint — see §5.
- **Image export.** First-class **PNG** (required) and **SVG** (desired) export
  must be added; neither engine has both today, and CLUE has neither.
- **Accessibility.** Net-new almost everywhere. The target — screen-reader
  description of canvas objects + keyboard navigation — should build on CLUE's
  object-list + per-object `ariaLabel` foundation.
- **Engine-specific.** Voice typing, variable chips, and CLUE tile-coupling
  should be **optional/injected**, not core. CLUE's **object-type + toolbar
  registry** is the mechanism that makes this possible (variable chips already use
  it) and is a strong candidate for the unified component's extension model. The
  legacy "annotation" and CLUE "annotation" are different features and should not
  be conflated. Variable chips additionally depend on a **cross-tile shared
  variables model**, so reusing them outside CLUE means providing (or stubbing)
  that shared model.

### Version-debt gap (independent of unification)

Both legacy consumers run the **same Fabric 3.6.3**; codap is on `drawing-tool`
**2.1.1 (vendored)** vs question-interactives' **2.3.2** — a minor library gap,
not an engine gap. Two smaller cleanups are worth noting regardless of
unification: codap's `index.html` loads a **dead Fabric 1.5.0 CDN `<script>`**
(the bundled 3.6.3 overrides it) that should be removed to avoid confusion, and
codap's drawing-tool is a **manually vendored, pre-built bundle** rather than an
npm dependency, so it does not pick up fixes automatically.

## 5. Cross-Cutting Unification Challenges (descriptive)

These three problems cut across every host and are the ones most likely to
determine feasibility. Per the scope of this document they are **characterized,
not solved**.

### 5.1 State ownership: managed/controlled vs. self-owned

The legacy engine and CLUE sit at opposite ends of a spectrum. Legacy **owns its
state** and exposes `save()`/`load()` plus an internal 20-step undo stack; an
external system can only snapshot or replace the whole drawing. CLUE is
**externally owned**: the MST model lives in the CLUE document, undo/redo and (in
principle) collaboration work by applying patches to that model, and the SVG view
is a pure function of it.

A unified component has to satisfy both:
- CLUE needs a **controlled** mode — state in, change-events out, no hidden
  internal history — so CLUE's document undo/history remains the single source of
  truth.
- LARA and CODAP wrappers need the **simple** contract — give me a blob, take a
  blob back, optionally manage your own undo button.

The tension is not just API shape; it's *where undo lives* and *whether the
component is allowed to hold authoritative state at all*. This is the decision
that most constrains the engine choice.

### 5.2 Image export fidelity (PNG required, SVG desired)

The unified component must emit a **PNG** of the drawing reliably across hosts
(codap's camera button, LARA report items, etc.), and ideally an **SVG** as well.
Today this is unsolved in opposite directions: the canvas engine makes PNG easy
and SVG awkward; the SVG engine makes SVG natural but offers no export at all and
would need to **rasterize** for PNG. Complicating factors that any solution must
handle: **background images** and **stamps** (CORS-tainted canvases break
`toDataURL`; legacy mitigates with an image proxy and `parseSVG`), **zoom/pan
state** (export must reflect document coordinates, not the current viewport), and
**font/text rendering** parity between on-screen and exported output. The fact
that question-interactives maintains a *separate* React→SVG renderer just for
reports shows the requirement is real and currently met by duplicated code.

### 5.3 Accessibility as net-new work

None of the three is accessible today in the target sense: a screen-reader user
being able to **perceive and navigate the objects** on the canvas (full blind
*authoring* is explicitly out of scope). The work is largely greenfield, but not
uniformly: CLUE already has an **object-list view** that enumerates objects with
semantic `<ul>/<li>` and ARIA, per-object `ariaLabel`s, a focus trap, keyboard
shortcuts, and an aria-live announcement utility. The legacy engine has only a
focusable canvas and a handful of shortcuts. The hard parts a unified solution
must address: generating **meaningful descriptions** per object (shape, color,
position, grouping, z-order), exposing a **keyboard navigation order** over a
2-D canvas, and keeping the accessible representation **in sync** with a possibly
externally-owned model (which ties back to §5.1).

## 6. Third-Party Library Landscape (activity & popularity)

This section surveys third-party libraries that *could* underpin a unified
drawing tool, spanning the full range from low-level rendering engines (like
Fabric, the current dependency) up to drop-in whiteboard components.

**Scope note:** per request, these are **not** evaluated for feature fit or
compatibility with the requirements in §3. They are judged only on **how active
and popular they are** — maintenance health, adoption, and release cadence — plus
a **license-viability gate**, since a library that is unmaintained or not usable
under an open license is not a viable foundation regardless of features. Feature
fit is a separate, later exercise.

**Data snapshot: June 2026** (GitHub stars, npm downloads/month, latest release).
These numbers drift; re-pull before relying on them.

| Library | Category | License | GitHub ★ | npm/mo | Latest release | Activity |
|---|---|---|---:|---:|---|---|
| **Fabric.js** | Canvas engine | MIT | 31.2k | 3.48M | 7.4.0 (2026-05) | **Active** — v7 is a full modernization (TS, ESM) vs the v3 we use |
| **Konva** (+ react-konva) | Canvas engine | MIT | 14.5k / 6.4k | 6.98M / 5.34M | 10.3.0 (2026-04) | **Very active** — first-class React bindings |
| **Paper.js** | Canvas/vector engine | MIT | 15.0k | 812k | 0.12.18 (2024-07) | **Low / dormant** — no release in ~2 yrs |
| **Two.js** | Multi-renderer (SVG/canvas/WebGL) | MIT | 8.6k | 50k | 0.8.23 (2025-12) | **Active**, smaller adoption |
| **SVG.js** | SVG manipulation | MIT | 11.8k | 3.29M | 3.2.5 (2025-09) | **Moderate** — high usage, slow cadence |
| **perfect-freehand** | Freehand stroke geometry | MIT | 5.6k | 6.88M | 1.2.3 (2026-02) | **Active** — a primitive, not a tool (by tldraw's author) |
| **react-sketch-canvas** | Freehand React component | MIT | 0.6k | 339k | 8.0.0 (2026-05) | **Maintained**, niche/small |
| **react-canvas-draw** | Freehand React component | MIT | 0.9k | 147k | 1.2.1 (2021-11) | **Abandoned — repo archived** |
| **Excalidraw** (`@excalidraw/excalidraw`) | Full whiteboard component | MIT | 125k | 1.23M | 0.18.1 (2026-04) | **Very active**, huge community, embeddable React component |
| **tldraw** | Full infinite-canvas SDK | ⚠️ **tldraw license (not OSS)** | 47.7k | 982k | 5.1.0 (2026-06) | **Very active**, polished — **but see license gate** |
| **Polotno** | Canvas design-editor SDK | ⚠️ **Commercial (paid)** | n/a | 79k | 2.41.1 (2026-05) | Active but closed/commercial (Konva-based) |
| **tui.image-editor** | Fabric-based image editor | MIT | 7.6k | 126k | 3.15.3 (2022-04) | **Unmaintained** — no release since 2022 |
| **JointJS** (`joint`) | Diagramming (adjacent) | MPL-2.0 (open core) | 5.3k | 167k | 3.7.7 (2024-03) | Active core; full features are commercial (JointJS+). Node/shape diagrams, not freeform drawing |

### Reading the landscape

Grouped by where they sit on the spectrum:

- **Low-level engines (build-the-tool-yourself).** **Fabric** (our current base)
  and **Konva** are the two healthiest by a wide margin — both MIT, millions of
  monthly downloads, active releases, and Konva ships first-class **React**
  bindings (`react-konva`). Fabric **v7** is a major modernization over the v3 we
  run today, so even "stay on Fabric" implies a real upgrade. **Two.js** and
  **SVG.js** are viable but smaller/slower-moving; **Paper.js** looks **dormant**
  (no release in ~2 years) and is the riskiest of this group.
- **Stroke primitives.** **perfect-freehand** is extremely popular but is just
  stroke geometry — a building block, not a drawing tool. **react-sketch-canvas**
  is maintained but niche; **react-canvas-draw** is **archived** and should be
  ruled out.
- **Full components / SDKs (closest to drop-in).** **Excalidraw** is the standout
  on activity *and* openness — **MIT**, 125k stars, ~1.2M downloads/month, very
  active, and shipped as an embeddable React component. **tldraw** is comparably
  polished and active but carries a **non-open-source license** (production needs a
  paid commercial license, ~$6k/yr/team, or a visible watermark) — a likely
  blocker for an open-source educational product. **Polotno** is closed/commercial.
  **tui.image-editor** is MIT but **effectively unmaintained**.
- **Diagramming (adjacent).** **JointJS** is active and relevant only if the need
  shifts toward node/shape diagrams; its full feature set is commercial
  (JointJS+), and it is not a freeform drawing tool.

### Activity/popularity shortlist

Purely on health and adoption (feature fit deferred):

1. **Konva (+ react-konva)** — healthiest MIT engine with native React support.
2. **Fabric.js v7** — healthiest MIT engine matching our existing investment;
   continuity, but a major-version jump from v3.
3. **Excalidraw** — by far the most popular *full* component that is also MIT.
4. **tldraw** — top-tier activity, but gated by its **non-OSS license**.

Everything else is either a narrow primitive, dormant/unmaintained, or
closed/commercial.

## 7. Open Questions / Decisions Deferred

These are out of scope here but are the natural inputs to a follow-up decision
doc:

1. **Engine/path choice.** Upgrade Fabric in the legacy engine, generalize CLUE's
   React/SVG engine for reuse outside CLUE, or adopt a third-party React drawing
   component? (Each trades differently against §5.1–§5.3.)
2. **State contract.** What is the canonical state shape, and does the component
   expose a controlled mode, an uncontrolled mode, or both?
3. **Undo ownership.** In-component vs. host-owned undo — can both be supported,
   or must hosts converge on one?
4. **Background image.** Keep it as a first-class distinct layer (legacy) or model
   it as an object (CLUE)?
5. **Touch gestures.** Preserve pinch-scale/two-finger-rotate, or standardize on
   Pointer Events and drop them?
6. **Export ownership.** Does the engine own PNG/SVG export, or does each host
   keep its own renderer (as qi does today)?
7. **Accessibility model.** Object-list-driven (CLUE-style) as the primary a11y
   affordance, plus spatial keyboard navigation — confirmed direction?
8. **Migration.** How do existing saved drawings (Fabric JSON v1, CLUE snapshot
   1.x) migrate into the unified format, and who owns the converters?
9. **codap modernization.** codap is already on Fabric 3.6.3, so there is no
   Fabric jump — but it lags `drawing-tool` (2.1.1 vendored vs 2.3.2), ships a
   manually built bundle instead of an npm dependency, and carries a dead Fabric
   1.5.0 CDN tag. Does unification absorb this cleanup, or is it handled first?
10. **Extension model.** Should the unified component adopt CLUE's
    object-type + toolbar registration registry as its public extension point, so
    host-specific features (variable chips, voice typing, future tools) plug in
    without forking the core? If so, how are extension-provided dependencies
    (e.g. the shared-variables model) injected per host?

---

### Appendix: primary source references

Paths below are relative to each project's own repository. Only the legacy
engine lives in **this** repo; the other three are **external repositories** and
cannot be browsed from here.

- **Legacy engine** *(this repo,
  [concord-consortium/drawing-tool](https://github.com/concord-consortium/drawing-tool))*:
  `app/scripts/drawing-tool.js`, `tool.js`, `undo-redo.js`,
  `convert-state.js`, `ui/ui-definition.js`.
- **question-interactives** *(external repo,
  [concord-consortium/question-interactives](https://github.com/concord-consortium/question-interactives))*:
  `packages/drawing-tool/src/components/` —
  `drawing-tool.tsx`, `types.ts`, `app.tsx`, `take-snapshot.tsx`,
  `upload-background.tsx`, `report-item/static-drawing.tsx`,
  `stamp-collections.tsx`.
- **codap DrawTool** *(external repo,
  [concord-consortium/codap-data-interactives](https://github.com/concord-consortium/codap-data-interactives))*:
  `DrawTool/draw-tool-plugin.js`, `DrawTool/index.html`,
  `DrawTool/lib/drawing-tool.js` (vendored 2.1.1), `DrawTool/package.json`.
- **CLUE** *(external repo,
  [concord-consortium/collaborative-learning](https://github.com/concord-consortium/collaborative-learning))*:
  `src/plugins/drawing/` — `model/drawing-content.ts`,
  `model/drawing-migrator.ts`, `objects/*.tsx`,
  `components/transformable.tsx`, `components/object-list-view.tsx`,
  `components/drawing-object-manager.tsx` (registry), `toolbar-buttons/*`,
  `action-buttons.tsx`. Variable chips:
  `src/plugins/shared-variables/drawing/variable-object.tsx`,
  `shared-variables/shared-variables-registration.ts`.

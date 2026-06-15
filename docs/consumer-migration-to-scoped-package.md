# Consumer migration to `@concord-consortium/drawing-tool`

**Status:** Not started (future work). The library was renamed from the unscoped
`drawing-tool` to `@concord-consortium/drawing-tool` and automated publishing was
set up in PR #91. Existing consumers still depend on the old unscoped package;
this doc tracks migrating them.

This is a coordinated, multi-repo change — **not** a single-repo search-and-replace.
Captured here so the future project starts informed.

## Consumers (from an org-wide search)

No git submodules and no `github:`/`git+https` npm deps — both consumers pull from
the npm registry via semver:

- `question-interactives/packages/drawing-tool` (the `drawing-tool-interactive`
  wrapper) → `"drawing-tool": "^2.3.2"` — the active consumer.
- `codap-data-interactives/DrawTool` → `"drawing-tool": "^2.1.1"` — older,
  possibly unmaintained.

See also the consumer contract (how the library is imported) in the README
"Packaging notes" section.

## Mechanical but spread out

- `question-interactives/packages/drawing-tool` (`drawing-tool-interactive`):
  dependency name in `package.json`, `import ... from "drawing-tool"`, and
  `'drawing-tool/dist/drawing-tool.css'`.
- The jest CSS mock there is extension-based
  (`\.(css|less|sass|scss)$` → identity-obj-proxy), so the CSS path rename does
  **not** break tests.

## Non-obvious complications

1. **TypeScript module shims, scattered.** drawing-tool ships no types, so
   consumers declare `declare module "drawing-tool";`. That line appears in
   ~13 `global.d.ts` files across nearly every `question-interactives` package
   (including packages that declare-but-don't-import it — shared boilerplate).
   All must become `declare module "@concord-consortium/drawing-tool";`.
2. **At least two repos, possibly three.** `tectonic-explorer/packages/tecrock-table`
   also has the `declare module "drawing-tool"` shim — confirm whether it
   actually imports the lib or just copied the boilerplate.
3. **codap-data-interactives is a version jump, not a rename.** It is pinned to
   `^2.1.1`; the scoped package starts at ~2.3.x, so "migrating" it is an upgrade
   across `2.1.1 → 2.3.x` with possible behavior changes. Given it may be
   unmaintained, the likely choice is to **leave it on the deprecated unscoped
   `drawing-tool`** (which still resolves) rather than migrate.
4. **Lockfile regeneration** in each migrated repo.
5. **`npm deprecate drawing-tool "moved to @concord-consortium/drawing-tool"`**
   once consumers are migrated. Existing pins keep resolving to `2.3.2`;
   deprecation only warns.

**Red herring:** `collabspace/webpack.config.js`'s `"drawing-tool"` is a local
webpack *entry name*, not npm consumption — unaffected.

## Optional improvement to consider during migration

Ship TypeScript types with drawing-tool so consumers can delete the
`declare module` shims. (And/or ship a built entry point so consumers don't need
to bundle the source — see the README "Packaging notes".) Scope creep for the
migration itself, but worth weighing.

# Drawing Tool — Automated npm Publish on Tag (Design)

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan

## Goal

Replace the manual `npm publish` process for the drawing-tool library with an
automated, tag-triggered GitHub Actions workflow, modeled on the approach used
in [`accessibility-tools`](https://github.com/concord-consortium/accessibility-tools).
At the same time, rename the package to the `@concord-consortium` scope and stop
committing build output to git.

Pushing a `v*` git tag (e.g. `v2.3.3`, `v2.4.0-pre.1`) builds the library in CI
and publishes it to npm. No more hand-running `npm publish`, no more hand-bumping
the version, and no more committed `dist/`.

## Context / current state

- **Package:** `drawing-tool` — unscoped, public, live on npm at `2.3.2`
  (`dist-tags = { latest: '2.3.2' }`).
- **Version is not surfaced to clients.** A grep of all `.js`/`.json`/`.html`
  for the version string matched only `package.json`. The build output contains
  no inlined version, and there is no `version.ts`-style constant or
  `DrawingTool.version` API. So unlike accessibility-tools (which has a
  `src/version.ts` importing from package.json), drawing-tool has nothing
  client-facing to keep in sync.
- **Build:** webpack 4 (`npm run build` → `webpack`), output to `dist/`. The
  `dist/` directory is currently **committed to git** and is rebuilt + committed
  by hand before release (per the README).
- **Build determinism (verified):** running `npm run build` on a clean checkout
  produced a **byte-identical** `dist/` (`git diff dist/` empty). The committed
  dist is not stale, and a CI build reproduces it exactly.
- **Modern-Node compatibility (verified):** webpack 4 fails on Node ≥17 with
  `ERR_OSSL_EVP_UNSUPPORTED` unless `NODE_OPTIONS=--openssl-legacy-provider` is
  set. With that flag the build succeeds on Node 24.
- **Consumers (org-wide search):** no git submodules, no `github:`/`git+https`
  npm dependencies. Both consumers pull from the npm registry via semver:
  - `question-interactives/packages/drawing-tool` (the `drawing-tool-interactive`
    wrapper) → `"drawing-tool": "^2.3.2"` — the active consumer.
  - `codap-data-interactives/DrawTool` → `"drawing-tool": "^2.1.1"` — older,
    possibly unmaintained.
- **How the active consumer imports** (this drives the published file set):
  ```js
  import DrawingToolLib from "drawing-tool";        // → main → app/index.js (SOURCE)
  import 'drawing-tool/dist/drawing-tool.css';      // → built CSS in dist/
  ```
  The consumer bundles the **source** (via `main: app/index.js`) and only
  consumes the **CSS** from `dist/`. The `dist/drawing-tool.js` UMD bundle is
  **not** used by consumers. Therefore the published package must ship **both**
  `app/` (source) and `dist/` (for the CSS).
- **Existing `ci.yml`:** runs an S3 deploy on every push using
  `concord-consortium/s3-deploy-action@v1` with AWS access-key secrets and
  Node 16. It has **no build step** — it serves the committed `dist/` (the public
  demo at `models-resources.concord.org/drawing-tool/.../examples/index.html`).

## Decisions

1. **Scope the package now; migrate consumers later.** Rename to
   `@concord-consortium/drawing-tool` in this repo and configure the automated
   publish on the scoped name. Migrating consumers and deprecating the old
   `drawing-tool` package is a separate follow-up project (see below).
2. **Build in CI and publish the CI-built dist; stop committing `dist/`.** The
   publish workflow and the S3-deploy workflow both build fresh.
3. **Version field = `0.0.0-development`, stamped from the tag at publish time.**
   The git tag is the single source of truth. (Since the version is not surfaced
   to clients, nothing else needs syncing.)
4. **Auth = npm OIDC trusted publishing** with `--provenance`, no stored secret.
5. **Prerelease dist-tag = `next`** (any version containing `-`). No prerelease
   dist-tag currently exists on npm for this package
   (`{ latest: '2.3.2' }` only), so `next` is a clean choice and matches
   accessibility-tools. Historical prerelease *versions* exist
   (`2.1.0-pre-3`, `2.2.0-pre.1`, `2.3.0-pre.1`) but were never a dist-tag.

## Design

### package.json changes

| Field | Change |
|---|---|
| `name` | `drawing-tool` → `@concord-consortium/drawing-tool` |
| `version` | `2.3.2` → `0.0.0-development` |
| `publishConfig` | **add** `{ "access": "public" }` — scoped packages default to restricted; without this the publish goes private / fails. |
| `files` | **add** `["app", "dist"]` — see "Why `files` is mandatory" below. |
| `scripts.build` | `webpack` → `NODE_OPTIONS=--openssl-legacy-provider webpack` |

`main` stays `app/index.js` (consumers depend on it). `peerDependencies`
(`jquery`) and everything else unchanged.

**Why `files` is mandatory now.** There is no `.npmignore`, so npm falls back to
`.gitignore` to decide what to publish. The moment `dist/` is gitignored (decision
#2), npm would **silently drop `dist/` from the package**, breaking the
`dist/drawing-tool.css` import consumers rely on. A `files` allowlist always wins
over ignore rules, so `dist/` ships even though it is gitignored. `app/` must be
listed too, since the source `main` lives there. Side effect: `public/`,
`webpack.config.js`, `bower.json`, and `.eslintrc.js` will no longer be published
(all dev-only — a net cleanup). `package.json`, `README`, and `LICENSE` are always
included regardless of `files`.

**Why the OpenSSL flag goes in the npm script (not the workflow).** Baking
`NODE_OPTIONS=--openssl-legacy-provider` into the `build` script makes the build
work in *both* workflows and for *local* development on modern Node in one place.
Consequence: the flag is only recognized on Node ≥17, so both workflows must run
Node ≥17 (we use Node 20). Minor caveat: the inline `VAR=value` syntax is not
portable to Windows shells; acceptable for mac/linux developers. (A `cross-env`
dependency would make it portable if needed later.)

### .gitignore / git tracking

- Add `dist/` to `.gitignore`.
- Remove the currently-committed `dist/` from git tracking
  (`git rm -r --cached dist`).

### New workflow: `.github/workflows/publish-library.yml`

Trigger: `push` of tags matching `v*`.

```yaml
name: Publish to npm
on:
  push:
    tags:
      - 'v*'
permissions:
  contents: read
  id-token: write        # required for OIDC trusted publishing
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install -g npm@11.5      # OIDC trusted publishing needs npm >= 11.5
      - run: npm ci
      - name: Resolve version and dist-tag from git tag
        id: meta
        run: |
          VERSION="${GITHUB_REF_NAME#v}"
          if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
            echo "::error::Tag version '$VERSION' is not valid semver (expected X.Y.Z or X.Y.Z-prerelease)"
            exit 1
          fi
          if [[ "$VERSION" == *-* ]]; then DIST_TAG=next; else DIST_TAG=latest; fi
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          echo "dist_tag=$DIST_TAG" >> "$GITHUB_OUTPUT"
      - run: npm run build
      - name: Stamp version into package.json
        run: npm version --no-git-tag-version "${{ steps.meta.outputs.version }}"
      - name: Publish to npm
        run: npm publish --tag "${{ steps.meta.outputs.dist_tag }}" --provenance
```

Differences from the accessibility-tools workflow: no `npm run check` and no
`npm test` steps (drawing-tool has neither script). `--access public` is omitted
from `npm publish` because it is set via `publishConfig` in package.json (either
works; using `publishConfig` keeps the workflow generic). Build order: build →
stamp → publish. The version is not embedded in `dist/`, so build-before-stamp is
fine.

### Updated workflow: `ci.yml` (S3 deploy)

Because `dist/` is no longer committed, the S3-deploy job must build it before
deploying the demo. Changes:

- Bump `setup-node` to Node 20 (required for the OpenSSL flag baked into
  `npm run build`).
- Add a build step / the action's `build` input so `dist/` is generated:
  `build: npm run build`.
- Ensure the deployed folder is `dist` (the `examples/` demo lives in `dist/`;
  confirm the s3-deploy-action's `folderToDeploy` resolves to `dist`, set it
  explicitly if not).

AWS authentication (existing access-key secrets) and the `on: push` trigger are
**unchanged**. Modernizing AWS auth to OIDC is out of scope.

### README changes

- Update install instructions: `npm install @concord-consortium/drawing-tool`.
- Update import examples to the scoped name (both the JS import and the
  `/dist/drawing-tool.css` import).
- Update the release/dev process: `dist/` is now built in CI and is no longer
  committed; to release, push a `v*` tag. Note Node ≥18 is required for local
  builds (`npm run build`).

## Manual / out-of-band steps (not automated)

1. **First publish bootstrap.** `@concord-consortium/drawing-tool` is a brand-new
   npm package. npm trusted-publishing config is per-package and cannot be set
   before the package exists. So: perform **one manual first publish**
   (`npm publish --access public`) to create the package, then add the Trusted
   Publisher in the package settings on npmjs.com (repo
   `concord-consortium/drawing-tool`, workflow file `publish-library.yml`).
   Subsequent `v*` tag pushes then publish via OIDC automatically.
2. **Consumer migration (separate follow-up project).** See below.

## Out of scope (this repo / this effort)

- Migrating consumers to the scoped package (separate project).
- Deprecating the old unscoped `drawing-tool` package.
- Modernizing `ci.yml`'s AWS auth from access keys to OIDC.
- Upgrading webpack 4 → 5 (would remove the OpenSSL-flag dependency, but is a
  larger, independent effort).
- Adding tests or a typecheck step.

## Follow-up project: consumer migration

A coordinated, multi-repo change — **not** a single-repo search-and-replace.
Captured here so the future project starts informed.

**Mechanical but spread out:**
- `question-interactives/packages/drawing-tool` (`drawing-tool-interactive`):
  dependency name in package.json, `import ... from "drawing-tool"`, and
  `'drawing-tool/dist/drawing-tool.css'`.
- The jest CSS mock there is extension-based
  (`\.(css|less|sass|scss)$` → identity-obj-proxy), so the CSS path rename does
  **not** break tests.

**Non-obvious complications:**
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

**Optional improvement to consider during migration:** ship TypeScript types with
drawing-tool so consumers can delete the `declare module` shims. Scope creep for
now; flagged for the migration project.

## First automated release

After the bootstrap (manual first publish + trusted-publisher config), the first
tag-driven release would be `v2.3.3` (matching the in-flight 2.3.3 work),
publishing `@concord-consortium/drawing-tool@2.3.3` under the `latest` dist-tag.

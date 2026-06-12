# Drawing Tool — Automated npm Publish on Tag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual `npm publish` process with a tag-triggered GitHub Actions workflow that builds in CI and publishes `@concord-consortium/drawing-tool` via npm OIDC trusted publishing.

**Architecture:** Rename the package to the `@concord-consortium` scope, set the committed version to `0.0.0-development` (stamped from the git tag at publish time), stop committing `dist/` (built fresh in CI), and add a `files` allowlist so the built `dist/` and source `app/` still ship. A new `publish-library.yml` triggers on `v*` tags; the existing `ci.yml` S3-deploy gains a build step since `dist/` is no longer committed.

**Tech Stack:** GitHub Actions, npm (OIDC trusted publishing, npm ≥ 11.5), Node 20 in CI / Node ≥17 locally, webpack 4 (`--openssl-legacy-provider`).

**Spec:** [docs/superpowers/specs/2026-06-12-drawing-tool-npm-publish-on-tag-design.md](../specs/2026-06-12-drawing-tool-npm-publish-on-tag-design.md)

**Branch:** `QI-155-npm-publish-on-tag` (already created).

**Commit convention:** Every commit subject is prefixed `QI-155:` and ends with the trailer:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

**Note on testing approach:** This is CI/packaging infrastructure, so there are no unit tests. Each task's "test" is a concrete verification command (build succeeds, tarball contents, YAML parses, semver logic) run before committing. This repo has no `test`/`check` scripts.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `package.json` | Modify | Package identity (scoped name, dev version), publish config, `files` allowlist, build script OpenSSL flag |
| `package-lock.json` | Modify (regenerated) | Keep root name/version in sync with package.json |
| `.gitignore` | Modify | Ignore `dist/` |
| `dist/` | Untrack | Remove built output from git tracking (kept on disk) |
| `.github/workflows/publish-library.yml` | Create | Tag-triggered build + npm publish via OIDC |
| `.github/workflows/ci.yml` | Modify | Build `dist/` before S3 deploy; Node 20 |
| `README.md` | Modify | Scoped install/import instructions; new release/dev process |

---

## Task 1: Bake the OpenSSL flag into the build script

webpack 4 fails on Node ≥17 with `ERR_OSSL_EVP_UNSUPPORTED`. Putting the flag in the npm script fixes both CI and local builds in one place.

**Files:**
- Modify: `package.json` (the `scripts.build` line)

- [ ] **Step 1: Edit the build script**

In `package.json`, change the `build` script from:
```json
    "build": "webpack",
```
to:
```json
    "build": "NODE_OPTIONS=--openssl-legacy-provider webpack",
```

- [ ] **Step 2: Verify the build succeeds locally**

Run: `npm run build`
Expected: webpack completes, emits `dist/drawing-tool.js` and `dist/drawing-tool.css` (size/perf warnings are fine), exit code 0.

- [ ] **Step 3: Verify the build is unchanged from before**

Run: `git status --short dist/`
Expected: no output (the rebuilt dist is byte-identical to the committed dist — `dist/` is still tracked at this point).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "QI-155: Add --openssl-legacy-provider to build script for modern Node"
```

---

## Task 2: Scope the package, set dev version, add publishConfig and files

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (via `npm install`)

- [ ] **Step 1: Edit package identity and publish fields**

In `package.json`:

Change the name:
```json
  "name": "drawing-tool",
```
to:
```json
  "name": "@concord-consortium/drawing-tool",
```

Change the version:
```json
  "version": "2.3.2",
```
to:
```json
  "version": "0.0.0-development",
```

Add two new top-level fields. Place `publishConfig` and `files` immediately after the `"main": "app/index.js",` line:
```json
  "main": "app/index.js",
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "app",
    "dist"
  ],
```

(`publishConfig.access: public` is required because scoped packages default to restricted. `files` is required because `dist/` will be gitignored in Task 3 — without an allowlist npm would drop it from the package.)

- [ ] **Step 2: Sync the lockfile root metadata**

Run: `npm install`
Expected: completes; `package-lock.json` root `name` becomes `@concord-consortium/drawing-tool` and `version` becomes `0.0.0-development`. No dependency changes.

- [ ] **Step 3: Verify the lockfile picked up the new name**

Run: `grep -m1 '"name"' package-lock.json`
Expected: `"name": "@concord-consortium/drawing-tool",`

- [ ] **Step 4: Verify package.json is valid JSON and fields are set**

Run: `node -e "const p=require('./package.json'); console.log(p.name, p.version, p.publishConfig.access, JSON.stringify(p.files))"`
Expected: `@concord-consortium/drawing-tool 0.0.0-development public ["app","dist"]`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "QI-155: Scope package to @concord-consortium, set dev version, add publishConfig and files"
```

---

## Task 3: Stop committing dist

**Files:**
- Modify: `.gitignore`
- Untrack: `dist/` (kept on disk)

- [ ] **Step 1: Add dist to .gitignore**

The current `.gitignore` has a stray, malformed "dist folders" section at the end:
```
# dist folders
__gh-pages-tmp__/
```
Replace that trailing block with a correct one:
```
# Build output (built in CI, published from there; no longer committed)
dist/
```
(The `__gh-pages-tmp__/` entry already appears earlier under "temporary files", so removing the duplicate here is correct.)

- [ ] **Step 2: Untrack the committed dist (keep it on disk)**

Run: `git rm -r --cached dist`
Expected: lists `dist/...` files as removed from the index. `ls dist/` afterward still shows the files on disk.

- [ ] **Step 3: Verify dist is now ignored and untracked**

Run: `git status --short dist/ ; git check-ignore dist/drawing-tool.css`
Expected: the `git status` shows the dist files as deleted (`D`) from tracking; `git check-ignore` prints `dist/drawing-tool.css` (confirming it is ignored).

- [ ] **Step 4: Build, then verify the published tarball still contains app/ and dist/**

This is the critical check that the `files` allowlist (Task 2) overrides the new `.gitignore` for npm packaging.

Run:
```bash
npm run build
npm pack --dry-run 2>&1 | grep -E 'app/index.js|dist/drawing-tool.css|dist/drawing-tool.js' 
```
Expected: all three paths appear in the output (npm includes `app/` source and the built `dist/` despite `dist/` being gitignored).

- [ ] **Step 5: Verify dev-only files are NOT in the tarball**

Run: `npm pack --dry-run 2>&1 | grep -E 'webpack.config.js|public/|bower.json|\.eslintrc' || echo "none present (good)"`
Expected: `none present (good)` (the `files` allowlist excludes them).

- [ ] **Step 6: Commit**

```bash
git add .gitignore
git rm -r --cached dist >/dev/null 2>&1 || true
git commit -m "QI-155: Stop committing dist/ (built in CI, shipped via files allowlist)"
```

---

## Task 4: Create the tag-triggered publish workflow

**Files:**
- Create: `.github/workflows/publish-library.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/publish-library.yml` with exactly this content:
```yaml
name: Publish to npm

# Publishes @concord-consortium/drawing-tool when a `v*` git tag is pushed
# (e.g. `v2.3.3`, `v2.4.0-pre.1`). The committed package.json version is always
# `0.0.0-development`; the real version is parsed from the tag and stamped into
# package.json by this workflow before publishing. The version is not surfaced
# in any built artifact, so nothing else needs to be kept in sync.
#
# dist/ is not committed; it is built fresh here before publishing. The `files`
# allowlist in package.json ensures the built dist/ and the app/ source ship.
#
# The dist-tag is `next` when the version contains a `-` (prerelease), else
# `latest`.
#
# Authentication uses npm trusted publishing (OIDC). No NPM_TOKEN secret is
# required, but the npm package must list this repo + workflow under "Trusted
# Publishers" in its settings (see the spec's bootstrap notes).

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - name: Upgrade npm to a version with OIDC trusted publishing support
        # OIDC trusted publishing was added in npm 11.5+. Node 20 ships with
        # npm 10.x, so upgrade explicitly. Pinned to 11.5.x for a reproducible
        # release pipeline.
        run: npm install -g npm@11.5
      - name: Install dependencies
        run: npm ci
      - name: Resolve version and dist-tag from git tag
        id: meta
        # The `v*` trigger glob matches any suffix; guard against malformed
        # tags before stamping or publishing. Allows X.Y.Z and X.Y.Z-prerelease.
        run: |
          VERSION="${GITHUB_REF_NAME#v}"
          if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
            echo "::error::Tag version '$VERSION' is not valid semver (expected X.Y.Z or X.Y.Z-prerelease)"
            exit 1
          fi
          if [[ "$VERSION" == *-* ]]; then
            DIST_TAG=next
          else
            DIST_TAG=latest
          fi
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          echo "dist_tag=$DIST_TAG" >> "$GITHUB_OUTPUT"
          echo "Publishing $VERSION under dist-tag $DIST_TAG"
      - name: Build library
        run: npm run build
      - name: Stamp version into package.json
        run: npm version --no-git-tag-version "${{ steps.meta.outputs.version }}"
      - name: Publish to npm
        run: npm publish --tag "${{ steps.meta.outputs.dist_tag }}" --provenance
```

- [ ] **Step 2: Verify the YAML parses**

Run: `ruby -ryaml -e "YAML.load_file('.github/workflows/publish-library.yml'); puts 'yaml ok'"`
Expected: `yaml ok`

- [ ] **Step 3: Verify the version/dist-tag logic with sample tags**

Run this snippet, which reproduces the workflow's `meta` step logic locally:
```bash
for REF in v2.3.3 v2.4.0-pre.1 v2.3.0-pre-4 vfoo v1.2; do
  VERSION="${REF#v}"
  if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
    echo "$REF -> REJECT (not semver)"; continue
  fi
  if [[ "$VERSION" == *-* ]]; then echo "$REF -> $VERSION / next"; else echo "$REF -> $VERSION / latest"; fi
done
```
Expected:
```
v2.3.3 -> 2.3.3 / latest
v2.4.0-pre.1 -> 2.4.0-pre.1 / next
v2.3.0-pre-4 -> 2.3.0-pre-4 / next
vfoo -> REJECT (not semver)
v1.2 -> REJECT (not semver)
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish-library.yml
git commit -m "QI-155: Add tag-triggered npm publish workflow (OIDC trusted publishing)"
```

---

## Task 5: Update ci.yml to build dist before the S3 deploy

Since `dist/` is no longer committed, the S3-deploy job must build it. Bump Node to 20 (required for the OpenSSL flag now baked into `npm run build`).

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace ci.yml with the updated version**

Replace the entire contents of `.github/workflows/ci.yml` with:
```yaml
name: Continuous Integration

on: push

jobs:
  s3-deploy:
    name: S3 Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install Dependencies
        run: npm ci
      - uses: concord-consortium/s3-deploy-action@v1
        with:
          bucket: models-resources
          awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
          awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          prefix: ${{ github.event.repository.name }}
          # dist/ is no longer committed, so build it before deploying the demo.
          build: npm run build
          folderToDeploy: dist
          # Add the default branch as a top branch
          topBranches: |-
            [
              "s3-deploy",
              "${{ github.event.repository.default_branch }}"
            ]
```

Changes from the original: `node-version` `'16'` → `'20'`; added `build: npm run build` and `folderToDeploy: dist` inputs to the s3-deploy-action. AWS auth, `prefix`, trigger, and `topBranches` are unchanged.

- [ ] **Step 2: Verify the YAML parses**

Run: `ruby -ryaml -e "YAML.load_file('.github/workflows/ci.yml'); puts 'yaml ok'"`
Expected: `yaml ok`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "QI-155: Build dist in CI before S3 deploy; bump to Node 20"
```

---

## Task 6: Update the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the install + import instructions**

In `README.md`, replace this block:
```
## Using as a library

`npm install drawing-tool`

In myComponent.js:

```
import DrawingTool from "drawing-tool";
import 'drawing-tool/dist/drawing-tool.css';

const drawingTool = new DrawingTool("#drawing-tool-container");
```
```
with:
```
## Using as a library

`npm install @concord-consortium/drawing-tool`

In myComponent.js:

```
import DrawingTool from "@concord-consortium/drawing-tool";
import '@concord-consortium/drawing-tool/dist/drawing-tool.css';

const drawingTool = new DrawingTool("#drawing-tool-container");
```
```

- [ ] **Step 2: Update the development instructions (dist no longer committed)**

In the `## Development` section, replace this line:
```
    * Before you commit, run `webpack` to update `dist` directory and add it to git index.
```
with:
```
    * `dist/` is built output and is **not** committed — it is built in CI for both the demo deploy and npm publish. You do not need to rebuild or commit it before pushing.
```

And in the same `## Development` "Install" list, after the Node.js bullet, add a note about the required Node version:
```
    * Node.js 18+ is required for local builds (`npm run build`) — webpack 4 needs the `--openssl-legacy-provider` flag, which is baked into the build script and only exists on Node 17+.
```

- [ ] **Step 3: Add a Releasing section**

After the `## Development` section's intro list (before `### Undo / redo feature`), add:
```
### Releasing

Publishing to npm is automated. To cut a release, push a semver tag:

```
git tag v2.3.3          # or v2.4.0-pre.1 for a prerelease
git push origin v2.3.3
```

This triggers `.github/workflows/publish-library.yml`, which builds the library
and publishes `@concord-consortium/drawing-tool` to npm. Tags with a prerelease
suffix (containing `-`) publish under the `next` dist-tag; plain `X.Y.Z` tags
publish under `latest`. The committed `package.json` version stays
`0.0.0-development`; the real version comes from the tag.
```

- [ ] **Step 4: Verify the README has no remaining unscoped references**

Run: `grep -nE '"drawing-tool"|install drawing-tool|drawing-tool/dist' README.md || echo "no unscoped refs (good)"`
Expected: `no unscoped refs (good)`

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "QI-155: Update README for scoped package and automated releases"
```

---

## Task 7: Final verification and bootstrap checklist

No code changes — a final end-to-end check and a record of the manual steps that must happen outside the repo.

- [ ] **Step 1: Clean build from scratch**

Run:
```bash
rm -rf dist node_modules
npm ci
npm run build
```
Expected: `npm ci` installs cleanly; `npm run build` emits `dist/drawing-tool.js` and `dist/drawing-tool.css`, exit code 0.

- [ ] **Step 2: Inspect the full publish tarball contents**

Run: `npm pack --dry-run`
Expected: the file list includes `package.json`, `README.md`, `LICENSE`, the `app/` tree, and the `dist/` tree (including `dist/drawing-tool.css`). It must NOT include `public/`, `webpack.config.js`, `bower.json`, or `.eslintrc.js`. The package name shown is `@concord-consortium/drawing-tool`.

- [ ] **Step 3: Confirm git is clean and dist is untracked**

Run: `git status`
Expected: working tree clean; `dist/` does not appear (it is ignored).

- [ ] **Step 4: Record the manual bootstrap steps (do NOT automate)**

These must be performed by a maintainer with npm publish rights for the `@concord-consortium` scope. They are out of scope for code but required for the workflow to function:

1. **Create the package with a first manual publish** (trusted-publishing config cannot be set on a package that does not exist yet):
   ```bash
   npm run build
   npm publish --access public        # creates @concord-consortium/drawing-tool
   ```
2. **Add the Trusted Publisher** on npmjs.com: package `@concord-consortium/drawing-tool` → Settings → Trusted Publishers → add repo `concord-consortium/drawing-tool`, workflow file `publish-library.yml`.
3. After that, every `git push` of a `v*` tag publishes automatically via OIDC. The first automated release is expected to be `v2.3.3`.

- [ ] **Step 5: Open the PR**

```bash
git push -u origin QI-155-npm-publish-on-tag
gh pr create --fill --base master
```
(Confirm with the user before pushing/opening the PR if not already authorized.)

---

## Self-Review (completed by plan author)

**Spec coverage:** package.json changes (name, version, publishConfig, files, build script) → Tasks 1–2. Stop committing dist (.gitignore + untrack) → Task 3. publish-library.yml (OIDC, semver guard, next/latest, no test/check) → Task 4. ci.yml build step + Node 20 → Task 5. README (scoped install/import, release process, Node version) → Task 6. Manual bootstrap (first publish + trusted publisher) → Task 7. Out-of-scope items (consumer migration, deprecation, AWS OIDC, webpack upgrade) are intentionally excluded. All spec sections covered.

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every step has concrete file content and exact commands with expected output.

**Type/name consistency:** `@concord-consortium/drawing-tool`, `0.0.0-development`, `files: ["app","dist"]`, dist-tag values `next`/`latest`, and the semver regex are identical across the package.json task, the workflow task, and the verification snippets.

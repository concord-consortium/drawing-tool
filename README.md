# HTML5 Drawing Tool

Demo: https://models-resources.concord.org/drawing-tool/branch/master/examples/index.html

## Using as a library

`npm install @concord-consortium/drawing-tool`

In myComponent.js:

```
import DrawingTool from "@concord-consortium/drawing-tool";
import '@concord-consortium/drawing-tool/dist/drawing-tool.css';

const drawingTool = new DrawingTool("#drawing-tool-container");
```

## Development
* Install (if you don't have them):
    * [Node.js](http://nodejs.org) : `brew install node` on OS X
    * Node.js 18+ is required for local builds (`npm run build`) — webpack 4 needs the `--openssl-legacy-provider` flag, which is baked into the build script and only exists on Node 17+.
    * [Live server](https://www.npmjs.com/package/live-server) :`npm install -g live-server`
* Run:
    * `npm install` to install dependencies.
    * `webpack --watch` -- Automatically compiles sources to `./dist`
    * `live-server .` -- starts a web server on [http://localhost:8080/](http://localhost:8080/)
    * Open [http://localhost:8080/examples/](http://localhost:8080/examples/).
    * Code!!
    * `dist/` is built output and is **not** committed to git — it is built in CI for both the demo deploy and npm publish. The `webpack --watch` step above builds it locally only for previewing the demo with live-server.

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

### Packaging notes

Consumers import this library two ways at once:

```
import DrawingTool from "@concord-consortium/drawing-tool";        // → main → app/index.js (SOURCE)
import "@concord-consortium/drawing-tool/dist/drawing-tool.css";   // → built CSS in dist/
```

So the published package must ship **both** `app/` (the source, consumed via
`main`) **and** `dist/` (for the CSS). The UMD bundle `dist/drawing-tool.js` is
**not** used by consumers. Implications when editing `package.json`:

- Keep `files: ["app", "dist"]`. `dist/` is gitignored, and without this
  allowlist npm falls back to `.gitignore` and would silently drop `dist/` from
  the package — breaking the CSS import.
- Don't repoint `main` away from the source or drop `app/`; consumers bundle the
  source themselves (this is why we don't ship only `dist/` like some sibling
  libraries).

A future migration could ship TypeScript types and/or a built entry point to
simplify this — see [docs/consumer-migration-to-scoped-package.md](docs/consumer-migration-to-scoped-package.md).

### Undo / redo feature

If you are planning to add new feature that will be exposed in UI or via main API, you should consider whether
this action should be saved in history (so undo and redo is possible) or not.

If so, all you need to do is to call `DrawingTool.pushToHistory` method.

The current convention is that everything that modifies **canvas** should be saved in history, e.g.:

* new object created
* object removed
* object stroke color changed
* canvas dimensions changed

However state of the drawing tool itself is not tracked, so e.g. following events are **not** saved:

* tool changed
* current stroke color changed
* current fill color changed

If an action is async and callback can be provided, callback should be invoked **after** history is updated
(see `DrawingTool.setBackgroundImage`). It gives us more flexibility, as the client code can reset history
after action is complete so user won't be able to undo it (sometimes it is useful).

### JSON state converter

Drawing Tool state can be serialized to JSON. If you're introducing non-backward compatible change, update version in `DrawingTool#save` method and add approperiate conversion to `convert-state.js`.

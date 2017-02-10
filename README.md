# HTML5 Drawing Tool

Demo: http://concord-consortium.github.io/drawing-tool/examples/

## External dependencies

* jQuery
* FabricJS

## Development
* Install (if you don't have them):
    * [Node.js](http://nodejs.org): `brew install node` on OS X
* Run:
    * `npm run server` — watches the project with continuous rebuild. 
    * Open [http://localhost:8080/examples/](http://localhost:3333/examples/).
    * Code!
    * Before you commit, run `npm run build` to update `dist` directory and add it to git index.

### Deploying to Github Pages

Use `push-gh-pages.sh` script. It (re)generates `dist` dir using `npm run build`, updates `gh-pages` branch
and pushes changes to Github.

Note that you may deploy uncommitted changes, as this script uses current working directory state.

### Updating Bower package.

http://bower.io/search/?q=drawing-tool

* Remember that Bower expects [semver](http://semver.org/) tags.
* Update version in `package.json` and `bower.json`.
* Make sure that `dist` folder is up to date! Run `npm run build` to double-check that.
* Commit all changes and then run: `git tag -a v1.2.3 -m "Release version 1.2.3"`.
* Push changes remembering about `--tags` option: `git push origin master --tags`.

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

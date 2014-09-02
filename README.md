# HTML5 Drawing Tool

This is HTML5 Drawing Tool, built with [Brunch](http://brunch.io) and uses [Fabric](http://fabricjs.com).
[View the demo](http://concord-consortium.github.io/drawing-tool/examples/)

## Getting started
* Install (if you don't have them):
    * [Node.js](http://nodejs.org): `brew install node` on OS X
    * [Brunch](http://brunch.io): `npm install -g brunch`
    * [Bower](http://bower.io): `npm install -g bower`
    * Brunch plugins and Bower dependencies: `npm install & bower install`.
* Run:
    * `brunch watch --server` — watches the project with continuous rebuild. This will also launch HTTP server with [pushState](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history).
    * `brunch build --production` — builds minified project for production
* Learn:
    * `public/` dir is fully auto-generated and served by HTTP server.  Write your code in `app/` dir.
    * Place static files you want to be copied from `app/assets/` to `public/`.
    * [Brunch site](http://brunch.io), [Chaplin site](http://chaplinjs.org)


## Development

* Run `brunch watch --server`.
* Open [http://localhost:3333/examples/](http://localhost:3333/examples/).
* Code!
* Before you commit you should run `brunch build -e dist` to update `dist` directory and add it to git index.

## Deploying to Github Pages

Use `push-gh-pages.sh` script. It (re)generates `public` dir using `bower build -e production`, updates `gh-pages` branch
(using `public` content) and pushes changes to Github.

Note that you may deploy uncommited changes, as this script uses current working directory state.

## Updating Bower package.

http://bower.io/search/?q=drawing-tool

* Remember that Bower expects [semver](http://semver.org/) tags.
* Update version in `package.json` and `bower.json`.
* Make sure that `dist` folder is up to date! Run `brunch build -e dist` to double-check that.
* Commit all changes and then run: `git tag -a v1.2.3 -m "Release version 1.2.3"`.
* Push changes remembering about `--tags` option: `git push origin master --tags`.

## Dependencies

* jQuery
* FabricJS
* EventEmitter2
* HammerJS (optional, adds multi-touch support)

All of these libraries are concatenated together in `dist/vendor.js` file.

## Undo / redo feature

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

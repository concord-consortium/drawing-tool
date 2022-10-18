# HTML5 Drawing Tool

Demo: https://models-resources.concord.org/drawing-tool/examples/index.html

## Using as a library

`npm install drawing-tool`

In myComponent.js:

```
import DrawingTool from "drawing-tool";
import 'drawing-tool/dist/drawing-tool.css';

const drawingTool = new DrawingTool("#drawing-tool-container");
```

## Development
* Install (if you don't have them):
    * [Node.js](http://nodejs.org) : `brew install node` on OS X
    * [Live server](https://www.npmjs.com/package/live-server) :`npm install -g live-server`
* Run:
    * `npm install` to install dependencies.
    * `webpack --watch` -- Automatically compiles sources to `./dist`
    * `live-server .` -- starts a web server on [http://localhost:8080/](http://localhost:8080/)
    * Open [http://localhost:8080/examples/](http://localhost:3333/examples/).
    * Code!!
    * Before you commit, run `webpack` to update `dist` directory and add it to git index.

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

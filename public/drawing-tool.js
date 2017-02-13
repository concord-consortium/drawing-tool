(function() {
  'use strict';

  var globals = typeof global === 'undefined' ? self : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = {}.hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (bundle && typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = typeof window === 'undefined' ? this : window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
require.register("scripts/convert-state", function(exports, require, module) {
var $ = jQuery;
// Converts drawing tool state JSON created using old version to the most recent one.
// Ensures that Drawing Tool is backward compatible.

var stateConverter = {
  0: convertVer0toVer1
  // In the future (in case of need):
  // 2: convertVer1toVer2
  // etc.
};

// Version 0 is using FabricJS 1.4.11
// Version 1 is using FabricJS 1.5.0
// New FabricJS version serializes paths in a different way, see:
// https://github.com/kangax/fabric.js/issues/2139
function convertVer0toVer1(state) {
  state.canvas.objects.forEach(function (obj) {
    if (obj.type === 'path') {
      obj.pathOffset.x = obj.left;
      obj.pathOffset.y = obj.top;
      var offsetX = obj.left - obj.width * 0.5;
      var offsetY = obj.top - obj.height * 0.5;
      var path = obj.path;
      for (var i = 0; i < path.length; i++) {
        var def = path[i];
        for (var j = 1; j < def.length; j++) {
          if (j % 2 === 1) {
            def[j] += offsetX;
          } else {
            def[j] += offsetY;
          }
        }
      }
    }
  });
  state.version = 1;
  return state;
}

function convertState(state) {
  if (typeof state.version === 'undefined') {
    state.version = 0;
  }
  while (stateConverter[state.version]) {
    state = stateConverter[state.version](state);
  }
  return state;
}

module.exports = convertState;

});

require.register("scripts/drawing-tool", function(exports, require, module) {
var $ = jQuery;
var SelectionTool     = require('scripts/tools/select-tool');
var LineTool          = require('scripts/tools/shape-tools/line-tool');
var BasicShapeTool    = require('scripts/tools/shape-tools/basic-shape-tool');
var FreeDrawTool      = require('scripts/tools/shape-tools/free-draw');
var TextTool          = require('scripts/tools/shape-tools/text-tool');
var StampTool         = require('scripts/tools/shape-tools/stamp-tool');
var DeleteTool        = require('scripts/tools/delete-tool');
var CloneTool         = require('scripts/tools/clone-tool');
var UIManager         = require('scripts/ui/ui-manager');
var UndoRedo          = require('scripts/undo-redo');
var convertState      = require('scripts/convert-state');
var rescale2resize    = require('scripts/fabric-extensions/rescale-2-resize');
var multitouchSupport = require('scripts/fabric-extensions/multi-touch-support');
var FirebaseImp = require('scripts/firebase');

function rotateLineCoords() {
  // Set angle to 0 and apply transform to (x1, y1), (x2, y2). We could also
  // apply this transformation to control points instead. However if we reset
  // line rotation, conversion will have to be applies only once.
  if (this.get('angle') === 0) return;
  var angle = this.get('angle') / 180 * Math.PI;
  var originX = this.get('left');
  var originY = this.get('top');
  var newA = rot(this.get('x1'), this.get('y1'), originX, originY, angle);
  var newB = rot(this.get('x2'), this.get('y2'), originX, originY, angle);
  this.set({
    x1: newA[0],
    y1: newA[1],
    x2: newB[0],
    y2: newB[1],
    angle: 0
  });

  function rot(px, py, ox, oy, theta) {
    var cos = Math.cos(theta);
    var sin = Math.sin(theta);
    return [
      cos * (px - ox) - sin * (py - oy) + ox,
      sin * (px - ox) + cos * (py - oy) + oy
    ];
  }
}

function makeControlPoint(s, source, i) {
  var point = new fabric.Rect({
    width: s,
    height: s,
    strokeWidth: 0,
    stroke: lineCustomControlPoints.controlPointColor,
    fill: lineCustomControlPoints.controlPointColor,
    hasControls: false,
    hasBorders: false,
    originX: 'center',
    originY: 'center',
    // Custom properties:
    _dt_sourceObj: source,
    id: i,
    isControlPoint: true
  });
  source.canvas.add(point);
  point.on("moving", controlPointMoved);
  point.on("removed", controlPointDeleted);
  return point;
}

module.exports = lineCustomControlPoints;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

var fabric                  = __webpack_require__(2);
var inherit                 = __webpack_require__(0);
var Tool                    = __webpack_require__(5);
var lineCustomControlPoints = __webpack_require__(7);

var BASIC_SELECTION_PROPERTIES = {
  cornerSize: fabric.isTouchSupported ? 22 : 12,
  transparentCorners: false
};

/**
 * Defacto default tool for DrawingTool.
 * When activated it puts the canvas into a selectable state so objects
 * can be moved and manipulated.
 */
function SelectionTool(name, drawTool) {
  Tool.call(this, name, drawTool);

  this.canvas.on("object:selected", function (opt) {
    opt.target.set(BASIC_SELECTION_PROPERTIES);
    this.canvas.renderAll();
    this._setLastObject(opt.target);
  }.bind(this));

  this._lastObject = null;
  this.canvas.on("object:added", function (opt) {
    this._setLastObject(opt.target);
  }.bind(this));
  this.canvas.on("object:removed", function (opt) {
    this._checkLastObject(opt.target);
  }.bind(this));

  // Bind Ctrl / Cmd + A to select all action.
  this.master.$element.on('keydown', function (e) {
    if (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) {
      this.selectAll();
      e.preventDefault();
    }
  }.bind(this));

  // Set visual options of custom line control points.
  lineCustomControlPoints.controlPointColor = '#bcd2ff';
  lineCustomControlPoints.cornerSize = BASIC_SELECTION_PROPERTIES.cornerSize;
}

inherit(SelectionTool, Tool);

SelectionTool.BASIC_SELECTION_PROPERTIES = BASIC_SELECTION_PROPERTIES;

SelectionTool.prototype.activate = function () {
  SelectionTool.super.activate.call(this);
  this.setSelectable(true);
  this.selectLastObject();
};

SelectionTool.prototype.deactivate = function () {
  SelectionTool.super.deactivate.call(this);
  this.setSelectable(false);
};

SelectionTool.prototype.setSelectable = function (selectable) {
  this.canvas.selection = selectable;
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
};

SelectionTool.prototype.selectAll = function () {
  this.master.chooseTool('select');
  this.master.select(this.canvas.getObjects());
};

SelectionTool.prototype.selectLastObject = function () {
  if (this._lastObject) {
    this.canvas.setActiveObject(this._lastObject);
  }
};

SelectionTool.prototype._setLastObject = function (obj) {
  if (obj._dt_sourceObj) {
    // Ignore custom control points.
    return;
  }
  this._lastObject = obj;
};

SelectionTool.prototype._checkLastObject = function (removedObj) {
  if (removedObj === this._lastObject) {
    var remainingObjects = this.canvas.getObjects();
    this._lastObject = remainingObjects[remainingObjects.length - 1];
  }
};

module.exports = SelectionTool;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

var $                       = __webpack_require__(1);
var fabric                  = __webpack_require__(2);
var inherit                 = __webpack_require__(0);
var ShapeTool               = __webpack_require__(4);
var SelectTool              = __webpack_require__(8);
var Util                    = __webpack_require__(6);
var lineCustomControlPoints = __webpack_require__(7);
__webpack_require__(12);

// Note that this tool supports fabric.Line and all its subclasses (defined
// as part of this code base, not FabricJS itself). Pass 'lineType' argument
// (e.g. "line" or "arrow").

function LineTool(name, drawTool, lineType, lineOptions) {
  ShapeTool.call(this, name, drawTool);

  lineType = lineType || 'line';
  this._lineKlass = fabric.util.getKlass(lineType);
  this._lineOptions = lineOptions;

  lineCustomControlPoints(this.canvas);
}

inherit(LineTool, ShapeTool);

LineTool.prototype.mouseDown = function (e) {
  LineTool.super.mouseDown.call(this, e);

  if (!this.active) return;

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new this._lineKlass([x, y, x, y], $.extend(true, {
    originX: 'center', // important due to custom line control points!
    originY: 'center',
    selectable: false,
    stroke: this.master.state.stroke,
    strokeWidth: this.master.state.strokeWidth
  }, this._lineOptions));
  this.canvas.add(this.curr);
};

LineTool.prototype.mouseMove = function (e) {
  LineTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr.set('x2', x);
  this.curr.set('y2', y);
  this.canvas.renderAll();
};

LineTool.prototype.mouseUp = function (e) {
  LineTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
  this.master.pushToHistory();
};

LineTool.prototype._processNewShape = function (s) {
  var x1 = s.get('x1');
  var y1 = s.get('y1');
  var x2 = s.get('x2');
  var y2 = s.get('y2');
  if (Util.dist(x1 - x2, y1 - y2) < this.minSize) {
    x2 = x1 + this.defSize;
    y2 = y1 + this.defSize;
    s.set('x2', x2);
    s.set('y2', y2);
  }
  s.setCoords();
};

module.exports = LineTool;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

var $                 = __webpack_require__(1);
var fabric            = __webpack_require__(2);
var EventEmitter2     = __webpack_require__(34);
var SelectionTool     = __webpack_require__(8);
var LineTool          = __webpack_require__(9);
var BasicShapeTool    = __webpack_require__(18);
var FreeDrawTool      = __webpack_require__(19);
var TextTool          = __webpack_require__(21);
var StampTool         = __webpack_require__(20);
var DeleteTool        = __webpack_require__(17);
var CloneTool         = __webpack_require__(16);
var UIManager         = __webpack_require__(30);
var UndoRedo          = __webpack_require__(31);
var convertState      = __webpack_require__(11);
var rescale2resize    = __webpack_require__(14);
var multitouchSupport = __webpack_require__(13);
var FireBase          = __webpack_require__(40);

__webpack_require__(36);

var DEF_OPTIONS = {
  width: 800,
  height: 600,
  // If this flag is set to true, stamp tool will try to parse SVG images
  // using parser provided by FabricJS. It lets us avoid tainting canvas
  // in some browsers which always do that when SVG image is rendered
  // on canvas (e.g. Safari, IE).
  // Also, when this option is set to false, it will case that bounding-box
  // target find method is used instead of per-pixel one. It's cause by the fact
  // that some browsers always taint canvas when SVG is rendered on it,
  // (Safari, IE). Untainted canvas is necessary for per-pixel method.
  parseSVG: true
};

var DEF_STATE = {
  stroke: '#333',
  fill: "",
  strokeWidth: 8,
  fontSize: 27
};

var EVENTS = {
  // 'drawing:changed' is fired when the drawing (canvas) is updated by the user,
  // for example new shape is added or existing one edited and so on.
  DRAWING_CHANGED: 'drawing:changed',
  // 'state:changed' is fired when the internal state of the drawing tool is updated,
  // for example selected stroke color, fill color, font size and so on.
  STATE_CHANGED:   'state:changed',
  TOOL_CHANGED:    'tool:changed',
  UNDO_POSSIBLE:   'undo:possible',
  UNDO_IMPOSSIBLE: 'undo:impossible',
  REDO_POSSIBLE:   'redo:possible',
  REDO_IMPOSSIBLE: 'redo:impossible'
};

// Note that some object properties aren't serialized by default by FabricJS.
// List them here so they can be serialized.
var ADDITIONAL_PROPS_TO_SERIALIZE = ['lockUniScaling'];

/**
 * DrawingTool Constructor
 * This does the work of initializing the entire webapp. It constructs the
 * `DrawingTool` as well as the fabric.js canvas and UI.
 *
 * parameters:
 *  - selector: this is the selector for the div of where the DrawingTool will be housed
 *  - options: custom width and height for the drawTool canvas (see `DEF_OPTIONS` above)
 *  - settings: settings for starting state (see `DEF_STATE` above)
 */
function DrawingTool(selector, options, settings) {
  this.selector = selector;

  this.options = $.extend(true, {}, DEF_OPTIONS, options);
  this.state = $.extend(true, {}, DEF_STATE, settings);

  this._dispatch = new EventEmitter2({
    wildcard: true,
    newListener: false,
    maxListeners: 100,
    delimiter: ':'
  });

  this._initDOM();
  this._initFabricJS();
  this._setDimensions(this.options.width, this.options.height);
  this._initTools();
  this._initFirebase();
  this._initStateHistory();

  new UIManager(this);

  // Apply a fix that changes native FabricJS rescaling behavior into resizing.
  rescale2resize(this.canvas);
  // Adds support for multitouch support (pinching resize, two finger rotate, etc)
  multitouchSupport(this.canvas);

  // Note that at the beginning we will emmit two events - state:changed and tool:changed.
  this._fireStateChanged();
  this.chooseTool('select');
  this.pushToHistory();
  this.firebase = new FirebaseImp();
}

DrawingTool.prototype.ADDITIONAL_PROPS_TO_SERIALIZE = ADDITIONAL_PROPS_TO_SERIALIZE;


/**
 * Proxy function that is used when images are loaded. Basic version just returns the same URL.
 * Client code may provide custom function in DrawingTool options to return proxied url.
 * E.g.:
 * new DrawingTool({
 *   proxy: function (url) {
 *     return 'http://myproxy.com?url=' + url;
 *   }
 * });
 */
DrawingTool.prototype.proxy = function (url) {
  return (this.options.proxy && this.options.proxy(url)) || url;
};

/**
 * Clears all objects from the fabric canvas and can also clear the background image
 *
 * parameters:
 *  - clearBackground: if true, this function will also remove the background image
 */
DrawingTool.prototype.clear = function (clearBackground) {
  this.canvas.clear();
  if (clearBackground) {
    this.canvas.setBackgroundImage(null);
  }
  this.canvas.renderAll();
  this.pushToHistory();
};

/**
 * Deselects any selected objects and re-renders the fabricjs canvas
 */
DrawingTool.prototype.clearSelection = function () {
  // Important! It will cause that all custom control points will be removed (e.g. for lines).
  this.canvas.deactivateAllWithDispatch();
  this.canvas.renderAll();
};

/**
 * Saves the current state of the fabricjs canvas into a JSON format.
 * (used in conjunction with `load()`)
 */
DrawingTool.prototype.save = function () {
  var selection = this.getSelection();
  // There are two cases when we do want to remove selection before saving sate:
  // 1. Custom control points are present. Obviously we don't want to serialize them.
  //    At the moment we assume that custom control points live only when
  //    the source object is selected and they are destroyed when selection is cleared.
  // 2. There is a group selection (so selection is an array). Note that #toJSON method
  //    of canvas will discard group selection (and recreate it later) to ensure that all
  //    transformations applied to group will be applied to particular objects. However
  //    this happens without firing "before:selection:cleared" event that is used by
  //    our custom rescale-2-resize behavior. So remove and recreate selection manually
  //    to and make sure that this even will be dispatched (#clearSelection does that).
  var selectionCleared = false;
  if (selection && (selection.hasCustomControlPoints || selection.length > 0)) {
    this.clearSelection();
    selectionCleared = true;
  }
  var result = JSON.stringify({
    version: 1,
    dt: {
      // Drawing Tool specific options.
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight()
    },
    canvas: this.canvas.toJSON(ADDITIONAL_PROPS_TO_SERIALIZE)
  });
  if (selectionCleared) {
    this.select(selection);
  }
  if(this.firebase) { this.firebase.update(result ); }
  return result;
};

/*
 * Loads a previous state of the fabricjs canvas from JSON.
 * (used in conjunction with `save()`).
 *
 * parameters:
 *  - jsonString: JSON data, when it is not provided, canvas will be cleared
 *  - callback: function invoked when load is finished
 *  - noHistoryUpdate: if true, this action won't be saved in undo / redo history
 */
DrawingTool.prototype.load = function (jsonString, callback, noHistoryUpdate) {
  // When JSON string is not provided (or empty) just clear the canvas.
  if (!jsonString) {
    this.canvas.clear();
    this.canvas.setBackgroundImage(null);
    this.canvas.renderAll();
    loadFinished.call(this);
    return;
  }

  var state = JSON.parse(jsonString);
  // Support JSONs saved by older Drawing Tool versions.
  state = convertState(state);

  // Process Drawing Tool specific options.
  var dtState = state.dt;
  this._setDimensions(dtState.width, dtState.height);

  // Load FabricJS state.
  var loadDef = $.Deferred();
  var bgImgDef = $.Deferred();
  // Note that we remove background definition before we call #loadFromJSON
  // and then add the same background manually. Otherwise, the background
  // won't be loaded due to CORS error (FabricJS bug?).
  var canvasState = state.canvas;
  var backgroundImage = canvasState.backgroundImage;
  delete canvasState.backgroundImage;
  this.canvas.loadFromJSON(canvasState, loadDef.resolve.bind(loadDef));
  if (backgroundImage !== undefined) {
    var imageSrc = backgroundImage.src;
    delete backgroundImage.src;
    this._setBackgroundImage(imageSrc, backgroundImage, bgImgDef.resolve.bind(bgImgDef));
  } else {
    this._setBackgroundImage(null, null, bgImgDef.resolve.bind(bgImgDef));
  }
  // Call load finished callback when both loading from JSON and separate background
  // loading process are done.
  $.when(loadDef, bgImgDef).done(loadFinished.bind(this));

  function loadFinished() {
    // We don't serialize selectable property which depends on currently selected tool.
    // Currently objects should be selectable only if select tool is active.
    this.tools.select.setSelectable(this.tools.select.active);
    if (!noHistoryUpdate) {
      this.pushToHistory();
    }
    if (typeof callback === 'function') {
      callback();
    }
  }
};

DrawingTool.prototype.pushToHistory = function () {
  this._history.saveState();
  this._fireHistoryEvents();
  this._fireDrawingChanged();
};

DrawingTool.prototype.undo = function () {
  this._history.undo();
  this._fireHistoryEvents();
  this._fireDrawingChanged();
};

DrawingTool.prototype.redo = function () {
  this._history.redo();
  this._fireHistoryEvents();
  this._fireDrawingChanged();
};

DrawingTool.prototype.resetHistory = function () {
  this._history.reset();
  // Push the "initial" state.
  // We can't use public 'pushToHistory', 'drawing:changed' event shouldn't be emitted.
  this._history.saveState();
  this._fireHistoryEvents();
};

DrawingTool.prototype._fireHistoryEvents = function () {
  if (this._history.canUndo()) {
    this._dispatch.emit(EVENTS.UNDO_POSSIBLE);
  } else {
    this._dispatch.emit(EVENTS.UNDO_IMPOSSIBLE);
  }
  if (this._history.canRedo()) {
    this._dispatch.emit(EVENTS.REDO_POSSIBLE);
  } else {
    this._dispatch.emit(EVENTS.REDO_IMPOSSIBLE);
  }
};

DrawingTool.prototype._fireDrawingChanged = function () {
  this._dispatch.emit(EVENTS.DRAWING_CHANGED);
};

/**
 * Sets the stroke color for new shapes and fires a `stateEvent` to signal a
 * change in the stroke color.
 *
 * parameters:
 *  - color: can be in any web-friendly format
 *          ex: literal-'black', hex-'#444444', or rgba-'rgba(100,200,200,.75)'
 */
DrawingTool.prototype.setStrokeColor = function (color) {
  this.state.stroke = color;
  this._fireStateChanged();
};

/**
 * Sets the stroke width for new shapes and fires a `stateEvent` to signal a
 * change in the stroke width.
 *
 * parameters:
 *  - width: integer for the desired width
 */
DrawingTool.prototype.setStrokeWidth = function (width) {
  this.state.strokeWidth = width;
  this._fireStateChanged();
};

/**
 * Sets the font size for new text objects and fires a `stateEvent` to signal a
 * change in the font size.
 *
 * parameters:
 *  - fontSize: integer for the desired font size
 */
DrawingTool.prototype.setFontSize = function (fontSize) {
  this.state.fontSize = fontSize;
  this._fireStateChanged();
};

/**
 * Sets the fill color for new shapes and fires a `stateEvent` to signal a
 * change in the fill color.
 *
 * parameters:
 *  - color: can be in any web-friendly format
 *          ex: literal-'black', hex-'#444444', or rgba-'rgba(100,200,200,.75)'
 */
DrawingTool.prototype.setFillColor = function (color) {
  this.state.fill = color;
  this._fireStateChanged();
};

DrawingTool.prototype.setSelectionStrokeColor = function (color) {
  if (!this.getSelection()) return;
  this.forEachSelectedObject(function (obj) {
    this._setObjectProp(obj, 'stroke', color);
  }.bind(this));
  this.canvas.renderAll();
  this.pushToHistory();
};

DrawingTool.prototype.setSelectionFillColor = function (color) {
  if (!this.getSelection()) return;
  this.forEachSelectedObject(function (obj) {
    this._setObjectProp(obj, 'fill', color);
  }.bind(this));
  this.canvas.renderAll();
  this.pushToHistory();
};

DrawingTool.prototype.setSelectionStrokeWidth = function (width) {
  if (!this.getSelection()) return;
  this.forEachSelectedObject(function (obj) {
    this._setObjectProp(obj, 'strokeWidth', width);
  }.bind(this));
  this.canvas.renderAll();
  this.pushToHistory();
};

DrawingTool.prototype.setSelectionFontSize = function (fontSize) {
  if (!this.getSelection()) return;
  this.forEachSelectedObject(function (obj) {
    if (obj.type === 'i-text') {
      this._setObjectProp(obj, 'fontSize', fontSize);
    }
  }.bind(this));
  this.canvas.renderAll();
  this.pushToHistory();
};

DrawingTool.prototype.sendSelectionToFront = function () {
  if (!this.getSelection()) return;
  this._sendSelectionTo('front');
  this.pushToHistory();
};

DrawingTool.prototype.sendSelectionToBack = function () {
  if (!this.getSelection()) return;
  this._sendSelectionTo('back');
  this.pushToHistory();
};

DrawingTool.prototype.forEachSelectedObject = function (callback) {
  if (this.canvas.getActiveObject()) {
    callback(this.canvas.getActiveObject());
  } else if (this.canvas.getActiveGroup()) {
    this.canvas.getActiveGroup().objects.forEach(callback);
  }
};

DrawingTool.prototype._setObjectProp = function (object, type, value) {
  if (object.type === 'i-text') {
    // Special case for text. We assume that text color is defined by 'stroke', not fill.
    if (type === 'stroke') {
      type = 'fill';
    } else if (type === 'fill') {
      return;
    } else if (type === 'strokeWidth') {
      return;
    }
  }
  object.set(type, value);
};

DrawingTool.prototype._sendSelectionTo = function (where) {
  if (this.canvas.getActiveObject()) {
    // Simple case, only a single object is selected.
    send(this.canvas.getActiveObject());
  } else if (this.canvas.getActiveGroup()) {
    // Yes, this is overcomplicated, however FabricJS cannot handle
    // sending a group to front or back. We need to remove selection,
    // send particular objects and recreate selection...
    var objects = this.canvas.getActiveGroup().getObjects();
    this.clearSelection();
    objects.forEach(send);
    this.select(objects);
  }
  function send(obj) {
    // Note that this function handles custom control points defined for lines.
    // See: line-custom-control-points.js
    if (obj._dt_sourceObj) {
      send(obj._dt_sourceObj);
      return;
    }
    if (where === 'front') {
      obj.bringToFront();
      // Make sure that custom control point are send to front AFTER shape itself.
      if (obj._dt_controlPoints) {
        obj._dt_controlPoints.forEach(function (cp) {
          cp.bringToFront();
        });
      }
    } else {
      // Make sure that custom control point are send to back BEFORE shape itself.
      if (obj._dt_controlPoints) {
        obj._dt_controlPoints.forEach(function (cp) {
          cp.sendToBack();
        });
      }
      obj.sendToBack();
    }
  }
};

/**
 * Set the background image for the fabricjs canvas.
 *
 * parameters:
 *  - imageSrc: string with location of the image
 *  - fit: (string) how to put the image into the canvas
 *        ex: "resizeBackgroundToCanvas" or "resizeCanvasToBackground"
 *  - callback: function which is called when background image is loaded and set.
 */
DrawingTool.prototype.setBackgroundImage = function (imageSrc, fit, callback) {
  this._setBackgroundImage(imageSrc, null, function () {
    switch (fit) {
      case "resizeBackgroundToCanvas": this.resizeBackgroundToCanvas(); break;
      case "resizeCanvasToBackground": this.resizeCanvasToBackground(); break;
      case "shrinkBackgroundToCanvas": this.shrinkBackgroundToCanvas(); break;
    }
    this.pushToHistory();
    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this));
};

DrawingTool.prototype.resizeBackgroundToCanvas = function () {
  if (!this.canvas.backgroundImage) {
    return;
  }
  this.canvas.backgroundImage.set({
    width: this.canvas.width,
    height: this.canvas.height
  });
  this.canvas.renderAll();
  this.pushToHistory();
};

// Fits background to canvas (keeping original aspect ratio) only when background is bigger than canvas.
DrawingTool.prototype.shrinkBackgroundToCanvas = function () {
  if (!this.canvas.backgroundImage) {
    return;
  }
  var bgImg = this.canvas.backgroundImage;
  var widthRatio  = this.canvas.width / bgImg.width;
  var heightRatio = this.canvas.height / bgImg.height;
  var minRatio    = Math.min(widthRatio, heightRatio);
  if (minRatio < 1) {
    bgImg.set({
      width:  bgImg.width * minRatio,
      height: bgImg.height * minRatio
    });
    this.canvas.renderAll();
    this.pushToHistory();
  }
};

DrawingTool.prototype.resizeCanvasToBackground = function () {
  if (!this.canvas.backgroundImage) {
    return;
  }
  this._setDimensions(this.canvas.backgroundImage.width, this.canvas.backgroundImage.height);
  this.canvas.backgroundImage.set({
    top: this.canvas.height / 2,
    left: this.canvas.width / 2
  });
  this.canvas.renderAll();
  this.pushToHistory();
};

DrawingTool.prototype.setDimensions = function (width, height) {
  this._setDimensions(width, height);
  this.pushToHistory();
};

/**
 * Calculates canvas element offset relative to the document.
 * Call this method when Drawing Tool container position is updated.
 * This method is attached as "resize" event handler of window (by FabricJS itself).
 */
DrawingTool.prototype.calcOffset = function () {
  this.canvas.calcOffset();
};

/**
 * Changes the current tool.
 *
 * parameters:
 *  - toolSelector: selector for the tool as sepecified in the contruction of the tool
 */
DrawingTool.prototype.chooseTool = function (toolSelector) {
  var newTool = this.tools[toolSelector];
  if (!newTool) {
    return;
  }

  if (this.currentTool === newTool) {
    // Some tools may implement .activateAgain() method and
    // enable some special behavior.
    this.currentTool.activateAgain();
    return;
  }

  if (newTool.singleUse === true) {
    // special single use tools should not be set as the current tool
    newTool.use();
    return;
  }

  // activate and deactivate the new and old tools
  if (this.currentTool !== undefined) {
    this.currentTool.setActive(false);
  }

  this.currentTool = newTool;
  this.currentTool.setActive(true);

  this._dispatch.emit(EVENTS.TOOL_CHANGED, toolSelector);

  this.canvas.renderAll();
};

/**
 * Changing the current tool out of this current tool to the default tool
 * aka 'select' tool
 */
DrawingTool.prototype.changeOutOfTool = function () {
  this.chooseTool('select');
};


DrawingTool.prototype.on = function () {
  this._dispatch.on.apply(this._dispatch, arguments);
};

DrawingTool.prototype.off = function (name, handler) {
  this._dispatch.off.apply(this._dispatch, arguments);
};

/**
 * Selects passed object or array of objects.
 */
DrawingTool.prototype.select = function (objectOrObjects) {
  this.clearSelection();
  if (!objectOrObjects) {
    return;
  }
  if (objectOrObjects.length === 1) {
    objectOrObjects = objectOrObjects[0];
  }
  if (!objectOrObjects.length) {
    // Simple scenario, select a single object.
    this.canvas.setActiveObject(objectOrObjects);
    return;
  }
  // More complex case, create a group and select it.
  var group = new fabric.Group(objectOrObjects, {
    originX: 'center',
    originY: 'center',
    canvas: this.canvas
  });
  // Important! E.g. ensures that outlines around objects are visible.
  group.addWithUpdate();
  this.canvas.setActiveGroup(group);
};

/**
 * Returns selected object or array of selected objects.
 */
DrawingTool.prototype.getSelection = function () {
  var actGroup = this.canvas.getActiveGroup();
  if (actGroup) {
    return actGroup.getObjects();
  }
  var actObject = this.canvas.getActiveObject();
  return actObject && actObject.isControlPoint ? actObject._dt_sourceObj : actObject;
};

DrawingTool.prototype._fireStateChanged = function () {
  this._dispatch.emit(EVENTS.STATE_CHANGED, this.state);
};

DrawingTool.prototype._setBackgroundImage = function (imageSrc, options, backgroundLoadedCallback) {
  options = options || {
    originX: 'center',
    originY: 'center',
    top: this.canvas.height / 2,
    left: this.canvas.width / 2,
    crossOrigin: 'anonymous'
  };
  var self = this;

  if (!imageSrc) {
    // Fast path when we remove background image.
    this.canvas.setBackgroundImage(null, bgLoaded);
  } else {
    imageSrc = this.proxy(imageSrc);
    loadImage();
  }

  function loadImage() {
    // Note we cannot use fabric.Image.fromURL, as then we would always get
    // fabric.Image instance and we couldn't guess whether load failed or not.
    // util.loadImage provides null to callback when loading fails.
    fabric.util.loadImage(imageSrc, callback, null, options.crossOrigin);
  }
  function callback (img) {
    // If image is null and crossOrigin settings are available, it probably means that loading failed
    // due to lack of CORS headers. Try again without them.
    if ((options.crossOrigin === 'anonymous' || options.crossOrigin === '') && !img) {
      options = $.extend(true, {}, options);
      delete options.crossOrigin;
      console.log('Background could not be loaded due to lack of CORS headers. Trying to load it again without CORS support.');
      loadImage();
      return;
    }
    self.canvas.setBackgroundImage(new fabric.Image(img, options), bgLoaded);
  }
  function bgLoaded() {
    if (typeof backgroundLoadedCallback === 'function') {
      backgroundLoadedCallback();
    }
    self.canvas.renderAll();
  }
};

DrawingTool.prototype._initTools = function () {
  // Initialize all the tools, they add themselves to the tools hash.
  this.tools = {
    select:      new SelectionTool("Selection Tool", this),
    line:        new LineTool("Line Tool", this),
    arrow:       new LineTool("Arrow Tool", this, "arrow"),
    doubleArrow: new LineTool("Double Arrow Tool", this, "arrow", {doubleArrowhead: true}),
    rect:        new BasicShapeTool("Rectangle Tool", this, "rect"),
    ellipse:     new BasicShapeTool("Ellipse Tool", this, "ellipse"),
    square:      new BasicShapeTool("Square Tool", this, "square"),
    circle:      new BasicShapeTool("Circle Tool", this, "circle"),
    free:        new FreeDrawTool("Free Draw Tool", this),
    stamp:       new StampTool("Stamp Tool", this, this.options.parseSVG),
    text:        new TextTool("Text Tool", this),
    trash:       new DeleteTool("Delete Tool", this),
    clone:       new CloneTool("Clone Tool", this)
  };
};

DrawingTool.prototype._initDOM = function () {
  $(this.selector).empty();
  this.$element = $('<div class="dt-container">')
    .appendTo(this.selector);
  var $canvasContainer = $('<div class="dt-canvas-container">')
    .attr('tabindex', 0) // makes the canvas focusable for keyboard events
    .appendTo(this.$element);
  this.$canvas = $('<canvas>')
    .appendTo($canvasContainer);
};

DrawingTool.prototype._initFabricJS = function () {
  this.canvas = new fabric.Canvas(this.$canvas[0]);
  // Target find would be more tolerant on touch devices.
  // Also SVG images added to canvas will taint it in some browsers, no matter whether
  // it's coming from the same or another domain (e.g. Safari, IE). In such case, we
  // have to use bounding box target find, as per pixel tries to read canvas data
  // (impossible when canvas is tainted).
  if (fabric.isTouchSupported || !this.options.parseSVG) {
    this.canvas.perPixelTargetFind = false;
  } else {
    this.canvas.perPixelTargetFind = true;
    this.canvas.targetFindTolerance = 12;
  }
  this.canvas.setBackgroundColor("#fff");
};

DrawingTool.prototype._setDimensions = function (width, height) {
  this.canvas.setDimensions({
    width: width,
    height: height
  });
  // devicePixelRatio may be undefined in old browsers.
  var pixelRatio = window.devicePixelRatio || 1;
  if (pixelRatio !== 1) {
    var canvEl = this.canvas.getElement();
    $(canvEl)
      .attr('width',  width  * pixelRatio)
      .attr('height', height * pixelRatio)
      .css('width',   width)
      .css('height',  height);
    canvEl.getContext('2d').scale(pixelRatio, pixelRatio);
  }
};

DrawingTool.prototype._initFirebase = function() {
  var _loader = this.load.bind(this);
  var loadFunction = function(data) {
    if(data.serializedData){
      // use strings for now...
      // if(data.serializedData.version ) {
        var d = data.serializedData;
        _loader(d);
      // }
    }
  };
  this.firebase = new FireBase(loadFunction);
};

DrawingTool.prototype._initStateHistory = function () {
  this._history = new UndoRedo(this);
  this.canvas.on('object:modified', function () {
    this.pushToHistory();
  }.bind(this));
};

module.exports = DrawingTool;

});

require.register("scripts/fabric-extensions/arrow", function(exports, require, module) {
var $ = jQuery;
(function(global) {

  'use strict';

  var fabric = global.fabric || (global.fabric = { }),
      extend = fabric.util.object.extend;

  if (fabric.Arrow) {
    fabric.warn('fabric.Arrow is already defined');
    return;
  }

  /**
   * Arrow class
   * @class fabric.Arrow
   * @extends fabric.Line
   * @see {@link fabric.Arrow#initialize} for constructor definition
   */
  fabric.Arrow = fabric.util.createClass(fabric.Line, /** @lends fabric.Arrow.prototype */ {

    /**
     * Type of an object
     * @type String
     * @default
     */
    type: 'arrow',

    /**
     * Type of the arrow (double or single)
     * @type Boolean
     * @default
     */
    doubleArrowhead: false,

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _render: function(ctx) {
      ctx.beginPath();

      var isInPathGroup = this.group && this.group.type === 'path-group';
      if (isInPathGroup && !this.transformMatrix) {
        //  Line coords are distances from left-top of canvas to origin of line.
        //
        //  To render line in a path-group, we need to translate them to
        //  distances from center of path-group to center of line.
        var cp = this.getCenterPoint();
        ctx.translate(
          -this.group.width/2 + cp.x,
          -this.group.height / 2 + cp.y
        );
      }

      if (!this.strokeDashArray) {
        // Move from center (of virtual box) to its left/top corner,
        // we can't assume x1, y1 is top left and x2, y2 is bottom right.
        var xMult = this.x1 <= this.x2 ? -1 : 1,
            yMult = this.y1 <= this.y2 ? -1 : 1;

        // Arrow start point.
        var xs = this.width === 1 ? 0 : (xMult * this.width / 2),
            ys = this.height === 1 ? 0 : (yMult * this.height / 2);
        // Arrow end point.
        var xe = this.width === 1 ? 0 : (xMult * -1 * this.width / 2),
            ye = this.height === 1 ? 0 : (yMult * -1 * this.height / 2);
        // Helper variables.
        var dx = xe - xs,
            dy = ye - ys,
            l  = Math.sqrt(dx * dx + dy * dy);
        // Arrow width.
        var s = this.strokeWidth * 0.5;
        // Arrowhead width.
        var ls = Math.min(s * 3, l * (this.doubleArrowhead ? 0.21 : 0.35));
        // Arrowhead length.
        var ahlx = ls * 2 * dx / l,
            ahly = ls * 2 * dy / l;
        // Arrowhead position 1 (points close to the line).
        var xm1 = xe - ahlx,
            ym1 = ye - ahly;
        // Arrowhead position 2 (the most outer points).
        var xm2 = xe - ahlx * 1.1,
            ym2 = ye - ahly * 1.1;

        // Outline of the arrow.
        var points;
        if (!this.doubleArrowhead) {
          points = [
            this._perpCoords(xs, ys, xe, ye, xs, ys, s * 0.5, 1),
            this._perpCoords(xs, ys, xe, ye, xs, ys, s * 0.5, -1),
          ];
        } else {
          // Second arrowhead.
          var xm3 = xs + ahlx,
              ym3 = ys + ahly;
          var xm4 = xs + ahlx * 1.1,
              ym4 = ys + ahly * 1.1;
          points = [
            this._perpCoords(xs, ys, xe, ye, xm3, ym3, s, 1),
            this._perpCoords(xs, ys, xe, ye, xm4, ym4, ls, 1),
            [xs, ys],
            this._perpCoords(xs, ys, xe, ye, xm4, ym4, ls, -1),
            this._perpCoords(xs, ys, xe, ye, xm3, ym3, s, -1),
          ];
        }
        // Common part of the outline.
        points.push(
          this._perpCoords(xs, ys, xe, ye, xm1, ym1, s, -1),
          this._perpCoords(xs, ys, xe, ye, xm2, ym2, ls, -1),
          [xe, ye],
          this._perpCoords(xs, ys, xe, ye, xm2, ym2, ls, 1),
          this._perpCoords(xs, ys, xe, ye, xm1, ym1, s, 1)
        );

        ctx.moveTo(points[0][0], points[0][1]);
        points.forEach(function (p) {
          ctx.lineTo(p[0], p[1]);
        });
      }

      if (this.stroke) {
        // Note that we actually use fill instead of stroke.
        // Stroke width is included in outline calulcations above.
        var origFillStyle = ctx.fillStyle;
        ctx.fillStyle = this.stroke;
        this._renderFill(ctx);
        ctx.fillStyle = origFillStyle;
      }
    },

    /**
     * @private
     * Given coordinates of segment AB and point X, returns coordinates
     * of point C where CX is prependicular to AB and |CX| = l.
     */
    _perpCoords: function (xa, ya, xb, yb, x, y, l, dir) {
      var dx = xb - xa,
          dy = yb - ya,
          k = l / Math.sqrt(dx * dx + dy * dy);
      return [x + k * -dy * dir, y + k * dx * dir];
    },

    /**
     * Returns object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} object representation of an instance
     */
    toObject: function(propertiesToInclude) {
      return extend(this.callSuper('toObject', propertiesToInclude), {
        doubleArrowhead: this.get('doubleArrowhead')
      });
    }

    // WARN:
    // Note that #toSVG now returns LINE representation (as it's not overwritten).
    // The same applies to #complexity (TODO: what is it used for?).
  });

  // WARN:
  // Note that deserialization from SVG element expects LINE element. See above.

  /* _FROM_SVG_START_ */
  /**
   * List of attribute names to account for when parsing SVG element (used by {@link fabric.Arrow.fromElement})
   * @static
   * @memberOf fabric.Arrow
   * @see http://www.w3.org/TR/SVG/shapes.html#LineElement
   */
  fabric.Arrow.ATTRIBUTE_NAMES = fabric.SHARED_ATTRIBUTES.concat('x1 y1 x2 y2'.split(' '));

  /**
   * Returns fabric.Arrow instance from an SVG element
   * @static
   * @memberOf fabric.Arrow
   * @param {SVGElement} element Element to parse
   * @param {Object} [options] Options object
   * @return {fabric.Arrow} instance of fabric.Arrow
   */
  fabric.Arrow.fromElement = function(element, options) {
    var parsedAttributes = fabric.parseAttributes(element, fabric.Line.ATTRIBUTE_NAMES),
        points = [
          parsedAttributes.x1 || 0,
          parsedAttributes.y1 || 0,
          parsedAttributes.x2 || 0,
          parsedAttributes.y2 || 0
        ];
    return new fabric.Arrow(points, extend(parsedAttributes, options));
  };
  /* _FROM_SVG_END_ */

  /**
   * Returns fabric.Arrow instance from an object representation
   * @static
   * @memberOf fabric.Arrow
   * @param {Object} object Object to create an instance from
   * @return {fabric.Arrow} instance of fabric.Arrow
   */
  fabric.Arrow.fromObject = function(object) {
    var points = [object.x1, object.y1, object.x2, object.y2];
    return new fabric.Arrow(points, object);
  };

})(this);

});

require.register("scripts/fabric-extensions/line-custom-control-points", function(exports, require, module) {
var $ = jQuery;
var SUPPORTED_TYPES = ["line", "arrow"];

function lineCustomControlPoints(canvas) {
  // Make sure that listeners aren't added multiple times.
  if (canvas.lineCustomControlPointsEnabled) return;

  var selectedObject = null;
  canvas.on("object:selected", function (e) {
    var newTarget = e.target;
    if (selectedObject && isLine(selectedObject) && !isControlPoint(newTarget, selectedObject)) {
      lineDeselected.call(selectedObject);
    }
    if (!isControlPoint(newTarget, selectedObject)) {
      selectedObject = newTarget;
      if (isLine(newTarget)) {
        lineSelected.call(newTarget);
      }
    }
  });
  canvas.on("selection:cleared", function (e) {
    if (selectedObject && isLine(selectedObject)) {
      lineDeselected.call(selectedObject);
    }
    selectedObject = null;
  });
  canvas.lineCustomControlPointsEnabled = true;
}

// Options.
lineCustomControlPoints.controlPointColor = '#bcd2ff';
lineCustomControlPoints.cornerSize = 12;

function isControlPoint(object, line) {
  return line && line._dt_controlPoints && (line._dt_controlPoints[0] === object || line._dt_controlPoints[1] === object);
}

function isLine(object) {
  for (var i = 0; i < SUPPORTED_TYPES.length; i++) {
    if (object.type === SUPPORTED_TYPES[i]) return true;
  }
  return false;
}

// Handlers

function lineSelected() {
  // Disable typical control points.
  this.set({
    hasControls: false,
    hasBorders: false
  });
  // Create custom ones.
  var sidelen = lineCustomControlPoints.cornerSize;
  this._dt_controlPoints = [
    makeControlPoint(sidelen, this, 0),
    makeControlPoint(sidelen, this, 1)
  ];
  this.hasCustomControlPoints = true;
  updateLineControlPoints.call(this);
  this.on('moving', lineMoved);
  this.on('removed', lineDeleted);
  // And finally re-render (perhaps it's redundant).
  this.canvas.renderAll();
}

function lineDeselected() {
  // Very important - set _dt_sourceObj property to null / undefined,
  // as otherwise control point will remove line as well!
  this._dt_controlPoints[0]._dt_sourceObj = null;
  this._dt_controlPoints[1]._dt_sourceObj = null;
  this._dt_controlPoints[0].remove();
  this._dt_controlPoints[1].remove();
  this._dt_controlPoints = undefined;
  this.hasCustomControlPoints = false;
  this.off('moving');
  this.off('removed');
}

function lineMoved() {
  updateLineControlPoints.call(this);
}

function lineDeleted() {
  // Do nothing if there are no control points.
  if (!this._dt_controlPoints) return;
  // If there are some, just remove one of them
  // It will cause that the second one will be removed as well.
  this._dt_controlPoints[0].remove();
}

function controlPointMoved() {
  var line = this._dt_sourceObj;
  line.set('x' + (this.id + 1), this.left);
  line.set('y' + (this.id + 1), this.top);
  line.setCoords();
  line.canvas.renderAll();
}

function controlPointDeleted() {
  var line = this._dt_sourceObj;
  // Do nothing if there is no reference to source object (line).
  if (!line) return;
  // Otherwise try to remove second point and finally canvas.
  var secondControlPoint;
  if (line._dt_controlPoints[0] !== this) {
    secondControlPoint = line._dt_controlPoints[0];
  } else {
    secondControlPoint = line._dt_controlPoints[1];
  }
  secondControlPoint.line = null;
  secondControlPoint.remove();
  line.remove();
}

// Helpers

function updateLineControlPoints() {
  translateLineCoords.call(this);
  rotateLineCoords.call(this);
  this._dt_controlPoints[0].set('left', this.get('x1'));
  this._dt_controlPoints[0].set('top', this.get('y1'));
  this._dt_controlPoints[1].set('left', this.get('x2'));
  this._dt_controlPoints[1].set('top', this.get('y2'));
  this._dt_controlPoints[0].setCoords();
  this._dt_controlPoints[1].setCoords();
}

function translateLineCoords() {
  // It's a bit confusing part of FabricJS. Basically line has (x1, y1), (x2, y2) coordinates
  // and (top, left). When line is moved, only (top, left) are updated. Update rest of
  // coordinates too. Note that there is an assumption that the line has central origin!
  var centerX = this.get('x1') + (this.get('x2') - this.get('x1')) * 0.5;
  var centerY = this.get('y1') + (this.get('y2') - this.get('y1')) * 0.5;
  var dx = this.left - centerX;
  var dy = this.top  - centerY;
  this.set('x1', dx + this.x1);
  this.set('y1', dy + this.y1);
  this.set('x2', dx + this.x2);
  this.set('y2', dy + this.y2);
}

function rotateLineCoords() {
  // Set angle to 0 and apply transform to (x1, y1), (x2, y2). We could also
  // apply this transformation to control points instead. However if we reset
  // line rotation, conversion will have to be applies only once.
  if (this.get('angle') === 0) return;
  var angle = this.get('angle') / 180 * Math.PI;
  var originX = this.get('left');
  var originY = this.get('top');
  var newA = rot(this.get('x1'), this.get('y1'), originX, originY, angle);
  var newB = rot(this.get('x2'), this.get('y2'), originX, originY, angle);
  this.set({
    x1: newA[0],
    y1: newA[1],
    x2: newB[0],
    y2: newB[1],
    angle: 0
  });

  function rot(px, py, ox, oy, theta) {
    var cos = Math.cos(theta);
    var sin = Math.sin(theta);
    return [
      cos * (px - ox) - sin * (py - oy) + ox,
      sin * (px - ox) + cos * (py - oy) + oy
    ];
  }
}

function makeControlPoint(s, source, i) {
  var point = new fabric.Rect({
    width: s,
    height: s,
    strokeWidth: 0,
    stroke: lineCustomControlPoints.controlPointColor,
    fill: lineCustomControlPoints.controlPointColor,
    hasControls: false,
    hasBorders: false,
    originX: 'center',
    originY: 'center',
    // Custom properties:
    _dt_sourceObj: source,
    id: i,
    isControlPoint: true
  });
  source.canvas.add(point);
  point.on("moving", controlPointMoved);
  point.on("removed", controlPointDeleted);
  return point;
}

module.exports = lineCustomControlPoints;

});

require.register("scripts/fabric-extensions/multi-touch-support", function(exports, require, module) {
var $ = jQuery;
module.exports = function addMultiTouchSupport(canvas) {
  if (typeof Hammer === 'undefined' || !fabric.isTouchSupported) {
    return;
  }
  var mc = new Hammer.Manager(canvas.upperCanvasEl);
  mc.add(new Hammer.Pinch());

  var initialAngle;
  var initialScale;
  var shouldCenterOrigin;
  var originalOriginX;
  var originalOriginY;

  mc.on('pinchstart', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    setLocked(target, true);
    initialAngle = target.get('angle');
    initialScale = target.get('scaleX');
    // While performing multi-touch gestures like pinch and zoom, it feels more natural
    // when origin is in center.
    shouldCenterOrigin = target.originX !== 'center' || target.originY !== 'center';
    if (shouldCenterOrigin) {
      setOriginToCenter(target);
    }
  });

  mc.on('pinchmove', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }

    target.set({
      scaleX: e.scale * initialScale,
      scaleY: e.scale * initialScale,
      angle: initialAngle + e.rotation
    });

    fire(target, 'scaling', e.srcEvent);
    fire(target, 'rotating', e.srcEvent);

    if (target.get('scaleX') !== e.scale * initialScale) {
      // rescale-2-resize mod used.
      initialScale = 1 / e.scale;
    }
  });

  mc.on('pinchend', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    if (shouldCenterOrigin) {
      resetOrigin(target);
    }
    setLocked(target, false);
    // In theory we should also call:
    // fire(target, 'modified', e.srcEvent);
    // but fabric automatically fies 'modified' event on mouseup.
  });

  function isLine(object) {
    return object.type === 'line' || object.type === 'arrow';
  }

  function getTarget() {
    return canvas.getActiveObject() || canvas.getActiveGroup();
  }

  function setLocked(target, v) {
    target.set({
      lockMovementX: v,
      lockMovementY: v,
      lockScalingX: v,
      lockScalingY: v
    });
  }

  function fire(target, eventName, e) {
    canvas.fire('object:' + eventName, {target: target, e: e});
    target.fire(eventName, {e: e});
  }

  // Note that these functions are based on Fabric's _setOriginToCenter and _resetOrigin
  // (as they are marked as private).
  function setOriginToCenter(object) {
    originalOriginX = object.originX;
    originalOriginY = object.originY;

    var center = object.getCenterPoint();

    object.originX = 'center';
    object.originY = 'center';
    object.left = center.x;
    object.top = center.y;
  }

  function resetOrigin(object) {
    var originPoint = object.translateToOriginPoint(
      object.getCenterPoint(),
      originalOriginX,
      originalOriginY);

    object.originX = originalOriginX;
    object.originY = originalOriginY;

    object.left = originPoint.x;
    object.top = originPoint.y;
  }
};

});

require.register("scripts/fabric-extensions/rescale-2-resize", function(exports, require, module) {
var $ = jQuery;
var LineTool = require('scripts/tools/shape-tools/line-tool');

function basicWidthHeightTransform(s) {
  s.width = s.width * s.scaleX + s.strokeWidth * (s.scaleX - 1);
  s.height = s.height * s.scaleY + s.strokeWidth * (s.scaleY - 1);
  s.scaleX = 1;
  s.scaleY = 1;
}

// These handlers will be called during resizing (e.g. every single 1px change).
// Add handler here when you need "live" update, as otherwise resizing would look
// strange (e.g. due to incorrect stroke width).
var duringResize = {
  rect: function (s) {
    basicWidthHeightTransform(s);
  },
  ellipse: function (s) {
    basicWidthHeightTransform(s);
    s.rx = Math.abs(s.width / 2);
    s.ry = Math.abs(s.height / 2);
  },
  line: function (s) {
    basicWidthHeightTransform(s);
    if (s.x1 > s.x2) {
      s.x1 = s.left + s.width;
      s.x2 = s.left;
    } else {
      s.x2 = s.left + s.width;
      s.x1 = s.left;
    }
    if (s.y1 > s.y2) {
      s.y1 = s.top + s.height;
      s.y2 = s.top;
    } else {
      s.y2 = s.top + s.height;
      s.y1 = s.top;
    }
  },
  arrow: function (s) {
    this.line(s);
  },
  path: function (s) {
    var offsetX = s.pathOffset.x;
    var offsetY = s.pathOffset.y;
    for (var i = 0; i < s.path.length; i++) {
      s.path[i][1] = (s.path[i][1] - offsetX) * s.scaleX + offsetX;
      s.path[i][2] = (s.path[i][2] - offsetY) * s.scaleY + offsetY;
      s.path[i][3] = (s.path[i][3] - offsetX) * s.scaleX + offsetX;
      s.path[i][4] = (s.path[i][4] - offsetY) * s.scaleY + offsetY;
    }
    basicWidthHeightTransform(s);
  }
};

// These handlers will be called just once, after resizing is complete.
// Add handler here when you don't need "live" update, as there is no
// visual difference between rescaling and resizing for given object type.
var afterResize = $.extend(true, {}, duringResize, {
  'i-text': function (s) {
    // Note that actually there is no rescale to resize transformation.
    // Rescaling is fine for text, we only just move scale from scaleX/Y
    // attributes to fontSize and strokeWidth.
    s.set({
      fontSize: s.get('fontSize') * s.get('scaleX'),
      strokeWidth: s.get('strokeWidth') * s.get('scaleX'),
      scaleX: 1,
      scaleY: 1
    });
    s.setCoords();
  }
});

// This function expects FabricJS canvas object as an argument.
// It replaces native FabricJS rescaling behavior with resizing.
module.exports = function rescale2resize(canvas) {
  canvas.on('object:scaling', function (opt) {
    var shape = opt.target;
    var type = shape.type;
    if (duringResize[type]) {
      duringResize[type](shape);
    }
  });

  canvas.on('object:modified', function (opt) {
    var shape = opt.target;
    var type = shape.type;
    if ((shape.scaleX !== 1 || shape.scaleY !== 1) && afterResize[type]) {
      afterResize[type](shape);
    }
  });

  fabric.Group.prototype.lockUniScaling = true;
  canvas.on('before:selection:cleared', function(opt) {
    var group = opt.target;
    // if the the selection wasn't on a scaled group, then
    // this function is not needed --> return
    if (group.type !== 'group' || group.scaleX === 1) { return; }

    var scale = group.scaleX;
    var items = group.getObjects();
    var tempStrokeWidth;
    for (var i = 0; i < items.length; i++) {
      if (afterResize[items[i].type] !== undefined) {

        // little hack to get adapt the current code
        // (eliminates the end of lines 2 and 3)
        tempStrokeWidth = items[i].strokeWidth;
        items[i].strokeWidth = 0;

        // temporarily apply the group scale to the objects so
        // the resizers work as intended
        items[i].scaleX = scale;
        items[i].scaleY = scale;

        afterResize[items[i].type](items[i]);

        items[i].strokeWidth = tempStrokeWidth * scale;

        // setting the scale factor so the scaling applied after
        // this function will have no effect
        items[i].scaleX = 1 / scale;
        items[i].scaleY = 1 / scale;
      }
    }
  });
};

});

require.register("scripts/firebase", function(exports, require, module) {
var $ = jQuery;

function FirebaseImp() {
  this.user = null;
  this.token = null;
  this.config = {
    apiKey: "AIzaSyDUm2l464Cw7IVtBef4o55key6sp5JYgDk",
    authDomain: "colabdraw.firebaseapp.com",
    databaseURL: "https://colabdraw.firebaseio.com",
    storageBucket: "colabdraw.appspot.com",
    messagingSenderId: "432582594397"
  };
  this.initFirebase();
}

FirebaseImp.prototype.log = function(mesg) {
  console.log(mesg);
};

FirebaseImp.prototype.error = function(error) {
  this.log(error);
};

FirebaseImp.prototype.reqAuth = function() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
  .then(this.finishAuth)
  .catch(this.failAuth);
};

FirebaseImp.prototype.failAuth = function(error) {
  debugger;
  var errorCode = error.code;
  var errorMessage = error.message;
  var email = error.email;
  var credential = error.credential;
  this.error(
  ["couldn't authenticate", errorMessage, error.email]
  .join(" ")
  );
};

FirebaseImp.prototype.finishAuth = function() {
  this.token = result.credential.accessToken;
  this.user = result.user;
  this.dataRef = firebase.database().ref("testing");
  this.log('logged in');
};

FirebaseImp.prototype.update = function(data) {
  if(this.user) {
    this.log(this.dataRef.update(data));
  } else {
    this.error("couldn't write data because we weren't logged in");
  }
};

FirebaseImp.prototype.initFirebase = function() {
  firebase.initializeApp(this.config);
  this.reqAuth();
};

window.FirebaseImp = FirebaseImp;
module.exports = FirebaseImp;

});

require.register("scripts/inherit", function(exports, require, module) {
var $ = jQuery;
/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   ParentClass.call(this, a, b);
 * }
 *
 * inherit(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.super.foo.call(this, a);
 *   // other code
 * };
 *
 * @param {Function} Child Child class.
 * @param {Function} Parent Parent class.
 */
module.exports = function inherit(Child, Parent) {
  Child.prototype = Object.create(Parent.prototype);
  Child.prototype.constructor = Child;
  Child.super = Parent.prototype;
};

});

require.register("scripts/jquery-longpress", function(exports, require, module) {
var $ = jQuery;
(function ($) {

  $.fn.longPress = function(listener, timeout) {
    return this.on('mousedown touchstart', function (e) {
      var timer;
      timer = setTimeout(function () {
        listener.call(this, e);
      }, timeout || 150);
      $(window).one('mouseup touchend touchcancel touchleave', function() {
        clearTimeout(timer);
      });
    });
  };

})(jQuery);

});

require.register("scripts/tool", function(exports, require, module) {
var $ = jQuery;
/**
 * Tool "Class"
 *
 * parameters:
 *  - name: string with the human-readable name of the tool (mainly used for debugging)
 *  - selector: shorter 'code' for the tool, used in the corresponding HTML element
 *  - drawTool: the master node that this tool belongs too
 */
function Tool(name, drawTool) {
  this.name = name || "Tool";
  this.master = drawTool;
  this.canvas = drawTool.canvas;
  this.active = false;
  this.singleUse = false;

  // fabric.js listeners of the tool
  this._listeners = [];

  // internal mechanisms that monitor the state of the tool
  this._stateListeners = [];
}

Tool.prototype.setActive = function (active) {
  if (this.singleUse) {
    console.warn("This is a single use tool. It was not activated.");
    return;
  }
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    this.activate();
  } else {
    this.deactivate();
  }

  return active;
};

Tool.prototype.activate = function () {
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.on(trigger, action);
  }
};

// This function will be called when user tries to activate a tool that
// is already active. It can enable some special behavior.
// Implement this function in a subclass when needed.
Tool.prototype.activateAgain = function () {};

// This function will be implemented by singleUse tools that do not need
// to be activated
Tool.prototype.use = function () {};

Tool.prototype.deactivate = function () {
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.off(trigger);
  }
};

// A tool's event listeners are attached to the `fabricjs` canvas
// and allow the tool to interact with a user's clicks and drags etc.
// Add the tool's event listeners to a list that will be added
// to the canvas upon the tool's activation
Tool.prototype.addEventListener = function (eventTrigger, eventHandler) {
  this._listeners.push({
    trigger: eventTrigger,
    action: eventHandler
  });
};

// Remove tool's event listeners from those to be added to the canvas
// on tool activation
Tool.prototype.removeEventListener = function (trigger) {
  for (var i = 0; i < this._listeners.length; i++) {
    if (trigger == this._listeners[i].trigger){
      return this._listeners.splice(i, 1);
    }
  }
};

module.exports = Tool;

});

require.register("scripts/tools/clone-tool", function(exports, require, module) {
var $ = jQuery;
var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

var CLONE_OFFSET = 15;

/**
 * Single use tool that clones the currently selected object(s).
 */
function CloneTool(name, drawingTool) {
  Tool.call(this, name, drawingTool);
  this.singleUse = true;

  this._clipboard = null;

  // Ctrl / Cmd + C to copy, Ctrl / Cmd + V to paste.
  this.master.$element.on('keydown', function (e) {
    if (this._inTextEditMode()) {
      // Keep default copy and paste actions during text edit.
      return;
    }
    if (e.keyCode === 67 /* C */ && (e.ctrlKey || e.metaKey)) {
      this.copy();
      e.preventDefault();
    }
    if (e.keyCode === 86 /* V */ && (e.ctrlKey || e.metaKey)) {
      this.paste();
      e.preventDefault();
    }
  }.bind(this));
}

inherit(CloneTool, Tool);

/**
 * Clones the currently selected object(s) from the fabricjs canvas.
 */
CloneTool.prototype.use = function () {
  // It's just copy and paste sequence at once.
  this.copy(function () {
    this.paste();
  }.bind(this));
};

CloneTool.prototype.copy = function (callback) {
  var activeObject = this.canvas.getActiveGroup() || this.canvas.getActiveObject();
  if (!activeObject) {
    return;
  }
  // We don't want to copy control point, but the source object instead.
  // See: line-custom-control-points.js
  if (activeObject._dt_sourceObj) {
    activeObject = activeObject._dt_sourceObj;
  }
  var klass = fabric.util.getKlass(activeObject.type);
  var propsToInclude = this.master.ADDITIONAL_PROPS_TO_SERIALIZE;
  if (klass.async) {
    activeObject.clone(function (clonedObject) {
      this._updateClipboard(clonedObject);
      if (typeof callback === 'function') {
        callback();
      }
    }.bind(this), propsToInclude);
  } else {
    this._updateClipboard(activeObject.clone(null, propsToInclude));
    if (typeof callback === 'function') {
      callback();
    }
  }
};

CloneTool.prototype.paste = function () {
  if (!this._clipboard) {
    return;
  }
  var clonedObject = this._clipboard;

  this.canvas.deactivateAllWithDispatch();

  clonedObject.set({
    left: clonedObject.left + CLONE_OFFSET,
    top: clonedObject.top + CLONE_OFFSET
  });
  clonedObject.setCoords();

  if (clonedObject.type === 'group') {
    clonedObject.getObjects().forEach(function (o) {
      this.canvas.add(o);
    }.bind(this));
    this.canvas.setActiveGroup(clonedObject);
  } else {
    this.canvas.add(clonedObject);
    this.canvas.setActiveObject(clonedObject);
  }
  this.canvas.renderAll();
  this.master.pushToHistory();

  // Before user can paste again, we have to clone clipboard object again.
  // Do it just by calling #copy again (note that objects we just pasted are selected).
  this._clipboard = null;
  this.copy();
};

CloneTool.prototype._updateClipboard = function (clonedObject) {
  this._clipboard = clonedObject;
};

CloneTool.prototype._inTextEditMode = function () {
  var activeObject = this.canvas.getActiveObject();
  return activeObject && activeObject.isEditing;
};


module.exports = CloneTool;

});

require.register("scripts/tools/delete-tool", function(exports, require, module) {
var $ = jQuery;
var inherit  = require('scripts/inherit');
var Tool     = require('scripts/tool');

/**
 * Single use tool that deletes the currently selected object(s).
 * This tool also captures the backspace/delete key and is triggered that way as well.
 */
function DeleteTool(name, drawTool) {
  Tool.call(this, name, drawTool);

  this.singleUse = true;

  // Delete the selected object(s) with the backspace key.
  this.master.$element.on('keydown', function(e) {
    if (e.keyCode === 8) {
      this.use();
      e.preventDefault();
    }
  }.bind(this));
}

inherit(DeleteTool, Tool);

/**
 * Deletes the currently selected object(s) from the fabricjs canvas.
 */
DeleteTool.prototype.use = function () {
  var canvas = this.canvas;
  if (canvas.getActiveObject()) {
    canvas.remove(canvas.getActiveObject());
    this.master.pushToHistory();
  } else if (canvas.getActiveGroup()) {
    canvas.getActiveGroup().forEachObject(function (o) {
      canvas.remove(o);
    });
    canvas.discardActiveGroup().renderAll();
    this.master.pushToHistory();
  }
};

module.exports = DeleteTool;

});

require.register("scripts/tools/select-tool", function(exports, require, module) {
var $ = jQuery;
var inherit                 = require('scripts/inherit');
var Tool                    = require('scripts/tool');
var lineCustomControlPoints = require('scripts/fabric-extensions/line-custom-control-points');

var BASIC_SELECTION_PROPERTIES = {
  cornerSize: fabric.isTouchSupported ? 22 : 12,
  transparentCorners: false
};

/**
 * Defacto default tool for DrawingTool.
 * When activated it puts the canvas into a selectable state so objects
 * can be moved and manipulated.
 */
function SelectionTool(name, drawTool) {
  Tool.call(this, name, drawTool);

  this.canvas.on("object:selected", function (opt) {
    opt.target.set(BASIC_SELECTION_PROPERTIES);
    this.canvas.renderAll();
    this._setLastObject(opt.target);
  }.bind(this));

  this._lastObject = null;
  this.canvas.on("object:added", function (opt) {
    this._setLastObject(opt.target);
  }.bind(this));
  this.canvas.on("object:removed", function (opt) {
    this._checkLastObject(opt.target);
  }.bind(this));

  // Bind Ctrl / Cmd + A to select all action.
  this.master.$element.on('keydown', function (e) {
    if (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) {
      this.selectAll();
      e.preventDefault();
    }
  }.bind(this));

  // Set visual options of custom line control points.
  lineCustomControlPoints.controlPointColor = '#bcd2ff';
  lineCustomControlPoints.cornerSize = BASIC_SELECTION_PROPERTIES.cornerSize;
}

inherit(SelectionTool, Tool);

SelectionTool.BASIC_SELECTION_PROPERTIES = BASIC_SELECTION_PROPERTIES;

SelectionTool.prototype.activate = function () {
  SelectionTool.super.activate.call(this);
  this.setSelectable(true);
  this.selectLastObject();
};

SelectionTool.prototype.deactivate = function () {
  SelectionTool.super.deactivate.call(this);
  this.setSelectable(false);
};

SelectionTool.prototype.setSelectable = function (selectable) {
  this.canvas.selection = selectable;
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
};

SelectionTool.prototype.selectAll = function () {
  this.master.chooseTool('select');
  this.master.select(this.canvas.getObjects());
};

SelectionTool.prototype.selectLastObject = function () {
  if (this._lastObject) {
    this.canvas.setActiveObject(this._lastObject);
  }
};

SelectionTool.prototype._setLastObject = function (obj) {
  if (obj._dt_sourceObj) {
    // Ignore custom control points.
    return;
  }
  this._lastObject = obj;
};

SelectionTool.prototype._checkLastObject = function (removedObj) {
  if (removedObj === this._lastObject) {
    var remainingObjects = this.canvas.getObjects();
    this._lastObject = remainingObjects[remainingObjects.length - 1];
  }
};

module.exports = SelectionTool;

});

require.register("scripts/tools/shape-tool", function(exports, require, module) {
var $ = jQuery;
var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');
var Util    = require('scripts/util');

function ShapeTool(name, drawTool) {
  Tool.call(this, name, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this.down = false; // mouse down
  this._firstAction = false; // special behavior on first action

  // Make locked mode default one. Note that this never changes.
  // It used to be optional mode that now is a default one, see:
  // https://www.pivotaltracker.com/story/show/77436218
  this._locked = true;
}

inherit(ShapeTool, Tool);

ShapeTool.prototype.minSize = 7;
ShapeTool.prototype.defSize = 30;

ShapeTool.prototype.activate = function (keepSelection) {
  ShapeTool.super.activate.call(this);
  this.down = false;
  this.canvas.defaultCursor = "crosshair";
  // By default it makes sense to clear selected objects before we switch to another shape tool.
  // However they may be some edge cases when the current selection is useful (text tool and font size
  // change).
  if (!keepSelection) {
    this.master.clearSelection();
  }
};

ShapeTool.prototype.activateAgain = function () {
  // This used to activate 'locked' mode. However now it's activated by default.
  // However this logic may be useful in the future when we decide to do something
  // during a "second activation" (usually second click).
};

ShapeTool.prototype.deactivate = function () {
  ShapeTool.super.deactivate.call(this);
  this.canvas.defaultCursor = "default";
};

ShapeTool.prototype.exit = function () {
  this.down = false;
  this.master.changeOutOfTool();
};

ShapeTool.prototype.mouseDown = function (e) {
  this.down = true;
  if (!this._locked && !this._firstAction && e.target !== undefined) {
    // Not in a locked mode, not the first action and cursor is over some shape.
    this.exit();
  }
};

ShapeTool.prototype.mouseMove = function (e) {
  // noop
};

ShapeTool.prototype.mouseUp = function (e) {
  this.down = false;
};

ShapeTool.prototype.actionComplete = function (newObject) {
  if (newObject) {
    newObject.selectable = !this._locked;
  }
  if (this._locked) {
    return;
  }
  if (this._firstAction) {
    this._firstAction = false;
    // After first action we do want all objects to be selectable,
    // so user can immediately move object that he just created.
    this._setAllObjectsSelectable(true);
  }
};

ShapeTool.prototype.setCentralOrigin = function (object, keepPosition) {
  var strokeWidth = object.stroke ? object.strokeWidth : 0;
  var left = object.left + (object.width + strokeWidth) / 2;
  var top  = object.top + (object.height + strokeWidth) / 2;
  object.set({
    left: left,
    top: top,
    originX: 'center',
    originY: 'center'
  });
};

// During object creation it can end up with negative dimensions. Convert them to positive ones.
ShapeTool.prototype.convertToPositiveDimensions = function (object) {
  if (object.width < 0) {
    object.left = object.left + object.width;
    object.width = -object.width;
  }
  if (object.height < 0) {
    object.top = object.top + object.height;
    object.height = -object.height;
  }
};

ShapeTool.prototype.moveObjectLeftTop = function (object) {
  var strokeWidth = object.stroke ? object.strokeWidth : 0;
  var left = object.left - (object.width + strokeWidth) / 2;
  var top  = object.top - (object.height + strokeWidth) / 2;
  object.set({
    left: left,
    top: top
  });
};

/**
 * This is a special mode which ensures that first action of the shape tool
 * always draws an object, even if user starts drawing over existing object.
 * Later that will cause interaction with the existing object unless user reselects
 * the tool. This is currently unused feature, as locked mode is enabed by default
 * in #activate method.
 */
ShapeTool.prototype._setFirstActionMode = function () {
  this._firstAction = true;
  this._setAllObjectsSelectable(false);
};

ShapeTool.prototype._setAllObjectsSelectable = function (selectable) {
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
};

module.exports = ShapeTool;

});

require.register("scripts/tools/shape-tools/basic-shape-tool", function(exports, require, module) {
var $ = jQuery;
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

var SUPPORTED_SHAPES = {
  rect: {
    fabricType: 'rect'
  },
  square: {
    fabricType: 'rect',
    uniform: true
  },
  ellipse: {
    fabricType: 'ellipse',
    radius: true
  },
  circle: {
    fabricType: 'ellipse',
    uniform: true,
    radius: true
  }
};

function BasicShapeTool(name, drawTool, type) {
  ShapeTool.call(this, name, drawTool);

  this._type = SUPPORTED_SHAPES[type];
  this._shapeKlass = fabric.util.getKlass(this._type.fabricType);
}

inherit(BasicShapeTool, ShapeTool);

BasicShapeTool.prototype.mouseDown = function (e) {
  BasicShapeTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);

  var x = loc.x;
  var y = loc.y;

  this.curr = new this._shapeKlass({
    top: y,
    left: x,
    width: 0,
    height: 0,
    selectable: false,
    lockUniScaling: this._type.uniform,
    fill: this.master.state.fill,
    stroke: this.master.state.stroke,
    strokeWidth: this.master.state.strokeWidth
  });
  this.canvas.add(this.curr);
};

BasicShapeTool.prototype.mouseMove = function (e) {
  BasicShapeTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this.curr.left;
  var height = loc.y - this.curr.top;

  if (this._type.uniform) {
    if (Math.abs(width) < Math.abs(height)) {
      height = Math.abs(width) * sign(height);
    } else {
      width = Math.abs(height) * sign(width);
    }
  }

  this.curr.set({
    width: width,
    height: height
  });

  if (this._type.radius) {
    this.curr.set({
      rx: Math.abs(width / 2),
      ry: Math.abs(height / 2)
    });
  }

  this.canvas.renderAll();
};

function sign(num) {
  return num >= 0 ? 1 : -1;
}

BasicShapeTool.prototype.mouseUp = function (e) {
  BasicShapeTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
  this.master.pushToHistory();
};

BasicShapeTool.prototype._processNewShape = function (s) {
  this.convertToPositiveDimensions(s);
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('width', this.defSize);
    s.set('height', this.defSize);
    if (this._type.radius) {
      s.set('rx', this.defSize / 2);
      s.set('ry', this.defSize / 2);
    }
    // So the center of the object is directly underneath the cursor.
    this.moveObjectLeftTop(s);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = BasicShapeTool;

});

require.register("scripts/tools/shape-tools/free-draw", function(exports, require, module) {
var $ = jQuery;
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');

function FreeDrawTool(name, drawTool) {
  ShapeTool.call(this, name, drawTool);

  var self = this;

  self.canvas.freeDrawingBrush.color = this.master.state.stroke;
  self.canvas.freeDrawingBrush.width = this.master.state.strokeWidth;

  this.master.on('state:changed', function(e) {
    self.canvas.freeDrawingBrush.color = self.master.state.stroke;
    self.canvas.freeDrawingBrush.width = self.master.state.strokeWidth;
  });
}

inherit(FreeDrawTool, ShapeTool);

FreeDrawTool.prototype.mouseDown = function (opt) {
  FreeDrawTool.super.mouseDown.call(this, opt);
  if (!this.active) { return; }
  if (!this.canvas.isDrawingMode) {
    // If we are here, it means the handler is called for the first time.
    // Activate drawing mode and call manually FabricJS handler to handle
    // mouse down in drawing mode correctly.
    //
    // If you take look at FabricJS's methods like:
    // - _onMouseDownInDrawingMode
    // - _onMouseMoveInDrawingMode
    // - _onMouseUpInDrawingMode
    // it's visible that we could implement whole functionality using public
    // `freeDrawingBrush` object. That would be better solution if these methods
    // didn't handle clipping too. It would force us to literally copy the same
    // code. So unless almost everything is handled in brush class, IMHO it's
    // better to use this solution which is at least short and simple.
    this.canvas.isDrawingMode = true;
    this.canvas._onMouseDownInDrawingMode(opt.e);
  }
};

FreeDrawTool.prototype.mouseUp = function (opt) {
  var objects = this.canvas.getObjects();
  var lastObject = objects[objects.length - 1];
  this.curr = lastObject;
  FreeDrawTool.super.mouseUp.call(this, opt);
  if (!this._locked) {
    this.canvas.isDrawingMode = false;
  }
  this.actionComplete(lastObject);
  this.curr = undefined;
  this.master.pushToHistory();
};

FreeDrawTool.prototype.deactivate = function () {
  FreeDrawTool.super.deactivate.call(this);
  this.canvas.isDrawingMode = false;
};

module.exports = FreeDrawTool;

});

require.register("scripts/tools/shape-tools/line-tool", function(exports, require, module) {
var $ = jQuery;
var inherit                 = require('scripts/inherit');
var ShapeTool               = require('scripts/tools/shape-tool');
var SelectTool              = require('scripts/tools/select-tool');
var Util                    = require('scripts/util');
var lineCustomControlPoints = require('scripts/fabric-extensions/line-custom-control-points');
require('scripts/fabric-extensions/arrow');

// Note that this tool supports fabric.Line and all its subclasses (defined
// as part of this code base, not FabricJS itself). Pass 'lineType' argument
// (e.g. "line" or "arrow").

function LineTool(name, drawTool, lineType, lineOptions) {
  ShapeTool.call(this, name, drawTool);

  lineType = lineType || 'line';
  this._lineKlass = fabric.util.getKlass(lineType);
  this._lineOptions = lineOptions;

  lineCustomControlPoints(this.canvas);
}

inherit(LineTool, ShapeTool);

LineTool.prototype.mouseDown = function (e) {
  LineTool.super.mouseDown.call(this, e);

  if (!this.active) return;

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new this._lineKlass([x, y, x, y], $.extend(true, {
    originX: 'center', // important due to custom line control points!
    originY: 'center',
    selectable: false,
    stroke: this.master.state.stroke,
    strokeWidth: this.master.state.strokeWidth
  }, this._lineOptions));
  this.canvas.add(this.curr);
};

LineTool.prototype.mouseMove = function (e) {
  LineTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr.set('x2', x);
  this.curr.set('y2', y);
  this.canvas.renderAll();
};

LineTool.prototype.mouseUp = function (e) {
  LineTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
  this.master.pushToHistory();
};

LineTool.prototype._processNewShape = function (s) {
  var x1 = s.get('x1');
  var y1 = s.get('y1');
  var x2 = s.get('x2');
  var y2 = s.get('y2');
  if (Util.dist(x1 - x2, y1 - y2) < this.minSize) {
    x2 = x1 + this.defSize;
    y2 = y1 + this.defSize;
    s.set('x2', x2);
    s.set('y2', y2);
  }
  s.setCoords();
};

module.exports = LineTool;

});

require.register("scripts/tools/shape-tools/stamp-tool", function(exports, require, module) {
var $ = jQuery;
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');

function StampTool(name, drawTool, parseSVG) {
  ShapeTool.call(this, name, drawTool);

  // If this flag is set to true, stamp tool will try to parse SVG images
  // using parser provided by FabricJS. It lets us avoid tainting canvas
  // in some browsers which always do that when SVG image is rendered
  // on canvas (e.g. Safari, IE).
  this._parseSVG = parseSVG;
  // FabricJS object.
  this._stamp = null;

  this._curr = null
  this._startX = null;
  this._startY = null;
}

inherit(StampTool, ShapeTool);

StampTool.prototype.mouseDown = function (e) {
  StampTool.super.mouseDown.call(this, e);

  if (!this.active || !this._stamp) return;

  var loc = this.canvas.getPointer(e.e);
  this._startX = loc.x;
  this._startY = loc.y;

  this._stamp.clone(function (clonedStamp) {
    clonedStamp.set({
      left: this._startX,
      top: this._startY,
      scaleX: 0,
      scaleY: 0,
      originX: 'center',
      originY: 'center',
      selectable: false
    });
    this._curr = clonedStamp;
    this.canvas.add(this._curr);
  }.bind(this));
};

StampTool.prototype.mouseMove = function (e) {
  StampTool.super.mouseMove.call(this, e);
  if (this.down === false || !this._curr) return;

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this._startX;
  var height = loc.y - this._startY;
  var imgAspectRatio = this._stamp.width / this._stamp.height || 1;

  // Keep original image aspect ratio.
  if (Math.abs(width / height) > imgAspectRatio) {
    width = sign(width) * Math.abs(height) * imgAspectRatio;
  } else {
    height = sign(height) * Math.abs(width) / imgAspectRatio;
  }

  this._curr.set({
    scaleX: Math.abs(width) / this._stamp.width,
    scaleY: Math.abs(height) / this._stamp.height,
    left: this._startX + width * 0.5,
    top: this._startY + height * 0.5
  });

  this.canvas.renderAll();
};

function sign(num) {
  return num >= 0 ? 1 : -1;
}

StampTool.prototype.mouseUp = function (e) {
  StampTool.super.mouseUp.call(this, e);
  if (!this._curr) return;
  this._processNewShape(this._curr);
  this.canvas.renderAll();
  this.actionComplete(this._curr);
  this._curr = undefined;
  this.master.pushToHistory();
};

// Loads an image from URL.
// Callback will be invoked with two arguments - ready FabricJS object and Image element.
// Note that when URL points SVG image, it will be processed in a special way and path group
// object will be created instead of regular image.
StampTool.prototype.loadImage = function(url, callback) {
  if (this._parseSVG && url.toLowerCase().substr(-4) === ".svg") {
    this._loadSVGImage(url, callback);
  } else {
    this._loadNonSVGImage(url, callback);
  }
};

StampTool.prototype.setStampObject = function (stamp) {
  this._stamp = stamp;
};

StampTool.prototype.getStampSrc = function () {
  return this._stamp && this._stamp._dt_sourceURL;
};

StampTool.prototype._processNewShape = function (s) {
  if (Math.max(s.width * s.scaleX, s.height * s.scaleY) < this.minSize) {
    s.set({
      scaleX: 1,
      scaleY: 1,
    });
  }
  s.setCoords();
};

StampTool.prototype._loadSVGImage = function (url, callback) {
  fabric.loadSVGFromURL(url, function (objects, options) {
    var fabricObj = fabric.util.groupSVGElements(objects, options);
    fabricObj._dt_sourceURL = url;
    callback(fabricObj, this._renderToImage(fabricObj));
  }.bind(this));
};

StampTool.prototype._loadNonSVGImage = function (url, callback) {
  fabric.util.loadImage(url, function (img) {
    var fabricObj = new fabric.Image(img, {
      crossOrigin: img.crossOrigin
    });
    fabricObj._dt_sourceURL = url;
    callback(fabricObj, img)
  }, null, 'anonymous');
};

StampTool.prototype._renderToImage = function (fabricObj) {
  var canv = new fabric.Canvas(document.createElement('canvas'));
  canv.setDimensions({
    width: fabricObj.width,
    height: fabricObj.height
  });
  canv.add(fabricObj).renderAll();
  var img = new Image();
  img.src = canv.toDataURL();
  return img;
};

module.exports = StampTool;

});

require.register("scripts/tools/shape-tools/text-tool", function(exports, require, module) {
var $ = jQuery;
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');

function TextTool(name, drawTool) {
  ShapeTool.call(this, name, drawTool);

  this.canvas.on('text:editing:exited', function (opt) {
    if (this.active) {
      // This may be confusing, but if you take a look at FabricJS source, you will notice
      // that text .selectable property is always set to true just before this event
      // is emitted. Quite often is now what we want, especially when TextTool is active.
      opt.target.selectable = false;
    }
    this._pushToHistoryIfModified(opt.target);
  }.bind(this));
}

inherit(TextTool, ShapeTool);

TextTool.prototype.mouseDown = function (opt) {
  // User interacts with the text itself (e.g. select letters or change cursor
  // position), do nothing and exit.
  if (opt.target && opt.target.isEditing) return;

  TextTool.super.mouseDown.call(this, opt);

  // Special behaviour of text tool - single click lets you edit existing text.
  var target = this.canvas.findTarget(opt.e);
  if (target && target.type === 'i-text') {
    this.editText(target, opt.e);
    return;
  }
  // See #_exitTextEditingOnFirstClick method.
  if (!this.active || opt.e._dt_doNotCreateNewTextObj) return;

  var loc = this.canvas.getPointer(opt.e);
  var x = loc.x;
  var y = loc.y;

  var text = new fabric.IText("", {
    left: x,
    top: y,
    lockUniScaling: true,
    fontFamily: 'Arial',
    fontSize: this.master.state.fontSize,
    // Yes, looks strange, but I guess stroke color should be used (as it would be the "main" one).
    fill: this.master.state.stroke
  });
  this.actionComplete(text);
  this.canvas.add(text);
  this.editText(text, opt.e);
  opt.e.preventDefault();
};

TextTool.prototype.activate = function () {
  // Keep selected object so user can change its font size.
  TextTool.super.activate.call(this, true);
};

TextTool.prototype.deactivate = function () {
  TextTool.super.deactivate.call(this);
  // If text is in edit mode, deactivate it before changing the tool.
  this.exitTextEditing();
};

TextTool.prototype.exitTextEditing = function () {
  // If text is in edit mode, deactivate it before changing the tool.
  var activeObj = this.canvas.getActiveObject();
  if (activeObj && activeObj.isEditing) {
    this.canvas.deactivateAllWithDispatch();
  }
};

TextTool.prototype.editText = function (text, e) {
  this.canvas.setActiveObject(text);
  text.enterEditing();
  text.setCursorByClick(e);
  // Unfortunately there is no reliable method to enter editing mode through
  // FabricJS API. Entering edit mode highly depends on sequence of mouse / touch
  // events. Lines below fix: https://www.pivotaltracker.com/story/show/77905208
  // They ensure that user will be able to immediately enter text in some edge cases
  // (drawing tool inside jQuery UI modal dialog).
  // Note that it's exactly the same what FabricJS does in IText onMouseDown handler
  // (at least in FabricJS v1.4.11).
  if (text.hiddenTextarea && text.canvas) {
    text.canvas.wrapperEl.appendChild(text.hiddenTextarea);
    if (fabric.isTouchSupported) {
      // Mobile devices seem to automatically zoom and scroll to input when it gets focus. Set a big font size to
      // avoid zooming. Also, set correct 'top' value so page scrolls to the correct position. Note that this solution
      // isn't perfect, as still page might scroll to the left (due to -1000px val). Unfortunately we can't keep
      // hidden text input in the right place, as the input caret seems to ignore z-index and its always visible (iOS).
      $(text.hiddenTextarea).css({left: '-1000px', top: e.pageY || 0, 'font-size': '50px'});
    }
    text.hiddenTextarea.focus();
  }
  this._exitTextEditingOnFirstClick();
};

// FabricJS also disables edit mode on first click, but only when a canvas is the click target.
// Make sure we always exit edit mode and do it pretty fast, before other handlers are executed
// (useCapture = true, window). That's important e.g. for state history update (edge case: user
// is in edit mode and clicks 'undo' button).
TextTool.prototype._exitTextEditingOnFirstClick = function () {
  var self = this;
  var canvas = this.canvas;
  addHandlers();

  function addHandlers() {
    window.addEventListener('mousedown', handler, true);
    window.addEventListener('touchstart', handler, true);
  }
  function cleanupHandlers() {
    window.removeEventListener('mousedown', handler, true);
    window.removeEventListener('touchstart', handler, true);
  }
  function handler(e) {
    // By default when you click any element, active text should exit edit mode.
    // However if clicked element (or his ancestor) has special class 'dt-keep-text-edit-mode',
    // click will be ignored and edit mode won't be exited.
    if ($(e.target).closest('.dt-keep-text-edit-mode').length > 0) {
      return;
    }
    var target = canvas.findTarget(e);
    var activeObj = canvas.getActiveObject();
    if (target !== activeObj && activeObj && activeObj.isEditing) {
      cleanupHandlers();
      // Exit edit mode and mark that this click shouldn't add a new text object
      // (when canvas is clicked).
      self.exitTextEditing();
      e._dt_doNotCreateNewTextObj = true;
    }
  }
};

TextTool.prototype._pushToHistoryIfModified = function (obj) {
  if (obj.text !== obj._dt_lastText) {
    this.master.pushToHistory();
    obj._dt_lastText = obj.text;
  }
};

module.exports = TextTool;

});

require.register("scripts/ui/basic-button", function(exports, require, module) {
var $ = jQuery;
require('scripts/jquery-longpress');

// Note that we use 'mousedown touchstart' everywhere. It's pretty important,
// as 'click' could interfere with palette auto-hide feature (as it hides on
// 'mousedown'). Also, it simplifies scenarios for touch devices,
// as 'mousedown' occurs in the same moment as 'touchstart'.

function BasicButton(options, ui, drawingTool) {
  this.ui = ui;
  this.dt = drawingTool;

  this.name = options.name;
  this.palette = options.palette;
  // Note that this will be called later by UI manager.
  this.onInit = options.onInit;

  this._locked = false;

  this.$element = $('<div>')
    .addClass('dt-btn')
    .addClass(options.classes)
    .attr('title', options.tooltip)
    .appendTo(ui.getPalette(options.palette).$element);

  this.$label = $('<span>')
    .text(options.label)
    .appendTo(this.$element);

  if (options.onClick) {
    this.$element.on('mousedown touchstart', function (e) {
      if (this._locked) return;
      options.onClick.call(this, e, ui, drawingTool);
      e.preventDefault();
    }.bind(this));
  }

  if (options.onLongPress) {
    this.$element.longPress(function (e) {
      if (this._locked) return;
      options.onLongPress.call(this, e, ui, drawingTool);
      e.preventDefault();
    }.bind(this));
  }

  if (options.onStateChange) {
    drawingTool.on('state:changed', function (state) {
      options.onStateChange.call(this, state);
    }.bind(this));
  }

  if (options.onToolChange) {
    drawingTool.on('tool:changed', function (state) {
      options.onToolChange.call(this, state);
    }.bind(this));
  }

  if (options.activatesTool) {
    this.$element.on('mousedown touchstart', function (e) {
      if (this._locked) return;
      drawingTool.chooseTool(options.activatesTool);
      e.preventDefault();
    }.bind(this));

    drawingTool.on('tool:changed', function (toolName) {
      if (toolName === options.activatesTool) {
        this.$element.addClass('dt-active');
      } else {
        this.$element.removeClass('dt-active');
      }
    }.bind(this));
  }

  if (options.reflectsTools) {
    drawingTool.on('tool:changed', function (toolName) {
      if (options.reflectsTools.indexOf(toolName) !== -1) {
        this.setActive(true);
        this.setLabel(ui.getButton(toolName).getLabel());
      } else {
        this.setActive(false);
        this.$element.removeClass('dt-active');
      }
    }.bind(this));
  }
}

BasicButton.prototype.setLabel = function (label) {
  this.$label.text(label);
};

BasicButton.prototype.getLabel = function () {
  return this.$label.text();
};

BasicButton.prototype.click = function () {
  // #triggerHandler won't create a native event that bubbles (in contrast
  // to #trigger). Use it as otherwise it could interfere with some other
  // handlers listening to 'mousedown' on window (palette auto-hide feature).
  this.$element.triggerHandler('mousedown');
};

BasicButton.prototype.setActive = function (v) {
  if (v) {
    this.$element.addClass('dt-active');
  } else {
    this.$element.removeClass('dt-active');
  }
};

BasicButton.prototype.setLocked = function (v) {
  if (v) {
    this.$element.addClass('dt-locked');
  } else {
    this.$element.removeClass('dt-locked');
  }
  this._locked = v;
};

module.exports = BasicButton;

});

require.register("scripts/ui/color-button", function(exports, require, module) {
var $ = jQuery;
var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function ColorButton(options, ui, drawingTool) {
  var callback;
  if (options.type === 'stroke') {
    callback = function () {
      this.dt.setStrokeColor(options.color);
      this.dt.setSelectionStrokeColor(options.color);
    };
  } else {
    callback = function () {
      this.dt.setFillColor(options.color);
      this.dt.setSelectionFillColor(options.color);
    };
  }
  options.onClick = callback;
  BasicButton.call(this, options, ui, drawingTool);

  this.setBackground(options.color);
}

inherit(ColorButton, BasicButton);

ColorButton.prototype.setBackground = function(color) {
  if (!color) {
    this.$element.addClass('dt-transparent');
    return;
  }
  this.$element.css('background', color);
};

module.exports = ColorButton;

});

require.register("scripts/ui/fill-button", function(exports, require, module) {
var $ = jQuery;
var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function FillButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);

  this.$element
    .addClass('dt-fill-color');
  $('<div>')
    .addClass('dt-color')
    .appendTo(this.$element);
}

inherit(FillButton, BasicButton);

FillButton.prototype.setColor = function(color) {
  if (!color) {
    this.$element.find('.dt-color').addClass('dt-no-color');
    // Light gray looks better than white / transparent.
    color = '#ddd';
  } else {
    this.$element.find('.dt-color').removeClass('dt-no-color');
  }
  this.$element.find('.dt-color').css('background', color);
};

module.exports = FillButton;

});

require.register("scripts/ui/generate-stamps", function(exports, require, module) {
var $ = jQuery;
var StampImageButton = require('scripts/ui/stamp-image-button');

var INSERT_STAMP_AFTER = 'text';

function generateStamps(uiDefinition, stampsDefition) {
  if (!stampsDefition) {
    return;
  }

  // Main stamp button.
  var prevBtnIdx = findButtonIndex(INSERT_STAMP_AFTER, uiDefinition.buttons);
  uiDefinition.buttons.splice(prevBtnIdx + 1, 0, {
    name: 'stamp',
    tooltip: 'Stamp tool (click and hold to show available categories)',
    classes: 'dt-expand',
    label: 'M',
    palette: 'main',
    activatesTool: 'stamp',
    onLongPress: function () {
      this.ui.togglePalette('stampCategories');
    }
  });

  // Palette with stamp categories.
  uiDefinition.palettes.push({
    name: 'stampCategories',
    anchor: 'stamp',
    vertical: true,
    hideOnClick: false
  });

  // Generate separate palettes with stamp buttons for each category.
  var firstStamp = true;
  Object.keys(stampsDefition).forEach(function (category) {
    var categoryBtnName = category + 'StampsCategory';
    var categoryPaletteName = category + 'StampsPalette';

    var categoryBtn = {
      name: categoryBtnName,
      label: category,
      tooltip: category + ' category (click to show available stamps)',
      classes: 'dt-text-btn dt-expand',
      palette: 'stampCategories',
      onClick: function () {
        this.ui.togglePalette(categoryPaletteName);
      }
    }
    uiDefinition.buttons.push(categoryBtn);

    var categoryPalette = {
      name: categoryPaletteName,
      anchor: categoryBtnName
    };
    uiDefinition.palettes.push(categoryPalette);

    var stampButtons = generateStampButtons(categoryPaletteName, stampsDefition[category]);
    stampButtons.forEach(function (stampButton) {
      uiDefinition.buttons.push(stampButton);
    })
  });

  function generateStampButtons(paletteName, imagesArray) {
    var result = [];
    imagesArray.forEach(function (imgSrc) {
      result.push({
        imageSrc: imgSrc,
        setStampOnImgLoad: firstStamp,
        buttonClass: StampImageButton,
        palette: paletteName
      });
      // The first stamp we create will set its image as a default stamp in stamp tool.
      // So when user select stamp tool, he would be able to draw something even without
      // entering sub-menus.
      if (firstStamp) {
        firstStamp = false;
      }
    });
    return result;
  }

  function findButtonIndex(name, buttons) {
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].name === name) {
        return i;
      }
    }
  }
}

module.exports = generateStamps;

});

require.register("scripts/ui/line-width-button", function(exports, require, module) {
var $ = jQuery;
var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function LineWidthButton(options, ui, drawingTool) {
  options.onClick = function () {
    this.dt.setStrokeWidth(options.width);
    this.dt.setSelectionStrokeWidth(options.width);
  };
  options.onStateChange = function (state) {
    if (state.strokeWidth === options.width) {
      this.$element.addClass('dt-active');
    } else {
      this.$element.removeClass('dt-active');
    }
  };
  BasicButton.call(this, options, ui, drawingTool);

  $('<div>')
    .addClass('dt-line-width-icon')
    .appendTo(this.$element);
  this.setLineWidth(options.width);
}

inherit(LineWidthButton, BasicButton);

LineWidthButton.prototype.setLineWidth = function(width) {
  if (width === 0) {
    this.$element.find('.dt-line-width-icon').addClass('dt-no-stroke');
    return;
  }
  this.$element.find('.dt-line-width-icon').css('width', width);
};

module.exports = LineWidthButton;

});

require.register("scripts/ui/palette", function(exports, require, module) {
var $ = jQuery;
function Palette(options, ui) {
  this.ui          = ui;
  this.name        = options.name;
  this.permanent   = !!options.permanent;
  this.hideOnClick = options.hideOnClick === undefined ? true : options.hideOnClick;
  this.anchor      = options.anchor;
  this.$element    = $('<div>')
    .addClass('dt-palette')
    .addClass(options.vertical ? 'dt-vertical' : 'dt-horizontal');

  this._closeOnClick = function (e) {
    if (!this.hideOnClick && (this.$element === e.target || this.$element.find(e.target).length > 0)) {
      return;
    }
    if (this.$element.is(':visible')) {
      this._hide();
    }
    this._clearWindowHandlers();
  }.bind(this);

  if (!this.permanent) {
    this.$element.hide();
  }
}

Palette.prototype.toggle = function () {
  if (this.$element.is(':visible')) {
    this._hide();
  } else {
    this._show();
  }
};

Palette.prototype._show = function () {
  this._position();
  this.$element.show();

  if (this.permanent) {
    return;
  }
  // Hide palette on first mousedown / touch (if it's not permanent).
  // Timeout ensures that we won't catch the same event which actually
  // opened the palette.
  setTimeout(function () {
    $(window).on('mousedown touchstart', this._closeOnClick);
  }.bind(this), 16);
};

Palette.prototype._hide = function () {
  this.$element.hide();
  this._clearWindowHandlers();
};

Palette.prototype._clearWindowHandlers = function () {
  $(window).off('mousedown touchstart', this._closeOnClick);
};

Palette.prototype._position = function () {
  var anchorButton = this.anchor && this.ui.getButton(this.anchor);
  if (!anchorButton) {
    return;
  }
  var p = anchorButton.$element.offset();
  var mainP = this.ui.getMainContainer().offset();
  this.$element.css({
    position: 'absolute',
    top:      p.top - mainP.top,
    left:     p.left + anchorButton.$element.outerWidth() - mainP.left,
  });
};

module.exports = Palette;

});

require.register("scripts/ui/stamp-image-button", function(exports, require, module) {
var $ = jQuery;
var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function StampImageButton(options, ui, drawingTool) {
  options.onClick = function () {
    this.dt.tools.stamp.setStampObject(this._stamp);
  };
  BasicButton.call(this, options, ui, drawingTool);

  this._stamp = null;
  this._imageSrc = drawingTool.proxy(options.imageSrc);

  this.$element.addClass('dt-img-btn');

  this._startWaiting();
  this.dt.tools.stamp.loadImage(this._imageSrc, function (fabricObj, img) {
    this._stamp = fabricObj;
    this.$image = $(img).appendTo(this.$element);
    this._stopWaiting();
    if (options.setStampOnImgLoad) {
      this.dt.tools.stamp.setStampObject(this._stamp);
    }
  }.bind(this), null, 'anonymous');

  // Note that we should have some other event like 'stampToolImage:changed'.
  // However 'tool:changed' is good enough for now to handle all cases.
  // It's impossible to see this button without prior stamp tool activation.
  // So 'tool:changed' will be always emitted before and active state updated.
  drawingTool.on('tool:changed', function (toolName) {
    if (toolName === 'stamp' && drawingTool.tools.stamp.getStampSrc() === this._imageSrc) {
      this.setActive(true);
    } else {
      this.setActive(false);
    }
  }.bind(this));
}

inherit(StampImageButton, BasicButton);

StampImageButton.prototype._startWaiting = function () {
  this.setLocked(true);
  this.$element.find('span')
    .addClass('dt-spin')
    .text('/');
};

StampImageButton.prototype._stopWaiting = function () {
  this.setLocked(false);
  this.$element.find('span')
    .removeClass('dt-spin')
    .text('');
};

module.exports = StampImageButton;

});

require.register("scripts/ui/stroke-button", function(exports, require, module) {
var $ = jQuery;
var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function StrokeButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);

  this.$element
    .addClass('dt-stroke-color');
  var $color = $('<div>')
    .addClass('dt-color')
    .appendTo(this.$element);
  $('<div>')
    .addClass('dt-inner1')
    .appendTo($color);
  $('<div>')
    .addClass('dt-inner2')
    .appendTo($color);
}

inherit(StrokeButton, BasicButton);

StrokeButton.prototype.setColor = function(color) {
  if (!color) {
    this.$element.find('.dt-color').addClass('dt-no-color');
    // Light gray looks better than white / transparent.
    color = '#ddd';
  } else {
    this.$element.find('.dt-color').removeClass('dt-no-color');
  }
  this.$element.find('.dt-color').css('background', color);
};

module.exports = StrokeButton;

});

require.register("scripts/ui/ui-definition", function(exports, require, module) {
var $ = jQuery;
var StrokeButton    = require('scripts/ui/stroke-button');
var FillButton      = require('scripts/ui/fill-button');
var ColorButton     = require('scripts/ui/color-button');
var LineWidthButton = require('scripts/ui/line-width-button');

var COLORS = [
  '',
  '#efefef',
  '#e66665',
  '#75b792',
  '#076bb6',
  '#ffd605',
  '#f47d43',
  '#ae70af',
  '#a9b2b1',
  '#333333'
];

var STROKE_WIDTHS = [
  1,
  2,
  4,
  8,
  12,
  16,
  20
];

var FONT_SIZES = [
  12,
  17,
  22,
  27,
  32,
  37,
  42
];

var ui = {
  /***
   * Palettes
   ***/
  palettes: [
    {
      name: 'main',
      permanent: true,
      vertical: true
    },
    {
      name: 'lines',
      anchor: 'linesPalette'
    },
    {
      name: 'shapes',
      anchor: 'shapesPalette'
    },
    {
      name: 'fontSizes',
      anchor: 'text'
    },
    {
      name: 'strokeColors',
      anchor: 'strokeColorPalette'
    },
    {
      name: 'fillColors',
      anchor: 'fillColorPalette'
    },
    {
      name: 'strokeWidths',
      anchor: 'strokeWidthPalette'
    }
  ],
  buttons: [
    /***
     * Main tools
     ***/
    {
      label: 's',
      tooltip: 'Select tool',
      activatesTool: 'select',
      palette: 'main'
    },
    {
      name: 'linesPalette',
      tooltip: 'Line tool (click and hold to show available line types)',
      classes: 'dt-expand',
      reflectsTools: ['line', 'arrow', 'doubleArrow'],
      palette: 'main',
      onInit: function () {
        this.setLabel(this.ui.getPaletteActiveButton('lines').getLabel());
      },
      onClick: function () {
        this.ui.getPaletteActiveButton('lines').click();
      },
      onLongPress: function () {
        this.ui.togglePalette('lines');
      }
    },
    {
      name: 'shapesPalette',
      tooltip: 'Basic shape tool (click and hold to show available shapes)',
      classes: 'dt-expand',
      reflectsTools: ['rect', 'ellipse', 'square', 'circle'],
      palette: 'main',
      onInit: function () {
        this.setLabel(this.ui.getPaletteActiveButton('shapes').getLabel());
      },
      onClick: function () {
        this.ui.getPaletteActiveButton('shapes').click();
      },
      onLongPress: function () {
        this.ui.togglePalette('shapes');
      }
    },
    {
      name: 'free',
      tooltip: 'Free hand drawing tool',
      label: 'F',
      activatesTool: 'free',
      palette: 'main'
    },
    {
      name: 'text',
      tooltip: 'Text tool (click and hold to show available font sizes)',
      label: 'T',
      // Do not exit text edit mode on click. See text tool class.
      classes: 'dt-expand dt-keep-text-edit-mode',
      activatesTool: 'text',
      palette: 'main',
      onLongPress: function () {
        this.ui.togglePalette('fontSizes');
      }
    },
    {
      name: 'clone',
      tooltip: 'Clone tool',
      label: 'c',
      activatesTool: 'clone',
      palette: 'main',
      onInit: lockWhenNothingIsSelected
    },
    {
      name: 'strokeColorPalette',
      tooltip: 'Stroke color (click and hold to show available colors)',
      buttonClass: StrokeButton,
      // Do not exit text edit mode on click. See text tool class.
      classes: 'dt-expand dt-keep-text-edit-mode',
      palette: 'main',
      onInit: function () {
        this.setColor(this.dt.state.stroke);
      },
      onStateChange: function (state) {
        this.setColor(state.stroke);
      },
      onClick: function () {
        this.ui.togglePalette('strokeColors');
      }
    },
    {
      name: 'fillColorPalette',
      tooltip: 'Fill color (click and hold to show available colors)',
      buttonClass: FillButton,
      classes: 'dt-expand',
      palette: 'main',
      onInit: function () {
        this.setColor(this.dt.state.fill);
      },
      onStateChange: function (state) {
        this.setColor(state.fill);
      },
      onClick: function () {
        this.ui.togglePalette('fillColors');
      }
    },
    {
      name: 'strokeWidthPalette',
      tooltip: 'Stroke width (click and hold to show available options)',
      label: 'w',
      classes: 'dt-expand',
      palette: 'main',
      onClick: function () {
        this.ui.togglePalette('strokeWidths');
      }
    },
    {
      name: 'sendToBack',
      tooltip: 'Send selected objects to back',
      label: 'm',
      classes: 'dt-send-to',
      palette: 'main',
      onInit: lockWhenNothingIsSelected,
      onClick: function () {
        this.dt.sendSelectionToBack();
      }
    },
    {
      name: 'sendToFront',
      tooltip: 'Send selected objects to front',
      label: 'l',
      classes: 'dt-send-to',
      palette: 'main',
      onInit: lockWhenNothingIsSelected,
      onClick: function () {
        this.dt.sendSelectionToFront();
      }
    },
    {
      name: 'undo',
      tooltip: 'Undo',
      label: 'u',
      classes: 'dt-undo-redo',
      palette: 'main',
      onClick: function () {
        this.dt.undo();
      },
      onInit: function () {
        this.setLocked(true);
        this.dt.on("undo:possible", function () {
          this.setLocked(false);
        }.bind(this));
        this.dt.on("undo:impossible", function () {
          this.setLocked(true);
        }.bind(this));
      }
    },
    {
      name: 'redo',
      tooltip: 'Redo',
      label: 'r',
      classes: 'dt-undo-redo',
      palette: 'main',
      onClick: function () {
        this.dt.redo();
      },
      onInit: function () {
        this.setLocked(true);
        this.dt.on("redo:possible", function () {
          this.setLocked(false);
        }.bind(this));
        this.dt.on("redo:impossible", function () {
          this.setLocked(true);
        }.bind(this));
      }
    },
    {
      name: 'trash',
      tooltip: 'Delete selected objects',
      label: 'd',
      activatesTool: 'trash',
      palette: 'main',
      onInit: lockWhenNothingIsSelected
    },
    /***
     * Line tools
     ***/
    {
      name: 'line',
      tooltip: 'Line',
      label: 'L',
      activatesTool: 'line',
      palette: 'lines'
    },
    {
      name: 'arrow',
      tooltip: 'Arrow',
      label: 'A',
      activatesTool: 'arrow',
      palette: 'lines'
    },
    {
      name: 'doubleArrow',
      tooltip: 'Double arrow',
      label: 'D',
      activatesTool: 'doubleArrow',
      palette: 'lines'
    },
    /***
     * Shape tools
     ***/
    {
      name: 'rect',
      tooltip: 'Rectangle',
      label: 'R',
      activatesTool: 'rect',
      palette: 'shapes'
    },
    {
      name: 'ellipse',
      tooltip: 'Ellipse',
      label: 'E',
      activatesTool: 'ellipse',
      palette: 'shapes'
    },
    {
      name: 'square',
      tooltip: 'Square',
      label: 'S',
      activatesTool: 'square',
      palette: 'shapes'
    },
    {
      name: 'circle',
      tooltip: 'Circle',
      label: 'C',
      activatesTool: 'circle',
      palette: 'shapes'
    }
  ]
};

FONT_SIZES.forEach(function (fontSize) {
  ui.buttons.push({
    label: 'T',
    tooltip: fontSize + 'px',
    // Do not exit text edit mode on click. See text tool class.
    classes: 'dt-keep-text-edit-mode',
    onInit: function () {
      this.$element.css('font-size', fontSize);
      // It just looks better for given set of font sizes.
      this.$element.css('line-height', '50px');
    },
    onClick: function () {
      this.dt.setFontSize(fontSize);
      this.dt.setSelectionFontSize(fontSize);
    },
    onStateChange: function (state) {
      this.setActive(state.fontSize === fontSize);
    },
    palette: 'fontSizes'
  });
});

COLORS.forEach(function (color) {
  ui.buttons.push({
    buttonClass: ColorButton,
    tooltip: color,
    // Do not exit text edit mode on click. See text tool class.
    classes: 'dt-keep-text-edit-mode',
    color: color,
    type: 'stroke',
    palette: 'strokeColors'
  });
  ui.buttons.push({
    buttonClass: ColorButton,
    tooltip: color,
    color: color,
    type: 'fill',
    palette: 'fillColors'
  });
});

STROKE_WIDTHS.forEach(function (width) {
  ui.buttons.push({
    buttonClass: LineWidthButton,
    tooltip: width + 'px',
    width: width,
    palette: 'strokeWidths'
  });
});

// Helper functions that may be used by buttons.
// Note that all listeners are called in the context
// of the button isntance (`this` value).
function lockWhenNothingIsSelected() {
  this.setLocked(true);
  this.dt.canvas.on("object:selected", function () {
    this.setLocked(false);
  }.bind(this));
  this.dt.canvas.on("selection:cleared", function () {
    this.setLocked(true);
  }.bind(this));
}

module.exports = ui;

});

require.register("scripts/ui/ui-manager", function(exports, require, module) {
var $ = jQuery;
var BasicButton    = require('scripts/ui/basic-button');
var Palette        = require('scripts/ui/palette');
var generateStamps = require('scripts/ui/generate-stamps');
var uiDefinition   = require('scripts/ui/ui-definition');

function UIManager(drawingTool) {
  this.drawingTool = drawingTool;

  this.$tools = $('<div>')
    .addClass('dt-tools')
    .prependTo(drawingTool.$element);

  this._palettes = {};
  this._buttons = {};
  this._paletteActiveButton = {};
  // Copy ui definition so custom modifications won't affect globally available object.
  var uiDef = $.extend(true, {}, uiDefinition);
  if (this.drawingTool.options.stamps) {
    generateStamps(uiDef, this.drawingTool.options.stamps);
  }
  this._processUIDefinition(uiDef);

  for (var name in this._buttons) {
    var btn = this._buttons[name];
    if (btn.onInit) {
      btn.onInit.call(btn, this, drawingTool);
    }
  }
}

UIManager.prototype._processUIDefinition = function (uiDef) {
  this.$tools.empty();
  uiDef.palettes.forEach(this._createPalette.bind(this));
  uiDef.buttons.forEach(this._createButton.bind(this));
};

UIManager.prototype.getButton = function (name) {
  return this._buttons[name];
};

UIManager.prototype.getPalette = function (name) {
  return this._palettes[name];
};

UIManager.prototype.togglePalette = function (name) {
  this._palettes[name].toggle();
};

UIManager.prototype.getMainContainer = function () {
  return this.drawingTool.$element;
};

UIManager.prototype.getPaletteActiveButton = function (name) {
  return this._paletteActiveButton[name];
};

UIManager.prototype._createPalette = function (paletteOptions) {
  var palette = new Palette(paletteOptions, this);
  var paletteName = palette.name || getUniqueName();
  palette.$element.appendTo(this.$tools);
  this._palettes[paletteName] = palette;
};

UIManager.prototype._createButton = function (buttonOptions) {
  var BtnClass = buttonOptions.buttonClass || BasicButton;
  var button = new BtnClass(buttonOptions, this, this.drawingTool);
  var buttonName = button.name || getUniqueName();
  this._buttons[buttonName] = button;

  this._setupPaletteActiveButton(button);
};

UIManager.prototype._setupPaletteActiveButton = function (button) {
  if (!this._paletteActiveButton[button.palette]) {
    // This will first button added to palette as "active" palette button.
    this._paletteActiveButton[button.palette] = button;
  }
  button.$element.on('mousedown touchstart', function () {
    // This will update "active" palette button during every click / touch.
    this._paletteActiveButton[button.palette] = button;
  }.bind(this));
};

var _idx = 0;
function getUniqueName() {
  return _idx++;
}

module.exports = UIManager;

});

require.register("scripts/undo-redo", function(exports, require, module) {
var $ = jQuery;
var MAX_HISTORY_LENGTH = 20;

function UndoRedo(drawTool) {
  this.dt = drawTool;
  this._suppressHistoryUpdate = false;

  this.reset();

  this.dt.$element.on('keydown', function (e) {
    if (e.keyCode === 90 /* Z */ && (e.ctrlKey || e.metaKey)) {
      this.undo();
      e.preventDefault();
    } else if (e.keyCode === 89 /* V */ && (e.ctrlKey || e.metaKey)) {
      this.redo();
      e.preventDefault();
    }
  }.bind(this));
}

UndoRedo.prototype.undo = function () {
  var prevState = this._storage[this._idx - 1];
  if (!prevState) {
    return;
  }
  this._load(prevState);
  this._idx -= 1;
};

UndoRedo.prototype.redo = function () {
  var nextState = this._storage[this._idx + 1];
  if (!nextState) {
    return;
  }
  this._load(nextState);
  this._idx += 1;
};

UndoRedo.prototype.saveState = function (opt) {
  var newState = this.dt.save();
  if (this._suppressHistoryUpdate || newState === this._lastState()) {
    return;
  }
  this._idx += 1;
  this._storage[this._idx] = newState;
  // Discard all states after current one.
  this._storage.length = this._idx + 1;
  this._cutOffOldStates();
};

UndoRedo.prototype.reset = function () {
  this._storage = [];
  this._idx = -1;
};

UndoRedo.prototype.canUndo = function () {
  return !!this._storage[this._idx - 1];
};

UndoRedo.prototype.canRedo = function () {
  return !!this._storage[this._idx + 1];
};

UndoRedo.prototype._lastState = function () {
  return this._storage[this._idx];
};

UndoRedo.prototype._load = function (state) {
  // Note that #load is a normal action that updates history. However when
  // a state is restored from the history, it's definitely unwanted.
  this.dt.load(state, null, true);
};

UndoRedo.prototype._cutOffOldStates = function () {
  var statesToRemove = this._storage.length - MAX_HISTORY_LENGTH;
  if (statesToRemove > 0) {
    this._storage.splice(0, statesToRemove);
    this._idx = this._storage.length - 1;
  }
};

module.exports = UndoRedo;

});

require.register("scripts/util", function(exports, require, module) {
var $ = jQuery;
module.exports = {
  dist: function dist(dx, dy){
    var dx2 = Math.pow(dx, 2);
    var dy2 = Math.pow(dy, 2);
    return Math.sqrt(dx2 + dy2);
  }
};

});

require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');

// See: https://github.com/brunch/brunch/issues/712

// Export DrawingTool constructor to 'window' object. There is an assumption
// that DrawingTool is always included using a script tag on a regular web page.
// However we can implement CommonJS and AMD support here too (e.g. using similar
// code snippet that is used by Browserify when 'standalone' option is enabled).
window.DrawingTool = require('scripts/drawing-tool');

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (true) {
     // AMD. Register as an anonymous module.
    !(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
      return EventEmitter;
    }.call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();


/***/ }),
/* 35 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(window.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function createLinkElement(options) {
	var linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	insertStyleElement(options, linkElement);
	return linkElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else if(obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function") {
		styleElement = createLinkElement(options);
		update = updateLink.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
			if(styleElement.href)
				URL.revokeObjectURL(styleElement.href);
		};
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		styleElement.setAttribute("media", media)
	}

	if(styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}

function updateLink(linkElement, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	if(sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = linkElement.href;

	linkElement.href = URL.createObjectURL(blob);

	if(oldSrc)
		URL.revokeObjectURL(oldSrc);
}


/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(32);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(35)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./../../node_modules/css-loader/index.js!./../../node_modules/sass-loader/lib/loader.js!./drawing-tool.scss", function() {
			var newContent = require("!!./../../node_modules/css-loader/index.js!./../../node_modules/sass-loader/lib/loader.js!./drawing-tool.scss");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 37 */
/***/ (function(module, exports) {

module.exports = "data:application/x-font-ttf;base64,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"

/***/ }),
/* 38 */
/***/ (function(module, exports) {

module.exports = "data:application/font-woff;base64,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"

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

var DrawingTool = __webpack_require__(10);

module.exports = DrawingTool;


/***/ }),
/* 40 */
/***/ (function(module, exports) {


function FirebaseImp(setDataMethod) {
  this.user = null;
  this.token = null;
  this.clientSetDataMethod = setDataMethod;
  this.refName = 'drawToolSerialData';
  this.config = {
    apiKey: "AIzaSyDUm2l464Cw7IVtBef4o55key6sp5JYgDk",
    authDomain: "colabdraw.firebaseapp.com",
    databaseURL: "https://colabdraw.firebaseio.com",
    storageBucket: "colabdraw.appspot.com",
    messagingSenderId: "432582594397"
  };
  this.initFirebase();
}

FirebaseImp.prototype.log = function(mesg) {
  console.log(mesg);
};

FirebaseImp.prototype.error = function(error) {
  this.log(error);
};

FirebaseImp.prototype.reqAuth = function() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithRedirect  (provider)
  .then(this.finishAuth.bind(this))
  .catch(this.failAuth.bind(this));
};

FirebaseImp.prototype.failAuth = function(error) {
  var errorCode = error.code;
  var errorMessage = error.message;
  var email = error.email;
  var credential = error.credential;
  this.error(
  ["couldn't authenticate", errorMessage, error.email]
  .join(" ")
  );
};

FirebaseImp.prototype.finishAuth = function(result) {
  this.user = result.user;
  this.dataRef = firebase.database().ref(this.refName);
  this.registerListeners();
  this.log('logged in');
};

FirebaseImp.prototype.registerListeners = function() {
  console.log("registering listeners");
  var ref = this.dataRef;
  var setData = this.clientSetDataMethod.bind(this);

  ref.on('value', function(data){
    console.log(data.val());
    console.log('value');
    setData(data.val());
  });

  ref.on('child_changed', function(data){
    console.log(data);
    console.log('child_changed');
  });
    ref.on('child_added', function(data){
    console.log(data);
    console.log('child added');
  });

  ref.on('child_removed', function(data){
    console.log(data);
    console.log('child removed');
  });
};

FirebaseImp.prototype.update = function(data) {
  this.log(this.dataRef.update({'serializedData': data}));
};

FirebaseImp.prototype.initFirebase = function() {
  firebase.initializeApp(this.config);
  var finishAuth = this.finishAuth.bind(this);
  var reqAuth    = this.reqAuth.bind(this);
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      console.log(user.displayName + " authenticated");
      finishAuth({result: {user: user}});
    } else {
      reqAuth();
    }
  });
};

module.exports = FirebaseImp;


/***/ })
/******/ ]);
});
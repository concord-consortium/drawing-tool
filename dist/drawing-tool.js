(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
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
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
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
var rescale2resize    = require('scripts/fabric-extensions/rescale-2-resize');
var multitouchSupport = require('scripts/fabric-extensions/multi-touch-support');

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

  this._history = new UndoRedo(this);

  new UIManager(this);

  // Apply a fix that changes native FabricJS rescaling behavior into resizing.
  rescale2resize(this.canvas);
  // Adds support for multitouch support (pinching resize, two finger rotate, etc)
  multitouchSupport(this.canvas);

  // Note that at the beginning we will emmit two events - state:changed and tool:changed.
  this._fireStateChange();
  this.chooseTool('select');
  this.pushToHistory();
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
};

DrawingTool.prototype.undo = function () {
  this._history.undo();
  this._fireHistoryEvents();
};

DrawingTool.prototype.redo = function () {
  this._history.redo();
  this._fireHistoryEvents();
};

DrawingTool.prototype.resetHistory = function () {
  this._history.reset();
  // Push the "initial" state.
  this.pushToHistory();
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
  this._fireStateChange();
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
  this._fireStateChange();
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
  this._fireStateChange();
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
  this._fireStateChange();
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

DrawingTool.prototype._fireStateChange = function () {
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
    for (var i = 0; i < s.path.length; i++) {
      s.path[i][1] *= s.scaleX;
      s.path[i][2] *= s.scaleY;
      s.path[i][3] *= s.scaleX;
      s.path[i][4] *= s.scaleY;
    }
    // We have two options to adjust width/height:
    // 1) this makes inaccurate bounding box dimensions but
    //    eliminates "floating" or weird behavior at edges
    basicWidthHeightTransform(s);
    // 2) this approach "floats" and has strange bugs but
    //    generates accurate bounding boxes
    // s.width = s.width * s.scaleX;
    // s.height = s.height * s.scaleY;
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
  this.canvas = drawTool.canvas;
  this._suppressHistoryUpdate = false;

  this.reset();
  this._saveStateOnUserInteraction();

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

UndoRedo.prototype._saveStateOnUserInteraction = function () {
  this.canvas.on('object:modified', function () {
    this.saveState();
  }.bind(this));
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

// See: https://github.com/brunch/brunch/issues/712

// Export DrawingTool constructor to 'window' object. There is an assumption
// that DrawingTool is always included using a script tag on a regular web page.
// However we can implement CommonJS and AMD support here too (e.g. using similar
// code snippet that is used by Browserify when 'standalone' option is enabled).
window.DrawingTool = require('scripts/drawing-tool');


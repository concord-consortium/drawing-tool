var rescale2resize    = require('scripts/fabric-extensions/rescale-2-resize');
var multitouchSupport = require('scripts/fabric-extensions/multi-touch-support');
var UI                = require('scripts/ui');

var DEF_OPTIONS = {
  width: 700,
  height: 500
};

var DEF_STATE = {
  // stroke: "rgba(100,200,200,.75)",
  stroke: 'black',
  strokeWidth: 10,
  fill: ""
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
  this.options = jQuery.extend(true, {}, DEF_OPTIONS, options);

  this.state = jQuery.extend(true, {}, DEF_STATE, settings);
  this._stateListeners = [];

  this.tools = {};

  // TODO: decouple this part? Seems very intertwined
  this.ui = new UI(this, selector, this.options); // initialize the UI and containers
  this._initFabricJS(); // fill the container intialized above with the fabricjs canvas
  this.ui.initTools(); // initialize tools after fabricjs has been constructed

  // Apply a fix that changes native FabricJS rescaling behavior into resizing.
  rescale2resize(this.canvas);
  // Adds support for multitouch support (pinching resize, two finger rotate, etc)
  multitouchSupport(this.canvas);
}

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
    this._backgroundImage = null;
  }
  this.canvas.renderAll();
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
  // It ensures that all custom control points will be removed before serialization!
  this.clearSelection();
  return JSON.stringify({
    dt: {
      // Drawing Tool specific options.
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight()
    },
    canvas: this.canvas.toJSON(ADDITIONAL_PROPS_TO_SERIALIZE)
  });
};

/*
 * Loads a previous state of the fabricjs canvas from JSON.
 * (used in conjunction with `save()`)
 *
 * parameters:
 *  - jsonString: JSON data
 */
DrawingTool.prototype.load = function (jsonString) {
  // Undefined, null or empty string just clears drawing tool.
  if (!jsonString) {
    this.clear(true);
    return;
  }

  var state = JSON.parse(jsonString);

  // Process Drawing Tool specific options.
  var dtState = state.dt;
  this.canvas.setDimensions({
    width: dtState.width,
    height: dtState.height
  });

  // Load FabricJS state.
  // Note that we remove background definition before we call #loadFromJSON
  // and then add the same background manually. Otherwise, the background
  // won't be loaded due to CORS error (FabricJS bug?).
  var canvasState = state.canvas;
  var backgroundImage = canvasState.backgroundImage;
  delete canvasState.backgroundImage;
  this.canvas.loadFromJSON(canvasState);
  if (backgroundImage !== undefined) {
    var imageSrc = backgroundImage.src;
    delete backgroundImage.src;
    this._setBackgroundImage(imageSrc, backgroundImage);
  }
  this.canvas.renderAll();
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
  // TODO: utilize the `changedKey` and `changedVal` fields
  this._fireStateEvent();
};

/**
 * Sets the stroke width for new shapes and fires a `stateEvent` to signal a
 * change in the stroke width. This is also the font size for the text tool.
 *
 * parameters:
 *  - width: integer for the desired width
 */
DrawingTool.prototype.setStrokeWidth = function (width) {
  this.state.strokeWidth = width;
  this._fireStateEvent();
};

/**
 * Sets the fill color for new shapes and fires a `stateEvent` to signal a
 * change in the fill color.
 *
 * parameters:
 *  - color: can be in any web-friendly format
 *          ex: literal-'black', hex-'#444444', or rgba-'rgba(100,200,200,.75)'
 */
DrawingTool.prototype.setFill = function (color) {
  this.state.fill = color;
  this._fireStateEvent();
};

/**
 * Set the background image for the fabricjs canvas.
 *
 * parameters:
 *  - imageSrc: string with location of the image
 *  - fit: (string) how to put the image into the canvas
 *        ex: "resizeBackgroundToCanvas" or "resizeCanvasToBackground"
 */
DrawingTool.prototype.setBackgroundImage = function (imageSrc, fit) {
  var self = this;
  this._setBackgroundImage(imageSrc, null, function () {
    switch (fit) {
      case "resizeBackgroundToCanvas": self.resizeBackgroundToCanvas(); return;
      case "resizeCanvasToBackground": self.resizeCanvasToBackground(); return;
      // TODO: default fit?
    }
  });
};

DrawingTool.prototype.resizeBackgroundToCanvas = function () {
  if (!this._backgroundImage) {
    return;
  }
  this._backgroundImage.set({
    width: this.canvas.width,
    height: this.canvas.height
  });
  this.canvas.renderAll();
};

DrawingTool.prototype.resizeCanvasToBackground = function () {
  if (!this._backgroundImage) {
    return;
  }
  this.canvas.setDimensions({
    width: this._backgroundImage.width,
    height: this._backgroundImage.height
  });
  this._backgroundImage.set({
    top: this.canvas.height / 2,
    left: this.canvas.width / 2
  });
  this.canvas.renderAll();
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
 * Changes the current tool by 'clicking' on the button for the tool.
 *
 * parameters:
 *  - toolSelector: selector for the tool as sepecified in the contruction of the tool
 */
DrawingTool.prototype.chooseTool = function (toolSelector){
  jQuery(this.selector).find('.'+toolSelector).click();
};

/**
 * Changing the current tool out of this current tool to the default tool
 * aka 'select' tool
 *
 * parameters:
 *  - oldToolSelector: selector of the old tool (currently unused data)
 */
//TODO: add default as drawingTool property
DrawingTool.prototype.changeOutOfTool = function (oldToolSelector){
  this.chooseTool('select');
};

DrawingTool.prototype._setBackgroundImage = function (imageSrc, options, backgroundLoadedCallback) {
  options = options || {
    originX: 'center',
    originY: 'center',
    top: this.canvas.height / 2,
    left: this.canvas.width / 2,
    crossOrigin: 'anonymous'
  };

  loadImage();

  function loadImage(crossOrigin) {
    // Note we cannot use fabric.Image.fromURL, as then we would always get
    // fabric.Image instance and we couldn't guess whether load failed or not.
    // util.loadImage provides null to callback when loading fails.
    fabric.util.loadImage(imageSrc, callback, null, options.crossOrigin);
  }

  var self = this;
  function callback (img) {
    // If image is null and crossOrigin settings are available, it probably means that loading failed
    // due to lack of CORS headers. Try again without them.
    if ((options.crossOrigin === 'anonymous' || options.crossOrigin === '') && !img) {
      options = jQuery.extend(true, {}, options);
      delete options.crossOrigin;
      console.log('Background could not be loaded due to lack of CORS headers. Trying to load it again without CORS support.');
      loadImage();
      return;
    }
    img = new fabric.Image(img, options);
    self.canvas.setBackgroundImage(img, self.canvas.renderAll.bind(self.canvas));
    self._backgroundImage = img;
    if (typeof backgroundLoadedCallback === 'function') {
      backgroundLoadedCallback();
    }
  }
};

/**
 * Add a state listener to listen for changes in the `DrawingTool.state` object
 *
 * parameters:
 *  - stateHandler: listener function that is called when an event is fired
 */
DrawingTool.prototype.addStateListener = function (stateHandler) {
  this._stateListeners.push(stateHandler);
}

/**
 * Removes a state listener
 *
 * parameters:
 *  - stateHandler: listener to be removed
 */
DrawingTool.prototype.removeStateListener = function (stateHandler) {
  for (var i = 0; i < this._stateListeners.length; i++) {
    if (this._stateListeners[i] === stateHandler) {
      return this._stateListeners.splice(i, 1);
    }
  }
  return false;
}

DrawingTool.prototype._fireStateEvent = function (changedKey, val) {
  var e = {};
  // TODO: implement this functionality in the actual setters in drawing-tool
  if (arguments.length > 0) {
    e['changedKey'] = changedKey;
    e['changedValue'] = val;
  }
  for (var i = 0; i < this._stateListeners.length; i++) {
    // console.log(this._stateListeners[i]);
    this._stateListeners[i].call(this, e);
  }
}

DrawingTool.prototype._initFabricJS = function () {
  this.canvas = new fabric.Canvas(this.ui.$canvas[0]);
  // Target find would be more tolerant on touch devices.
  if (fabric.isTouchSupported) {
    this.canvas.perPixelTargetFind = false;
  } else {
    this.canvas.perPixelTargetFind = true;
    this.canvas.targetFindTolerance = 12;
  }
  this.canvas.setBackgroundColor("#fff");
};

module.exports = DrawingTool;

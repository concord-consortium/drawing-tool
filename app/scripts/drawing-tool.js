var Util              = require('scripts/util');
var rescale2resize    = require('scripts/fabric-extensions/rescale-2-resize');
var multitouchSupport = require('scripts/fabric-extensions/multi-touch-support');
var UI                = require('scripts/ui');

var DEF_OPTIONS = {
  width: 700,
  height: 500
};

var DEF_STATE = {
  stroke: "rgba(100,200,200,.75)",
  strokeWidth: 10,
  fill: ""
};

// Note that some object properties aren't serialized by default by FabricJS.
// List them here so they can be serialized.
var ADDITIONAL_PROPS_TO_SERIALIZE = ['lockUniScaling'];

// Constructor function.
function DrawingTool(selector, options, settings) {
  this.selector = selector;
  this.options = $.extend(true, {}, DEF_OPTIONS, options);

  this.state = $.extend(true, {}, DEF_STATE, settings);

  this.tools = {};

  this.ui = new UI(this, selector, this.options);
  this._initFabricJS();
  this.ui.initTools();

  // Apply a fix that changes native FabricJS rescaling behavior into resizing.
  rescale2resize(this.canvas);
  multitouchSupport(this.canvas);
}

DrawingTool.prototype.clear = function (clearBackground) {
  this.canvas.clear();
  if (clearBackground) {
    this.canvas.setBackgroundImage(null);
    this._backgroundImage = null;
  }
  this.canvas.renderAll();
};

DrawingTool.prototype.clearSelection = function () {
  // Important! It will cause that all custom control points will be removed (e.g. for lines).
  this.canvas.deactivateAllWithDispatch();
  this.canvas.renderAll();
};

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

DrawingTool.prototype.setStrokeColor = function (color) {
  this.state.color = color;
};

DrawingTool.prototype.setStrokeWidth = function (width) {
  this.state.strokeWidth = width;
};

DrawingTool.prototype.setFill = function (color) {
  this.state.fill = color;
};

DrawingTool.prototype.setBackgroundImage = function (imageSrc, fit) {
  var self = this;
  this._setBackgroundImage(imageSrc, null, function () {
    switch (fit) {
      case "resizeBackgroundToCanvas": self.resizeBackgroundToCanvas(); return;
      case "resizeCanvasToBackground": self.resizeCanvasToBackground(); return;
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

DrawingTool.prototype.chooseTool = function (toolSelector){
  $(this.selector).find('.'+toolSelector).click();
};

// Changing the current tool out of this current tool
// to the default tool aka 'select' tool
// TODO: make this better and less bad... add default as drawingTool property
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
      options = $.extend(true, {}, options);
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

DrawingTool.prototype._initFabricJS = function () {
  this.canvas = new fabric.Canvas(this.ui.$canvas[0]);
  // Target find would be more tolerant on touch devices.
  this.canvas.perPixelTargetFind = !fabric.isTouchSupported;

  this.canvas.setBackgroundColor("#fff");
};

module.exports = DrawingTool;

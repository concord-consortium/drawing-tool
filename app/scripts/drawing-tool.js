var Tool              = require('scripts/tool');
var ShapeTool         = require('scripts/tools/shape-tool');
var SelectionTool     = require('scripts/tools/select-tool');
var LineTool          = require('scripts/tools/line-tool');
var RectangleTool     = require('scripts/tools/rect-tool');
var EllipseTool       = require('scripts/tools/ellipse-tool');
var SquareTool        = require('scripts/tools/square-tool');
var CircleTool        = require('scripts/tools/circle-tool');
var FreeDrawTool      = require('scripts/tools/free-draw');
var DeleteTool        = require('scripts/tools/delete-tool');
var Util              = require('scripts/util');
var rescale2resize    = require('scripts/rescale-2-resize');
var multitouchSupport = require('scripts/multi-touch-support');
var UI                = require('scripts/ui');

var CANVAS_ID = 'dt-drawing-area';
var DEF_OPTIONS = {
  width: 700,
  height: 500
};

// Constructor function.
function DrawingTool(selector, options) {
  this.options = $.extend(true, {}, DEF_OPTIONS, options);

  this.ui = new UI(this, selector, CANVAS_ID, this.options);
  this._initFabricJS();

  // Tools
  this.tools = {};
  var selectionTool = new SelectionTool("Selection Tool", "select", this);
  var lineTool = new LineTool("Line Tool", "line", this);
  var rectangleTool = new RectangleTool("Rectangle Tool", "rect", this);
  var ellipseTool = new EllipseTool("Ellipse Tool", "ellipse", this);
  var squareTool = new SquareTool("Square Tool", "square", this);
  var circleTool = new CircleTool("Circle Tool", "circle", this);
  var freeDrawTool = new FreeDrawTool("Free Draw Tool", "free", this);
  var deleteTool = new DeleteTool("Delete Tool", "trash", this);

  this.ui.initTools();


  // Apply a fix that changes native FabricJS rescaling behavior into resizing.
  rescale2resize(this.canvas);
  multitouchSupport(this.canvas);

  this.chooseTool("select");
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
  this.canvas.deactivateAllWithDispatch();
  this.canvas.renderAll();
};

DrawingTool.prototype.save = function () {
  return JSON.stringify(this.canvas.toJSON());
};

DrawingTool.prototype.load = function (jsonString) {
  // Undefined, null or empty string just clears drawing tool.
  if (!jsonString) {
    this.clear(true);
    return;
  }
  // Note that we remove background definition before we call #loadFromJSON
  // and then add the same background manually. Otherwise, the background
  // won't be loaded due to CORS error (FabricJS bug?).
  var state = JSON.parse(jsonString);
  var backgroundImage = state.backgroundImage;
  delete state.backgroundImage;
  this.canvas.loadFromJSON(state);
  if (backgroundImage !== undefined) {
    var imageSrc = backgroundImage.src;
    delete backgroundImage.src;
    this._setBackgroundImage(imageSrc, backgroundImage);
  }
  this.canvas.renderAll();
};

DrawingTool.prototype.setStrokeColor = function (color) {
  fabric.Object.prototype.stroke = color;
  this.canvas.freeDrawingBrush.color = color;
  fabric.Image.prototype.stroke = null;
};

DrawingTool.prototype.setStrokeWidth = function (width) {
  fabric.Object.prototype.strokeWidth = width;
  this.canvas.freeDrawingBrush.width = width;
};

DrawingTool.prototype.setFill = function (color) {
  fabric.Object.prototype.fill = color;
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

DrawingTool.prototype.chooseTool = function (toolSelector){
  console.log(toolSelector);
  $("#" + toolSelector).click();
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
  this.canvas = new fabric.Canvas(CANVAS_ID);
  // Target find would be more tolerant on touch devices.
  this.canvas.perPixelTargetFind = !fabric.isTouchSupported;

  this.setStrokeWidth(10);
  this.setStrokeColor("rgba(100,200,200,.75)");
  this.setFill("");
  this.canvas.setBackgroundColor("#fff");
};

DrawingTool.prototype._toolButtonClicked = function (toolSelector) {
  if (this.currentTool !== undefined && this.currentTool.selector === toolSelector) {
    // Some tools may implement .activateAgain() method and enable some special behavior.
    this.currentTool.activateAgain();
    return;
  }

  var newTool = this.tools[toolSelector];
  if (newTool === undefined){
    console.warn("Warning! Could not find tool with selector \"" + toolSelector +
      "\"\nExiting tool chooser.");
    return;
  } else if (newTool.singleUse === true) {
    newTool.use();
    return;
  }

  if (this.currentTool !== undefined) {
    this.currentTool.setActive(false);
  }
  this.currentTool = newTool;
  newTool.setActive(true);
  this.canvas.renderAll();
};

module.exports = DrawingTool;

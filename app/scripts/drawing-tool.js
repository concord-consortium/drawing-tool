var Tool           = require('scripts/tool');
var ShapeTool      = require('scripts/tools/shape-tool');
var SelectionTool  = require('scripts/tools/select-tool');
var LineTool       = require('scripts/tools/line-tool');
var RectangleTool  = require('scripts/tools/rect-tool');
var EllipseTool    = require('scripts/tools/ellipse-tool');
var SquareTool     = require('scripts/tools/square-tool');
var CircleTool     = require('scripts/tools/circle-tool');
var FreeDrawTool   = require('scripts/tools/free-draw');
var DeleteTool     = require('scripts/tools/delete-tool');
var Util           = require('scripts/util');
var rescale2resize = require('scripts/rescale-2-resize');

var CANVAS_ID = 'dt-drawing-area';
var DEF_OPTIONS = {
  width: 700,
  height: 500
};

// Constructor function.
function DrawingTool(selector, options) {
  this.options = $.extend(true, {}, DEF_OPTIONS, options);

  this._initUI(selector);
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
  selectionTool.deleteTool = deleteTool;

  var self = this;
  $('.btn').button();
  $('.btn').click(function () {
    var id = $(this).attr('id');
    self._toolButtonClicked(id);
  });

  // Apply a fix that changes native FabricJS rescaling bahvior into resizing.
  rescale2resize(this.canvas);

  this.chooseTool("select");
}

DrawingTool.prototype.chooseTool = function (toolSelector){
  $("#" + toolSelector).click();
};

// Changing the current tool out of this current tool
// to the default tool aka 'select' tool
// TODO: make this better and less bad... add default as drawingTool property
DrawingTool.prototype.changeOutOfTool = function (oldToolSelector){
  this.chooseTool('select');
};


// debugging method to print out all the items on the canvas
DrawingTool.prototype.check = function() {
  var shapes = this.canvas.getObjects();
  for (var i = 0; i < shapes.length; i++) {
    console.log(shapes[i]);
  }
};

DrawingTool.prototype.setStrokeColor = function (color) {
  fabric.Object.prototype.stroke = color;
  this.canvas.freeDrawingBrush.color = color;
};

DrawingTool.prototype.setStrokeWidth = function (width) {
  fabric.Object.prototype.strokeWidth = width;
  this.canvas.freeDrawingBrush.width = width;
};

DrawingTool.prototype.setFill = function (color) {
  fabric.Object.prototype.fill = color;
};


DrawingTool.prototype._initUI = function (selector) {
  $(selector).empty();
  this.$element = $('<div class="dt-container">').appendTo(selector);
  this.$tools = $('<div class="dt-tools btn-group-vertical" data-toggle="buttons">')
    .appendTo(this.$element);
  var $canvasContainer = $('<div class="dt-canvas-container">')
    .attr('tabindex', 0) // makes the canvas focusable for keyboard events
    .appendTo(this.$element);
  $('<canvas>')
    .attr('id', CANVAS_ID)
    .attr('width', this.options.width + 'px')
    .attr('height', this.options.height + 'px')
    .appendTo($canvasContainer);
};

DrawingTool.prototype._initFabricJS = function () {
  this.canvas = new fabric.Canvas(CANVAS_ID);
  this.canvas.perPixelTargetFind = true;

  this.setStrokeWidth(10);
  this.setStrokeColor("rgba(100,200,200,.75)");
  this.setFill("");

  fabric.Object.prototype.transparentCorners = false;

  fabric.Object.prototype.perPixelTargetFind = true;
};

DrawingTool.prototype._toolButtonClicked = function (toolSelector) {
  if (this.currentTool !== undefined && this.currentTool.selector === toolSelector) {
    console.log(this.currentTool.name + " is already the current tool");
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
    $('#'+toolSelector).button('toggle');
    return;
  }

  if (this.currentTool !== undefined) {
    this.currentTool.setActive(false);
  }
  this.currentTool = newTool;
  newTool.setActive(true);
  this.canvas.renderAll(false);
};

module.exports = DrawingTool;

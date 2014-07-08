var Tool           = require('scripts/tool');
var ShapeTool      = require('scripts/shape-tool');
var SelectionTool  = require('scripts/select-tool');
var LineTool       = require('scripts/line-tool');
var RectangleTool  = require('scripts/rect-tool');
var EllipseTool    = require('scripts/ellipse-tool');
var SquareTool     = require('scripts/square-tool');
var CircleTool     = require('scripts/circle-tool');
var FreeDrawTool   = require('scripts/free-draw');
var Util           = require('scripts/util');
var rescale2resize = require('scripts/rescale-2-resize');

var CANVAS_ID = 'dt-drawing-area';
var DEF_OPTIONS = {
  width: 700,
  height: 500
};

// Constructor function.
function DrawingTool(selector, options) {
  this.options = $.extend(true, {}, options, DEF_OPTIONS);

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

  var self = this,
      canvas = this.canvas;
  $('.btn').click(function () {
    var id = $(this).find("input").val();
    self._toolButtonClicked(id);
  });

  // delete the selected object(s)
  // see: https://www.pivotaltracker.com/story/show/74415780
  $('.dt-canvas-container').keydown(function(e) {
    if (e.keyCode === 8) {
      if (canvas.getActiveObject()) {
        canvas.remove(canvas.getActiveObject());
      } else if (self.canvas.getActiveGroup()) {
        canvas.getActiveGroup().forEachObject(function(o){ canvas.remove(o) });
        canvas.discardActiveGroup().renderAll();
      }
      e.preventDefault();
    }
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
    .attr('tabindex', 0)
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

  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.selectable = false;

  // Custom Variables for Shape resizing
  fabric.Object.prototype.minWidth = 15;
  fabric.Object.prototype.minHeight = 15;

  fabric.Object.prototype.perPixelTargetFind = true;
  this.setStrokeWidth(10);
  this.setStrokeColor("rgba(100,200,200,.75)");
  this.setFill("");

  fabric.Line.prototype.hasControls = false;
  fabric.Line.prototype.hasBorders = false;
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
  }
  if (this.currentTool !== undefined) {
    this.currentTool.setActive(false);
  }
  newTool.setActive(true);
  this.currentTool = newTool;
  this.canvas.renderAll(false);
};

module.exports = DrawingTool;

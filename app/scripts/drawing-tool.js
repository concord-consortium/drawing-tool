var Tool          = require('scripts/tool');
var ShapeTool     = require('scripts/shape-tool');
var SelectionTool = require('scripts/select-tool');
var LineTool      = require('scripts/line-tool');
var RectangleTool = require('scripts/rect-tool');
var EllipseTool   = require('scripts/ellipse-tool');
var SquareTool    = require('scripts/square-tool');
var CircleTool    = require('scripts/circle-tool');
var Util          = require('scripts/util');
var rescale2resize = require('scripts/rescale-2-resize');

// Constructor function.
function DrawingTool (selector) {
  this.canvas = new fabric.Canvas(selector);
  this.canvas.perPixelTargetFind = true;

  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.selectable = false;
  // Custom Variables for Shape resizing
  fabric.Object.prototype.minWidth = 10;
  fabric.Object.prototype.minHeight = 10;
  // fabric.Object.prototype.perPixelTargetFind = true;

  fabric.Object.prototype.strokeWidth = 10;
  fabric.Object.prototype.stroke = "rgba(100,200,200,0.75)";
  fabric.Object.prototype.fill = "";

  fabric.Group.prototype.selectable = true;

  this.tools = {};

  // Tools
  var selectionTool = new SelectionTool("Selection Tool", "select", this);
  // TODO: fix line editing (endpoints, disable selection/scaling)
  var lineTool = new LineTool("Line Tool", "line", this);
  var rectangleTool = new RectangleTool("Rectangle Tool", "rect", this);
  var ellipseTool = new EllipseTool("Ellipse Tool", "ellipse", this);
  var squareTool = new SquareTool("Square Tool", "square", this);
  var circleTool = new CircleTool("Circle Tool", "circle", this);

  var self = this;
  $('.btn').click(function(){
    var id = $(this).find("input").val();
    self._toolButtonClicked(id);
  });

  // Apply a fix that changes native FabricJS rescaling bahvior into resizing.
  rescale2resize(this.canvas);

  this.chooseTool("select");
}

DrawingTool.prototype.chooseTool = function(toolSelector){
  $("#" + toolSelector).click();
};

// Changing the current tool out of this current tool
// to the default tool aka 'select' tool
// TODO: make this better and less bad... add default as drawingTool property
DrawingTool.prototype.changeOutOfTool = function(oldToolSelector){
  this.chooseTool('select');
};


// debugging method to print out all the items on the canvas
DrawingTool.prototype.check = function() {
  var shapes = this.canvas.getObjects();
  for (var i = 0; i < shapes.length; i++) {
    console.log(shapes[i]);
  }
};

DrawingTool.prototype._toolButtonClicked = function(toolSelector) {
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

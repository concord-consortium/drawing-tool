var Tool          = require('scripts/tool');
var SelectionTool = require('scripts/select-tool');
var LineTool      = require('scripts/line-tool');
var RectangleTool = require('scripts/rect-tool');
var EllipseTool   = require('scripts/ellipse-tool');
var Util          = require('scripts/util');

// Constructor function.
function DrawingTool (selector) {
  this.canvas = new fabric.Canvas(selector);
  this.canvas.perPixelTargetFind = true;

  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.selectable = false;
  // fabric.Object.prototype.perPixelTargetFind = true;

  fabric.Object.prototype.strokeWidth = 10;
  fabric.Object.prototype.stroke = "rgba(100,200,200,0.75)";
  fabric.Object.prototype.fill = "";

  fabric.Group.prototype.selectable = true;

  // Tools
  var selectionTool = new SelectionTool("Selection Tool", "select", this);
  // TODO: fix line editing (endpoints, disable selection/scaling)
  var lineTool = new LineTool("Line Tool", "line", this);
  var rectangleTool = new RectangleTool("Rectangle Tool", "rect", this);
  var ellipseTool = new EllipseTool("Ellipse Tool", "ellipse", this);
  // var squareTool = new SquareTool();
  // var circleTool = new CircleTool();

  this.tools = {
    "select": selectionTool,
    "line": lineTool,
    "rect": rectangleTool,
    "ellipse": ellipseTool
  };

  var self = this;
  $('.btn').click(function(){
    var id = $(this).find("input").val();
    self._toolButtonClicked(id);
  });

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
};

module.exports = DrawingTool;

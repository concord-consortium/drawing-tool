var Tool = require('scripts/tool');
var SelectionTool = require('scripts/select-tool');
var LineTool = require('scripts/line-tool');
var RectangleTool = require('scripts/rect-tool');
var Util = require('scripts/util');

// Constructor function.
function DrawingTool (selector) {

  // Implement me!
  console.log("Drawing Tool created");
  this.canvas = new fabric.Canvas(selector);
  this.canvas.perPixelTargetFind = true;


  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.selectable = false;
  // fabric.Object.prototype.perPixelTargetFind = true;

  fabric.Object.prototype.strokeWidth = 10;
  fabric.Object.prototype.stroke = "rgba(100,200,200,0.75)";
  fabric.Object.prototype.fill = "";

  fabric.Group.prototype.selectable = true;

  this.getCanvas = function(){ return this.canvas; }

  // //adding sample shapes
  // var rect3 = new fabric.Rect({
  //   width: 200, height: 100, left: 500, top: 150, angle: 45,
  //   fill: 'rgba(0,0,200,0.5)'
  // });
  // this.canvas.add(rect3);
  //
  // var ttt = new fabric.Line([0,0,100,100], {});
  // this.canvas.add(ttt);

  var self = this;

  // Tools

  var selectionTool = new SelectionTool("Selection Tool", "select", this);

  // TODO: fix line editing (endpoints, disable selection/scaling)

  var lineTool = new LineTool("Line Tool", "line", this);

  var rectangleTool = new RectangleTool("Rectangle Tool", "rect", this);

  // var ellipseTool = new EllipseTool();
  // var squareTool = new SquareTool();
  // var circleTool = new CircleTool();

  this.tools = {
    "select": selectionTool,
    "line": lineTool,
    "rect": rectangleTool
  }

  this.currentTool;
  this.chooseTool("select");

  $('.btn').click(function(){
    var id = $(this).find("input").val();
    // console.log("ui detected a click on " + id);
    self.chooseTool(id);
  });

  console.log("drawing tool constructor finished");
}

DrawingTool.prototype.chooseTool = function(toolSelector) {
  if (!(this.currentTool === undefined) && this.currentTool.selector === toolSelector){
    console.log(this.currentTool.name + " is already the current tool");
    return;
  }

  var newTool = this.tools[toolSelector];
  if (newTool === undefined){
    console.warn("Warning! Could not find tool with selector \"" + toolSelector
    + "\"\nExiting tool chooser.");
    return;
  }

  try {
    console.log("Choosing " + newTool.name + " over " + this.currentTool.name);
    this.currentTool.setActive(false);
    var oldTool = this.currentTool;
  } catch (err) {
    console.log("Choosing " + newTool.name);
  }
  newTool.setActive(true);
  this.currentTool = newTool;

  var id = "#" + toolSelector;
  if (!$(id).hasClass("active")){
    $("#" + toolSelector).click();
  }

  return oldTool;
}

// Changing the current tool out of this current tool
// to the default tool aka 'select' tool
// TODO: make this better and less bad... add default as drawingTool property
DrawingTool.prototype.changeOutOfTool = function(oldToolSelector){
  this.chooseTool('select');
}

DrawingTool.prototype.check = function() {
  var shapes = this.canvas.getObjects();
  for (var i = 0; i < shapes.length; i++) {
    console.log(shapes[i].selectable + " " + shapes[i]);
  }
}

module.exports = DrawingTool;

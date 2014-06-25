// Constructor function.
function DrawingTool (selector) {
  // Implement me!
  console.log("Drawing Tool created");
  this.canvas = new fabric.Canvas(selector);
  fabric.Object.prototype.transparentCorners = false;
  fabric.Line.prototype.strokeWidth = 10;
  fabric.Line.prototype.stroke = "green";

  this.getCanvas = function(){ return this.canvas; }

  // adding sample shape
  var rect3 = new fabric.Rect({
    width: 200, height: 100, left: 500, top: 150, angle: 45,
    fill: 'rgba(0,0,200,0.5)'
  });
  this.canvas.add(rect3);

  var ttt = new fabric.Line([0,0,100,100], {});
  this.canvas.add(ttt);

  var self = this;

  // Tools & implementation
  var selectionTool = new Tool("Selection Tool", "select");
  selectionTool.activate = function(){
    console.log("items are now selectable");
    this.setSelectable(true);
  }
  selectionTool.deactivate = function(){
    console.log("items are no longer selectable");
    this.setSelectable(false);
  }
  selectionTool.setSelectable = function(selectable){
    self.canvas.selection = selectable;
    var items = self.canvas.getObjects();
    for (var i = items.length - 1; i >= 0; i--) {
      items[i].selectable = selectable;
    };
  }

  var lineTool = new Tool("Line Tool", "line");
  lineTool.activate = function(){
    var moved = false;
    var newLine;
    var index = self.canvas.getObjects().length;
    self.canvas.on("mouse:down", function(options){
      var x1 = options.e.offsetX, y1 = options.e.offsetY;
      newLine = new fabric.Line([x1, y1, x1, y1], {});
      newLine.selectable = false;
      self.canvas.add(newLine);
    })
    self.canvas.on("mouse:move", function(options){
      if (newLine === undefined) return;
      console.log("Moved");
      if (!moved) moved = true; // movement has clearly occured
      newLine.set('x2', options.e.offsetX);
      newLine.set('y2', options.e.offsetY);
      self.canvas.renderAll(false);
    })
    self.canvas.on("mouse:up", function(options){
      newLine.stroke = "black";
      if (moved) {// successful line draw
        // TODO: set a threshold of movement
        self.canvas.renderAll(false);
        console.log("line constructed");
      } else { // click (no line drawn) - move back to select tool
        self.canvas.remove(newLine);
        self.chooseTool("select");
      }
      newLine = undefined;
      moved = false;
    })
  }
  lineTool.deactivate = function(){

  }
  // var rectangleTool = new RectangleTool();
  // var ellipseTool = new EllipseTool();
  // var squareTool = new SquareTool();
  // var circleTool = new CircleTool();

  this.tools = {
    "select": selectionTool,
    "line": lineTool
  }

  this.currentTool;
  this.chooseTool("select");

  $('.btn').click(function(){
    var id = $(this).find("input").val();
    console.log("ui detected a click on " + id);
    self.chooseTool(id);
  });

  $("#canvas-container").click(function(){
    self.chooseTool("select");
  })

  // $('.btn').on('click', $.proxy(function () {
  //   console.log($(this));
  // }, this));

  console.log("drawing tool constructor finished");
}

DrawingTool.prototype.chooseTool = function(toolSelector) {

  // TODO: update HTML elements to reflect tool change (might be needed for selection)
  // TODO: implement a stop if same tool is already selected?
  var newTool = this.tools[toolSelector];
  if (newTool === undefined){
    console.warn("Warning! Could not find tool with selector \"" + toolSelector
    + "\"\nExiting tool chooser.");
    return;
  }

  this.canvas.off('mouse:up');
  this.canvas.off('mouse:down');
  this.canvas.off('mouse:move');

  try {
    console.log("Choosing " + newTool.name + " over " + this.currentTool.name);
    this.currentTool.setActive(false);
    var oldTool = this.currentTool;
  } catch (err) {
    console.log("Choosing " + newTool.name);
  }
  newTool.setActive(true);
  this.currentTool = newTool;
  return oldTool;
}

DrawingTool.prototype.check = function() {
  var shapes = this.canvas.getObjects();
  for (var i = 0; i < shapes.length; i++) {
    console.log(shapes[i].selectable + " " + shapes[i]);
  }
}


/*
 * Tool "Class"
 */
var Tool = function Tool (name, selector) {
  this.name = name || "Tool";
  this.selector = selector || "";
  this.active = false;
}

Tool.prototype.setActive = function(active) {
  console.log(this.name + " active? " +  this.active);
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    // this tool is now active
    console.log("Activating " + this.name);
    this.activate();
    console.log(this.name + " has been activated");
  }
  else{
    // this tool has been deselected
    console.log("Deactivating " + this.name);
    this.deactivate();
    console.log(this.name + " is no longer active");
  }

  return active;
}

Tool.prototype.isActive = function() { return this.active; }

Tool.prototype.activate = function() { console.warn("unimplemented activation method"); }

Tool.prototype.deactivate = function() { console.warn("unimplemented deactivation method"); }


module.exports = DrawingTool;

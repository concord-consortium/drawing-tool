// Constructor function.
function DrawingTool (selector) {
  // Implement me!
  console.log("Drawing Tool created");
  this.canvas = new fabric.Canvas(selector);
  fabric.Object.prototype.transparentCorners = false;

  this.getCanvas = function(){ return this.canvas; }

  // adding sample shape
  var rect3 = new fabric.Rect({
    width: 200, height: 100, left: 500, top: 150, angle: 45,
    fill: 'rgba(0,0,200,0.5)'
  });
  this.canvas.add(rect3);

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
    console.info ("implemented line tool activation function");
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


  // $('.btn').on('click', $.proxy(function () { 
  //   console.log($(this)); 
  // }, this));

  console.log("drawing tool constructor finished");
}

DrawingTool.prototype.chooseTool = function(toolSelector) {

  // implement a stop if same tool is already selected?
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
  return oldTool;
}

var Tool = function Tool (name, selector) {
  this.name = name || "Tool";
  this.selector = selector || "";
  this.active = false;
}

Tool.prototype.setActive = function(active) {
  console.info(this.name + " active? " +  this.active);
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

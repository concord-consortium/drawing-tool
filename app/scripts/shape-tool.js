var Tool = require('scripts/tool');

function ShapeTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);
  this.firstAction = false;
  this.moved = false;
  this.down = false;
}

ShapeTool.prototype = Object.create(Tool.prototype);
ShapeTool.prototype.constructor = ShapeTool;
ShapeTool.prototype.tool = Tool.prototype;

ShapeTool.prototype.activate = function(){
  // console.warn(this.name + " at shape tool activation");
  this.tool.activate.call(this);
  this.firstAction = true;
  this.moved = false;
  this.down = false;
}

// check if this is the first mouse down action
// if not and the mouse down is on an existing object,
// set that object as active and change into selection mode
ShapeTool.prototype.mouseDown = function(e){
  this.down = true;
  this.moved = false;

  // TODO: FIX THIS
  if (this.firstAction === false && !(e.target === undefined)){
    // e.e.type = "mouseup";
    // this.canvas.fire.call(this.canvas, "mouse:up", e);
    this.exit();
    // now that we are in selection mode, select the item
    this.canvas.setActiveObject.call(this.canvas, e.target);
    this.canvas.fire.call(this.canvas, "mouse:down", e);
  }
}

ShapeTool.prototype.mouseMove = function(e){
  if (this.moved === false && this.down === true){
    this.moved = true;
  }
}

ShapeTool.prototype.mouseUp = function(e){
  this.down = false;
  // This is also interswined with the mouse down problem
  if (this.moved === false) {
    this.exit();
  }
  this.firstAction = false;
}

ShapeTool.prototype.exit = function(){
  console.info("changing out of " + this.name);
  this.down = false;
  this.moved = false;
  this.master.changeOutOfTool.call(this.master, this.selector);
}

module.exports = ShapeTool;

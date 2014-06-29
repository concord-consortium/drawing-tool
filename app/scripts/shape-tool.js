var Tool = require('scripts/tool');

function ShapeTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.moved = false;
  this.down = false;
  this._firstAction = false;
}

ShapeTool.prototype = Object.create(Tool.prototype);
ShapeTool.prototype.constructor = ShapeTool;
ShapeTool.prototype.tool = Tool.prototype;

ShapeTool.prototype.activate = function(){
  // console.warn(this.name + " at shape tool activation");
  this.tool.activate.call(this);
  this.moved = false;
  this.down = false;
  this._firstAction = true;
}

ShapeTool.prototype.exit = function() {
  console.info("changing out of " + this.name);
  this.down = false;
  this.moved = false;
  this.master.changeOutOfTool(this.selector);
}

// check if this is the first mouse down action
// if not and the mouse down is on an existing object,
// set that object as active and change into selection mode
ShapeTool.prototype.mouseDown = function(e){
  this.down = true;
  this.moved = false;

  if (this._firstAction === false && e.target !== undefined) {
    // Note that in #mouseUp handler we already set all objects to be
    // selectable. Interaction with an object will be handled by Fabric.
    // We have to exit to avoid drawing a new shape.
    this.exit();
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
}

ShapeTool.prototype.actionComplete = function (e) {
  this._firstAction = false;
  // After first action we do want all objects to be selectable,
  // so user can immediately move object that he just created.
  this._setAllObjectsSelectable(true);
};

ShapeTool.prototype._setAllObjectsSelectable = function (selectable) {
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  };
};

module.exports = ShapeTool;

var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

function ShapeTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.moved = false;
  this.down = false;
  this._firstAction = false;
}

inherit(ShapeTool, Tool);

ShapeTool.prototype.activate = function () {
  // console.warn(this.name + " at shape tool activation");
  ShapeTool.super.activate.call(this);
  this.moved = false;
  this.down = false;
  this._setFirstActionMode();
};

ShapeTool.prototype.activateAgain = function () {
  this._setFirstActionMode();
};

ShapeTool.prototype.exit = function () {
  console.info("changing out of " + this.name);
  this.down = false;
  this.moved = false;
  this.master.changeOutOfTool(this.selector);
};

// check if this is the first mouse down action
// if not and the mouse down is on an existing object,
// set that object as active and change into selection mode
ShapeTool.prototype.mouseDown = function (e) {
  this.down = true;
  this.moved = false;

  if (this._firstAction === false && e.target !== undefined) {
    // Note that in #mouseUp handler we already set all objects to be
    // selectable. Interaction with an object will be handled by Fabric.
    // We have to exit to avoid drawing a new shape.
    this.exit();
  }
};

ShapeTool.prototype.mouseMove = function (e) {
  if (this.moved === false && this.down === true){
    this.moved = true;
  }
};

ShapeTool.prototype.mouseUp = function (e) {
  this.down = false;
  if (this.moved === false) {
    this.exit();
  }
};

ShapeTool.prototype.actionComplete = function (newObject) {
  if (this._firstAction) {
    this._firstAction = false;
    // After first action we do want all objects to be selectable,
    // so user can immediately move object that he just created.
    this._setAllObjectsSelectable(true);
  }
  if (newObject) {
    newObject.selectable = true;
  }
};

// This is a special mode which ensures that first action of the shape tool
// always draws an object, even if user starts drawing over existing object.
// Later that will cause interaction with the existing object unless user reselects
// the tool. Please see: https://www.pivotaltracker.com/story/show/73959546
ShapeTool.prototype._setFirstActionMode = function (selectable) {
  this._firstAction = true;
  this._setAllObjectsSelectable(false);
};

ShapeTool.prototype._setAllObjectsSelectable = function (selectable) {
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
};

module.exports = ShapeTool;

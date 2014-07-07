var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');
var Util    = require('scripts/util');

function ShapeTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.down = false; // mouse down
  this._firstAction = false; // special behavior on first action
  this._locked = false; // locked into first action mode
  this.curr = undefined; // current shape being manipulated
}

inherit(ShapeTool, Tool);

ShapeTool.prototype.minimumSize = 10;

ShapeTool.prototype.activate = function () {
  // console.warn(this.name + " at shape tool activation");
  ShapeTool.super.activate.call(this);
  this.down = false;
  this._setFirstActionMode();

  // Changes cursor to crosshair when drawing a shape
  // see https://www.pivotaltracker.com/n/projects/1103712/stories/73647372
  this.canvas.defaultCursor = "crosshair";
};

ShapeTool.prototype.activateAgain = function () {
  this._setFirstActionMode();
  this._locked = true;
  $('#' + this.selector).addClass('locked');
};

ShapeTool.prototype.deactivate = function() {
  ShapeTool.super.deactivate.call(this);
  this.unlock();
}

ShapeTool.prototype.unlock = function() {
  $('#' + this.selector).removeClass('locked');
  this._locked = false;
}

ShapeTool.prototype.exit = function () {
  if (this.curr) {
    this.canvas.remove(this.curr);
  }

  if (this._locked) { return; }

  console.info("changing out of " + this.name);
  this.down = false;
  this.master.changeOutOfTool(this.selector);
  // Changes cursor back to default
  // see https://www.pivotaltracker.com/n/projects/1103712/stories/73647372
  this.canvas.defaultCursor = "default";
};

// check if this is the first mouse down action
// if not and the mouse down is on an existing object,
// set that object as active and change into selection mode
ShapeTool.prototype.mouseDown = function (e) {
  this.down = true;
  if (this._firstAction === false && e.target !== undefined) {
    // Note that in #mouseUp handler we already set all objects to be
    // selectable. Interaction with an object will be handled by Fabric.
    // We have to exit to avoid drawing a new shape.
    this.exit();
  }

  var loc = Util.getLoc(e.e);
  this.__startX = loc.x;
  this.__startY = loc.y;
};

ShapeTool.prototype.mouseMove = function (e) {

};

ShapeTool.prototype.mouseUp = function (e) {
  this.down = false;
  var loc = Util.getLoc(e.e);
  if (Util.dist(this.__startX - loc.x, this.__startY - loc.y) < this.minimumSize) {
    this.exit();
  }

};

ShapeTool.prototype.actionComplete = function (newObject) {
  if (this._firstAction && !this._locked) {
    this._firstAction = false;
    // After first action we do want all objects to be selectable,
    // so user can immediately move object that he just created.
    this._setAllObjectsSelectable(true);
  }
  if (newObject && !this._locked) {
    newObject.selectable = true;
  }
};

// This is a special mode which ensures that first action of the shape tool
// always draws an object, even if user starts drawing over existing object.
// Later that will cause interaction with the existing object unless user reselects
// the tool. Please see: https://www.pivotaltracker.com/story/show/73959546
ShapeTool.prototype._setFirstActionMode = function () {
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

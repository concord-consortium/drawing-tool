var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');
var Util    = require('scripts/util');

function ShapeTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this.down = false; // mouse down
  this._firstAction = false; // special behavior on first action
  this._locked = false; // locked into first action mode
}

inherit(ShapeTool, Tool);

ShapeTool.prototype.minSize = 7;
ShapeTool.prototype.defSize = 30;

ShapeTool.prototype.activate = function () {
  // console.warn(this.name + " at shape tool activation");
  ShapeTool.super.activate.call(this);
  this.down = false;
  this._setFirstActionMode();

  // Changes cursor to crosshair when drawing a shape
  // see https://www.pivotaltracker.com/n/projects/1103712/stories/73647372
  this.canvas.defaultCursor = "crosshair";
};

/**
 * If the tool is already activated then another click will redirect here.
 * The second activation will lock the tool so it will not exit without explicitly
 * selecting another tool on the tool palette.
 */
ShapeTool.prototype.activateAgain = function () {
  this._setFirstActionMode();
  this._locked = true;
  this._fireStateEvent({ state: this.active, locked: true });
};

ShapeTool.prototype.deactivate = function () {
  ShapeTool.super.deactivate.call(this);
  this.unlock();
};

/**
 * Undoes the lock set by `activateAgain()`
 */
ShapeTool.prototype.unlock = function () {
  this._locked = false;
  this._fireStateEvent({ state: this.active, locked: false });
};

/**
 * Tries to exit from the currently active tool. If it is locked, it won't do anything
 */
ShapeTool.prototype.exit = function () {
  if (this._locked) {
    return;
  }
  this.down = false;
  this.master.changeOutOfTool(this.selector);
  // Changes cursor back to default
  // see https://www.pivotaltracker.com/n/projects/1103712/stories/73647372
  this.canvas.defaultCursor = "default";
};

/**
 * check if this is the first mouse down action
 * if not and the mouse down is on an existing object,
 * set that object as active and change into selection mode
 */
ShapeTool.prototype.mouseDown = function (e) {
  this.down = true;
  if (this._firstAction === false && e.target !== undefined) {
    // Note that in #mouseUp handler we already set all objects to be
    // selectable. Interaction with an object will be handled by Fabric.
    // We have to exit to avoid drawing a new shape.
    this.exit();
  }
};

ShapeTool.prototype.mouseMove = function (e) {
};

ShapeTool.prototype.mouseUp = function (e) {
  this.down = false;
};

ShapeTool.prototype.actionComplete = function (newObject) {
  if (newObject) {
    newObject.selectable = !this._locked;
  }
  if (this._locked) {
    return;
  }
  if (this._firstAction) {
    this._firstAction = false;
    // After first action we do want all objects to be selectable,
    // so user can immediately move object that he just created.
    this._setAllObjectsSelectable(true);
  }
};

ShapeTool.prototype.setCentralOrigin = function (object) {
  object.set({
    left: object.left + (object.width + object.strokeWidth) / 2,
    top: object.top + (object.height + object.strokeWidth) / 2,
    originX: 'center',
    originY: 'center'
  });
};

/**
 * This is a special mode which ensures that first action of the shape tool
 * always draws an object, even if user starts drawing over existing object.
 * Later that will cause interaction with the existing object unless user reselects
 * the tool. Please see: https://www.pivotaltracker.com/story/show/73959546
 */
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

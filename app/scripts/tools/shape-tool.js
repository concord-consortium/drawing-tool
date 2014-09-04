var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');
var Util    = require('scripts/util');

function ShapeTool(name, drawTool) {
  Tool.call(this, name, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this.down = false; // mouse down
  this._firstAction = false; // special behavior on first action

  // Make locked mode default one. Note that this never changes.
  // It used to be optional mode that now is a default one, see:
  // https://www.pivotaltracker.com/story/show/77436218
  this._locked = true;
}

inherit(ShapeTool, Tool);

ShapeTool.prototype.minSize = 7;
ShapeTool.prototype.defSize = 30;

ShapeTool.prototype.activate = function () {
  ShapeTool.super.activate.call(this);
  this.down = false;
  this.canvas.defaultCursor = "crosshair";
};

ShapeTool.prototype.activateAgain = function () {
  // This used to activate 'locked' mode. However now it's activated by default.
  // However this logic may be useful in the future when we decide to do something
  // during a "second activation" (usually second click).
};

ShapeTool.prototype.deactivate = function () {
  ShapeTool.super.deactivate.call(this);
  this.canvas.defaultCursor = "default";
};

ShapeTool.prototype.exit = function () {
  this.down = false;
  this.master.changeOutOfTool();
};

ShapeTool.prototype.mouseDown = function (e) {
  this.down = true;
  if (!this._locked && !this._firstAction && e.target !== undefined) {
    // Not in a locked mode, not the first action and cursor is over some shape.
    this.exit();
  }
};

ShapeTool.prototype.mouseMove = function (e) {
  // noop
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

ShapeTool.prototype.setCentralOrigin = function (object, keepPosition) {
  var strokeWidth = object.stroke ? object.strokeWidth : 0;
  var left = object.left + (object.width + strokeWidth) / 2;
  var top  = object.top + (object.height + strokeWidth) / 2;
  object.set({
    left: left,
    top: top,
    originX: 'center',
    originY: 'center'
  });
};

// During object creation it can end up with negative dimensions. Convert them to positive ones.
ShapeTool.prototype.convertToPositiveDimensions = function (object) {
  if (object.width < 0) {
    object.left = object.left + object.width;
    object.width = -object.width;
  }
  if (object.height < 0) {
    object.top = object.top + object.height;
    object.height = -object.height;
  }
};

ShapeTool.prototype.moveObjectLeftTop = function (object) {
  var strokeWidth = object.stroke ? object.strokeWidth : 0;
  var left = object.left - (object.width + strokeWidth) / 2;
  var top  = object.top - (object.height + strokeWidth) / 2;
  object.set({
    left: left,
    top: top
  });
};

/**
 * This is a special mode which ensures that first action of the shape tool
 * always draws an object, even if user starts drawing over existing object.
 * Later that will cause interaction with the existing object unless user reselects
 * the tool. This is currently unused feature, as locked mode is enabed by default
 * in #activate method.
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

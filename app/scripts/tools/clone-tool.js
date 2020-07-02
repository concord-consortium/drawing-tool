var fabric  = require('fabric').fabric;
var inherit = require('../inherit');
var Tool    = require('../tool');

var CLONE_OFFSET = 15;

/**
 * Single use tool that clones the currently selected object(s).
 */
function CloneTool(name, drawingTool) {
  Tool.call(this, name, drawingTool);
  this.singleUse = true;

  this._clipboard = null;

  // Ctrl / Cmd + C to copy, Ctrl / Cmd + V to paste.
  this.master.$element.on('keydown', function (e) {
    if (this._inTextEditMode()) {
      // Keep default copy and paste actions during text edit.
      return;
    }
    if (e.keyCode === 67 /* C */ && (e.ctrlKey || e.metaKey)) {
      this.copy();
      e.preventDefault();
    }
    if (e.keyCode === 86 /* V */ && (e.ctrlKey || e.metaKey)) {
      this.paste();
      e.preventDefault();
    }
  }.bind(this));
}

inherit(CloneTool, Tool);

/**
 * Clones the currently selected object(s) from the fabricjs canvas.
 */
CloneTool.prototype.use = function () {
  // It's just copy and paste sequence at once.
  this.copy(function () {
    this.paste();
  }.bind(this));
};

CloneTool.prototype.copy = function (callback) {
  var activeObject = this.canvas.getActiveObject();
  if (!activeObject) {
    return;
  }

  // We don't want to copy control point, but the source object instead.
  // See: line-custom-control-points.js
  if (activeObject._dt_sourceObj) {
    activeObject = activeObject._dt_sourceObj;
  }
  var propsToInclude = this.master.ADDITIONAL_PROPS_TO_SERIALIZE;
  activeObject.clone(function (clonedObject) {
    this._updateClipboard(clonedObject);
    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this), propsToInclude);
};

CloneTool.prototype.paste = function () {
  if (!this._clipboard) {
    return;
  }
  var clonedObject = this._clipboard;

  this.canvas.discardActiveObject();

  clonedObject.set({
    left: clonedObject.left + CLONE_OFFSET,
    top: clonedObject.top + CLONE_OFFSET
  });
  clonedObject.setCoords();

  if (clonedObject.type === 'activeSelection') {
    clonedObject.getObjects().forEach(function (o) {
      this.canvas.add(o);
    }.bind(this));
    this.canvas.setActiveObject(clonedObject);
  } else {
    this.canvas.add(clonedObject);
    this.canvas.setActiveObject(clonedObject);
  }
  this.canvas.renderAll();
  this.master.pushToHistory();

  // Before user can paste again, we have to clone clipboard object again.
  // Do it just by calling #copy again (note that objects we just pasted are selected).
  this._clipboard = null;
  this.copy();
};

CloneTool.prototype._updateClipboard = function (clonedObject) {
  this._clipboard = clonedObject;
};

CloneTool.prototype._inTextEditMode = function () {
  var activeObject = this.canvas.getActiveObject();
  return activeObject && activeObject.isEditing;
};


module.exports = CloneTool;

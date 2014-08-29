var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

var CLONE_OFFSET = 15;

/**
 * Single use tool that clones the currently selected object(s).
 */
function CloneTool(name, drawingTool) {
  Tool.call(this, name, drawingTool);
  this.singleUse = true;
}

inherit(CloneTool, Tool);

/**
 * Clones the currently selected object(s) from the fabricjs canvas.
 */
CloneTool.prototype.use = function () {
  var activeObject = this.canvas.getActiveGroup() || this.canvas.getActiveObject();
  if (!activeObject) {
    return;
  }
  // We don't want to copy control point, but the source object instead.
  // See: line-custom-control-points.js
  if (activeObject._dt_sourceObj) {
    activeObject = activeObject._dt_sourceObj;
  }
  var klass = fabric.util.getKlass(activeObject.type);
  var propsToInclude = this.master.ADDITIONAL_PROPS_TO_SERIALIZE;
  if (klass.async) {
    activeObject.clone(this._processClonedObject.bind(this), propsToInclude);
  } else {
    this._processClonedObject(activeObject.clone(null, propsToInclude));
  }
};

CloneTool.prototype._processClonedObject = function (clonedObject) {
  this.canvas.deactivateAllWithDispatch();

  clonedObject.set({
    left: clonedObject.left + CLONE_OFFSET,
    top: clonedObject.top + CLONE_OFFSET
  });
  clonedObject.setCoords();

  if (clonedObject.type === 'group') {
    clonedObject.getObjects().forEach(function (o) {
      this.canvas.add(o);
    }.bind(this));
    this.canvas.setActiveGroup(clonedObject);
  } else {
    this.canvas.add(clonedObject);
    this.canvas.setActiveObject(clonedObject);
  }
  this.canvas.renderAll();
  this.master.pushToHistory();
};

module.exports = CloneTool;

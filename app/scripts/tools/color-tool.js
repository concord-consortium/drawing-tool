var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

/*
 * `ColorTool` is a single use (see `tool.js`'s `singleUse` property')
 * tool that sets property (specified by `type`) of the selected object(s)
 * to a certain color (defined by `colorCode`).
 *
 * constructor parameters:
 *  - colorName: human-readable name for the color
 *  - type: name of the parameter to be changed
 *          (will either be 'stroke' or 'fill')
 *          default: 'stroke'
 *  - colorCode: the actual color (in hex or rgba etc)
 *          NOTE: this string is used to compare equivalences
 *  - drawTool: the 'master'
 */
function ColorTool(name, type, colorCode, drawTool) {
  this.type = type || "stroke";
  Tool.call(this, name, name, drawTool);

  this.color = colorCode;
  this.singleUse = true;
}

inherit(ColorTool, Tool);

/**
 * `ColorTool`'s functionality.
 * If any objects are currently selected, their property (defined by `ColorTool.type`)
 * is set to the color of this ColorTool (`ColorTool.color`).
 * This function also sets corresponding property of `drawingTool.state`.
 */
ColorTool.prototype.use = function () {
  if (this.master.canvas.getActiveObject()) {
    var obj = this.master.canvas.getActiveObject();
    obj.set(this.type, this.color);
  } else if (this.master.canvas.getActiveGroup()) {
    var objs = this.master.canvas.getActiveGroup().objects;
    var i = 0;
    for (; i < objs.length; i++) {
      objs[i].set(this.type, this.color);
    }
  }
  // Set color of property of state object.
  if (this.type === 'stroke') {
    this.master.setStrokeColor(this.color);
  } else if (this.type === 'fill') {
    this.master.setFill(this.color);
  }

  this.canvas.renderAll();
};

module.exports = ColorTool;

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
 *          NOTE: this string is used to compare equivilancies
 *  - drawTool: the 'master'
 */
function ColorTool(name, type, colorCode, drawTool) {
  this.type = type || "stroke";
  Tool.call(this, name, name, drawTool);

  this.color = colorCode;
  this.singleUse = true;
}

inherit(ColorTool, Tool);

ColorTool.prototype.use = function () {
  // TODO: implement color tool
  // set color of property of currently selected object
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

  this.canvas.renderAll(false);

  // set color of property of state object
  this.master.state[this.type] = this.color;
  if (this.type === 'stroke') {
    this.master.setStrokeColor(this.color);
  } else if (this.type === 'fill') {
    this.master.setFill(this.color);
  } else {console.warn("Unrecognized color type!");}
};

module.exports = ColorTool;

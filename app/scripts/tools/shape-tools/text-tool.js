var inherit                 = require('scripts/inherit');
var ShapeTool               = require('scripts/tools/shape-tool');

function TextTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(TextTool, ShapeTool);

TextTool.prototype.mouseDown = function (e) {
  TextTool.super.mouseDown.call(this, e);

  if (!this.active) return;

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  var text = new fabric.IText("", {
    left: x,
    top: y,
    lockUniScaling: true,
    fontFamily: 'Arial',
    fontSize: this.master.state.strokeWidth * 4,
    // Yes, looks strange, but I guess stroke color should be used (as it would be the "main" one).
    fill: this.master.state.stroke
  });
  this.actionComplete(text);
  this.canvas.add(text);
  this.canvas.setActiveObject(text);
  text.enterEditing();
};

module.exports = TextTool;

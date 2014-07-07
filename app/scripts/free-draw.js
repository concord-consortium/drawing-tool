var inherit = require('scripts/inherit');
var ShapeTool    = require('scripts/shape-tool');

function FreeDrawTool(name, selector, drawTool) {
    ShapeTool.call(this, name, selector, drawTool);

    var self = this;
    this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
    this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

    this.setLabel('F');
}

inherit(FreeDrawTool, ShapeTool);

FreeDrawTool.prototype.activate = function() {
  FreeDrawTool.super.activate.call(this);
  this.canvas.isDrawingMode = true;
}

FreeDrawTool.prototype.deactivate = function() {
  FreeDrawTool.super.deactivate.call(this);
  this.canvas.isDrawingMode = false;
}

FreeDrawTool.prototype.mouseUp = function(e) {
  FreeDrawTool.super.mouseUp.call(this, e);
  // if deactivation (marked with this.active) occurs during this step
  // it can only be because of a movement that was below the threshold
  if (!this.active) {
    this.canvas.remove(this.canvas.item(this.canvas.getObjects().length-1));
  }
}

module.exports = FreeDrawTool;

var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

function FreeDrawTool(name, selector, drawTool) {
    Tool.call(this, name, selector, drawTool);
}

inherit(FreeDrawTool, Tool);

FreeDrawTool.prototype.activate = function() {
  this.canvas.isDrawingMode = true;
}

FreeDrawTool.prototype.deactivate = function() {
  this.canvas.isDrawingMode = false;
}

module.exports = FreeDrawTool;

var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

function FreeDrawTool(name, selector, drawTool) {
    Tool.call(this, name, selector, drawTool);
}

inherit(FreeDrawTool, Tool);

FreeDrawTool.prototype.activate = function() {
  // enable freedrawing mode
}

FreeDrawTool.prototype.deactivate = function() {
  // disable freedrawing mode
}

module.exports = FreeDrawTool;

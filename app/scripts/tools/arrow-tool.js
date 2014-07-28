var inherit    = require('scripts/inherit');
var LineTool   = require('scripts/tools/line-tool');
var Util       = require('scripts/util');

function ArrowTool(name, selector, drawTool) {
  LineTool.call(this, name, selector, drawTool);
}

inherit (ArrowTool, LineTool);

module.exports = ArrowTool;

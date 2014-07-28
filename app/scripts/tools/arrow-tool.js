var inherit    = require('scripts/inherit');
var LineTool   = require('scripts/tools/line-tool');
var Util       = require('scripts/util');

function ArrowTool(name, selector, drawTool) {
  LineTool.call(this, name, selector, drawTool);
}

inherit (ArrowTool, LineTool);

ArrowTool.prototype._processNewShape = function (s) {
  ArrowTool.super._processNewShape.call(this, s);

  var width = s.strokeWidth * 3;
  var height = width * 1.5;

  var path = new fabric.Path('M ' + width/2 + ' 0 L 0 ' + height + ' L ' + width + ' ' + height + ' z',
    {
      // originX: 'center',
      // originY: 'center',
      left: s.x1-s.strokeWidth,
      top: s.y1,
      angle: (Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI) - 90
    });
  path.setAngle((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI) - 90);
  path.setLeft(s.x1 - s.strokeWidth);
  path.setTop(s.y1);
  this.canvas.add(path);
  s.arrow = path;

  s.on('moving', ArrowTool.lineMoved);
}

ArrowTool.lineMoved = function (e) {
  var s = this;
  s.arrow.setAngle((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI) - 90);
  s.arrow.setLeft(s.x1 - s.strokeWidth);
  s.arrow.setTop(s.y1);
  this.canvas.renderAll(false);
}

module.exports = ArrowTool;

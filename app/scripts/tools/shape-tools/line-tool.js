var $                       = require('jquery');
var fabric                  = require('fabric').fabric;
var inherit                 = require('../../inherit');
var ShapeTool               = require('../shape-tool');
var SelectTool              = require('../select-tool');
var Util                    = require('../../util');
var lineCustomControlPoints = require('../../fabric-extensions/line-custom-control-points');
require('../../fabric-extensions/arrow');

// Note that this tool supports fabric.Line and all its subclasses (defined
// as part of this code base, not FabricJS itself). Pass 'lineType' argument
// (e.g. "line" or "arrow").

function LineTool(name, drawTool, lineType, lineOptions) {
  ShapeTool.call(this, name, drawTool);

  lineType = lineType || 'line';
  this._lineKlass = fabric.util.getKlass(lineType);
  this._lineOptions = lineOptions;

  lineCustomControlPoints(this.canvas);
}

inherit(LineTool, ShapeTool);

LineTool.prototype.mouseDown = function (e) {
  LineTool.super.mouseDown.call(this, e);

  if (!this.active) return;

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new this._lineKlass([x, y, x, y], $.extend(true, {
    originX: 'center', // important due to custom line control points!
    originY: 'center',
    selectable: false,
    stroke: this.master.state.stroke,
    strokeWidth: this.master.state.strokeWidth
  }, this._lineOptions));
  this.canvas.add(this.curr);
};

LineTool.prototype.mouseMove = function (e) {
  LineTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr.set('x2', x);
  this.curr.set('y2', y);
  this.canvas.renderAll();
};

LineTool.prototype.mouseUp = function (e) {
  LineTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
  this.master.pushToHistory();
};

LineTool.prototype._processNewShape = function (s) {
  var x1 = s.get('x1');
  var y1 = s.get('y1');
  var x2 = s.get('x2');
  var y2 = s.get('y2');
  if (Util.dist(x1 - x2, y1 - y2) < this.minSize) {
    x2 = x1 + this.defSize;
    y2 = y1 + this.defSize;
    s.set('x2', x2);
    s.set('y2', y2);
  }
  s.setCoords();
};

module.exports = LineTool;

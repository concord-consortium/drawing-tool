var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function SquareTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this.setLabel('Sq');
}

inherit(SquareTool, ShapeTool);

SquareTool.prototype.mouseDown = function (e) {
  SquareTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Rect({
    top: y,
    left: x,
    width: 0,
    height: 0,
    selectable: false,
    lockUniScaling: true, // it's a square!
  });
  this.canvas.add(this.curr);
};

SquareTool.prototype.mouseMove = function (e) {
  SquareTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this.curr.left;
  var height = loc.y - this.curr.top;

  var sideLen = Math.abs(width) > Math.abs(height) ? Math.abs(width) : Math.abs(height);
  this.curr.width = sideLen;
  if (width < 0) { this.curr.width *= -1; }
  this.curr.height = sideLen;
  if (height < 0) { this.curr.height *= -1; }

  this.canvas.renderAll(false);
};

SquareTool.prototype.mouseUp = function (e) {
  SquareTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

SquareTool.prototype._processNewShape = function (s) {
  if (s.width < 0) {
    s.left = s.left + s.width;
    s.width = - s.width;
  }
  if (s.height < 0) {
    s.top = s.top + s.height;
    s.height = - s.height;
  }
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('width', this.defSize);
    s.set('height', this.defSize);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = SquareTool;

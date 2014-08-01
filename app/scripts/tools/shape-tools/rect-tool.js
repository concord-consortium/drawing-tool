var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function RectangleTool(name, selector, drawTool, type) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this._square = type === "square";
}

inherit(RectangleTool, ShapeTool);

RectangleTool.prototype.mouseDown = function (e) {
  RectangleTool.super.mouseDown.call(this, e);

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
    lockUniScaling: this._square,
    fill: this.master.state.fill,
    stroke: this.master.state.stroke,
    strokeWidth: this.master.state.strokeWidth
  });
  this.canvas.add(this.curr);
};

RectangleTool.prototype.mouseMove = function (e) {
  RectangleTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this.curr.left;
  var height = loc.y - this.curr.top;

  if (this._square) {
    if (Math.abs(width) < Math.abs(height)) {
      height = Math.abs(width) * sign(height);
    } else {
      width = Math.abs(height) * sign(width);
    }
  }

  this.curr.set({
    width: width,
    height: height
  });

  this.canvas.renderAll();
};

function sign(num) {
  return num >= 0 ? 1 : -1;
}

RectangleTool.prototype.mouseUp = function (e) {
  RectangleTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

RectangleTool.prototype._processNewShape = function (s) {
  if (s.width < 0) {
    s.left = s.left + s.width;
    s.width = -s.width;
  }
  if (s.height < 0) {
    s.top = s.top + s.height;
    s.height = -s.height;
  }
  this.setCentralOrigin(s);
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('width', this.defSize);
    s.set('height', this.defSize);
    s.set('top', s.get('top') - (s.get('height') / 2) + s.get('strokeWidth'));
    s.set('left', s.get('left') - (s.get('width') / 2) + s.get('strokeWidth'));
  }
  s.setCoords();
};

module.exports = RectangleTool;

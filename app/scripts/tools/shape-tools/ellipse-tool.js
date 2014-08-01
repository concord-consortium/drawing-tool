var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function EllipseTool(name, selector, drawTool, type) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this._circle = type === "circle";
}

inherit(EllipseTool, ShapeTool);

EllipseTool.prototype.mouseDown = function (e) {
  EllipseTool.super.mouseDown.call(this, e);

  // if this tool is no longer active, stop current action!
  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Ellipse({
    top: y,
    left: x,
    rx: 0.1,
    ry: 0.1,
    selectable: false,
    lockUniScaling: this._circle,
    fill: this.master.state.fill,
    stroke: this.master.state.stroke,
    strokeWidth: this.master.state.strokeWidth
  });
  this.canvas.add(this.curr);
};

EllipseTool.prototype.mouseMove = function (e) {
  EllipseTool.super.mouseMove.call(this, e);

  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this.curr.left;
  var height = loc.y - this.curr.top;

  if (this._circle) {
    if (Math.abs(width) < Math.abs(height)) {
      height = Math.abs(width) * sign(height);
    } else {
      width = Math.abs(height) * sign(width);
    }
  }

  this.curr.set({
    width: width,
    height: height,
    rx: Math.abs(width / 2),
    ry: Math.abs(height / 2)
  });

  this.canvas.renderAll();
};

function sign(num) {
  return num >= 0 ? 1 : -1;
}

EllipseTool.prototype.mouseUp = function (e) {
  EllipseTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

EllipseTool.prototype._processNewShape = function (s) {
  if (s.width < 0) {
    s.left = s.left + s.width;
    s.width = -s.width;
  }
  if (s.height < 0) {
    s.top = s.top + s.height;
    s.height = -s.height;
  }
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('rx', this.defSize / 2);
    s.set('ry', this.defSize / 2);
    s.set('width', this.defSize);
    s.set('height', this.defSize);
    s.set('top', s.get('top') - s.get('ry') - s.get('strokeWidth') / 2);
    s.set('left', s.get('left') - s.get('rx') - s.get('strokeWidth') / 2);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = EllipseTool;

var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function CircleTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this.setLabel('C');
}

inherit(CircleTool, ShapeTool);

CircleTool.prototype.mouseDown = function (e) {
  console.log("Circle down");
  CircleTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Circle({
    top: y,
    left: x,
    radius: 0.1,
    lockUniScaling: true,
    selectable: false
  });
  this.canvas.add(this.curr);
};

CircleTool.prototype.mouseMove = function (e) {
  CircleTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;
  var x1 = this.curr.left;
  var y1 = this.curr.top;

  var width = x - x1;
  var height = y - y1;

  if (width < 0) {
    this.curr.originX = "right";
    width = -width;
  } else {
    this.curr.originX = "left";
  }

  if (height < 0) {
    this.curr.originY = "bottom";
    height = - height;
  } else {
    this.curr.originY = "top";
  }

  // circle size follows the smaller dimension of mouse drag
  var radius = (width < height ? width : height) / 2;

  this.curr.set('radius', radius);

  this.curr.set('width', radius * 2);
  this.curr.set('height', radius * 2);

  this.canvas.renderAll();
};

CircleTool.prototype.mouseUp = function (e) {
  console.log("Circle up");
  CircleTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

CircleTool.prototype._processNewShape = function (s) {
  if (s.originX === "right") {
    // "- s.strokeWidth" eliminates the small position shift
    // that would otherwise occur on mouseup
    s.left = s.left - s.width - s.strokeWidth;
    s.originX = "left";
  }
  if (s.originY === "bottom") {
    s.top = s.top - s.height - s.strokeWidth;
    s.originY = "top";
  }
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('radius', this.defSize / 2);
    s.set('width', this.defSize);
    s.set('height', this.defSize);
  }
  s.setCoords();
};

module.exports = CircleTool;

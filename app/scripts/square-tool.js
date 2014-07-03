var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/shape-tool');
var Util      = require('scripts/util');

function SquareTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(SquareTool, ShapeTool);

SquareTool.prototype.mouseDown = function (e) {
  console.log("square down");
  SquareTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = Util.getLoc(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Rect({
    top: y,
    left: x,
    width: 0,
    height: 0,
    lockUniScaling: true, // it's a square!
  });
  this.canvas.add(this.curr);
};

SquareTool.prototype.mouseMove = function (e) {
  SquareTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = Util.getLoc(e.e);
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
  console.log("square up");
  SquareTool.super.mouseUp.call(this, e);
  if (!this.active) { return; }

  if (this.curr.width < 0) {
    this.curr.left = this.curr.left + this.curr.width;
    this.curr.width = - this.curr.width;
  }
  if (this.curr.height < 0) {
    this.curr.top = this.curr.top + this.curr.height;
    this.curr.height = - this.curr.height;
  }
  this.curr.setCoords();

  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

module.exports = SquareTool;

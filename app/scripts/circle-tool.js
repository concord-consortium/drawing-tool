var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/shape-tool');
var Util      = require('scripts/util');

function CircleTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(CircleTool, ShapeTool);

CircleTool.prototype.mouseDown = function (e) {
  console.log("Circle down");
  CircleTool.super.mouseDown.call(this, e);

  var x = e.e.offsetX;
  var y = e.e.offsetY;

  this.curr = new fabric.Circle({
    top: y,
    left: x,
    radius: 0.1,
    selectable: false
  });
  this.canvas.add(this.curr);
};

CircleTool.prototype.mouseMove = function (e) {
  CircleTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }
  var x = e.e.offsetX,
      y = e.e.offsetY,
      x1 = this.curr.left,
      y1 = this.curr.top;

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

  var radius = (width > height ? width : height) / 2;

  this.curr.set('radius', radius);

  this.curr.set('width', radius * 2);
  this.curr.set('height', radius * 2);

  this.canvas.renderAll(false);
};

CircleTool.prototype.mouseUp = function (e) {
  console.log("Circle up");

  if (this.curr.radius < 10) {
    this.canvas.remove(this.curr);
    this.moved = false;
  }

  this.curr.setCoords();
  this.canvas.renderAll(false);
  CircleTool.super.mouseUp.call(this, e);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

module.exports = CircleTool;

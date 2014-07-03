var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/shape-tool');
var Util      = require('scripts/util');

function EllipseTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(EllipseTool, ShapeTool);

EllipseTool.prototype.mouseDown = function (e) {
  console.log("ellipse down");
  EllipseTool.super.mouseDown.call(this, e);

  // if this tool is no longer active, stop current action!
  if (!this.active) { return; }
  
  var x = e.e.layerX;
  var y = e.e.layerY;

  this.curr = new fabric.Ellipse({
    top: y,
    left: x,
    rx: 0.1,
    ry: 0.1,
    selectable: false
  });
  this.canvas.add(this.curr);
};

EllipseTool.prototype.mouseMove = function (e) {
  EllipseTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }
  var x = e.e.layerX,
      y = e.e.layerY,
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

  this.curr.set('rx', width / 2);
  this.curr.set('ry', height / 2);

  this.curr.set('width', width);
  this.curr.set('height', height);

  this.canvas.renderAll(false);
};

EllipseTool.prototype.mouseUp = function (e) {
  console.log("ellipse up");

  var width = this.curr.width,
      height = this.curr.height;
  if (Util.dist(width, height) < 10) {
    this.canvas.remove(this.curr);
    this.moved = false;
  } else {
    if (this.curr.originX === "right") {
      // "- this.curr.strokeWidth" eliminates the small position shift
      // that would otherwise occur on mouseup
      this.curr.left = this.curr.left - this.curr.width - this.curr.strokeWidth;
      this.curr.originX = "left";
    }
    if (this.curr.originY === "bottom") {
      this.curr.top = this.curr.top - this.curr.height - this.curr.strokeWidth;
      this.curr.originY = "top";
    }
  }

  this.curr.setCoords();
  this.canvas.renderAll(false);
  EllipseTool.super.mouseUp.call(this, e);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

module.exports = EllipseTool;

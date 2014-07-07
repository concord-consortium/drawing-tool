var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/shape-tool');
var Util      = require('scripts/util');

function EllipseTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this.setLabel('E');
}

inherit(EllipseTool, ShapeTool);

EllipseTool.prototype.mouseDown = function (e) {
  console.log("ellipse down");
  EllipseTool.super.mouseDown.call(this, e);

  // if this tool is no longer active, stop current action!
  if (!this.active) { return; }

  var loc = Util.getLoc(e.e);
  var x = loc.x;
  var y = loc.y;

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
  var loc = Util.getLoc(e.e);
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

  this.curr.set('rx', width / 2);
  this.curr.set('ry', height / 2);

  this.curr.set('width', width);
  this.curr.set('height', height);

  this.canvas.renderAll(false);
};

EllipseTool.prototype.mouseUp = function (e) {
  console.log("ellipse up");

  EllipseTool.super.mouseUp.call(this, e);
  if (!this.active) { return; }

  var width = this.curr.width,
      height = this.curr.height;

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

  this.curr.setCoords();
  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

module.exports = EllipseTool;

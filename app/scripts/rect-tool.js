var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/shape-tool');
var Util      = require('scripts/util');

function RectangleTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(RectangleTool, ShapeTool);

RectangleTool.prototype.mouseDown = function (e) {
  console.log("down");
  RectangleTool.super.mouseDown.call(this, e);

  var x = e.e.offsetX;
  var y = e.e.offsetY;

  this.curr = new fabric.Rect({
    top: y,
    left: x,
    width: 0,
    height: 0,
    selectable: false
  });
  this.canvas.add(this.curr);
};

RectangleTool.prototype.mouseMove = function (e) {
  RectangleTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }
  var x = e.e.offsetX,
      y = e.e.offsetY,
      x1 = this.curr.left,
      y1 = this.curr.top;
  this.curr.width = x - x1;
  this.curr.height = y - y1;
  this.canvas.renderAll(false);
};

RectangleTool.prototype.mouseUp = function (e) {
  console.log("rect up");
  RectangleTool.super.mouseUp.call(this, e);
  if(Util.dist(this.curr.width, this.curr.height) > 3){
    if (this.curr.width < 0) {
      this.curr.left = this.curr.left + this.curr.width;
      this.curr.width = - this.curr.width;
    }
    if (this.curr.height < 0) {
      this.curr.top = this.curr.top + this.curr.height;
      this.curr.height = - this.curr.height;
    }
    this.curr.setCoords();
  } else {
    this.exit();
  }

  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

module.exports = RectangleTool;

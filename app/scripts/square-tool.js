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
  console.log("down");
  SquareTool.super.mouseDown.call(this, e);

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

SquareTool.prototype.mouseMove = function (e) {
  SquareTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }
  var width = e.e.offsetX - this.curr.left;
  var height = e.e.offsetY - this.curr.top;

  var sideLen = Math.abs(width) > Math.abs(height) ? Math.abs(width) : Math.abs(height);
  this.curr.width = sideLen;
  if (width < 0) { this.curr.width *= -1; }
  this.curr.height = sideLen;
  if (height < 0) { this.curr.height *= -1; }

  this.canvas.renderAll(false);
};

SquareTool.prototype.mouseUp = function (e) {
  console.log("rect up");
  SquareTool.super.mouseUp.call(this, e);
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

module.exports = SquareTool;

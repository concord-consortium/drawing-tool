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
  this.canvas.remove(this.curr);
  var ctop = this.curr.top,
      cleft = this.curr.left,
      cheight = this.curr.height,
      cwidth = this.curr.width;
  // moved is now redundant on this portion right?
  if(this.moved && Util.dist(cwidth, cheight) > 3){
    if (cwidth < 0){
      cleft = cleft + cwidth;
      cwidth = -cwidth;
    }
    if (cheight < 0){
      ctop = ctop + cheight;
      cheight = -cheight;
    }
    var newRect = new fabric.Rect({
      top: ctop,
      left: cleft,
      width: cwidth,
      height: cheight
    });
    this.canvas.add(newRect);
    this.actionComplete(newRect);
    console.log("Rect constructed");
  } else {
    this.exit();
  }
  this.curr = undefined;
};

module.exports = RectangleTool;

var ShapeTool = require('scripts/shape-tool');
var Util = require('scripts/util');

function EllipseTool(name, selector, drawTool) {

  ShapeTool.call(this, name, selector, drawTool);

  this.curr;

  var self = this;

  this.addEventListener("mouse:down", function(e){ self.mouseDown(e); });
  this.addEventListener("mouse:move", function(e){ self.mouseMove(e); });
  this.addEventListener("mouse:up", function(e){ self.mouseUp(e); });
}

EllipseTool.prototype = Object.create(ShapeTool.prototype);
EllipseTool.prototype.constructor = EllipseTool;
EllipseTool.prototype.parent = ShapeTool.prototype;

EllipseTool.prototype.mouseDown = function(e){
  console.log("ellipse down");
  this.parent.mouseDown.call(this, e);

  var x = e.e.offsetX,
      y = e.e.offsetY;

  this.curr = new fabric.Ellipse({
    top: y-100,
    left: x-50,
    rx: 50,
    ry: 100,
    selectable: false
  })
  this.canvas.add(this.curr);
}

EllipseTool.prototype.mouseMove = function(e){
  this.parent.mouseMove.call(this, e);
  if (this.down === false) { return; }
  console.log("moved " + this.moved);
  var x = e.e.offsetX,
      y = e.e.offsetY,
      x1 = this.curr.left,
      y1 = this.curr.top;

  this.curr.set('rx', (x - x1) / 2);
  this.curr.set('ry', (y - y1) / 2);

  this.canvas.renderAll(false);
}

EllipseTool.prototype.mouseUp = function(e){
  console.log("ellipse up");
  this.parent.mouseUp.call(this, e);
  this.curr = undefined;
}

EllipseTool.prototype.activate = function() {
  // console.warn("At line tool activation");
  this.parent.activate.call(this);
}

module.exports = EllipseTool;

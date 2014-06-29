var ShapeTool = require('scripts/shape-tool');
var Util = require('scripts/util');

function LineTool(name, selector, drawTool) {

  ShapeTool.call(this, name, selector, drawTool);

  this.curr;

  var self = this;

  this.addEventListener("mouse:down", function(e){ self.mouseDown(e); });
  this.addEventListener("mouse:move", function(e){ self.mouseMove(e); });
  this.addEventListener("mouse:up", function(e){ self.mouseUp(e); });
}

LineTool.prototype = Object.create(ShapeTool.prototype);
LineTool.prototype.constructor = LineTool;
LineTool.prototype.parent = ShapeTool.prototype;

LineTool.prototype.mouseDown = function(e){
  console.log("down");
  this.parent.mouseDown.call(this, e);

  var x = e.e.offsetX,
      y = e.e.offsetY;

  this.curr = new fabric.Line([x,y,x,y],{ selectable: false });
  this.canvas.add(this.curr);
}

LineTool.prototype.mouseMove = function(e){
  this.parent.mouseMove.call(this, e);
  if (this.down === false) { return; }
  console.log("moved " + this.moved);
  var x = e.e.offsetX,
      y = e.e.offsetY;
  this.curr.set('x2', x);
  this.curr.set('y2', y);
  this.canvas.renderAll(false);
}

LineTool.prototype.mouseUp = function(e){
  console.log("line up");
  this.parent.mouseUp.call(this, e);
  this.canvas.remove(this.curr);

  var x1 = this.curr.get('x1'),
      y1 = this.curr.get('y1'),
      x2 = this.curr.get('x2'),
      y2 = this.curr.get('y2');
  if(this.moved && Util.dist(x2 - x1, y2 - y1) > 3){
    var newLine = new fabric.Line([x1, y1, x2, y2],{});
    this.canvas.add(newLine);
    console.log("new line constructed");
  } else {
    this.parent.exit.call(this);
  }
  this.curr = undefined;
  this.actionComplete();
}

LineTool.prototype.activate = function() {
  // console.warn("At line tool activation");
  this.parent.activate.call(this);
}

module.exports = LineTool;

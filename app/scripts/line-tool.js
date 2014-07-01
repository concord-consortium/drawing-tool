var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/shape-tool');
var Util      = require('scripts/util');

function LineTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(LineTool, ShapeTool);

LineTool.prototype.mouseDown = function (e) {
  console.log("down");
  LineTool.super.mouseDown.call(this, e);

  var x = e.e.offsetX;
  var y = e.e.offsetY;

  this.curr = new fabric.Line([x,y,x,y],{ selectable: false });
  this.canvas.add(this.curr);
};

LineTool.prototype.mouseMove = function (e) {
  LineTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }
  var x = e.e.offsetX,
      y = e.e.offsetY;
  this.curr.set('x2', x);
  this.curr.set('y2', y);
  this.canvas.renderAll(false);
};

LineTool.prototype.mouseUp = function (e) {
  console.log("line up");
  LineTool.super.mouseUp.call(this, e);

  var x1 = this.curr.get('x1'),
      y1 = this.curr.get('y1'),
      x2 = this.curr.get('x2'),
      y2 = this.curr.get('y2');
  if(Util.dist(x2 - x1, y2 - y1) > 10){
    this.curr.setCoords();
    console.log("new line constructed");
  } else {
    this.canvas.remove(this.curr);
    this.exit();
  }

  // control point
  var sidelen = fabric.Line.prototype.cornerSize;

  this.curr.ctp = [
  new fabric.Rect({
    left: x1,
    top: y1,
    width: sidelen,
    height: sidelen,
    strokeWidth: false,
    stroke: "grey",
    fill: "grey",
    visible: false
  }),

  new fabric.Rect({
    left: x2,
    top: y2,
    width: sidelen,
    height: sidelen,
    strokeWidth: 0,
    stroke: "grey",
    fill: "grey",
    visible: false
  })
  ];

  this.canvas.add(this.curr.ctp[0]);
  this.canvas.add(this.curr.ctp[1]);

  this.curr.on('selected', LineTool.objectSelected);
  this.curr.on('moving', LineTool.objectMoved);

  this.actionComplete(this.curr);
  this.curr = undefined;
};

LineTool.objectSelected = function(e) {
  var self = this;
  LineTool.updateControlPoints.call(self, e);

  console.log(e);

  this.ctp[0].visible = true;
  this.ctp[1].visible = true;

  this.canvas.renderAll(false);
}

LineTool.objectMoved = function(e) {
  var self = this;
  LineTool.updateControlPoints.call(self, e);
  if(this.ctp[0].visible){
    this.canvas.renderAll(false);
  }
}

LineTool.updateControlPoints = function(e) {
  // `this` is the object/line
  this.ctp[0].top = this.top;
  this.ctp[0].left = this.left;
  this.ctp[1].top = this.top + this.height;
  this.ctp[1].left = this.left + this.width;
}

module.exports = LineTool;

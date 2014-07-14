var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function EllipseTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  // this.setLabel('E');
}

inherit(EllipseTool, ShapeTool);

EllipseTool.prototype.mouseDown = function (e) {
  EllipseTool.super.mouseDown.call(this, e);

  // if this tool is no longer active, stop current action!
  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);
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
  var loc = this.canvas.getPointer(e.e);
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
    height = -height;
  } else {
    this.curr.originY = "top";
  }

  this.curr.set('rx', width / 2);
  this.curr.set('ry', height / 2);

  this.curr.set('width', width);
  this.curr.set('height', height);

  this.canvas.renderAll();
};

EllipseTool.prototype.mouseUp = function (e) {
  EllipseTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

EllipseTool.prototype._processNewShape = function (s) {
  var width = s.width;
  var height = s.height;

  if (s.originX === "right") {
    // "- s.strokeWidth" eliminates the small position shift
    // that would otherwise occur on mouseup
    s.left = s.left - s.width - s.strokeWidth;
    s.originX = "left";
  }
  if (s.originY === "bottom") {
    s.top = s.top - s.height - s.strokeWidth;
    s.originY = "top";
  }
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('rx', this.defSize / 2);
    s.set('ry', this.defSize / 2);
    s.set('width', this.defSize);
    s.set('height', this.defSize);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = EllipseTool;

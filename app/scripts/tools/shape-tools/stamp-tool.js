var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');

function StampTool(name, drawTool) {
  ShapeTool.call(this, name, drawTool);

  // HTML Image Element or null.
  this._imgElement = null;
}

inherit(StampTool, ShapeTool);

StampTool.prototype.mouseDown = function (e) {
  StampTool.super.mouseDown.call(this, e);

  if (!this.active || !this._imgElement) return;

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Image(this._imgElement, {
    left: x,
    top: y,
    width: 0,
    height: 0,
    selectable: false
  });

  this.canvas.add(this.curr);
};

StampTool.prototype.mouseMove = function (e) {
  StampTool.super.mouseMove.call(this, e);
  if (this.down === false || !this.curr) return;

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this.curr.left;
  var height = loc.y - this.curr.top;
  var imgAspectRatio = this._imgElement.width / this._imgElement.height;

  // Keep original image aspect ratio.
  if (Math.abs(width / height) > imgAspectRatio) {
    width = sign(width) * Math.abs(height) * imgAspectRatio;
  } else {
    height = sign(height) * Math.abs(width) / imgAspectRatio;
  }

  this.curr.set({
    width: width,
    height: height
  });

  this.canvas.renderAll();
};

function sign(num) {
  return num >= 0 ? 1 : -1;
}

StampTool.prototype.mouseUp = function (e) {
  StampTool.super.mouseUp.call(this, e);
  if (!this.curr) return;
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
  this.master.pushToHistory();
};

StampTool.prototype.setStampImage = function (imgElement) {
  this._imgElement = imgElement;
};

StampTool.prototype.getStampImageSrc = function () {
  return this._imgElement && this._imgElement.src;
};

StampTool.prototype._processNewShape = function (s) {
  this.convertToPositiveDimensions(s);
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set({
      width: this._imgElement.width,
      height: this._imgElement.height,
    });
    // So the center of the object is directly underneath the cursor.
    this.moveObjectLeftTop(s);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = StampTool;

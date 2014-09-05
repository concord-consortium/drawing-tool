var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');

function StampTool(name, drawTool) {
  ShapeTool.call(this, name, drawTool);

  // HTML Image Element or null.
  this._imgElement = null;

  this._curr = null
  this._startX = null;
  this._startY = null;
}

inherit(StampTool, ShapeTool);

StampTool.prototype.mouseDown = function (e) {
  StampTool.super.mouseDown.call(this, e);

  if (!this.active || !this._imgElement) return;

  var loc = this.canvas.getPointer(e.e);
  this._startX = loc.x;
  this._startY = loc.y;

  this._curr = new fabric.Image(this._imgElement, {
    left: this._startX,
    top: this._startY,
    width: 0,
    height: 0,
    originX: 'center',
    originY: 'center',
    selectable: false,
    crossOrigin: this._imgElement.crossOrigin
  });

  this.canvas.add(this._curr);
};

StampTool.prototype.mouseMove = function (e) {
  StampTool.super.mouseMove.call(this, e);
  if (this.down === false || !this._curr) return;

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this._startX;
  var height = loc.y - this._startY;
  var imgAspectRatio = this._imgElement.width / this._imgElement.height;

  // Keep original image aspect ratio.
  if (Math.abs(width / height) > imgAspectRatio) {
    width = sign(width) * Math.abs(height) * imgAspectRatio;
  } else {
    height = sign(height) * Math.abs(width) / imgAspectRatio;
  }

  this._curr.set({
    width: Math.abs(width),
    height: Math.abs(height),
    left: this._startX + width * 0.5,
    top: this._startY + height * 0.5
  });

  this.canvas.renderAll();
};

function sign(num) {
  return num >= 0 ? 1 : -1;
}

StampTool.prototype.mouseUp = function (e) {
  StampTool.super.mouseUp.call(this, e);
  if (!this._curr) return;
  this._processNewShape(this._curr);
  this.canvas.renderAll();
  this.actionComplete(this._curr);
  this._curr = undefined;
  this.master.pushToHistory();
};

StampTool.prototype.setStampImage = function (imgElement) {
  this._imgElement = imgElement;
};

StampTool.prototype.getStampImageSrc = function () {
  return this._imgElement && this._imgElement.src;
};

StampTool.prototype._processNewShape = function (s) {
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set({
      width: this._imgElement.width,
      height: this._imgElement.height,
    });
  }
  s.setCoords();
};

module.exports = StampTool;

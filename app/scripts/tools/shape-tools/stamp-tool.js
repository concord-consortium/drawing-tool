var fabric    = require('fabric').fabric;
var inherit   = require('../../inherit');
var ShapeTool = require('../shape-tool');

function StampTool(name, drawTool, parseSVG) {
  ShapeTool.call(this, name, drawTool);

  // If this flag is set to true, stamp tool will try to parse SVG images
  // using parser provided by FabricJS. It lets us avoid tainting canvas
  // in some browsers which always do that when SVG image is rendered
  // on canvas (e.g. Safari, IE).
  this._parseSVG = parseSVG;
  // FabricJS object.
  this._stamp = null;

  this._curr = null
  this._startX = null;
  this._startY = null;
}

inherit(StampTool, ShapeTool);

StampTool.prototype.mouseDown = function (e) {
  StampTool.super.mouseDown.call(this, e);

  if (!this.active || !this._stamp) return;

  var loc = this.canvas.getPointer(e.e);
  this._startX = loc.x;
  this._startY = loc.y;

  this._stamp.clone(function (clonedStamp) {
    clonedStamp.set({
      left: this._startX,
      top: this._startY,
      scaleX: 0,
      scaleY: 0,
      originX: 'center',
      originY: 'center',
      selectable: false
    });
    this._curr = clonedStamp;
    this.canvas.add(this._curr);
  }.bind(this));
};

StampTool.prototype.mouseMove = function (e) {
  StampTool.super.mouseMove.call(this, e);
  if (this.down === false || !this._curr) return;

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this._startX;
  var height = loc.y - this._startY;
  var imgAspectRatio = this._stamp.width / this._stamp.height || 1;

  // Keep original image aspect ratio.
  if (Math.abs(width / height) > imgAspectRatio) {
    width = sign(width) * Math.abs(height) * imgAspectRatio;
  } else {
    height = sign(height) * Math.abs(width) / imgAspectRatio;
  }

  this._curr.set({
    scaleX: Math.abs(width) / this._stamp.width,
    scaleY: Math.abs(height) / this._stamp.height,
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

// Loads an image from URL.
// Callback will be invoked with two arguments - ready FabricJS object and Image element.
// Note that when URL points SVG image, it will be processed in a special way and path group
// object will be created instead of regular image.
StampTool.prototype.loadImage = function(url, callback) {
  if (this._parseSVG && url.toLowerCase().substr(-4) === ".svg") {
    this._loadSVGImage(url, callback);
  } else {
    this._loadNonSVGImage(url, callback);
  }
};

StampTool.prototype.setStampObject = function (stamp) {
  this._stamp = stamp;
};

StampTool.prototype.getStampSrc = function () {
  return this._stamp && this._stamp._dt_sourceURL;
};

StampTool.prototype._processNewShape = function (s) {
  if (Math.max(s.width * s.scaleX, s.height * s.scaleY) < this.minSize) {
    s.set({
      scaleX: 1,
      scaleY: 1,
    });
  }
  s.setCoords();
};

StampTool.prototype._loadSVGImage = function (url, callback) {
  fabric.loadSVGFromURL(url, function (objects, options) {
    var fabricObj = fabric.util.groupSVGElements(objects, options);
    fabricObj._dt_sourceURL = url;
    callback(fabricObj, this._renderToImage(fabricObj));
  }.bind(this));
};

StampTool.prototype._loadNonSVGImage = function (url, callback) {
  fabric.util.loadImage(url, function (img) {
    var fabricObj = new fabric.Image(img, {
      crossOrigin: img.crossOrigin
    });
    fabricObj._dt_sourceURL = url;
    callback(fabricObj, img)
  }, null, 'anonymous');
};

StampTool.prototype._renderToImage = function (fabricObj) {
  var canv = new fabric.Canvas(document.createElement('canvas'));
  canv.setDimensions({
    width: fabricObj.width,
    height: fabricObj.height
  });
  canv.add(fabricObj).renderAll();
  var img = new Image();
  img.src = canv.toDataURL();
  return img;
};

module.exports = StampTool;

var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

var SUPPORTED_SHAPES = {
  rect: {
    fabricType: 'rect'
  },
  square: {
    fabricType: 'rect',
    uniform: true
  },
  ellipse: {
    fabricType: 'ellipse',
    radius: true
  },
  circle: {
    fabricType: 'ellipse',
    uniform: true,
    radius: true
  }
};

function BasicShapeTool(name, drawTool, type) {
  ShapeTool.call(this, name, drawTool);

  this._type = SUPPORTED_SHAPES[type];
  this._shapeKlass = fabric.util.getKlass(this._type.fabricType);
}

inherit(BasicShapeTool, ShapeTool);

BasicShapeTool.prototype.mouseDown = function (e) {
  BasicShapeTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);

  var x = loc.x;
  var y = loc.y;

  this.curr = new this._shapeKlass({
    top: y,
    left: x,
    width: 0,
    height: 0,
    selectable: false,
    lockUniScaling: this._type.uniform,
    fill: this.master.state.fill,
    stroke: this.master.state.stroke,
    strokeWidth: this.master.state.strokeWidth
  });
  this.canvas.add(this.curr);
};

BasicShapeTool.prototype.mouseMove = function (e) {
  BasicShapeTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this.curr.left;
  var height = loc.y - this.curr.top;

  if (this._type.uniform) {
    if (Math.abs(width) < Math.abs(height)) {
      height = Math.abs(width) * sign(height);
    } else {
      width = Math.abs(height) * sign(width);
    }
  }

  this.curr.set({
    width: width,
    height: height
  });

  if (this._type.radius) {
    this.curr.set({
      rx: Math.abs(width / 2),
      ry: Math.abs(height / 2)
    });
  }

  this.canvas.renderAll();
};

function sign(num) {
  return num >= 0 ? 1 : -1;
}

BasicShapeTool.prototype.mouseUp = function (e) {
  BasicShapeTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
  this.master.pushToHistory();
};

BasicShapeTool.prototype._processNewShape = function (s) {
  this.convertToPositiveDimensions(s);
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('width', this.defSize);
    s.set('height', this.defSize);
    if (this._type.radius) {
      s.set('rx', this.defSize / 2);
      s.set('ry', this.defSize / 2);
    }
    // So the center of the object is directly underneath the cursor.
    this.moveObjectLeftTop(s);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = BasicShapeTool;

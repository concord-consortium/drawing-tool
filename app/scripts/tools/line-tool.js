var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

var CONTROL_POINT_COLOR = '#bcd2ff';

function LineTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  this.setLabel('L');

  fabric.Line.prototype.hasControls = false;
  fabric.Line.prototype.hasBorders = false;

  // Setting up a "deselected" event
  // see https://groups.google.com/d/topic/fabricjs/pcFJOroSkI4/discussion
  // this._selectedObj has already been declared in drawing-tool.js
  fabric.Line.prototype.is = function (obj) {
    return this === obj || this.ctp[0] === obj || this.ctp[1] === obj;
  };

  // the context for the event is the object (which is why the .call is needed)
  this.canvas.on.call(this.canvas, "object:selected", function (e) {
    // TODO: this can be shortened with a flag on the control rectangles
    //       marking their special status
    if (this._selectedObj !== undefined) {
      if (this._selectedObj.type === "line") {
        if (!this._selectedObj.is(e.target)) {
          LineTool.objectDeselected.call(this._selectedObj);
          this._selectedObj = e.target;
        } else {
          // nothing
        }
      } else {
        this._selectedObj = e.target;
      }
    } else {
      this._selectedObj = e.target;
    }
  });

  // the fabric canvas is the context for a selection cleared
  this.canvas.on("selection:cleared", function (e) {
    if (this._selectedObj && this._selectedObj.type === "line") {
      LineTool.objectDeselected.call(this._selectedObj);
    }
    this._selectedObj = undefined;
  });

}

inherit(LineTool, ShapeTool);

LineTool.prototype.mouseDown = function (e) {
  console.log("down");
  LineTool.super.mouseDown.call(this, e);

  if ( !this.active ) { return; }

  var loc = Util.getLoc(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Line([x,y,x,y],{ selectable: false });
  this.canvas.add(this.curr);
};

LineTool.prototype.mouseMove = function (e) {
  LineTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = Util.getLoc(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr.set('x2', x);
  this.curr.set('y2', y);
  this.canvas.renderAll(false);
};

LineTool.prototype.mouseUp = function (e) {
  console.log("line up");
  LineTool.super.mouseUp.call(this, e);
  if (!this.active) { return; }

  var x1 = this.curr.get('x1'),
      y1 = this.curr.get('y1'),
      x2 = this.curr.get('x2'),
      y2 = this.curr.get('y2');
  this.curr.setCoords();
  console.log("new line constructed");

  this.curr.set('prevTop', this.curr.get('top'));
  this.curr.set('prevLeft', this.curr.get('left'));
  this.curr.set('selectable', false);

  // control point
  var sidelen = fabric.Line.prototype.cornerSize;
  this.curr.ctp = [
    this._makePoint(x1, y1, sidelen, this.curr, 0),
    this._makePoint(x2, y2, sidelen, this.curr, 1)
  ];

  this.curr.on('selected', LineTool.objectSelected);
  this.curr.on('moving', LineTool.objectMoved);

  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

LineTool.prototype._makePoint = function(l, t, s, source, i){
  var point = new fabric.Rect({
    left: l,
    top: t,
    width: s,
    height: s,
    strokeWidth: 0,
    stroke: CONTROL_POINT_COLOR,
    fill: CONTROL_POINT_COLOR,
    visible: false,
    hasControls: false,
    hasBorders: false,
    line: source,
    id: i
  });
  source.canvas.add(point);
  point.on("moving", LineTool.updateLine);
  return point;
};

// When the line is selected, show control points
LineTool.objectSelected = function(e) {
  var self = this;
  LineTool.updateControlPoints.call(self, e);

  this.ctp[0].visible = true;
  this.ctp[1].visible = true;

  this.canvas.renderAll(false);
};

// on "deselect", hide control points
LineTool.objectDeselected = function(e) {
  this.ctp[0].visible = false;
  this.ctp[1].visible = false;

  this.canvas.renderAll(false);
};

LineTool.objectMoved = function(e) {
  var dx = this.left - this.prevLeft;
  var dy = this.top - this.prevTop;

  this.set('x1', dx + this.x1);
  this.set('y1', dy + this.y1);
  this.set('x2', dx + this.x2);
  this.set('y2', dy + this.y2);

  this.prevLeft = this.left;
  this.prevTop = this.top;

  var self = this;
  LineTool.updateControlPoints.call(self, e);
};

LineTool.updateControlPoints = function(e) {
  // `this` is the object/line
  this.ctp[0].set('top', this.y1);
  this.ctp[0].set('left', this.x1);
  this.ctp[1].set('top', this.y2);
  this.ctp[1].set('left', this.x2);
  this.ctp[0].setCoords();
  this.ctp[1].setCoords();
};

// update line based on control point movement
LineTool.updateLine = function(e) {
  var line = this.line;
  line.set('x' + (this.id + 1), this.left);
  line.set('y' + (this.id + 1), this.top);
  line.setCoords();
  // update the "previous" values so dx and dy don't get wonky
  // when the control points are manipulated
  line.prevLeft = line.left;
  line.prevTop = line.top;
  line.canvas.renderAll(false);
};

module.exports = LineTool;

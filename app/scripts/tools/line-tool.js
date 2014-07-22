var inherit    = require('scripts/inherit');
var ShapeTool  = require('scripts/tools/shape-tool');
var SelectTool = require('scripts/tools/select-tool');
var Util       = require('scripts/util');

var CONTROL_POINT_COLOR = '#bcd2ff';

function LineTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  fabric.Line.prototype.is = function (obj) {
    return this === obj || this.ctp[0] === obj || this.ctp[1] === obj;
  };

  // the context for the event is the object (which is why the .call is needed)
  // TODO: make this code more read-able
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
  LineTool.super.mouseDown.call(this, e);

  if ( !this.active ) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Line([x,y,x,y], {
    selectable: false,
    hasControls: false,
    hasBorders: false,
    // fill: this.master.state.fill,
    // stroke: this.master.state.color,
    // strokeWidth: this.master.state.strokeWidth
  });
  this.curr.set(this.master.state);
  this.canvas.add(this.curr);
};

LineTool.prototype.mouseMove = function (e) {
  LineTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr.set('x2', x);
  this.curr.set('y2', y);
  this.canvas.renderAll(false);
};

LineTool.prototype.mouseUp = function (e) {
  LineTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

LineTool.prototype._processNewShape = function (s) {
  var x1 = s.get('x1');
  var y1 = s.get('y1');
  var x2 = s.get('x2');
  var y2 = s.get('y2');

  if (Util.dist(x1 - x2, y1 - y2) < this.minSize) {
    x2 = x1 + this.defSize;
    y2 = y1 + this.defSize;
    s.set('x2', x2);
    s.set('y2', y2);
  }

  s.setCoords();

  s.set('prevTop', s.get('top'));
  s.set('prevLeft', s.get('left'));
  s.set('selectable', false);

  // control point
  var sidelen = SelectTool.BASIC_SELECTION_PROPERTIES.cornerSize;
  s.ctp = [
    this._makePoint(x1, y1, sidelen, s, 0),
    this._makePoint(x2, y2, sidelen, s, 1)
  ];

  s.on('selected', LineTool.objectSelected);
  s.on('moving', LineTool.objectMoved);
  s.on('removed', LineTool.lineDeleted);
};

// TODO: fix this to control the line endpoints from the
//       CENTER of the control point (not the edge)
//       This is visible on larger width lines.
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
    id: i,
    originX: "left",
    originY: "top"
  });
  source.canvas.add(point);
  point.on("moving", LineTool.updateLine);
  point.on("removed", LineTool.pointDeleted);
  return point;
};

// When the line is selected, show control points
LineTool.objectSelected = function(e) {
  if (this.prevLeft !== this.left && this.prevTop !== this.top) {
    LineTool.objectMoved.call(this, e);
  }
  LineTool.updateControlPoints.call(this, e);

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

// update the points when the line is moved
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

// update the control points with coordinates from the line
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
LineTool.updateLine = function (e) {
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

// update line when the control point is deleted (delete the line as well)
LineTool.pointDeleted = function (e) {
  var l = this.line;
  if (l.ctp[0] !== this) { l.canvas.remove(l.ctp[0]); }
  else { l.canvas.remove(l.ctp[1]); }
  l.canvas.remove(l);
};

// delete the control points after the line has been deleted
LineTool.lineDeleted = function (e) {
  // since `pointDeleted` will be triggered on when removing the first point
  // we don't need to worry about removing the other point as well.
  this.canvas.remove(this.ctp[0]);
};

module.exports = LineTool;

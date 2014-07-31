var inherit    = require('scripts/inherit');
var ShapeTool  = require('scripts/tools/shape-tool');
var SelectTool = require('scripts/tools/select-tool');
var Util       = require('scripts/util');

// Load FabricJS extension.
require('scripts/fabric-extensions/arrow');

var CONTROL_POINT_COLOR = '#bcd2ff';

// Note that this tool supports fabric.Line and all its subclasses (defined
// as part of this code base, not FabricJS itself). Pass 'lineType' argument
// (e.g. "line" or "arrow").

function LineTool(name, selector, drawTool, lineType) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  lineType = lineType || 'line';
  handleLineSelection(this.canvas, lineType);
  this._lineKlass = fabric.util.getKlass(lineType);
}

inherit(LineTool, ShapeTool);

LineTool.prototype.mouseDown = function (e) {
  LineTool.super.mouseDown.call(this, e);

  if (!this.active) return;

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new this._lineKlass([x,y,x,y], {
    selectable: false,
    stroke: this.master.state.color,
    strokeWidth: this.master.state.strokeWidth
  });
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
  this.canvas.renderAll();
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
};

function handleLineSelection(canvas, lineType) {
  var selectedObject = null;
  canvas.on("object:selected", function (e) {
    var newTarget = e.target;
    if (selectedObject && selectedObject.type === lineType && !isControlPoint(newTarget, selectedObject)) {
      lineDeselected.call(selectedObject);
    }
    if (!isControlPoint(newTarget, selectedObject)) {
      selectedObject = newTarget;
      if (newTarget.type === lineType) {
        lineSelected.call(newTarget);
      }
    }
  });
  canvas.on("selection:cleared", function (e) {
    if (selectedObject && selectedObject.type === lineType) {
      lineDeselected.call(selectedObject);
    }
    selectedObject = null;
  });
}

function isControlPoint(object, line) {
  return line && line.ctp && (line.ctp[0] === object || line.ctp[1] === object);
}

// Handlers

function lineSelected() {
  // Disable typical control points.
  this.set({
    hasControls: false,
    hasBorders: false
  });
  // Create custom ones.
  var sidelen = SelectTool.BASIC_SELECTION_PROPERTIES.cornerSize;
  this.ctp = [
    makeControlPoint(sidelen, this, 0),
    makeControlPoint(sidelen, this, 1)
  ];
  updateLineControlPoints.call(this);
  this.on('moving', lineMoved);
  this.on('removed', lineDeleted);
  // And finally re-render (perhaps it's redundant).
  this.canvas.renderAll();
}

function lineDeselected() {
  // Very important - set line property to null / undefined,
  // as otherwise control point will remove line as well!
  this.ctp[0].line = null;
  this.ctp[1].line = null;
  this.ctp[0].remove();
  this.ctp[1].remove();
  this.ctp = undefined;
  this.off('moving');
  this.off('removed');
}

function lineMoved() {
  updateLineControlPoints.call(this);
}

function lineDeleted() {
  // Do nothing if there are no control points.
  if (!this.ctp) return;
  // If there are some, just remove one of them
  // It will cause that the second one will be removed as well.
  this.ctp[0].remove();
}

function controlPointMoved() {
  var line = this.line;
  line.set('x' + (this.id + 1), this.left);
  line.set('y' + (this.id + 1), this.top);
  line.setCoords();
  line.canvas.renderAll();
}

function controlPointDeleted() {
  var line = this.line;
  // Do nothing if there is no reference to source object (line).
  if (!line) return;
  // Otherwise try to remove second point and finally canvas.
  var secondControlPoint;
  if (line.ctp[0] !== this) {
    secondControlPoint = line.ctp[0];
  } else {
    secondControlPoint = line.ctp[1];
  }
  secondControlPoint.line = null;
  secondControlPoint.remove();
  line.remove();
}

// Helpers

// TODO: fix this to control the line endpoints from the
//       CENTER of the control point (not the edge)
//       This is visible on larger width lines.
function updateLineControlPoints() {
  // First update line itself, (x1, y1) and (x2, y2) points using left / top.
  var dx = this.left - Math.min(this.get('x1'), this.get('x2'));
  var dy = this.top  - Math.min(this.get('y1'), this.get('y2'));
  this.set('x1', dx + this.x1);
  this.set('y1', dy + this.y1);
  this.set('x2', dx + this.x2);
  this.set('y2', dy + this.y2);

  this.ctp[0].set('top', this.y1);
  this.ctp[0].set('left', this.x1);
  this.ctp[1].set('top', this.y2);
  this.ctp[1].set('left', this.x2);
  this.ctp[0].setCoords();
  this.ctp[1].setCoords();
}

function makeControlPoint(s, source, i) {
  var point = new fabric.Rect({
    width: s,
    height: s,
    strokeWidth: 0,
    stroke: CONTROL_POINT_COLOR,
    fill: CONTROL_POINT_COLOR,
    hasControls: false,
    hasBorders: false,
    // Custom properties:
    line: source,
    id: i
  });
  source.canvas.add(point);
  point.on("moving", controlPointMoved);
  point.on("removed", controlPointDeleted);
  return point;
}

module.exports = LineTool;

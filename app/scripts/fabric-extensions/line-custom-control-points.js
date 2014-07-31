var SUPPORTED_TYPES = ["line", "arrow"];

function lineCustomControlPoints(canvas) {
  // Make sure that listeners aren't added multiple times.
  if (canvas.lineCustomControlPointsEnabled) return;

  var selectedObject = null;
  canvas.on("object:selected", function (e) {
    var newTarget = e.target;
    if (selectedObject && isLine(selectedObject) && !isControlPoint(newTarget, selectedObject)) {
      lineDeselected.call(selectedObject);
    }
    if (!isControlPoint(newTarget, selectedObject)) {
      selectedObject = newTarget;
      if (isLine(newTarget)) {
        lineSelected.call(newTarget);
      }
    }
  });
  canvas.on("selection:cleared", function (e) {
    if (selectedObject && isLine(selectedObject)) {
      lineDeselected.call(selectedObject);
    }
    selectedObject = null;
  });
  canvas.lineCustomControlPointsEnabled = true;
}

// Options.
lineCustomControlPoints.controlPointColor = '#bcd2ff';
lineCustomControlPoints.cornerSize = 12;

function isControlPoint(object, line) {
  return line && line.ctp && (line.ctp[0] === object || line.ctp[1] === object);
}

function isLine(object) {
  for (var i = 0; i < SUPPORTED_TYPES.length; i++) {
    if (object.type === SUPPORTED_TYPES[i]) return true;
  }
  return false;
}

// Handlers

function lineSelected() {
  // Disable typical control points.
  this.set({
    hasControls: false,
    hasBorders: false
  });
  // Create custom ones.
  var sidelen = lineCustomControlPoints.cornerSize ;
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
    stroke: lineCustomControlPoints.controlPointColor,
    fill: lineCustomControlPoints.controlPointColor,
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

module.exports = lineCustomControlPoints;

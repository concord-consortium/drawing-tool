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
  return line && line._dt_controlPoints && (line._dt_controlPoints[0] === object || line._dt_controlPoints[1] === object);
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
  this._dt_controlPoints = [
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
  // Very important - set _dt_sourceObj property to null / undefined,
  // as otherwise control point will remove line as well!
  this._dt_controlPoints[0]._dt_sourceObj = null;
  this._dt_controlPoints[1]._dt_sourceObj = null;
  this._dt_controlPoints[0].remove();
  this._dt_controlPoints[1].remove();
  this._dt_controlPoints = undefined;
  this.off('moving');
  this.off('removed');
}

function lineMoved() {
  updateLineControlPoints.call(this);
}

function lineDeleted() {
  // Do nothing if there are no control points.
  if (!this._dt_controlPoints) return;
  // If there are some, just remove one of them
  // It will cause that the second one will be removed as well.
  this._dt_controlPoints[0].remove();
}

function controlPointMoved() {
  var line = this._dt_sourceObj;
  line.set('x' + (this.id + 1), this.left);
  line.set('y' + (this.id + 1), this.top);
  line.setCoords();
  line.canvas.renderAll();
}

function controlPointDeleted() {
  var line = this._dt_sourceObj;
  // Do nothing if there is no reference to source object (line).
  if (!line) return;
  // Otherwise try to remove second point and finally canvas.
  var secondControlPoint;
  if (line._dt_controlPoints[0] !== this) {
    secondControlPoint = line._dt_controlPoints[0];
  } else {
    secondControlPoint = line._dt_controlPoints[1];
  }
  secondControlPoint.line = null;
  secondControlPoint.remove();
  line.remove();
}

// Helpers

function updateLineControlPoints() {
  translateLineCoords.call(this);
  rotateLineCoords.call(this);
  this._dt_controlPoints[0].set('left', this.get('x1'));
  this._dt_controlPoints[0].set('top', this.get('y1'));
  this._dt_controlPoints[1].set('left', this.get('x2'));
  this._dt_controlPoints[1].set('top', this.get('y2'));
  this._dt_controlPoints[0].setCoords();
  this._dt_controlPoints[1].setCoords();
}

function translateLineCoords() {
  // It's a bit confusing part of FabricJS. Basically line has (x1, y1), (x2, y2) coordinates
  // and (top, left). When line is moved, only (top, left) are updated. Update rest of
  // coordinates too. Note that there is an assumption that the line has central origin!
  var centerX = this.get('x1') + (this.get('x2') - this.get('x1')) * 0.5;
  var centerY = this.get('y1') + (this.get('y2') - this.get('y1')) * 0.5;
  var dx = this.left - centerX;
  var dy = this.top  - centerY;
  this.set('x1', dx + this.x1);
  this.set('y1', dy + this.y1);
  this.set('x2', dx + this.x2);
  this.set('y2', dy + this.y2);
}

function rotateLineCoords() {
  // Set angle to 0 and apply transform to (x1, y1), (x2, y2). We could also
  // apply this transformation to control points instead. However if we reset
  // line rotation, conversion will have to be applies only once.
  if (this.get('angle') === 0) return;
  var angle = this.get('angle') / 180 * Math.PI;
  var originX = this.get('left');
  var originY = this.get('top');
  var newA = rot(this.get('x1'), this.get('y1'), originX, originY, angle);
  var newB = rot(this.get('x2'), this.get('y2'), originX, originY, angle);
  this.set({
    x1: newA[0],
    y1: newA[1],
    x2: newB[0],
    y2: newB[1],
    angle: 0
  });

  function rot(px, py, ox, oy, theta) {
    var cos = Math.cos(theta);
    var sin = Math.sin(theta);
    return [
      cos * (px - ox) - sin * (py - oy) + ox,
      sin * (px - ox) + cos * (py - oy) + oy
    ];
  }
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
    originX: 'center',
    originY: 'center',
    // Custom properties:
    _dt_sourceObj: source,
    id: i
  });
  source.canvas.add(point);
  point.on("moving", controlPointMoved);
  point.on("removed", controlPointDeleted);
  return point;
}

module.exports = lineCustomControlPoints;

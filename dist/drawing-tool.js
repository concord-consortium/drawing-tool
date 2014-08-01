(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
require.register("scripts/drawing-tool", function(exports, require, module) {
var Util              = require('scripts/util');
var rescale2resize    = require('scripts/fabric-extensions/rescale-2-resize');
var multitouchSupport = require('scripts/fabric-extensions/multi-touch-support');
var UI                = require('scripts/ui');

var DEF_OPTIONS = {
  width: 700,
  height: 500
};

var DEF_STATE = {
  color: "rgba(100,200,200,.75)",
  strokeWidth: 10,
  fill: ""
};

// Constructor function.
function DrawingTool(selector, options, settings) {
  this.selector = selector;
  this.options = $.extend(true, {}, DEF_OPTIONS, options);

  this.state = $.extend(true, {}, DEF_STATE, settings);

  this.tools = {};

  this.ui = new UI(this, selector, this.options);
  this._initFabricJS();
  this.ui.initTools();

  // Apply a fix that changes native FabricJS rescaling behavior into resizing.
  rescale2resize(this.canvas);
  multitouchSupport(this.canvas);
}

DrawingTool.prototype.clear = function (clearBackground) {
  this.canvas.clear();
  if (clearBackground) {
    this.canvas.setBackgroundImage(null);
    this._backgroundImage = null;
  }
  this.canvas.renderAll();
};

DrawingTool.prototype.clearSelection = function () {
  // Important! It will cause that all custom control points will be removed (e.g. for lines).
  this.canvas.deactivateAllWithDispatch();
  this.canvas.renderAll();
};

DrawingTool.prototype.save = function () {
  // FIXME: It ensures that all custom control points are hidden before serialization.
  //        Of course it's totally wrong, temporal workaround.
  this.clearSelection();
  return JSON.stringify({
    dt: {
      // Drawing Tool specific options.
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight()
    },
    canvas: this.canvas.toJSON()
  });
};

DrawingTool.prototype.load = function (jsonString) {
  // Undefined, null or empty string just clears drawing tool.
  if (!jsonString) {
    this.clear(true);
    return;
  }

  var state = JSON.parse(jsonString);

  // Process Drawing Tool specific options.
  var dtState = state.dt;
  this.canvas.setDimensions({
    width: dtState.width,
    height: dtState.height
  });

  // Load FabricJS state.
  // Note that we remove background definition before we call #loadFromJSON
  // and then add the same background manually. Otherwise, the background
  // won't be loaded due to CORS error (FabricJS bug?).
  var canvasState = state.canvas;
  var backgroundImage = canvasState.backgroundImage;
  delete canvasState.backgroundImage;
  this.canvas.loadFromJSON(canvasState);
  if (backgroundImage !== undefined) {
    var imageSrc = backgroundImage.src;
    delete backgroundImage.src;
    this._setBackgroundImage(imageSrc, backgroundImage);
  }
  this.canvas.renderAll();
};

DrawingTool.prototype.setStrokeColor = function (color) {
  this.state.color = color;
};

DrawingTool.prototype.setStrokeWidth = function (width) {
  this.state.strokeWidth = width;
};

DrawingTool.prototype.setFill = function (color) {
  this.state.fill = color;
};

DrawingTool.prototype.setBackgroundImage = function (imageSrc, fit) {
  var self = this;
  this._setBackgroundImage(imageSrc, null, function () {
    switch (fit) {
      case "resizeBackgroundToCanvas": self.resizeBackgroundToCanvas(); return;
      case "resizeCanvasToBackground": self.resizeCanvasToBackground(); return;
    }
  });
};

DrawingTool.prototype.resizeBackgroundToCanvas = function () {
  if (!this._backgroundImage) {
    return;
  }
  this._backgroundImage.set({
    width: this.canvas.width,
    height: this.canvas.height
  });
  this.canvas.renderAll();
};

DrawingTool.prototype.resizeCanvasToBackground = function () {
  if (!this._backgroundImage) {
    return;
  }
  this.canvas.setDimensions({
    width: this._backgroundImage.width,
    height: this._backgroundImage.height
  });
  this._backgroundImage.set({
    top: this.canvas.height / 2,
    left: this.canvas.width / 2
  });
  this.canvas.renderAll();
};

/**
 * Calculates canvas element offset relative to the document.
 * Call this method when Drawing Tool container position is updated.
 * This method is attached as "resize" event handler of window (by FabricJS itself).
 */
DrawingTool.prototype.calcOffset = function () {
  this.canvas.calcOffset();
};

DrawingTool.prototype.chooseTool = function (toolSelector){
  $(this.selector).find('.'+toolSelector).click();
};

// Changing the current tool out of this current tool
// to the default tool aka 'select' tool
// TODO: make this better and less bad... add default as drawingTool property
DrawingTool.prototype.changeOutOfTool = function (oldToolSelector){
  this.chooseTool('select');
};

DrawingTool.prototype._setBackgroundImage = function (imageSrc, options, backgroundLoadedCallback) {
  options = options || {
    originX: 'center',
    originY: 'center',
    top: this.canvas.height / 2,
    left: this.canvas.width / 2,
    crossOrigin: 'anonymous'
  };

  loadImage();

  function loadImage(crossOrigin) {
    // Note we cannot use fabric.Image.fromURL, as then we would always get
    // fabric.Image instance and we couldn't guess whether load failed or not.
    // util.loadImage provides null to callback when loading fails.
    fabric.util.loadImage(imageSrc, callback, null, options.crossOrigin);
  }

  var self = this;
  function callback (img) {
    // If image is null and crossOrigin settings are available, it probably means that loading failed
    // due to lack of CORS headers. Try again without them.
    if ((options.crossOrigin === 'anonymous' || options.crossOrigin === '') && !img) {
      options = $.extend(true, {}, options);
      delete options.crossOrigin;
      console.log('Background could not be loaded due to lack of CORS headers. Trying to load it again without CORS support.');
      loadImage();
      return;
    }
    img = new fabric.Image(img, options);
    self.canvas.setBackgroundImage(img, self.canvas.renderAll.bind(self.canvas));
    self._backgroundImage = img;
    if (typeof backgroundLoadedCallback === 'function') {
      backgroundLoadedCallback();
    }
  }
};

DrawingTool.prototype._initFabricJS = function () {
  this.canvas = new fabric.Canvas(this.ui.$canvas[0]);
  // Target find would be more tolerant on touch devices.
  this.canvas.perPixelTargetFind = !fabric.isTouchSupported;

  this.canvas.setBackgroundColor("#fff");
};

module.exports = DrawingTool;

});

require.register("scripts/fabric-extensions/arrow", function(exports, require, module) {
(function(global) {

  'use strict';

  var fabric = global.fabric || (global.fabric = { }),
      extend = fabric.util.object.extend;

  if (fabric.Arrow) {
    fabric.warn('fabric.Arrow is already defined');
    return;
  }

  /**
   * Arrow class
   * @class fabric.Arrow
   * @extends fabric.Line
   * @see {@link fabric.Arrow#initialize} for constructor definition
   */
  fabric.Arrow = fabric.util.createClass(fabric.Line, /** @lends fabric.Arrow.prototype */ {

    /**
     * Type of an object
     * @type String
     * @default
     */
    type: 'arrow',

    /**
     * Type of the arrow (double or single)
     * @type Boolean
     * @default
     */
    doubleArrowhead: false,

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _render: function(ctx) {
      ctx.beginPath();

      var isInPathGroup = this.group && this.group.type === 'path-group';
      if (isInPathGroup && !this.transformMatrix) {
        //  Line coords are distances from left-top of canvas to origin of line.
        //
        //  To render line in a path-group, we need to translate them to
        //  distances from center of path-group to center of line.
        var cp = this.getCenterPoint();
        ctx.translate(
          -this.group.width/2 + cp.x,
          -this.group.height / 2 + cp.y
        );
      }

      if (!this.strokeDashArray) {
        // Move from center (of virtual box) to its left/top corner,
        // we can't assume x1, y1 is top left and x2, y2 is bottom right.
        var xMult = this.x1 <= this.x2 ? -1 : 1,
            yMult = this.y1 <= this.y2 ? -1 : 1;

        // Arrow start point.
        var xs = this.width === 1 ? 0 : (xMult * this.width / 2),
            ys = this.height === 1 ? 0 : (yMult * this.height / 2);
        // Arrow end point.
        var xe = this.width === 1 ? 0 : (xMult * -1 * this.width / 2),
            ye = this.height === 1 ? 0 : (yMult * -1 * this.height / 2);
        // Helper variables.
        var dx = xe - xs,
            dy = ye - ys,
            l  = Math.sqrt(dx * dx + dy * dy);
        // Arrow width.
        var s = this.strokeWidth * 0.5;
        // Arrowhead width.
        var ls = Math.min(s * 3, l * (this.doubleArrowhead ? 0.21 : 0.35));
        // Arrowhead length.
        var ahlx = ls * 2 * dx / l,
            ahly = ls * 2 * dy / l;
        // Arrowhead position 1 (points close to the line).
        var xm1 = xe - ahlx,
            ym1 = ye - ahly;
        // Arrowhead position 2 (the most outer points).
        var xm2 = xe - ahlx * 1.1,
            ym2 = ye - ahly * 1.1;

        // Outline of the arrow.
        var points;
        if (!this.doubleArrowhead) {
          points = [
            this._perpCoords(xs, ys, xe, ye, xs, ys, s * 0.5, 1),
            this._perpCoords(xs, ys, xe, ye, xs, ys, s * 0.5, -1),
          ];
        } else {
          // Second arrowhead.
          var xm3 = xs + ahlx,
              ym3 = ys + ahly;
          var xm4 = xs + ahlx * 1.1,
              ym4 = ys + ahly * 1.1;
          points = [
            this._perpCoords(xs, ys, xe, ye, xm3, ym3, s, 1),
            this._perpCoords(xs, ys, xe, ye, xm4, ym4, ls, 1),
            [xs, ys],
            this._perpCoords(xs, ys, xe, ye, xm4, ym4, ls, -1),
            this._perpCoords(xs, ys, xe, ye, xm3, ym3, s, -1),
          ];
        }
        // Common part of the outline.
        points.push(
          this._perpCoords(xs, ys, xe, ye, xm1, ym1, s, -1),
          this._perpCoords(xs, ys, xe, ye, xm2, ym2, ls, -1),
          [xe, ye],
          this._perpCoords(xs, ys, xe, ye, xm2, ym2, ls, 1),
          this._perpCoords(xs, ys, xe, ye, xm1, ym1, s, 1)
        );

        ctx.moveTo(points[0][0], points[0][1]);
        points.forEach(function (p) {
          ctx.lineTo(p[0], p[1]);
        });
      }

      if (this.stroke) {
        // Note that we actually use fill instead of stroke.
        // Stroke width is included in outline calulcations above.
        var origFillStyle = ctx.fillStyle;
        ctx.fillStyle = this.stroke;
        this._renderFill(ctx);
        ctx.fillStyle = origFillStyle;
      }
    },

    /**
     * @private
     * Given coordinates of segment AB and point X, returns coordinates
     * of point C where CX is prependicular to AB and |CX| = l.
     */
    _perpCoords: function (xa, ya, xb, yb, x, y, l, dir) {
      var dx = xb - xa,
          dy = yb - ya,
          k = l / Math.sqrt(dx * dx + dy * dy);
      return [x + k * -dy * dir, y + k * dx * dir];
    },

    /**
     * Returns object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} object representation of an instance
     */
    toObject: function(propertiesToInclude) {
      return extend(this.callSuper('toObject', propertiesToInclude), {
        doubleArrowhead: this.get('doubleArrowhead')
      });
    }

    // WARN:
    // Note that #toSVG now returns LINE representation (as it's not overwritten).
    // The same applies to #complexity (TODO: what is it used for?).
  });

  // WARN:
  // Note that deserialization from SVG element expects LINE element. See above.

  /* _FROM_SVG_START_ */
  /**
   * List of attribute names to account for when parsing SVG element (used by {@link fabric.Arrow.fromElement})
   * @static
   * @memberOf fabric.Arrow
   * @see http://www.w3.org/TR/SVG/shapes.html#LineElement
   */
  fabric.Arrow.ATTRIBUTE_NAMES = fabric.SHARED_ATTRIBUTES.concat('x1 y1 x2 y2'.split(' '));

  /**
   * Returns fabric.Arrow instance from an SVG element
   * @static
   * @memberOf fabric.Arrow
   * @param {SVGElement} element Element to parse
   * @param {Object} [options] Options object
   * @return {fabric.Arrow} instance of fabric.Arrow
   */
  fabric.Arrow.fromElement = function(element, options) {
    var parsedAttributes = fabric.parseAttributes(element, fabric.Line.ATTRIBUTE_NAMES),
        points = [
          parsedAttributes.x1 || 0,
          parsedAttributes.y1 || 0,
          parsedAttributes.x2 || 0,
          parsedAttributes.y2 || 0
        ];
    return new fabric.Arrow(points, extend(parsedAttributes, options));
  };
  /* _FROM_SVG_END_ */

  /**
   * Returns fabric.Arrow instance from an object representation
   * @static
   * @memberOf fabric.Arrow
   * @param {Object} object Object to create an instance from
   * @return {fabric.Arrow} instance of fabric.Arrow
   */
  fabric.Arrow.fromObject = function(object) {
    var points = [object.x1, object.y1, object.x2, object.y2];
    return new fabric.Arrow(points, object);
  };

})(this);

});

require.register("scripts/fabric-extensions/line-custom-control-points", function(exports, require, module) {
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

function updateLineControlPoints() {
  translateLineCoords.call(this);
  rotateLineCoords.call(this);
  this.ctp[0].set('left', this.get('x1'));
  this.ctp[0].set('top', this.get('y1'));
  this.ctp[1].set('left', this.get('x2'));
  this.ctp[1].set('top', this.get('y2'));
  this.ctp[0].setCoords();
  this.ctp[1].setCoords();
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
    line: source,
    id: i
  });
  source.canvas.add(point);
  point.on("moving", controlPointMoved);
  point.on("removed", controlPointDeleted);
  return point;
}

module.exports = lineCustomControlPoints;

});

require.register("scripts/fabric-extensions/multi-touch-support", function(exports, require, module) {
module.exports = function addMultiTouchSupport(canvas) {
  if (typeof Hammer === 'undefined' || !fabric.isTouchSupported) {
    return;
  }
  var mc = new Hammer.Manager(canvas.upperCanvasEl);
  mc.add(new Hammer.Pinch());

  var initialAngle;
  var initialScale;

  mc.on('pinchstart', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    setLocked(target, true);
    initialAngle = target.get('angle');
    initialScale = target.get('scaleX');
  });

  mc.on('pinchmove', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    target.set({
      scaleX: e.scale * initialScale,
      scaleY: e.scale * initialScale,
      angle: initialAngle + e.rotation
    });
    canvas.fire('object:scaling', {target: target, e: e.srcEvent});
    if (target.get('scaleX') !== e.scale * initialScale) {
      // rescale-2-resize mod used.
      initialScale = 1 / e.scale;
    }
  });

  mc.on('pinchend', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    setLocked(target, false);
  });

  function isLine(object) {
    return object.type === 'line' || object.type === 'arrow';
  }

  function getTarget() {
    return canvas.getActiveObject() || canvas.getActiveGroup();
  }

  function setLocked(target, v) {
    target.set({
      lockMovementX: v,
      lockMovementY: v,
      lockScalingX: v,
      lockScalingY: v
    });
  }
};

});

require.register("scripts/fabric-extensions/rescale-2-resize", function(exports, require, module) {
var LineTool = require('scripts/tools/line-tool');

function basicWidthHeightTransform(s) {
  s.width = s.width * s.scaleX + s.strokeWidth * (s.scaleX - 1);
  s.height = s.height * s.scaleY + s.strokeWidth * (s.scaleY - 1);
}

function uniformWidthHeightTransform(s) {
  basicWidthHeightTransform(s);
  if (s.scaleX !== 1) {
    s.height = s.width;
  } else {
    s.width = s.height;
  }
}

var resizers = {
  rect: function (s) {
    basicWidthHeightTransform(s);
  },
  ellipse: function (s) {
    basicWidthHeightTransform(s);
    s.rx = Math.abs(s.width / 2);
    s.ry = Math.abs(s.height / 2);
  },
  circle: function (s) {
    uniformWidthHeightTransform(s);
    s.radius = Math.abs(s.width / 2);
  },
  square: function (s) {
    uniformWidthHeightTransform(s);
  },
  line: function (s) {
    basicWidthHeightTransform(s);

    s.prevTop = s.top;
    s.prevLeft = s.left;

    if (s.x1 > s.x2) { s.x1 = s.left + s.width; s.x2 = s.left; }
    else { s.x2 = s.left + s.width; s.x1 = s.left; }

    if (s.y1 > s.y2) { s.y1 = s.top + s.height; s.y2 = s.top; }
    else { s.y2 = s.top + s.height; s.y1 = s.top; }
  },
  arrow: function (s) {
    this.line(s);
  },
  path: function (s) {
    // we have two options to adjust width/height:

    // 1) this makes inaccurate bounding box dimensions but
    //    eliminates "floating" or weird behavior at edges
    basicWidthHeightTransform(s);

    // 2) this approach "floats" and has strange bugs but
    //    generates accurate bounding boxes
    // s.width = s.width * s.scaleX;
    // s.height = s.height * s.scaleY;

    for (var i = 0; i < s.path.length; i++) {
      s.path[i][1] *= s.scaleX;
      s.path[i][2] *= s.scaleY;
      s.path[i][3] *= s.scaleX;
      s.path[i][4] *= s.scaleY;
    }
  }
};

// This function expects FabricJS canvas object as an argument.
// It replaces native FabricJS rescaling behavior with resizing.
module.exports = function rescale2resize(canvas) {
  canvas.on('object:scaling', function (opt) {
    var shape = opt.target;
    // Support custom Drawing Tool shape types (e.g. "square" which is
    // not supported in FabricJS).
    var type = shape.dtType || shape.type;
    if (resizers[type] !== undefined) {
      resizers[type](shape);
      shape.scaleX = 1;
      shape.scaleY = 1;
    }
  });

  fabric.Group.prototype.lockUniScaling = true;
  canvas.on('before:selection:cleared', function(opt) {
    var group = opt.target;
    // if the the selection wasn't on a scaled group, then
    // this function is not needed --> return
    if (group.type !== 'group' || group.scaleX === 1) { return; }

    var scale = group.scaleX;
    var items = group.getObjects();
    var tempStrokeWidth;
    for (var i = 0; i < items.length; i++) {
      if (resizers[items[i].type] !== undefined) {

        // little hack to get adapt the current code
        // (eliminates the end of lines 2 and 3)
        tempStrokeWidth = items[i].strokeWidth;
        items[i].strokeWidth = 0;

        // temporarily apply the group scale to the objects so
        // the resizers work as intended
        items[i].scaleX = scale;
        items[i].scaleY = scale;

        resizers[items[i].type](items[i]);

        items[i].strokeWidth = tempStrokeWidth * scale;

        // setting the scale factor so the scaling applied after
        // this function will have no effect
        items[i].scaleX = 1 / scale;
        items[i].scaleY = 1 / scale;
      }
    }
  });
};

});

require.register("scripts/inherit", function(exports, require, module) {
/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   ParentClass.call(this, a, b);
 * }
 *
 * inherit(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.super.foo.call(this, a);
 *   // other code
 * };
 *
 * @param {Function} Child Child class.
 * @param {Function} Parent Parent class.
 */
module.exports = function inherit(Child, Parent) {
  Child.prototype = Object.create(Parent.prototype);
  Child.prototype.constructor = Child;
  Child.super = Parent.prototype;
};

});

require.register("scripts/tool", function(exports, require, module) {
/*
 * Tool "Class"
 */
function Tool(name, selector, drawTool) {
  this.name = name || "Tool";
  this.selector = selector || "";
  this.master = drawTool;
  this.canvas = drawTool.canvas;
  this.active = false;
  this.singleUse = false;

  this.master.tools[selector] = this;

  // fabric.js listeners of the tool
  this._listeners = [];

  // internal mechanisms that monitor the state of the tool
  this._stateListeners = [];
}

Tool.prototype.setActive = function (active) {
  if (this.singleUse) {
    console.warn("This is a single use tool. It was not activated.");
    return;
  }
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    this.activate();
  } else {
    this.deactivate();
  }

  return active;
};

Tool.prototype.activate = function () {
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.on(trigger, action);
  }
  this._fireStateEvent();
  // TODO: add this to the UI class
  // this.$element.addClass('dt-active');
};

// This function will be called when user tries to activate a tool that
// is already active. It can enable some special behavior.
// Implement this function in a subclass when needed.
Tool.prototype.activateAgain = function () {};

// This function will be implemented by singleUse tools that do not need
// to be activated
Tool.prototype.use = function () {};

Tool.prototype.deactivate = function () {
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.off(trigger);
  }
  this._fireStateEvent();
};

// Add the tool's event listeners to a list that will be added
// to the canvas upon the tool's activation
Tool.prototype.addEventListener = function (eventTrigger, eventHandler) {
  this._listeners.push({
    trigger: eventTrigger,
    action: eventHandler
  });
};

// Remove tool's event listeners from those to be added to the canvas
// on tool activation
Tool.prototype.removeEventListener = function (trigger) {
  for (var i = 0; i < this._listeners.length; i++) {
    if (trigger == this._listeners[i].trigger){
      return this._listeners.splice(i,1);
    }
  }
};

// Adds a state listener to the tool
Tool.prototype.addStateListener = function (stateHandler) {
  this._stateListeners.push(stateHandler);
};

// Removes a state listener from the tool
Tool.prototype.removeStateListener = function (stateHandler) {
  for (var i = 0; i < this._stateListeners.length; i++) {
    if (this._stateListeners[i] === stateHandler) {
      return this._stateListeners.splice(i, 1);
    }
  }
  return false;
};

Tool.prototype._fireStateEvent = function (extra, self) {
  var e = {
    source: self || this,
    active: this.active
  };
  for (var item in extra) {
    e[item] = extra[item];
  }
  for (var i = 0; i < this._stateListeners.length; i++) {
    // console.log(this._stateListeners[i]);
    this._stateListeners[i].call(this.master.ui, e);
  }
};

module.exports = Tool;

});

require.register("scripts/tools/circle-tool", function(exports, require, module) {
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function CircleTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  // this.setLabel('C');
}

inherit(CircleTool, ShapeTool);

CircleTool.prototype.mouseDown = function (e) {
  CircleTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Circle({
    top: y,
    left: x,
    radius: 0.1,
    lockUniScaling: true,
    selectable: false,
    fill: this.master.state.fill,
    stroke: this.master.state.color,
    strokeWidth: this.master.state.strokeWidth
  });
  this.canvas.add(this.curr);
};

CircleTool.prototype.mouseMove = function (e) {
  CircleTool.super.mouseMove.call(this, e);
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
    height = - height;
  } else {
    this.curr.originY = "top";
  }

  // circle size follows the smaller dimension of mouse drag
  var radius = (width < height ? width : height) / 2;

  this.curr.set('radius', radius);

  this.curr.set('width', radius * 2);
  this.curr.set('height', radius * 2);

  this.canvas.renderAll();
};

CircleTool.prototype.mouseUp = function (e) {
  CircleTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

CircleTool.prototype._processNewShape = function (s) {
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
    s.set('radius', this.defSize / 2);
    s.set('width', this.defSize);
    s.set('height', this.defSize);
    s.set('top', s.get('top') - s.get('radius') - s.get('strokeWidth') / 2);
    s.set('left', s.get('left') - s.get('radius') - s.get('strokeWidth') / 2);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = CircleTool;

});

require.register("scripts/tools/delete-tool", function(exports, require, module) {
var inherit  = require('scripts/inherit');
var Tool     = require('scripts/tool');

function DeleteTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.singleUse = true;

  // delete the selected object(s)
  // see: https://www.pivotaltracker.com/story/show/74415780
  var self = this;
  $('.dt-canvas-container').keydown(function(e) {
    if (e.keyCode === 8) {
      e.preventDefault();
      self._delete();
    }
  });

  // this.canvas.on("object:selected", function () { self.show(); });
  // this.canvas.on("selection:cleared", function () { self.hide(); });
}

inherit(DeleteTool, Tool);

DeleteTool.prototype.use = function () {
  this._delete();
};

DeleteTool.prototype._delete = function () {
  var canvas = this.canvas;
  if (canvas.getActiveObject()) {
    canvas.remove(canvas.getActiveObject());
  } else if (canvas.getActiveGroup()) {
    canvas.getActiveGroup().forEachObject(function(o){ canvas.remove(o); });
    canvas.discardActiveGroup().renderAll();
  }
};

DeleteTool.prototype.show = function () { this.$element.show(); };
DeleteTool.prototype.hide = function () { this.$element.hide(); };

module.exports = DeleteTool;

});

require.register("scripts/tools/ellipse-tool", function(exports, require, module) {
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
    selectable: false,
    fill: this.master.state.fill,
    stroke: this.master.state.color,
    strokeWidth: this.master.state.strokeWidth
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
    s.set('top', s.get('top') - s.get('ry') - s.get('strokeWidth') / 2);
    s.set('left', s.get('left') - s.get('rx') - s.get('strokeWidth') / 2);
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = EllipseTool;

});

require.register("scripts/tools/free-draw", function(exports, require, module) {
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');

function FreeDrawTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(FreeDrawTool, ShapeTool);

FreeDrawTool.prototype.mouseDown = function (opt) {

  this.canvas.freeDrawingBrush.color = this.master.state.color;
  this.canvas.freeDrawingBrush.width = this.master.state.strokeWidth;
  
  FreeDrawTool.super.mouseDown.call(this, opt);
  if (!this.active) { return; }
  if (!this.canvas.isDrawingMode) {
    // If we are here, it means the handler is called for the first time.
    // Activate drawing mode and call manually FabricJS handler to handle
    // mouse down in drawing mode correctly.
    //
    // If you take look at FabricJS's methods like:
    // - _onMouseDownInDrawingMode
    // - _onMouseMoveInDrawingMode
    // - _onMouseUpInDrawingMode
    // it's visible that we could implement whole functionality using public
    // `freeDrawingBrush` object. That would be better solution if these methods
    // didn't handle clipping too. It would force us to literally copy the same
    // code. So unless almost everything is handled in brush class, IMHO it's
    // better to use this solution which is at least short and simple.
    this.canvas.isDrawingMode = true;
    this.canvas._onMouseDownInDrawingMode(opt.e);
  }
};

FreeDrawTool.prototype.mouseUp = function (opt) {
  var objects = this.canvas.getObjects();
  var lastObject = objects[objects.length - 1];
  this.curr = lastObject;
  FreeDrawTool.super.mouseUp.call(this, opt);
  if (!this._locked) {
    this.canvas.isDrawingMode = false;
  }
  this.actionComplete(lastObject);
  this.curr = undefined;
};

FreeDrawTool.prototype.deactivate = function () {
  FreeDrawTool.super.deactivate.call(this);
  this.canvas.isDrawingMode = false;
};

module.exports = FreeDrawTool;

});

require.register("scripts/tools/line-tool", function(exports, require, module) {
var inherit                 = require('scripts/inherit');
var ShapeTool               = require('scripts/tools/shape-tool');
var SelectTool              = require('scripts/tools/select-tool');
var Util                    = require('scripts/util');
var lineCustomControlPoints = require('scripts/fabric-extensions/line-custom-control-points');
require('scripts/fabric-extensions/arrow');

// Note that this tool supports fabric.Line and all its subclasses (defined
// as part of this code base, not FabricJS itself). Pass 'lineType' argument
// (e.g. "line" or "arrow").

function LineTool(name, selector, drawTool, lineType, lineOptions) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

  lineType = lineType || 'line';
  this._lineKlass = fabric.util.getKlass(lineType);
  this._lineOptions = lineOptions;

  lineCustomControlPoints(this.canvas);
}

inherit(LineTool, ShapeTool);

LineTool.prototype.mouseDown = function (e) {
  LineTool.super.mouseDown.call(this, e);

  if (!this.active) return;

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new this._lineKlass([x, y, x, y], $.extend(true, {
    originX: 'center', // important due to custom line control points!
    originY: 'center',
    selectable: false,
    stroke: this.master.state.color,
    strokeWidth: this.master.state.strokeWidth
  }, this._lineOptions));
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

module.exports = LineTool;

});

require.register("scripts/tools/rect-tool", function(exports, require, module) {
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function RectangleTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(RectangleTool, ShapeTool);

RectangleTool.prototype.mouseDown = function (e) {
  RectangleTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);

  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Rect({
    top: y,
    left: x,
    width: 0,
    height: 0,
    selectable: false,
    fill: this.master.state.fill,
    stroke: this.master.state.color,
    strokeWidth: this.master.state.strokeWidth
  });
  this.canvas.add(this.curr);
};

RectangleTool.prototype.mouseMove = function (e) {
  RectangleTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);

  var x = loc.x;
  var y = loc.y;
  var x1 = this.curr.left;
  var y1 = this.curr.top;

  this.curr.set({
    width: x - x1,
    height: y - y1
  });

  this.canvas.renderAll(false);
};

RectangleTool.prototype.mouseUp = function (e) {
  RectangleTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

RectangleTool.prototype._processNewShape = function (s) {
  if (s.width < 0) {
    s.left = s.left + s.width;
    s.width = -s.width;
  }
  if (s.height < 0) {
    s.top = s.top + s.height;
    s.height = -s.height;
  }
  this.setCentralOrigin(s);
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('width', this.defSize);
    s.set('height', this.defSize);
    s.set('top', s.get('top') - (s.get('height') / 2) + s.get('strokeWidth'));
    s.set('left', s.get('left') - (s.get('width') / 2) + s.get('strokeWidth'));
  }
  s.setCoords();
};

module.exports = RectangleTool;

});

require.register("scripts/tools/select-tool", function(exports, require, module) {
var inherit                 = require('scripts/inherit');
var Tool                    = require('scripts/tool');
var lineCustomControlPoints = require('scripts/fabric-extensions/line-custom-control-points');

var BASIC_SELECTION_PROPERTIES = {
  cornerSize: fabric.isTouchSupported ? 22 : 12,
  transparentCorners: false
};

function SelectionTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.canvas.on("object:selected", function (opt) {
    opt.target.set(BASIC_SELECTION_PROPERTIES);
  });

  // Set visual options of custom line control points.
  lineCustomControlPoints.controlPointColor = '#bcd2ff';
  lineCustomControlPoints.cornerSize = BASIC_SELECTION_PROPERTIES.cornerSize;
}

inherit(SelectionTool, Tool);

SelectionTool.BASIC_SELECTION_PROPERTIES = BASIC_SELECTION_PROPERTIES;

SelectionTool.prototype.activate = function () {
  SelectionTool.super.activate.call(this);
  this.setSelectable(true);
};

SelectionTool.prototype.deactivate = function () {
  SelectionTool.super.deactivate.call(this);
  this.setSelectable(false);
  this.canvas.deactivateAllWithDispatch();
};

SelectionTool.prototype.setSelectable = function (selectable) {
  this.canvas.selection = selectable;
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
};

module.exports = SelectionTool;

});

require.register("scripts/tools/shape-tool", function(exports, require, module) {
var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');
var Util    = require('scripts/util');

function ShapeTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.down = false; // mouse down
  this._firstAction = false; // special behavior on first action
  this._locked = false; // locked into first action mode
}

inherit(ShapeTool, Tool);

ShapeTool.prototype.minSize = 7;
ShapeTool.prototype.defSize = 30;

ShapeTool.prototype.activate = function () {
  // console.warn(this.name + " at shape tool activation");
  ShapeTool.super.activate.call(this);
  this.down = false;
  this._setFirstActionMode();

  // Changes cursor to crosshair when drawing a shape
  // see https://www.pivotaltracker.com/n/projects/1103712/stories/73647372
  this.canvas.defaultCursor = "crosshair";
};

ShapeTool.prototype.activateAgain = function () {
  this._setFirstActionMode();
  this._locked = true;
  this._fireStateEvent({ state: this.active, locked: true });
};

ShapeTool.prototype.deactivate = function () {
  ShapeTool.super.deactivate.call(this);
  this.unlock();
};

ShapeTool.prototype.unlock = function () {
  this._locked = false;
  this._fireStateEvent({ state: this.active, locked: false });
};

ShapeTool.prototype.exit = function () {
  if (this._locked) {
    return;
  }
  this.down = false;
  this.master.changeOutOfTool(this.selector);
  // Changes cursor back to default
  // see https://www.pivotaltracker.com/n/projects/1103712/stories/73647372
  this.canvas.defaultCursor = "default";
};

// check if this is the first mouse down action
// if not and the mouse down is on an existing object,
// set that object as active and change into selection mode
ShapeTool.prototype.mouseDown = function (e) {
  this.down = true;
  if (this._firstAction === false && e.target !== undefined) {
    // Note that in #mouseUp handler we already set all objects to be
    // selectable. Interaction with an object will be handled by Fabric.
    // We have to exit to avoid drawing a new shape.
    this.exit();
  }
};

ShapeTool.prototype.mouseMove = function (e) {
};

ShapeTool.prototype.mouseUp = function (e) {
  this.down = false;
};

ShapeTool.prototype.actionComplete = function (newObject) {
  if (this._locked) {
    return;
  }
  if (this._firstAction) {
    this._firstAction = false;
    // After first action we do want all objects to be selectable,
    // so user can immediately move object that he just created.
    this._setAllObjectsSelectable(true);
  }
  if (newObject) {
    newObject.selectable = true;
  }
};

ShapeTool.prototype.setCentralOrigin = function (object) {
  object.set({
    left: object.left + (object.width + object.strokeWidth) / 2,
    top: object.top + (object.height + object.strokeWidth) / 2,
    originX: 'center',
    originY: 'center'
  });
};

// This is a special mode which ensures that first action of the shape tool
// always draws an object, even if user starts drawing over existing object.
// Later that will cause interaction with the existing object unless user reselects
// the tool. Please see: https://www.pivotaltracker.com/story/show/73959546
ShapeTool.prototype._setFirstActionMode = function () {
  this._firstAction = true;
  this._setAllObjectsSelectable(false);
};

ShapeTool.prototype._setAllObjectsSelectable = function (selectable) {
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
};

module.exports = ShapeTool;

});

require.register("scripts/tools/square-tool", function(exports, require, module) {
var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');
var Util      = require('scripts/util');

function SquareTool(name, selector, drawTool) {
  ShapeTool.call(this, name, selector, drawTool);

  var self = this;
  this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
  this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
  this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });
}

inherit(SquareTool, ShapeTool);

SquareTool.prototype.mouseDown = function (e) {
  SquareTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = this.canvas.getPointer(e.e);
  var x = loc.x;
  var y = loc.y;

  this.curr = new fabric.Rect({
    top: y,
    left: x,
    width: 0,
    height: 0,
    selectable: false,
    lockUniScaling: true, // it's a square!
    fill: this.master.state.fill,
    stroke: this.master.state.color,
    strokeWidth: this.master.state.strokeWidth
  });
  this.canvas.add(this.curr);
};

SquareTool.prototype.mouseMove = function (e) {
  SquareTool.super.mouseMove.call(this, e);
  if (this.down === false) { return; }

  var loc = this.canvas.getPointer(e.e);
  var width = loc.x - this.curr.left;
  var height = loc.y - this.curr.top;

  var sideLen = Math.abs(width) > Math.abs(height) ? Math.abs(width) : Math.abs(height);
  this.curr.width = sideLen;
  if (width < 0) { this.curr.width *= -1; }
  this.curr.height = sideLen;
  if (height < 0) { this.curr.height *= -1; }

  this.canvas.renderAll(false);
};

SquareTool.prototype.mouseUp = function (e) {
  SquareTool.super.mouseUp.call(this, e);
  this._processNewShape(this.curr);
  this.canvas.renderAll();
  this.actionComplete(this.curr);
  this.curr = undefined;
};

SquareTool.prototype._processNewShape = function (s) {
  if (s.width < 0) {
    s.left = s.left + s.width;
    s.width = - s.width;
  }
  if (s.height < 0) {
    s.top = s.top + s.height;
    s.height = - s.height;
  }
  if (Math.max(s.width, s.height) < this.minSize) {
    s.set('width', this.defSize);
    s.set('height', this.defSize);
    s.set('top', s.get('top') - s.get('height') + s.get('strokeWidth'));
    s.set('left', s.get('left') - s.get('width') + s.get('strokeWidth'));
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = SquareTool;

});

require.register("scripts/ui", function(exports, require, module) {
var Tool              = require('scripts/tool');
var SelectionTool     = require('scripts/tools/select-tool');
var LineTool          = require('scripts/tools/line-tool');
var RectangleTool     = require('scripts/tools/rect-tool');
var EllipseTool       = require('scripts/tools/ellipse-tool');
var SquareTool        = require('scripts/tools/square-tool');
var CircleTool        = require('scripts/tools/circle-tool');
var FreeDrawTool      = require('scripts/tools/free-draw');
var DeleteTool        = require('scripts/tools/delete-tool');

function UI (master, selector, options) {
  this.master = master;
  this.options = options;

  this._initUI(selector);
}

// initialize tools, config palettes, set labels, and setup trash behavior
UI.prototype.initTools = function(p) {

  // Initialize all the tools, they add themselves to the master.tools list
  var selectionTool = new SelectionTool("Selection Tool", "select", this.master);
  var lineTool = new LineTool("Line Tool", "line", this.master);
  var arrowTool = new LineTool("Arrow Tool", "arrow", this.master, "arrow");
  var doubleArrowTool = new LineTool("Double Arrow Tool", "doubleArrow", this.master, "arrow", {doubleArrowhead: true});
  var rectangleTool = new RectangleTool("Rectangle Tool", "rect", this.master);
  var ellipseTool = new EllipseTool("Ellipse Tool", "ellipse", this.master);
  var squareTool = new SquareTool("Square Tool", "square", this.master);
  var circleTool = new CircleTool("Circle Tool", "circle", this.master);
  var freeDrawTool = new FreeDrawTool("Free Draw Tool", "free", this.master);
  var deleteTool = new DeleteTool("Delete Tool", "trash", this.master);

  // tool palettes
  // TODO: document this portion
  var palettes = p || {
    shapes: ['-select', 'rect', 'ellipse', 'square', 'circle'],
    lines: ['-select', 'line', 'arrow', 'doubleArrow'],
    main: ['select', '-lines', '-shapes', 'free', 'trash']
  };
  this._initToolUI(palettes); // initialize the palettes and buttons
  this._initButtonUpdates(); // set up the listeners

  // set the labels
  this.setLabel(selectionTool.selector,   "s");
  this.setLabel(lineTool.selector,        "L");
  this.setLabel(arrowTool.selector,       "A");
  this.setLabel(doubleArrowTool.selector, "D");
  this.setLabel(rectangleTool.selector,   "R");
  this.setLabel(ellipseTool.selector,     "E");
  this.setLabel(squareTool.selector,      "S");
  this.setLabel(circleTool.selector,      "C");
  this.setLabel(freeDrawTool.selector,    "F");
  this.setLabel(deleteTool.selector,      "d");
  this.setLabel("-shapes", "Sh"); // immediately replaced by the currently active shape tool (rect)
  this.setLabel("-lines",  "Li"); // immediately replaced by the currently active line tool (line)
  this.setLabel("-select", "s");

  // show/hide trash button when objects are selected/deselected
  var trash = this.$buttons.trash;
  trash.hide();
  this.master.canvas.on("object:selected", function () { trash.show(); });
  this.master.canvas.on("selection:cleared", function () { trash.hide(); });

  // start on the select tool and show the main menu
  // this.palettes.main.$palette.show();
  this.master.chooseTool('select');
};

// Note: this function is bypassed in the _paletteButtonClicked function
UI.prototype.setLabel = function (toolId, label) {
  if (toolId.charAt(0) === '-') {
    var id = toolId.substring(1);
    this.$tools.find('.dt-target-'+id).find('span').text(label);
  } else {
    this.$tools.find("."+toolId).find('span').text(label);
  }
};

UI.prototype._initButtonUpdates = function () {
  // handler that updates UI when the internal tool state changes
  for (var toolId in this.master.tools) {
    this.master.tools[toolId].addStateListener(this.updateUI);
  }

  // handler that updates internal state when the UI changes
  var self = this;
  this.$tools.find('.dt-btn').on('click touchstart', function (e) {
    self._uiClicked(this);
    e.preventDefault();
  });
};

UI.prototype._uiClicked = function (target) {
  if ($(target).data('dt-btn-type') === 'palette') {
    this._paletteButtonClicked($(target).data('dt-target-id'));
  } else {
    this._toolButtonClicked($(target).data('dt-target-id'));
  }
};

// switches active palette
UI.prototype._paletteButtonClicked = function (selector) {
  for (var p in this.palettes) {
    if (p === selector) {
      this.palettes[p].show();
      if (this.master.currentTool.selector !== this.palettes[p].currentTool) {
        this.master.chooseTool(this.palettes[p].currentTool);
      }
    } else { this.palettes[p].hide(); }
  }
  var links = this.palettes[selector].$palette.find('.dt-link');
  for (var i = 0; i < links.length; i++) {
    if ($(links[i]).data('dt-btn-type') === 'palette') {
      var paletteName = $(links[i]).data('dt-target-id');
      var currToolId = this.palettes[paletteName].currentTool;
      $(links[i]).find('span').text(this.$tools.find('.'+currToolId).find('span').text());
    }
  }
};

UI.prototype._toolButtonClicked = function (toolSelector) {
  var newTool = this.master.tools[toolSelector];
  var $newPalette = this.$buttons[newTool.selector].parent();

  if (this.master.currentTool !== undefined &&
    this.master.currentTool.selector === toolSelector) {
    // Some tools may implement .activateAgain() method and
    // enable some special behavior.
    this.master.currentTool.activateAgain();
    return;
  }

  // search for tool
  if (newTool === undefined){
    console.warn("Warning! Could not find tool with selector \"" + toolSelector +
      "\"\nExiting tool chooser.");
    return;
  } else if (newTool.singleUse === true) {
    // special single use tools should not be set as the current tool
    newTool.use();
    return;
  }

  // activate and deactivate the new and old tools

  if (this.master.currentTool !== undefined) {
    this.master.currentTool.setActive(false);
  }

  this.master.currentTool = newTool;
  newTool.setActive(true);

  this.palettes[$newPalette.data('dt-palette-id')].currentTool = newTool.selector;

  // if the palette that the tool belongs to is not visible
  // then make it visible
  if (!$newPalette.is(':visible')) {
    // TODO: Remove usage of the palette ID
    this._paletteButtonClicked($newPalette.data('dt-palette-id'));
  }

  this.master.canvas.renderAll();
};

// Updates the UI when the internal state changes
// object e = {source, active: true/false, locked: true/false}
UI.prototype.updateUI = function (e) {
  var $element = this.$buttons[e.source.selector];
  if (e.active) { $element.addClass('dt-active'); }
  else { $element.removeClass('dt-active'); }

  if (e.locked) { $element.addClass('dt-locked'); }
  else { $element.removeClass('dt-locked'); }
};

// initializes the UI (divs and canvas size)
UI.prototype._initUI = function (selector) {
  $(selector).empty();
  this.$element = $('<div class="dt-container">').appendTo(selector);
  this.$tools = $('<div class="dt-tools">')
    .appendTo(this.$element);
  var $canvasContainer = $('<div class="dt-canvas-container">')
    .attr('tabindex', 0) // makes the canvas focusable for keyboard events
    .appendTo(this.$element);
  this.$canvas = $('<canvas>')
    .attr('width', this.options.width + 'px')
    .attr('height', this.options.height + 'px')
    .appendTo($canvasContainer);
};

// initializes all the tools
UI.prototype._initToolUI = function (palettes) {
  this.$buttons = {};
  this.palettes = {};

  for (var palette in palettes) {
    var buttons = []; // array to be sent to the `BtnGroup` constructor
    var btnNames = palettes[palette];

    for (var i = 0; i < btnNames.length; i++) {
      var $btn;

      if (btnNames[i].charAt(0) === '-') {

        if (btnNames[i].substring(1) in palettes) {
          $btn = this._initBtn(btnNames[i], 'palette');
        } else {
          $btn = this._initBtn(btnNames[i], 'toolLink');
        }

      } else { $btn = this._initBtn(btnNames[i]); }

      buttons[i] = $btn;
      this.$buttons[btnNames[i]] = $btn;
    }
    this.palettes[palette] = new BtnGroup(palette, buttons);
    this.palettes[palette].$palette.appendTo(this.$tools);
  }

};

// initializes each button
UI.prototype._initBtn = function (toolId, type) {
  var $element = $('<div class="dt-btn">');
  if (!type) { // normal button
    $element.addClass(toolId)
      .data('dt-btn-type', 'tool')
      .data('dt-target-id', toolId);
  } else if (type === 'palette') { // button that links to a subpalette
    $element.data('dt-btn-type', 'palette')
      .data('dt-target-id', toolId.substring(1))
      .addClass('dt-target-'+toolId.substring(1))
      .addClass('dt-link');
  } else if (type === 'toolLink') { // link to tool (ex: selector)
    $element.data('dt-btn-type', 'toolLink')
      .data('dt-target-id', toolId.substring(1))
      .addClass('dt-target-'+toolId.substring(1))
      .addClass('dt-link');
  }
  $('<span>') // for the label
    .appendTo($element);
  return $element;
};

// Object contains the jQuery div with the subpalette
// in addition to other information (name and currently used tool)
function BtnGroup (groupName, buttons) {
  this.name = groupName;
  this.$buttons = buttons;
  this.$palette = $('<div class="dt-toolpalette dt-palette-' + this.name + '">')
    .data('dt-palette-id', this.name)
    .hide();

  // append the tools to the palette div
  for (var i = 0; i < this.$buttons.length; i++) {
    // TODO: the "if" is temporary
    if (this.$buttons[i] === undefined) {}
    else {this.$buttons[i].appendTo(this.$palette);}
  }

  // set the default current tool of each palette to the first
  // not 'link' tool
  var j = 0;
  for (; j < this.$buttons.length &&
    this.$buttons[j].data('dt-btn-type') !== 'tool'; j++) {}
  this.currentTool = buttons[j].data('dt-target-id');
}

BtnGroup.prototype.show = function() {
  this.$palette.show(400);
};

BtnGroup.prototype.hide = function() {
  this.$palette.hide(400);
};

module.exports = UI;

});

require.register("scripts/util", function(exports, require, module) {
module.exports = {
  dist: function dist(dx, dy){
    var dx2 = Math.pow(dx, 2);
    var dy2 = Math.pow(dy, 2);
    return Math.sqrt(dx2 + dy2);
  }
};

});

// See: https://github.com/brunch/brunch/issues/712

// Export DrawingTool constructor to 'window' object. There is an assumption
// that DrawingTool is always included using a script tag on a regular web page.
// However we can implement CommonJS and AMD support here too (e.g. using similar
// code snippet that is used by Browserify when 'standalone' option is enabled).
window.DrawingTool = require('scripts/drawing-tool');


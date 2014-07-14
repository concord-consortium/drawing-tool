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
var Tool              = require('scripts/tool');
var ShapeTool         = require('scripts/tools/shape-tool');
var SelectionTool     = require('scripts/tools/select-tool');
var LineTool          = require('scripts/tools/line-tool');
var RectangleTool     = require('scripts/tools/rect-tool');
var EllipseTool       = require('scripts/tools/ellipse-tool');
var SquareTool        = require('scripts/tools/square-tool');
var CircleTool        = require('scripts/tools/circle-tool');
var FreeDrawTool      = require('scripts/tools/free-draw');
var DeleteTool        = require('scripts/tools/delete-tool');
var Util              = require('scripts/util');
var rescale2resize    = require('scripts/rescale-2-resize');
var multitouchSupport = require('scripts/multi-touch-support');
var UI                = require('scripts/ui');

var CANVAS_ID = 'dt-drawing-area';
var DEF_OPTIONS = {
  width: 700,
  height: 500
};

// Constructor function.
function DrawingTool(selector, options) {
  this.options = $.extend(true, {}, DEF_OPTIONS, options);

  this.ui = new UI(this, selector, CANVAS_ID, this.options);
  this._initFabricJS();

  // Tools
  this.tools = {};
  var selectionTool = new SelectionTool("Selection Tool", "select", this);
  var lineTool = new LineTool("Line Tool", "line", this);
  var rectangleTool = new RectangleTool("Rectangle Tool", "rect", this);
  var ellipseTool = new EllipseTool("Ellipse Tool", "ellipse", this);
  var squareTool = new SquareTool("Square Tool", "square", this);
  var circleTool = new CircleTool("Circle Tool", "circle", this);
  var freeDrawTool = new FreeDrawTool("Free Draw Tool", "free", this);
  var deleteTool = new DeleteTool("Delete Tool", "trash", this);

  this.ui.initTools();


  // Apply a fix that changes native FabricJS rescaling behavior into resizing.
  rescale2resize(this.canvas);
  multitouchSupport(this.canvas);

  this.chooseTool("select");
}

DrawingTool.prototype.clear = function (clearBackground) {
  this.canvas.clear();
  if (clearBackground) {
    this.canvas.setBackgroundImage(null);
    this._backgroundImage = null;
  }
  this.canvas.renderAll();
};

DrawingTool.prototype.save = function () {
  return JSON.stringify(this.canvas.toJSON());
};

DrawingTool.prototype.load = function (jsonString) {
  // Note that we remove background definition before we call #loadFromJSON
  // and then add the same background manually. Otherwise, the background
  // won't be loaded due to CORS error (FabricJS bug?).
  var state = JSON.parse(jsonString);
  var backgroundImage = state.backgroundImage;
  delete state.backgroundImage;
  this.canvas.loadFromJSON(state);
  if (backgroundImage !== undefined) {
    var imageSrc = backgroundImage.src;
    delete backgroundImage.src;
    this._setBackgroundImage(imageSrc, backgroundImage);
  }
  this.canvas.renderAll();
};

DrawingTool.prototype.setStrokeColor = function (color) {
  fabric.Object.prototype.stroke = color;
  this.canvas.freeDrawingBrush.color = color;
  fabric.Image.prototype.stroke = null;
};

DrawingTool.prototype.setStrokeWidth = function (width) {
  fabric.Object.prototype.strokeWidth = width;
  this.canvas.freeDrawingBrush.width = width;
};

DrawingTool.prototype.setFill = function (color) {
  fabric.Object.prototype.fill = color;
};

DrawingTool.prototype.setBackgroundImage = function (imageSrc) {
  this._setBackgroundImage(imageSrc);
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

DrawingTool.prototype.chooseTool = function (toolSelector){
  console.log(toolSelector);
  $("#" + toolSelector).click();
};

// Changing the current tool out of this current tool
// to the default tool aka 'select' tool
// TODO: make this better and less bad... add default as drawingTool property
DrawingTool.prototype.changeOutOfTool = function (oldToolSelector){
  this.chooseTool('select');
};

DrawingTool.prototype._setBackgroundImage = function (imageSrc, options) {
  options = options || {
    originX: 'center',
    originY: 'center',
    top: this.canvas.height / 2,
    left: this.canvas.width / 2
  };
  var self = this;
  fabric.Image.fromURL(imageSrc, function (img) {
    img.set(options);
    self.canvas.setBackgroundImage(img, self.canvas.renderAll.bind(self.canvas));
    self._backgroundImage = img;
  });
};



DrawingTool.prototype._initFabricJS = function () {
  this.canvas = new fabric.Canvas(CANVAS_ID);
  // Target find would be more tolerant on touch devices.
  this.canvas.perPixelTargetFind = !fabric.isTouchSupported;

  this.setStrokeWidth(10);
  this.setStrokeColor("rgba(100,200,200,.75)");
  this.setFill("");
};

DrawingTool.prototype._toolButtonClicked = function (toolSelector) {
  if (this.currentTool !== undefined && this.currentTool.selector === toolSelector) {
    // Some tools may implement .activateAgain() method and enable some special behavior.
    this.currentTool.activateAgain();
    return;
  }

  var newTool = this.tools[toolSelector];
  if (newTool === undefined){
    console.warn("Warning! Could not find tool with selector \"" + toolSelector +
      "\"\nExiting tool chooser.");
    return;
  } else if (newTool.singleUse === true) {
    newTool.use();
    return;
  }

  if (this.currentTool !== undefined) {
    this.currentTool.setActive(false);
  }
  this.currentTool = newTool;
  newTool.setActive(true);
  this.canvas.renderAll();
};

module.exports = DrawingTool;

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

require.register("scripts/multi-touch-support", function(exports, require, module) {
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
    if (!target || target.type === 'line') {
      return;
    }
    setLocked(target, true);
    initialAngle = target.get('angle');
    initialScale = target.get('scaleX');
  });

  mc.on('pinchmove', function (e) {
    var target = getTarget();
    if (!target || target.type === 'line') {
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
    if (!target || target.type === 'line') {
      return;
    }
    setLocked(target, false);
  });

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

require.register("scripts/rescale-2-resize", function(exports, require, module) {
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
  this._fireStateEvent()
  // this.$element.removeClass('dt-active');
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
}

// Removes a state listener from the tool
Tool.prototype.removeStateListener = function (stateHandler) {
  for (var i = 0; i < this._stateListeners.length; i++) {
    if (this._stateListeners[i] === stateHandler) {
      return this._stateListeners.splice(i, 1);
    }
  }
  return false;
}

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
    this._stateListeners[i].call(this.master.ui, e)
  }
}

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
    selectable: false
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
    selectable: false
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

  // this.setLabel('F');
}

inherit(FreeDrawTool, ShapeTool);

FreeDrawTool.prototype.mouseDown = function (opt) {
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

  // this.setLabel('L');

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
    hasBorders: false
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
    id: i
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

   // this.setLabel('R');
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
    selectable: false
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
  }
  s.setCoords();
};

module.exports = RectangleTool;

});

require.register("scripts/tools/select-tool", function(exports, require, module) {
var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

var BASIC_SELECTION_PROPERTIES = {
  cornerSize: fabric.isTouchSupported ? 22 : 12,
  transparentCorners: false
};

function SelectionTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.canvas.on("object:selected", function (opt) {
    opt.target.set(BASIC_SELECTION_PROPERTIES);
  });

  // this.setLabel('S');
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

  // this.setLabel('Sq');
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
  }
  this.setCentralOrigin(s);
  s.setCoords();
};

module.exports = SquareTool;

});

require.register("scripts/ui", function(exports, require, module) {
function UI (master, selector, CANVAS_ID, options) {
  this.master = master;
  this.CANVAS_ID = CANVAS_ID;
  this.options = options;

  this._initUI(selector);
}

UI.prototype.initTools = function() {
  this.tools = this.master.tools;
  this._initToolUI();
  this._initButtonUpdates();

  var test = new BtnGroup("d");

  var trash = this.buttons.trash;
  trash.hide();
  this.master.canvas.on("object:selected", function () { trash.show(); });
  this.master.canvas.on("selection:cleared", function () { trash.hide(); });
}

UI.prototype._initButtonUpdates = function () {
  // update UI when the internal tool state changes
  for (var toolId in this.tools) {
    this.tools[toolId].addStateListener(this.updateUI);
  }

  // update internal state when the UI changes
  var master = this.master;
  $('.dt-btn').on('click touchstart', function (e) {
    var id = $(this).attr('id');
    master._toolButtonClicked(id);
    e.preventDefault();
  });
}

UI.prototype.updateUI = function (e) {
  var $element = this.buttons[e.source.selector];
  if (e.active) { $element.addClass('dt-active') }
  else { $element.removeClass('dt-active'); }

  if (e.locked) { $element.addClass('dt-locked'); }
  else { $element.removeClass('dt-locked'); }
}

UI.prototype._initUI = function (selector) {
  $(selector).empty();
  this.$element = $('<div class="dt-container">').appendTo(selector);
  this.$tools = $('<div class="dt-tools" data-toggle="buttons">')
    .appendTo(this.$element);
  var $canvasContainer = $('<div class="dt-canvas-container">')
    .attr('tabindex', 0) // makes the canvas focusable for keyboard events
    .appendTo(this.$element);
  $('<canvas>')
    .attr('id', this.CANVAS_ID)
    .attr('width', this.options.width + 'px')
    .attr('height', this.options.height + 'px')
    .appendTo($canvasContainer);
};

UI.prototype._initToolUI = function () {
  this.buttons = {};
  for (var tool in this.tools) {
    this.buttons[tool] = this._initBtn(tool);
  }
}

UI.prototype._initBtn = function (toolId) {
  var $element = $('<div class="dt-btn">')
    .attr('id', toolId)
    .appendTo(this.$tools);
  $('<span>')
    .appendTo($element);
  return $element;
}

function BtnGroup () {
  if (arguments.length <= 0) { return; }
  this._buttons = arguments;
  console.log(this.__buttons);
}

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


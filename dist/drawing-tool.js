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
var Tool           = require('scripts/tool');
var ShapeTool      = require('scripts/tools/shape-tool');
var SelectionTool  = require('scripts/tools/select-tool');
var LineTool       = require('scripts/tools/line-tool');
var RectangleTool  = require('scripts/tools/rect-tool');
var EllipseTool    = require('scripts/tools/ellipse-tool');
var SquareTool     = require('scripts/tools/square-tool');
var CircleTool     = require('scripts/tools/circle-tool');
var FreeDrawTool   = require('scripts/tools/free-draw');
var DeleteTool     = require('scripts/tools/delete-tool');
var Util           = require('scripts/util');
var rescale2resize = require('scripts/rescale-2-resize');

var CANVAS_ID = 'dt-drawing-area';
var DEF_OPTIONS = {
  width: 700,
  height: 500
};

// Constructor function.
function DrawingTool(selector, options) {
  this.options = $.extend(true, {}, DEF_OPTIONS, options);

  this._initUI(selector);
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
  selectionTool.deleteTool = deleteTool;

  var self = this;
  $('.btn').button();
  $('.btn').click(function () {
    var id = $(this).attr('id');
    self._toolButtonClicked(id);
  });

  // Apply a fix that changes native FabricJS rescaling bahvior into resizing.
  rescale2resize(this.canvas);

  this.chooseTool("select");
}

DrawingTool.prototype.chooseTool = function (toolSelector){
  $("#" + toolSelector).click();
};

// Changing the current tool out of this current tool
// to the default tool aka 'select' tool
// TODO: make this better and less bad... add default as drawingTool property
DrawingTool.prototype.changeOutOfTool = function (oldToolSelector){
  this.chooseTool('select');
};


// debugging method to print out all the items on the canvas
DrawingTool.prototype.check = function() {
  var shapes = this.canvas.getObjects();
  for (var i = 0; i < shapes.length; i++) {
    console.log(shapes[i]);
  }
};

DrawingTool.prototype.setStrokeColor = function (color) {
  fabric.Object.prototype.stroke = color;
  this.canvas.freeDrawingBrush.color = color;
};

DrawingTool.prototype.setStrokeWidth = function (width) {
  fabric.Object.prototype.strokeWidth = width;
  this.canvas.freeDrawingBrush.width = width;
};

DrawingTool.prototype.setFill = function (color) {
  fabric.Object.prototype.fill = color;
};


DrawingTool.prototype._initUI = function (selector) {
  $(selector).empty();
  this.$element = $('<div class="dt-container">').appendTo(selector);
  this.$tools = $('<div class="dt-tools btn-group-vertical" data-toggle="buttons">')
    .appendTo(this.$element);
  var $canvasContainer = $('<div class="dt-canvas-container">')
    .attr('tabindex', 0) // makes the canvas focusable for keyboard events
    .appendTo(this.$element);
  $('<canvas>')
    .attr('id', CANVAS_ID)
    .attr('width', this.options.width + 'px')
    .attr('height', this.options.height + 'px')
    .appendTo($canvasContainer);
};

DrawingTool.prototype._initFabricJS = function () {
  this.canvas = new fabric.Canvas(CANVAS_ID);
  this.canvas.perPixelTargetFind = true;

  this.setStrokeWidth(10);
  this.setStrokeColor("rgba(100,200,200,.75)");
  this.setFill("");

  fabric.Object.prototype.transparentCorners = false;

  fabric.Object.prototype.perPixelTargetFind = true;
};

DrawingTool.prototype._toolButtonClicked = function (toolSelector) {
  if (this.currentTool !== undefined && this.currentTool.selector === toolSelector) {
    console.log(this.currentTool.name + " is already the current tool");
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
    $('#'+toolSelector).button('toggle');
    return;
  }

  if (this.currentTool !== undefined) {
    this.currentTool.setActive(false);
  }
  this.currentTool = newTool;
  newTool.setActive(true);
  this.canvas.renderAll(false);
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

require.register("scripts/rescale-2-resize", function(exports, require, module) {
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
};

});

require.register("scripts/tool", function(exports, require, module) {
/*
 * Tool "Class"
 */
function Tool(name, selector, drawTool) {
  console.info(name);

  this.name = name || "Tool";
  this.selector = selector || "";
  this.master = drawTool;
  this.canvas = drawTool.canvas;
  this.active = false;
  this.singleUse = false;

  this.master.tools[selector] = this;

  this._listeners = [];

  this.initUI();
}

Tool.prototype.setActive = function (active) {
  // console.log(this.name + " active? " +  this.active);
  if (this.singleUse) {
    console.warn("This is a single use tool. It was not activated.");
    return;
  }
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    // this tool is now active
    console.log("Activating " + this.name);
    this.activate();
  } else {
    // this tool has been deselected
    console.log("Deactivating " + this.name);
    this.deactivate();
  }

  return active;
};

Tool.prototype.activate = function () {
  // console.warn(this.name + " at tool activation method");
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.on(trigger, action);
  }
};

// This function will be called when user tries to activate a tool that
// is already active. It can enable some special behavior.
// Implement this function in a subclass when needed.
Tool.prototype.activateAgain = function () {};

// This function will be implemented by singleUse tools that do not need
// to be activated
Tool.prototype.use = function() {};

Tool.prototype.deactivate = function () {
  // console.warn(this.name + " at deactivation method");
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.off(trigger);
  }
};

Tool.prototype.addEventListener = function (eventTrigger, eventHandler) {
  this._listeners.push({
    trigger: eventTrigger,
    action: eventHandler
  });
};

Tool.prototype.removeEventListener = function (trigger) {
  for (var i = 0; i < this._listeners.length; i++) {
    if (trigger == this._listeners[i].trigger){
      return this._listeners.splice(i,1);
    }
  }
};

Tool.prototype.initUI = function () {
  this.$element = $('<label class="btn btn-primary">')
    .attr('id', this.selector)
    .appendTo(this.master.$tools);
  $('<input type="radio" name="options">')
    .attr('value', this.selector)
    .appendTo(this.$element);
  $('<span>')
    .appendTo(this.$element);
};

Tool.prototype.setLabel = function (label) {
  this.$element.find('span').text(label);
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

  this.setLabel('C');
}

inherit(CircleTool, ShapeTool);

CircleTool.prototype.mouseDown = function (e) {
  console.log("Circle down");
  CircleTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = Util.getLoc(e.e);
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

  var loc = Util.getLoc(e.e);
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

  this.canvas.renderAll(false);
};

CircleTool.prototype.mouseUp = function (e) {
  console.log("Circle up");
  CircleTool.super.mouseUp.call(this, e);
  if (!this.active) { return; }

  if (this.curr.originX === "right") {
    // "- this.curr.strokeWidth" eliminates the small position shift
    // that would otherwise occur on mouseup
    this.curr.left = this.curr.left - this.curr.width - this.curr.strokeWidth;
    this.curr.originX = "left";
  }
  if (this.curr.originY === "bottom") {
    this.curr.top = this.curr.top - this.curr.height - this.curr.strokeWidth;
    this.curr.originY = "top";
  }

  this.curr.setCoords();
  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
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

  this.addEventListener("object:selected", function () { self.show(); });
  this.addEventListener("selection:cleared", function () { self.hide(); });

  this.activate();
};

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
}

DeleteTool.prototype.initUI = function () {
  this.$element = $('<label class="btn btn-primary">')
    .attr('id', this.selector)
    .appendTo(this.master.$tools)
    .hide();
  $('<span>')
    .text('Tr')
    .appendTo(this.$element);
};

DeleteTool.prototype.show = function () { this.$element.show(); }
DeleteTool.prototype.hide = function () { this.$element.hide(); }

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

  this.setLabel('E');
}

inherit(EllipseTool, ShapeTool);

EllipseTool.prototype.mouseDown = function (e) {
  console.log("ellipse down");
  EllipseTool.super.mouseDown.call(this, e);

  // if this tool is no longer active, stop current action!
  if (!this.active) { return; }

  var loc = Util.getLoc(e.e);
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
  var loc = Util.getLoc(e.e);
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

  this.curr.set('rx', width / 2);
  this.curr.set('ry', height / 2);

  this.curr.set('width', width);
  this.curr.set('height', height);

  this.canvas.renderAll(false);
};

EllipseTool.prototype.mouseUp = function (e) {
  console.log("ellipse up");

  EllipseTool.super.mouseUp.call(this, e);
  if (!this.active) { return; }

  var width = this.curr.width,
      height = this.curr.height;

  if (this.curr.originX === "right") {
    // "- this.curr.strokeWidth" eliminates the small position shift
    // that would otherwise occur on mouseup
    this.curr.left = this.curr.left - this.curr.width - this.curr.strokeWidth;
    this.curr.originX = "left";
  }
  if (this.curr.originY === "bottom") {
    this.curr.top = this.curr.top - this.curr.height - this.curr.strokeWidth;
    this.curr.originY = "top";
  }

  this.curr.setCoords();
  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
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

  this.setLabel('F');
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
  FreeDrawTool.super.mouseUp.call(this, opt);
  if (!this._locked) {
    this.canvas.isDrawingMode = false;
  }
  var objects = this.canvas.getObjects();
  var lastObject = objects[objects.length - 1];
  if (!this.active) {
    this.canvas.remove(lastObject);
  } else {
    this.actionComplete(lastObject);
  }
};

FreeDrawTool.prototype.deactivate = function () {
  FreeDrawTool.super.deactivate.call(this);
  this.canvas.isDrawingMode = false;
}

module.exports = FreeDrawTool;

});

require.register("scripts/tools/line-tool", function(exports, require, module) {
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
  this._selectedObj;

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
  this.curr.on('removed', LineTool.lineDeleted);

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
  point.on("removed", LineTool.pointDeleted);
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
}

// delete the control points after the line has been deleted
LineTool.lineDeleted = function (e) {
  // since `pointDeleted` will be triggered on when removing the first point
  // we don't need to worry about removing the other point as well.
  this.canvas.remove(this.ctp[0]);
}

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

  this.setLabel('R');
}

inherit(RectangleTool, ShapeTool);

RectangleTool.prototype.mouseDown = function (e) {
  console.log("down");
  RectangleTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = Util.getLoc(e.e);

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

  var loc = Util.getLoc(e.e);

  var x = loc.x;
  var y = loc.y;
  var x1 = this.curr.left;
  var y1 = this.curr.top;

  this.curr.width = x - x1;
  this.curr.height = y - y1;

  this.canvas.renderAll(false);
};

RectangleTool.prototype.mouseUp = function (e) {
  console.log("rect up");
  RectangleTool.super.mouseUp.call(this, e);
  if (!this.active) { return; }

  if (this.curr.width < 0) {
    this.curr.left = this.curr.left + this.curr.width;
    this.curr.width = - this.curr.width;
  }
  if (this.curr.height < 0) {
    this.curr.top = this.curr.top + this.curr.height;
    this.curr.height = - this.curr.height;
  }
  this.curr.setCoords();

  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

module.exports = RectangleTool;

});

require.register("scripts/tools/select-tool", function(exports, require, module) {
var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

function SelectionTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.setLabel('S');
  this.deleteTool;
}

inherit(SelectionTool, Tool);

SelectionTool.prototype.activate = function () {
  this.setSelectable(true);
  // if (this.deleteTool) { this.deleteTool.show(); }
};

SelectionTool.prototype.deactivate = function () {
  this.setSelectable(false);
  this.canvas.deactivateAllWithDispatch();
  // if (this.deleteTool) { this.deleteTool.hide(); }
};

SelectionTool.prototype.setSelectable = function (selectable) {
  this.canvas.selection = selectable;
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
  // might be needed?
  // fabric.Group.prototype.selectable = selectable;
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
  this.curr = undefined; // current shape being manipulated
}

inherit(ShapeTool, Tool);

ShapeTool.prototype.minimumSize = 10;

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
  $('#' + this.selector).addClass('locked');
};

ShapeTool.prototype.deactivate = function() {
  ShapeTool.super.deactivate.call(this);
  this.unlock();
};

ShapeTool.prototype.unlock = function() {
  $('#' + this.selector).removeClass('locked');
  this._locked = false;
};

ShapeTool.prototype.exit = function () {
  if (this.curr) {
    this.canvas.remove(this.curr);
  }

  if (this._locked) { return; }

  console.info("changing out of " + this.name);
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

  var loc = Util.getLoc(e.e);
  this.__startX = loc.x;
  this.__startY = loc.y;
};

ShapeTool.prototype.mouseMove = function (e) {

};

ShapeTool.prototype.mouseUp = function (e) {
  this.down = false;
  var loc = Util.getLoc(e.e);
  if (Util.dist(this.__startX - loc.x, this.__startY - loc.y) < this.minimumSize) {
    this.exit();
  }

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

  this.setLabel('Sq');
}

inherit(SquareTool, ShapeTool);

SquareTool.prototype.mouseDown = function (e) {
  console.log("square down");
  SquareTool.super.mouseDown.call(this, e);

  if (!this.active) { return; }

  var loc = Util.getLoc(e.e);
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

  var loc = Util.getLoc(e.e);
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
  console.log("square up");
  SquareTool.super.mouseUp.call(this, e);
  if (!this.active) { return; }

  if (this.curr.width < 0) {
    this.curr.left = this.curr.left + this.curr.width;
    this.curr.width = - this.curr.width;
  }
  if (this.curr.height < 0) {
    this.curr.top = this.curr.top + this.curr.height;
    this.curr.height = - this.curr.height;
  }
  this.curr.setCoords();

  this.canvas.renderAll(false);
  this.actionComplete(this.curr);
  this.curr = undefined;
};

module.exports = SquareTool;

});

require.register("scripts/util", function(exports, require, module) {
module.exports = {
  dist: function dist(dx, dy){
    var dx2 = Math.pow(dx, 2);
    var dy2 = Math.pow(dy, 2);
    return Math.sqrt(dx2 + dy2);
  },

  // e is the mouse/touch event
  getLoc: function getLoc(e) {
    if (e instanceof MouseEvent) {
      return {
        x: e.layerX,
        y: e.layerY
      };
    } else if (e instanceof TouchEvent) {
      return {
        x: e.touches[0].clientX - $('canvas').offset().left,
        y: e.touches[0].clientY - $('canvas').offset().top
      };
    }
  }
};

});

// See: https://github.com/brunch/brunch/issues/712

// Export DrawingTool constructor to 'window' object. There is an assumption
// that DrawingTool is always included using a script tag on a regular web page.
// However we can implement CommonJS and AMD support here too (e.g. using similar
// code snippet that is used by Browserify when 'standalone' option is enabled).
window.DrawingTool = require('scripts/drawing-tool');


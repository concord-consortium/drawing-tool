// NOTE: see the fabric-extensions/annotations file for notes about how annotations are implemented

var $ = require('jquery');
var fabric = require('fabric').fabric;
var inherit = require('../../inherit');
var ShapeTool = require('../shape-tool');
var uuid = require('uuid').v4;
var handleAnnotations = require('../../fabric-extensions/annotations');

function AnnotationTool(name, drawTool) {
  ShapeTool.call(this, name, drawTool);

  this.canvas.on(
    'text:editing:exited',
    function (opt) {
      if (this.active) {
        // This may be confusing, but if you take a look at FabricJS source, you will notice
        // that text .selectable property is always set to true just before this event
        // is emitted. Quite often is now what we want, especially when AnnotationTool is active.
        opt.target.selectable = false;
      }
      this._pushToHistoryIfModified(opt.target);
    }.bind(this)
  );

  // handle movement of control point or text box
  this.canvas.on('object:moved', (e) => {
    if (e.target.annotationId) {
      this.master.pushToHistory();
    }
  });

  handleAnnotations(this);
}

inherit(AnnotationTool, ShapeTool);

AnnotationTool.prototype.mouseDown = function (opt) {
  // User interacts with the text itself (e.g. select letters or change cursor
  // position), do nothing and exit.
  if (opt.target && opt.target.isEditing) return;

  AnnotationTool.super.mouseDown.call(this, opt);

  // Special behaviour of annotation tool - single click on text or border lets you edit existing text.
  // and click on existing annotation object activates it
  var target = this.canvas.findTarget(opt.e);
  if (target && target.type === fabric.AnnotationText.prototype.type) {
    this.editText(target, opt.e);
    return;
  }
  // If user clicks on the border, find related text object and edit it.
  if (target && target.type === fabric.AnnotationBorder.prototype.type) {
    var text = fabric.Annotations.get(
      target.annotationId,
      fabric.AnnotationText.prototype.type
    );
    this.editText(text, opt.e);
    return;
  }

  // See #_exitTextEditingOnFirstClick method.
  if (!this.active || opt.e._dt_doNotCreateNewTextObj) return;

  // ignore if some part of an annotation is clicked
  if (target && target.annotationId) return;

  var loc = this.canvas.getPointer(opt.e);
  var x = loc.x;
  var y = loc.y;

  var annotationId = uuid();
  var ccCharcoal = '#3f3f3f';

  var text = new fabric.AnnotationText('', {
    annotationId,
    left: x,
    top: y,
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 16,
    fill: ccCharcoal
  });
  text.hasControls = false;

  var arrow = new fabric.AnnotationArrow(
    fabric.Annotations.calcArrowPoints(text),
    {
      annotationId,
      stroke: ccCharcoal,
      strokeWidth: 4,
      selectable: false
    }
  );
  this.canvas.add(arrow);

  var borderRect = fabric.Annotations.calcBorderRect(text);
  var border = new fabric.AnnotationBorder({
    annotationId,
    left: borderRect.left,
    top: borderRect.top,
    width: borderRect.width,
    height: borderRect.height,
    fill: 'white',
    stroke: ccCharcoal,
    rx: 4,
    ry: 4
  });
  this.canvas.add(border);

  this.actionComplete(text);
  // Disable perPixelTargetFind for AnnotationText type to help with selection of the empty text. See:
  // https://www.pivotaltracker.com/story/show/179583551
  text.perPixelTargetFind = false;

  this.canvas.add(text);
  this.editText(text, opt.e);
  opt.e.preventDefault();

  this.master.pushToHistory();
};

AnnotationTool.prototype.activate = function () {
  // Keep selected object so user can change its font size.
  AnnotationTool.super.activate.call(this, true);
};

AnnotationTool.prototype.deactivate = function () {
  AnnotationTool.super.deactivate.call(this);
  // If text is in edit mode, deactivate it before changing the tool.
  this.exitTextEditing();
};

AnnotationTool.prototype.exitTextEditing = function () {
  // If text is in edit mode, deactivate it before changing the tool.
  var activeObj = this.canvas.getActiveObject();
  if (activeObj && activeObj.isEditing) {
    this.canvas.discardActiveObject();
  }
};

AnnotationTool.prototype.editText = function (text, e) {
  this.canvas.setActiveObject(text);
  text.enterEditing();
  text.setCursorByClick(e);
  // Unfortunately there is no reliable method to enter editing mode through
  // FabricJS API. Entering edit mode highly depends on sequence of mouse / touch
  // events. Lines below fix: https://www.pivotaltracker.com/story/show/77905208
  // They ensure that user will be able to immediately enter text in some edge cases
  // (drawing tool inside jQuery UI modal dialog).
  // Note that it's exactly the same what FabricJS does in IText onMouseDown handler
  // (at least in FabricJS v1.4.11).
  if (text.hiddenTextarea && text.canvas) {
    text.canvas.wrapperEl.appendChild(text.hiddenTextarea);
    if (fabric.isTouchSupported) {
      // Mobile devices seem to automatically zoom and scroll to input when it gets focus. Set a big font size to
      // avoid zooming. Also, set correct 'top' value so page scrolls to the correct position. Note that this solution
      // isn't perfect, as still page might scroll to the left (due to -1000px val). Unfortunately we can't keep
      // hidden text input in the right place, as the input caret seems to ignore z-index and its always visible (iOS).
      $(text.hiddenTextarea).css({
        left: '-1000px',
        top: e.pageY || 0,
        'font-size': '50px'
      });
    }
    text.hiddenTextarea.focus();
  }
  this._exitTextEditingOnFirstClick();
};

// FabricJS also disables edit mode on first click, but only when a canvas is the click target.
// Make sure we always exit edit mode and do it pretty fast, before other handlers are executed
// (useCapture = true, window). That's important e.g. for state history update (edge case: user
// is in edit mode and clicks 'undo' button).
AnnotationTool.prototype._exitTextEditingOnFirstClick = function () {
  var self = this;
  var canvas = this.canvas;
  addHandlers();

  function addHandlers() {
    window.addEventListener('mousedown', handler, true);
    window.addEventListener('touchstart', handler, true);
  }
  function cleanupHandlers() {
    window.removeEventListener('mousedown', handler, true);
    window.removeEventListener('touchstart', handler, true);
  }
  function handler(e) {
    // By default when you click any element, active text should exit edit mode.
    // However if clicked element (or his ancestor) has special class 'dt-keep-text-edit-mode',
    // click will be ignored and edit mode won't be exited.
    if ($(e.target).closest('.dt-keep-text-edit-mode').length > 0) {
      return;
    }
    var target = canvas.findTarget(e);
    var activeObj = canvas.getActiveObject();
    if (target !== activeObj && activeObj && activeObj.isEditing) {
      cleanupHandlers();
      // Exit edit mode and mark that this click shouldn't add a new text object
      // (when canvas is clicked).
      self.exitTextEditing();
      e._dt_doNotCreateNewTextObj = true;
    }
  }
};

AnnotationTool.prototype._pushToHistoryIfModified = function (obj) {
  if (obj.text !== obj._dt_lastText) {
    this.master.pushToHistory();
    obj._dt_lastText = obj.text;
  }
};

module.exports = AnnotationTool;

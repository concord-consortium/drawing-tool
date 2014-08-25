var inherit   = require('scripts/inherit');
var ShapeTool = require('scripts/tools/shape-tool');

function TextTool(name, drawTool) {
  ShapeTool.call(this, name, drawTool);

  this.exitTextEditingOnFirstClick();
}

inherit(TextTool, ShapeTool);

TextTool.prototype.mouseDown = function (opt) {
  // User interacts with the text itself (e.g. select letters or change cursor
  // position), do nothing and exit.
  if (opt.target && opt.target.isEditing) return;

  TextTool.super.mouseDown.call(this, opt);

  // See #exitTextEditingOnFirstClick method.
  if (!this.active || opt.e._dt_doNotCreateNewTextObj) return;

  var loc = this.canvas.getPointer(opt.e);
  var x = loc.x;
  var y = loc.y;

  var text = new fabric.IText("", {
    left: x,
    top: y,
    lockUniScaling: true,
    fontFamily: 'Arial',
    fontSize: this.master.state.strokeWidth * 4,
    // Yes, looks strange, but I guess stroke color should be used (as it would be the "main" one).
    fill: this.master.state.stroke
  });
  this.actionComplete(text);
  this.canvas.add(text);
  this.canvas.setActiveObject(text);
  text.enterEditing();
  this.exitTextEditingOnFirstClick();
};

TextTool.prototype.deactivate = function () {
  TextTool.super.deactivate.call(this);
  // If text is in edit mode, deactivate it before changing the tool.
  this.exitTextEditing();
};

TextTool.prototype.exitTextEditing = function () {
  // If text is in edit mode, deactivate it before changing the tool.
  var activeObj = this.canvas.getActiveObject();
  if (activeObj && activeObj.isEditing) {
    this.canvas.deactivateAllWithDispatch();
  }
};

TextTool.prototype.exitTextEditingOnFirstClick = function () {
  var self = this;
  var canvas = this.canvas;

  // TODO: should we cleanup these handlers somewhere?
  // The perfect option would be to add handler to upperCanvasEl itself, but then
  // there is no way to execute it before Fabric's mousedown handler (which e.g.
  // will remove selection and deactivate object we are interested in).
  canvas.upperCanvasEl.parentElement.addEventListener('mousedown', handler, true);
  canvas.upperCanvasEl.parentElement.addEventListener('touchstart', handler, true);

  function handler(e) {
    if (!self.active) return;
    var target = canvas.findTarget(e);
    var activeObj = canvas.getActiveObject();
    if (target !== activeObj && activeObj && activeObj.isEditing) {
      // Deactivate current active (so also exit edit mode) object
      // and mark that this click shouldn't add new text object.
      canvas.deactivateAllWithDispatch();
      e._dt_doNotCreateNewTextObj = true;
      // Workaround - note that .deactivateAllWithDispatch() call above always set
      // .selecatble attribute to true, what sometimes is definitely unwanted (lock mode).
      activeObj.selectable = !self._locked;
    }
  }
};

module.exports = TextTool;

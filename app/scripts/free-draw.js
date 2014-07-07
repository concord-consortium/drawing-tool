var inherit = require('scripts/inherit');
var ShapeTool    = require('scripts/shape-tool');

function FreeDrawTool(name, selector, drawTool) {
    ShapeTool.call(this, name, selector, drawTool);

    var self = this;
    this.addEventListener("mouse:down", function (e) { self.mouseDown(e); });
    this.addEventListener("mouse:move", function (e) { self.mouseMove(e); });
    this.addEventListener("mouse:up", function (e) { self.mouseUp(e); });

    this.setLabel('F');
}

inherit(FreeDrawTool, ShapeTool);

FreeDrawTool.prototype.activate = function() {
  FreeDrawTool.super.activate.call(this);
  this.canvas.isDrawingMode = true;
}

FreeDrawTool.prototype.deactivate = function() {
  FreeDrawTool.super.deactivate.call(this);
  this.canvas.isDrawingMode = false;
}

FreeDrawTool.prototype.mouseDown = function(evt) {
  // need to find the target and add it to a new object along with the event
  // in order to emulate the behavior of other shape tools on mouse/touch down
  // events
  var targetObj = this.canvas.findTarget(evt.e);
  var modifiedEvent = {e: evt.e, target: targetObj};
  FreeDrawTool.super.mouseDown.call(this, modifiedEvent);
}


// This hack doesn't really work and definitely doesn't work on touchscreens
FreeDrawTool.prototype.mouseMove = function(e) {
  if (!this._firstAction) {
    this.canvas.isDrawingMode = this.canvas.findTarget(e.e) === undefined;
    this._setAllObjectsSelectable(!this.canvas.isDrawingMode);
    console.log(this.canvas.isDrawingMode);
  }
}

FreeDrawTool.prototype.mouseUp = function(e) {
  FreeDrawTool.super.mouseUp.call(this, e);
  // if deactivation (marked with this.active) occurs during this step
  // it can only be because of a movement that was below the threshold
  if (!this.active) {
    this.canvas.remove(this.canvas.item(this.canvas.getObjects().length - 1));
  }
  this.actionComplete();
}

module.exports = FreeDrawTool;

var inherit  = require('scripts/inherit');
var Tool     = require('scripts/tool');

/**
 * Single use tool that deletes the currently selected object(s).
 * This tool also captures the backspace/delete key and is triggered that way as well.
 */
function DeleteTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.singleUse = true;

  // delete the selected object(s) with the backspace key
  // see: https://www.pivotaltracker.com/story/show/74415780
  var self = this;
  jQuery('.dt-canvas-container').keydown(function(e) {
    if (e.keyCode === 8) {
      e.preventDefault();
      self._delete();
    }
  });
}

inherit(DeleteTool, Tool);

/**
 * Deletes the currently selected object(s) from the fabricjs canvas.
 */
DeleteTool.prototype.use = function () {
  var canvas = this.canvas;
  if (canvas.getActiveObject()) {
    canvas.remove(canvas.getActiveObject());
  } else if (canvas.getActiveGroup()) {
    canvas.getActiveGroup().forEachObject(function(o){ canvas.remove(o); });
    canvas.discardActiveGroup().renderAll();
  }
  // Alternate UI pattern for 'inactive delete tool'
  // else if (canvas.getObjects().length > 0) {
  //   // OPTION 1: REMOVES the most recently created object
  //   // canvas.remove(canvas.item(canvas.getObjects().length - 1));
  //   // OPTION 2: SELECTS the most recently created object
  //   // canvas.setActiveObject(canvas.item(canvas.getObjects().length - 1));
  // }
};

module.exports = DeleteTool;

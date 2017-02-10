var inherit  = require('../inherit');
var Tool     = require('../tool');

/**
 * Single use tool that deletes the currently selected object(s).
 * This tool also captures the backspace/delete key and is triggered that way as well.
 */
function DeleteTool(name, drawTool) {
  Tool.call(this, name, drawTool);

  this.singleUse = true;

  // Delete the selected object(s) with the backspace key.
  this.master.$element.on('keydown', function(e) {
    if (e.keyCode === 8) {
      this.use();
      e.preventDefault();
    }
  }.bind(this));
}

inherit(DeleteTool, Tool);

/**
 * Deletes the currently selected object(s) from the fabricjs canvas.
 */
DeleteTool.prototype.use = function () {
  var canvas = this.canvas;
  if (canvas.getActiveObject()) {
    canvas.remove(canvas.getActiveObject());
    this.master.pushToHistory();
  } else if (canvas.getActiveGroup()) {
    canvas.getActiveGroup().forEachObject(function (o) {
      canvas.remove(o);
    });
    canvas.discardActiveGroup().renderAll();
    this.master.pushToHistory();
  }
};

module.exports = DeleteTool;

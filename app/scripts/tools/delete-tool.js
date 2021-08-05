var inherit  = require('../inherit');
var Tool     = require('../tool');

/**
 * Single use tool that deletes the currently selected object(s).
 * This tool also captures the backspace/delete key and is triggered that way as well.
 */
function DeleteTool(name, drawTool) {
  Tool.call(this, name, drawTool);

  this.singleUse = true;

  // Delete the selected object(s) with the backspace and delete key when not using the text tool
  this.master.$element.on('keydown', function(e) {
    if ((e.keyCode === 8) || (e.keyCode === 46)) {
      if ((this.master.currentTool !== this.master.tools.text) && (this.master.currentTool !== this.master.tools.annotation)) {
        this.use();
        e.preventDefault();
      }
    }
  }.bind(this));
}

inherit(DeleteTool, Tool);

/**
 * Deletes the currently selected object(s) from the fabricjs canvas.
 */
DeleteTool.prototype.use = function () {
  var canvas = this.canvas;
  canvas.getActiveObjects().forEach(function (o) {
    canvas.remove(o);
  });
  canvas.discardActiveObject().renderAll();
  this.master.pushToHistory();
};

module.exports = DeleteTool;
